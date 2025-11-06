# Environment Variables Configuration

This document lists all environment variables required for the application.

## Database Configuration

```env
# PostgreSQL (Remote Database)
POSTGRES_URL_REMOTE=postgresql://user:password@host:5432/database
# Alternative (fallback)
POSTGRES_URL=postgresql://user:password@host:5432/database

# SQLite (Local Database)
SQLITE_PATH_LOCAL=file:./prisma/payflow.db
```

## Auth Module Configuration

```env
# SMTP Configuration
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your@gmail.com
SMTP_PASS=your_app_password
MAIL_FROM=your@gmail.com

# OTP Configuration
OTP_EXPIRE_MINUTES=10

# Password Configuration
PASSWORD_MIN_LENGTH=8

# JWT Configuration
JWT_SECRET=your_generated_secret
JWT_EXPIRES_IN=7d
```

## Sync Module Configuration

```env
# Sync Batch Sizes
SYNC_PULL_BATCH_SIZE=500
SYNC_PUSH_BATCH_SIZE=100

# Retry Configuration
SYNC_MAX_RETRIES=3
SYNC_RETRY_DELAY_MS=5000

# Timeout Configuration
SYNC_TIMEOUT_MS=30000

# Queue Configuration
SYNC_QUEUE_LIMIT=100
SYNC_QUEUE_PRIORITY_DEFAULT=5

# Sync Control
SYNC_ENABLED=true

# Sync Schedule (Cron Expression)
SYNC_INTERVAL=0 * * * *
SYNC_TIMEZONE=UTC

# Logging
SYNC_LOG_ENABLED=true

# Models to Sync (optional - comma-separated, uses default if not set)
# SYNC_MODELS=Customer,Product,SaleOrder,Payment,Discount
```

## Server Configuration

```env
# Server Port
PORT=4000

# Node Environment
NODE_ENV=development
```

## Complete .env Example

```env
# ============================================
# DATABASE CONFIGURATION
# ============================================
POSTGRES_URL_REMOTE=postgresql://user:password@host:5432/database
SQLITE_PATH_LOCAL=file:./prisma/payflow.db

# ============================================
# AUTH MODULE CONFIGURATION
# ============================================
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your@gmail.com
SMTP_PASS=your_app_password
MAIL_FROM=your@gmail.com
OTP_EXPIRE_MINUTES=10
PASSWORD_MIN_LENGTH=8
JWT_SECRET=your_generated_secret_here_change_in_production
JWT_EXPIRES_IN=7d

# ============================================
# SYNC MODULE CONFIGURATION
# ============================================
SYNC_PULL_BATCH_SIZE=500
SYNC_PUSH_BATCH_SIZE=100
SYNC_MAX_RETRIES=3
SYNC_RETRY_DELAY_MS=5000
SYNC_TIMEOUT_MS=30000
SYNC_QUEUE_LIMIT=100
SYNC_QUEUE_PRIORITY_DEFAULT=5
SYNC_ENABLED=true
SYNC_INTERVAL=0 * * * *
SYNC_TIMEZONE=UTC
SYNC_LOG_ENABLED=true
# SYNC_MODELS=Customer,Product,SaleOrder,Payment,Discount,ReturnOrder,Category,Brand,InventoryItem,StockAdjustment,StockTransfer,ParkedOrder,Shift,TaxCategory,TaxRate

# ============================================
# SERVER CONFIGURATION
# ============================================
PORT=4000
NODE_ENV=development
```

## Notes

- All sync-related environment variables are optional and have sensible defaults
- The sync module will work without any environment variables configured
- To disable sync completely, set `SYNC_ENABLED=false`
- To disable logging, set `SYNC_LOG_ENABLED=false`
- To disable timeouts, set `SYNC_TIMEOUT_MS=0`
- The sync interval uses standard cron syntax
- All numeric values should be provided as numbers (no quotes)
- For Gmail SMTP, use an App Password (2FA required)
- Generate a strong JWT_SECRET for production use

