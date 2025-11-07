# Prisma quick commands (PostgreSQL + SQLite)

## Setup
- `prisma.config.ts` auto-selects schema/URL:
  - With `--schema prisma/schema.sqlite.prisma` → uses `DATABASE_URL` (SQLite)
  - With `--schema prisma/schema.prisma` → uses `POSTGRES_URL_REMOTE` (Postgres)
  - Without `--schema`, it picks based on `DB_PROVIDER=sqlite` or presence of `POSTGRES_URL_REMOTE`.

### Env examples
- PowerShell
```powershell
$env:DATABASE_URL = "file:./cpos.db"
$env:POSTGRES_URL_REMOTE = "postgresql://user:pass@host:5432/db"
```
- Git Bash
```bash
export DATABASE_URL="file:./cpos.db"
export POSTGRES_URL_REMOTE="postgresql://user:pass@host:5432/db"
```

## Generate clients
```bash
# Postgres
npm run prisma:generate:pg

# SQLite
npm run prisma:generate:sqlite
```

## Push schema (no migrations)
```bash
# Postgres
npm run prisma:push:pg

# SQLite
npm run prisma:push:sqlite
```

## Migrations (recommended for Postgres)
```bash
npx prisma migrate dev --name <name>
```

## Studio & format
```bash
npx prisma studio
npx prisma format
```

## Notes
- SQLite does not support scalar lists; use `Json` or relation tables (already handled in `schema.sqlite.prisma`).
- If you see datasource mix-ups, ensure the right env var is set for the active schema.


