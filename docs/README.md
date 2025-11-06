# CSU Server

Central Sync & Update Server to connect local terminals and bidirectionally sync local and remote PostgreSQL databases.

## Features
- Swagger API docs at `/api-docs`
- Modular structure: controllers, routes, services
- Auth (JWT), mailer (nodemailer)
- Sync module: cron-based hourly or socket-based realtime (configurable)
- Error handling middleware

## Configuration
Create `.env` with at least:
```
PORT=4000
JWT_SECRET=replace_me
POSTGRES_URL_LOCAL=postgresql://user:pass@localhost:5432/localdb?schema=public
POSTGRES_URL_REMOTE=postgresql://user:pass@host:5432/remotedb?schema=public
SYNC_MODE=cron
SYNC_CRON=0 * * * *
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=
SMTP_PASS=
MAIL_FROM=no-reply@example.com
```

## Run
```
npm run dev
# or
npm start
```

## Sync Modes
- cron: runs on schedule from `SYNC_CRON` (default hourly)
- socket: use Socket.IO; terminals emit `sync:request` and receive `sync:result`

## TODO
- Implement per-table incremental sync with `sync_logs` checkpoints
- Conflict resolution policy
- Role-based auth
