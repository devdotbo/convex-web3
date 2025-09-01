<div align="center">

# Convex + Next.js + Reown AppKit SIWX Starter

Authenticate Web3 users across chains using Sign In With X (SIWX), issue short‑lived JWTs, and authorize Convex functions — all wired up for Next.js App Router with Wagmi and Reown AppKit.

[![Next.js](https://img.shields.io/badge/Next.js-15-black)](https://nextjs.org/) [![Convex](https://img.shields.io/badge/Convex-Cloud-blue)](https://convex.dev/) [![Wagmi](https://img.shields.io/badge/wagmi-v2-2E2E2E)](https://wagmi.sh/) [![AppKit](https://img.shields.io/badge/Reown%20AppKit-1.x-0aa)](https://github.com/reown-com/appkit) [![TypeScript](https://img.shields.io/badge/TypeScript-5-blue)](https://www.typescriptlang.org/)

</div>

---

## What you get

- Wallet modal and hooks via Reown AppKit with Wagmi (EVM)
- Chain‑agnostic SIWX powered by `@reown/appkit-siwx`
- Secure nonce + signature verification endpoints
- Short‑lived ES256 JWTs set as HttpOnly cookies
- Convex custom JWT auth wired to your JWKS endpoint
- SSR‑friendly hydration and cookie storage
- Minimal example Convex functions and a demo page

---

## Quickstart

1) Install dependencies (pnpm recommended):

```bash
pnpm install
```

2) Create `.env.local` at the project root:

```bash
NEXT_PUBLIC_PROJECT_ID="YOUR_WALLETCONNECT_PROJECT_ID"
NEXT_PUBLIC_CONVEX_URL="https://YOUR-CONVEX-DEPLOYMENT.convex.cloud"

# Optional but recommended for stable JWT validation across restarts
# Generate a private JWK (ES256) and paste it as a one-line JSON
# JWT_PRIVATE_JWK='{"kty":"EC","crv":"P-256","d":"...","x":"...","y":"...","kid":"app-key-1","alg":"ES256"}'

# Convex customJwt config should match these defaults
JWT_ISSUER="http://localhost:3000"
JWT_APPLICATION_ID="convex-web3"
JWT_JWKS_URL="http://localhost:3000/api/auth/jwks"
```

3) Ensure Convex auth config points to your JWKS:

```12:18:convex/auth.config.js
export default {
  providers: [
    {
      type: "customJwt",
      applicationID: process.env.JWT_APPLICATION_ID || "convex-web3",
      issuer: process.env.JWT_ISSUER || "http://localhost:3000",
      jwks: process.env.JWT_JWKS_URL,
      algorithm: "ES256",
    },
  ],
};
```

4) Run Next.js and Convex in parallel:

```bash
pnpm dev
```

Open `http://localhost:3000` and click the `<appkit-button />` to connect and sign.

---

## Architecture

```mermaid
flowchart TD
  A[Wallet Connect + Sign via AppKit] --> B[/SIWX nonce GET\n/api/siwx/nonce/]
  B --> C[Client signs message]
  C --> D[/Verify POST\n/api/siwx/verify/]
  D -->|verifyMessage + claims| E[Sign ES256 JWT]
  E -->|HttpOnly cookie| F[(auth_token)]
  F --> G[Convex Client\nsetAuth() -> /api/auth/token]
  G --> H[/JWKS GET\n/api/auth/jwks]
  H --> I[Convex customJwt\nverify against JWKS]
  I --> J[Authorized Convex functions]
```

Key pieces:

- `config/index.tsx`: Wagmi + AppKit setup with SSR, networks, and `projectId`.
- `context/index.tsx`: Initializes AppKit with `DefaultSIWX`, custom storage, and verifiers.
- `config/siwx-storage.ts`: Stores SIWX sessions locally and exchanges them for JWT cookies.
- `app/api/siwx/nonce`: Issues nonce and sets `siwx_nonce` cookie.
- `app/api/siwx/verify`: Verifies signature, mints ES256 JWT, sets `auth_token` cookie.
- `app/api/auth/jwks`: Exposes public JWKS for Convex to validate.
- `components/ConvexClientProvider.tsx`: Reads cookie‑backed JWT into Convex via `setAuth`.
- `components/AuthWatcher.tsx`: Clears Convex auth on wallet disconnect.

---

## SIWX in this template

