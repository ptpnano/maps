# MapBoost Neon

Google Maps optimization platform — built with **Next.js 15** (App Router, SSR).

## Tech Stack

- **Framework**: Next.js 15 (App Router)
- **Styling**: Tailwind CSS v4
- **Animations**: Framer Motion (`motion/react`)
- **Charts**: Recharts
- **Forms**: React Hook Form + Zod
- **Fonts**: next/font (Plus Jakarta Sans + Inter)
- **Toasts**: Sonner

## Getting Started

**Prerequisites**: Node.js >= 20

1. Install dependencies:
   ```bash
   npm install
   ```

2. Copy env file and fill in values:
   ```bash
   cp .env.example .env.local
   ```

3. Run dev server:
   ```bash
   npm run dev
   ```

Open [http://localhost:3000](http://localhost:3000).

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start dev server |
| `npm run build` | Production build |
| `npm run start` | Start production server |
| `npm run lint` | Lint code |

## Project Structure

```
app/                    # Next.js App Router pages
├── layout.tsx          # Root layout + metadata
├── page.tsx            # Home (/)
├── globals.css         # Global styles + Tailwind @theme
├── robots.ts           # Programmatic robots.txt
├── sitemap.ts          # Programmatic sitemap.xml
├── pricing/            # /pricing
├── case-studies/       # /case-studies
├── audit/              # /audit
├── login/              # /login
├── register/           # /register
└── dashboard/          # /dashboard (nested layout)
    ├── layout.tsx      # Sidebar layout
    ├── page.tsx        # Dashboard home
    ├── campaigns/
    ├── media/
    ├── reports/
    └── settings/
components/             # Shared client components
lib/                    # Utilities (cn)
```
