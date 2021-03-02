const smallifyCookie = require('smallify-cookie')
const { nanoid } = require('nanoid')
const LruCache = require('lru-cache')

function ensureDefaults (opts) {
  opts.secret = opts.secret || nanoid()
  opts.cookieName = opts.cookieName || 'sessionId'
  opts.cookie = opts.cookie || {}
  opts.cookie.path = opts.cookie.path || '/'
  opts.cookie.maxAge = opts.cookie.maxAge || 7200

  opts.store =
    opts.store ||
    new LruCache({
      maxAge: opts.cookie.maxAge / 1000,
      stale: true
    })

  return opts
}

function wrap (fn, ...args) {
  return new Promise((resolve, reject) => {
    try {
      let hasDone = false

      function done (err, data) {
        if (hasDone) return
        hasDone = true

        if (err) {
          return reject(err)
        }

        return resolve(data)
      }

      const fnRes = fn(...args, done)
      if (fnRes && typeof fnRes.then === 'function') {
        fnRes.then(data => done(null, data)).catch(err => done(err))
      } else {
        done(null, fnRes)
      }
    } catch (err) {
      return reject(err)
    }
  })
}

module.exports = async function (smallify, opts) {
  const { $root } = smallify

  const { secret, cookieName, cookie, store } = ensureDefaults(opts)

  $root.register(smallifyCookie, {
    secret
  })

  $root.decorateRequest('session', null)

  $root.decorateRequest('clearSession', async function () {
    const session = this.session
    if (!session || !session.id) {
      return
    }

    delete this.session
    await wrap(store.del.bind(store), session.id)
  })

  $root.addHook('onBeforeValidation', async function (req, rep) {
    return new Promise((resolve, reject) => {
      const { url } = req
      if (url.indexOf(cookie.path) !== 0) {
        return resolve()
      }

      const sessionId = req.cookies[cookieName]
      if (!sessionId) {
        req.session = {
          id: nanoid()
        }
        return resolve()
      } else {
        const decryptedSessionId = req.unsignCookie(sessionId)

        if (decryptedSessionId === false) {
          const err = new Error('Not Acceptable')
          err.statusCode = 406
          rep.clearCookie(cookieName)
          return reject(err)
        }

        wrap(store.get.bind(store), decryptedSessionId)
          .then(session => {
            if (!session) {
              const err = new Error('Unauthorized')
              err.statusCode = 401
              throw err
            }

            req.session = session
          })
          .then(resolve)
          .catch(err => {
            rep.clearCookie(cookieName)
            reject(err)
          })
      }
    })
  })

  $root.addHook('onResponse', function (req, rep) {
    return new Promise((resolve, reject) => {
      const session = req.session
      if (!session || !session.id) {
        rep.clearCookie(cookieName)
        return resolve()
      }

      wrap(store.set.bind(store), session.id, session, cookie.maxAge / 1000)
        .then(() => {
          rep.setCookie(cookieName, session.id, { signed: true, ...cookie })
        })
        .then(resolve)
        .catch(reject)
    })
  })
}
