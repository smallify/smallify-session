const Smallify = require('smallify')
const smallifySession = require('./index')

const smallify = Smallify({
  pino: {
    level: 'info',
    prettyPrint: true
  }
})

smallify.register(smallifySession, {
  secret: '1234657'
})

smallify.route({
  url: '/',
  method: 'GET',
  async handler (req, rep) {
    console.log({
      session: req.session
    })

    if (req.session) {
      await req.clearSession()
    }
    rep.send('hello world')
  }
})

smallify.ready(err => {
  err && smallify.$log.error(err.message)
  smallify.print()
})
