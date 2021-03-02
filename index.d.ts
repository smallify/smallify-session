import { Smallify } from 'smallify'

import { SessionOptions, SmallifySession, Session } from './types/options'

declare const session: SmallifySession

export = session

declare module 'smallify' {
  interface SmallifyPlugin {
    (plugin: SmallifySession, opts: SessionOptions): Smallify
  }

  interface Request {
    session: Session
    clearSession(): PromiseLike<void>
  }
}
