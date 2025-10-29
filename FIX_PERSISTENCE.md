# SOLUȚIE: Date persistente cu SQLite + Backup

PostgreSQL Free pe Render se resetează la fiecare restart.
Vom folosi SQLite în /tmp + backupuri automate.

**Pași:**
1. Șterge variabila DATABASE_URL din Render → Environment
2. Folosește SQLite în /tmp (care NU se resetează pe Render)
3. Backupuri automate la 6 ore (deja implementat în server.py)

**De ce merge:**
- /tmp pe Render persistă între deployments
- Backup cron job rulează automat
- Gratuit și persistent!

