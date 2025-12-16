# Showgeo User Profile API Reference

## 1. Overview
This API reference defines all **Supabase tables**, **interfaces**, and **API endpoints** used by the Showgeo user profile system.  

It complements:
- `profile_logic_map.md` — data flow & behavior
- `profile_component_structure.md` — component hierarchy
- `profile_layout_map.md` — spatial layout
- `profile_visual_standards.md` — design system

All data operations are built around **Supabase REST**, **RPC functions**, and **Row Level Security (RLS)**.  
When hosted on Render or Vercel, environment variables must match these definitions.

---

## 2. Supabase Configuration

### .env Variables
```bash
SUPABASE_URL=https://bsxmudeoxlsrwcolhlav.supabase.co
SUPABASE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJzeG11ZGVveGxzcndjb2xobGF2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjIwNTA5OTEsImV4cCI6MjA3NzYyNjk5MX0.vxWQpTs50APB9XSwbMz0OJDVPsoPyRa5gk_q_i1EvZw
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJzeG11ZGVveGxzcndjb2xobGF2Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MjA1MDk5MSwiZXhwIjoyMDc3NjI2OTkxfQ.t0CeJ-4QPu64fojwGKzzWslvgPaEdAC3oliXN6FgaHc
DATABASE_URL="postgresql://postgres:TLFSAOF0mhEen1DB@db.bsxmudeoxlsrwcolhlav.supabase.co:5432/postgres"
JWT_SECRET=g/Pjrcvio7HxWKdSfsKkParykrS3lVwlw+Iogb0KgfanfGaIYzPgK4N4YQs8HJbgSZYCK3So0TdRne371wOa5A==
