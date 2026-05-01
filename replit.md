# Workspace

## Overview

pnpm workspace monorepo using TypeScript. Hosts the **Voie, Vérité, Vie (3V)** Catholic spiritual association web app, ported from Lovable.dev.

## Application: 3V Association

A spiritual web app for the Voie, Vérité, Vie (3V) Catholic association in Cameroon. Features:
- Biblical reading program (daily readings, Carême 2026, Chemin de Croix, Neuvaines)
- Community features: prayer forum, activities, gallery
- AI spiritual assistant (chat)
- Notification system (push notifications via FCM/VAPID)
- Admin panel with full content management
- Multilingual: French (primary), English, Italian
- Dark mode support

## Architecture

- **Frontend**: `artifacts/3v-app/` — React + Vite + Tailwind v3 + shadcn/ui
- **Backend**: Supabase (existing project: `kaddsojhnkyfavaulrfc.supabase.co`) — 30+ tables, auth, realtime, storage
- **Routing**: react-router-dom v6
- **State**: TanStack Query + React Context
- **i18n**: i18next with FR/EN/IT
- **Auth**: Supabase Auth (email/password)

## Environment Variables

- `VITE_SUPABASE_URL` — Supabase project URL
- `VITE_SUPABASE_PUBLISHABLE_KEY` — Supabase anon public key

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5 (api-server, not currently used by main app)
- **Database**: Supabase (PostgreSQL) — external, already provisioned

## Key Commands

- `pnpm run typecheck` — full typecheck across all packages
- `pnpm --filter @workspace/3v-app run dev` — run frontend locally (handled by workflow)

See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details.
