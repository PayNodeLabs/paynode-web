<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know
This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# OVERVIEW
PayNode Web is the user-facing portal and API hub for the PayNode protocol. It serves as the landing page, POM (Proof of Movement) simulator, and future merchant dashboard.

# STRUCTURE
- `app/`: Next.js 15 App Router.
- `app/api/pom/`: Core POM backend logic. Integrates `@paynodelabs/sdk-js` for on-chain verification.
- `app/pom/`: Client-side simulator page.
- `public/`: Brand assets and static images.
- `next.config.ts`: Configures `ignoreDuringBuilds: true` for both ESLint and TypeScript.

# WHERE TO LOOK
- **POM API Implementation:** `app/api/pom/route.ts` (handles 402 handshakes and verification).
- **Network Config:** `app/api/pom/config.ts` (synced from root `paynode-config.json`).
- **Supabase Client:** `app/api/pom/lib/supabase.ts`.
- **Global Styles:** `app/globals.css` (Tailwind 4).

# CONVENTIONS
- **App Router:** Use Server Components by default. Add 'use client' only when state or effects are required.
- **API Routes:** Use NextRequest and NextResponse. Follow the x402 protocol header spec (x-paynode-*).
- **Styling:** Use Tailwind CSS 4 utility classes. Prefer Lucide React for icons.
- **Verification:** Always use PayNodeVerifier from the SDK for 402 retries.
- **Types:** Strict TypeScript. Use @/* aliases for imports from the root.

# ANTI-PATTERNS
- **No Manual Protocol Constants:** Do not edit app/api/pom/config.ts manually. Use scripts/sync-config.py in the root.
- **No Client-Side Keys:** Never expose Supabase service keys or private keys in client components.
- **No Inline Styles:** Use Tailwind utilities or CSS variables defined in globals.css.
- **No standard fetch for POM:** Always use headers matching the SDK specification in SDK_SPECIFICATION.md.
