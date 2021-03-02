import { Smallify, PluginOptions } from 'smallify'
import { CookieSerializeOptions } from 'cookie'

export interface Session {
  id: string
  [key: string]: any
}

export interface SessionStore {
  get(sessionId: string): Promise<Session> | Session
  set(sessionId: string, session: Session, maxAge: number): Promise<void> | void
  del(sessionId: string): Promise<void> | void
}

export class SessionOptions extends PluginOptions {
  secret: string
  cookieName: string
  cookie: CookieSerializeOptions
  store: SessionStore
}

export type SmallifySession = {
  (smallify: Smallify, opts: SessionOptions): Promise<void>
}
