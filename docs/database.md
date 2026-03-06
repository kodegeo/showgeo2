# Database Configuration

## Local Development
- Uses direct Supabase Postgres
- Port 5432
- No PgBouncer
- Required for Prisma

## Production (Fly.io)
- Uses Supabase PgBouncer
- Port 6543
- Requires:
  - pgbouncer=true
  - statement_cache_size=0
- Secrets managed via Fly

⚠️ Never reuse production DATABASE_URL locally.
