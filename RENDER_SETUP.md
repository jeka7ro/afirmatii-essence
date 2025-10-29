# Render Setup Instructions

## PostgreSQL Configuration (PERSISTENT)

1. Go to [Render Dashboard](https://dashboard.render.com)
2. Find your service: `essence-afirmatii-api`
3. Click **Environment**
4. Add this environment variable:

### Variable: `DATABASE_URL`
- **Value**: Copy from your PostgreSQL database connection string
  - If you don't have PostgreSQL: Create one via Render Dashboard → New → PostgreSQL
  - The connection string looks like: `postgresql://user:pass@host:port/dbname`

### After adding DATABASE_URL:
1. Go to **Manual Deploy** → Deploy latest commit
2. Wait for deployment to finish
3. Data will now persist permanently!

## Alternative: SQLite (Can lose data on restart)

If you don't set `DATABASE_URL`, it will use SQLite in `/tmp` which may be lost on restart.

## Why PostgreSQL?

- ✅ Data NEVER lost
- ✅ Survives restarts
- ✅ Scalable for 30+ users
- ✅ Professional database

## Current Status

Check if `DATABASE_URL` is set in your Render environment variables.
If NO → Your data will be lost on restart
If YES → Your data is permanent!


