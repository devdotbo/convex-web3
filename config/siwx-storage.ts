import type { SIWXSession } from '@reown/appkit'
import type { SIWXStorage } from '@reown/appkit-siwx'
import { LocalStorage } from '@reown/appkit-siwx'
import { convex } from '@/components/ConvexClientProvider'

export class JwtCookieStorage implements SIWXStorage {
  private readonly local = new LocalStorage({ key: '@appkit/siwx' })

  async add(session: SIWXSession): Promise<void> {
    await this.local.add(session)
    try {
      const res = await fetch('/api/siwx/verify', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ session }),
      })
      if (res.ok) {
        await convex.setAuth(async () => {
          try {
            const t = await fetch('/api/auth/token', { cache: 'no-store', credentials: 'include' })
            const { token } = (await t.json()) as { token: string | null }
            return token ?? null
          } catch {
            return null
          }
        })
      }
    } catch {
      // ignore network errors; UI can retry
    }
  }

  async set(sessions: SIWXSession[]): Promise<void> {
    await this.local.set(sessions)
    const last = sessions[sessions.length - 1]
    if (last) {
      try {
        const res = await fetch('/api/siwx/verify', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ session: last }),
        })
        if (res.ok) {
          await convex.setAuth(async () => {
            try {
              const t = await fetch('/api/auth/token', { cache: 'no-store', credentials: 'include' })
              const { token } = (await t.json()) as { token: string | null }
              return token ?? null
            } catch {
              return null
            }
          })
        }
      } catch {
        // ignore
      }
    }
  }

  async get(chainId: string, address: string): Promise<SIWXSession[]> {
    // Cast to any to avoid importing appkit-core types
    return this.local.get(chainId as any, address)
  }

  async delete(chainId: string, address: string): Promise<void> {
    await this.local.delete(chainId, address)
    try {
      await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' })
      // Immediately clear Convex auth so mutations/queries require re-auth without page reload
      await convex.setAuth(async () => null)
    } catch {
      // ignore
    }
  }
}


