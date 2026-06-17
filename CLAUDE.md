# MOBYOU - Sistema de Gestão de E-Scooters

## Stack
- Next.js 15 (App Router)
- TypeScript
- Tailwind CSS v4
- Shadcn/UI
- Supabase (Auth, Database, Storage, Realtime)

## Project Structure
- `src/app/(auth)/` - Authentication pages (login, password reset, first access)
- `src/app/(dashboard)/gestor/` - Admin/Manager panel
- `src/app/(dashboard)/vendedor/` - Seller panel
- `src/app/(dashboard)/tecnico/` - Technician panel
- `src/app/(dashboard)/cliente/` - Client app
- `src/components/` - Reusable components organized by domain
- `src/lib/supabase/` - Supabase client (browser + server)
- `src/types/` - TypeScript types matching database schema
- `src/hooks/` - Custom React hooks
- `supabase/migrations/` - Database migrations

## Commands
- `npm run dev` - Start dev server
- `npm run build` - Build for production
- `npm run lint` - Run ESLint

## Roles
- gestor: Full access admin
- vendedor: Sales, clients, NF import, contracts
- tecnico: Service orders, diagnostics, check-in (NO pricing)
- cliente: View scooter, documents, approve quotes, track maintenance

## Key Patterns
- All dashboard pages are "use client"
- Supabase client: `import { createClient } from "@/lib/supabase/client"`
- Toast notifications: `import { toast } from "sonner"`
- Icons: lucide-react
- Portuguese language throughout UI
