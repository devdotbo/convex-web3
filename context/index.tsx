'use client'

import React, { ReactNode } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { WagmiProvider, cookieToInitialState, type Config } from 'wagmi'
import { createAppKit } from '@reown/appkit/react'
import { DefaultSIWX, InformalMessenger, EIP155Verifier } from '@reown/appkit-siwx'
import { config, networks, projectId, wagmiAdapter } from '@/config'
import { mainnet } from '@reown/appkit/networks'
import { JwtCookieStorage } from '@/config/siwx-storage'

const queryClient = new QueryClient()

const metadata = {
  name: 'Convex Web3',
  description: 'Convex + Next.js + Reown AppKit',
  url: typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000',
  icons: ['/convex.svg'],
}

if (!projectId) {
  console.error('AppKit Initialization Error: Project ID is missing.')
} else {
  const domain = typeof window !== 'undefined' ? window.location.hostname : 'localhost'
  const uri = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000'

  const siwx = new DefaultSIWX({
    messenger: new InformalMessenger({
      domain,
      uri,
      getNonce: async () => {
        const res = await fetch('/api/siwx/nonce', { cache: 'no-store', credentials: 'include' })
        const json = (await res.json()) as { nonce: string }
        return json.nonce
      },
    }),
    verifiers: [new EIP155Verifier()],
    storage: new JwtCookieStorage(),
  })

  createAppKit({
    adapters: [wagmiAdapter],
    projectId: projectId!,
    networks: networks,
    defaultNetwork: mainnet,
    metadata,
    features: { analytics: true },
    siwx,
  })
}

export default function ContextProvider({
  children,
  cookies,
}: {
  children: ReactNode
  cookies: string | null
}) {
  const initialState = cookieToInitialState(config as Config, cookies)

  return (
    <WagmiProvider config={config as Config} initialState={initialState}>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </WagmiProvider>
  )
}