- Messenger: `InformalMessenger` obtains a nonce from `/api/siwx/nonce` and binds `domain`/`uri`.
- Verifier: `EIP155Verifier` verifies EVM accounts client‑side; server re‑verifies signature with `viem.verifyMessage`.
- Storage: `JwtCookieStorage` persists local sessions and calls `/api/siwx/verify` to receive an `auth_token` cookie; also revokes on logout.

Relevant code:

```27:49:context/index.tsx
const siwx = new DefaultSIWX({
  messenger: new InformalMessenger({
    domain,
    uri,
    getNonce: async () => {
      const res = await fetch('/api/siwx/nonce', { cache: 'no-store', credentials: 'include' })
      const json = (await res.json()) as { nonce: string }
      return json.nonce
    }
  }),
  verifiers: [new EIP155Verifier()],
  storage: new JwtCookieStorage()
})
```

```6:33:config/siwx-storage.ts
export class JwtCookieStorage implements SIWXStorage {
  async add(session: SIWXSession) {
    await this.local.add(session)
    const res = await fetch('/api/siwx/verify', { method: 'POST', headers: { 'content-type': 'application/json' }, credentials: 'include', body: JSON.stringify({ session }) })
    if (res.ok) {
      await convex.setAuth(async () => {
        const t = await fetch('/api/auth/token', { cache: 'no-store', credentials: 'include' })
        const { token } = (await t.json()) as { token: string | null }
        return token ?? null
      })
    }
  }
}
```

---

## API Endpoints

- `GET /api/siwx/nonce`
  - Returns `{ nonce }` and sets `siwx_nonce` cookie (10 min).

- `POST /api/siwx/verify`
  - Body: `{ session: { data, message, signature } }`
  - Validates `siwx_nonce` cookie against `session.data.nonce` and verifies signature.
  - Mints ES256 JWT with claims `{ sub, iss, aud, wallet, chainId, type: 'siwx' }`.
  - Sets `auth_token` HttpOnly cookie (15 min).

- `GET /api/auth/token`
  - Returns `{ token }` from `auth_token` cookie for Convex `setAuth`.

- `POST /api/auth/logout`
  - Clears `auth_token` cookie.

- `GET /api/auth/jwks`
  - Returns public JWKS derived from private JWK used to sign tokens.

---

## Environment variables

- `NEXT_PUBLIC_PROJECT_ID`: WalletConnect Cloud Project ID for AppKit.
- `NEXT_PUBLIC_CONVEX_URL`: Convex deployment URL for the browser client.
- `JWT_PRIVATE_JWK` (optional): Private ES256 JWK JSON used to sign JWTs. If absent, an ephemeral key is generated on boot.
- `JWT_ISSUER`, `JWT_APPLICATION_ID`, `JWT_JWKS_URL`: Must align with `convex/auth.config.js` for token verification.

---

## Scripts

```json
{
  "dev": "npm-run-all --parallel dev:frontend dev:backend",
  "dev:frontend": "next dev",
  "dev:backend": "convex dev",
  "build": "next build",
  "start": "next start",
  "lint": "next lint"
}
```

---

## Usage

- Trigger modal anywhere:

```tsx
<appkit-button />
```

- Call an authenticated Convex mutation: open `app/page.tsx`, click Connect, then “Add a random number”.

```26:33:convex/myFunctions.ts
const identity = await ctx.auth.getUserIdentity();
if (!identity) {
  throw new Error("Unauthorized");
}
```

---

## Notes on SSR & hydration

- AppKit/Wagmi are configured with `cookieStorage` and `ssr: true` to avoid hydration warnings.
- `ContextProvider` uses `cookieToInitialState` and passes server cookies for Wagmi hydration.
- Convex `setAuth` is invoked after SIWX verification to propagate the fresh JWT to Convex immediately.

---

## Security considerations

- Nonce is mandatory and bound to `domain`/`uri` via the messenger; server rejects missing/mismatched nonce.
- JWTs are short‑lived and HttpOnly; refresh by re‑verifying or re‑connecting.
- For production, set a persistent `JWT_PRIVATE_JWK` and host JWKS on a stable URL over HTTPS.

---

## References

- Reown AppKit `wagmi` + networks: `@reown/appkit`, `@reown/appkit-adapter-wagmi`, `@reown/appkit/networks`
- SIWX primitives: `@reown/appkit-siwx`, CAIP‑122
- Convex custom JWT auth: `convex/auth.config.js`
- Docs in this repo: `docs/siwx-custom.md`, `docs/custom-jwt-authentication.md`, `docs/appkit-react-hooks.md`, `docs/caip-122.md`

---

## License

MIT
