# Set DATABASE_URL pe Render

## Pas 1: Creează PostgreSQL Database pe Render

1. Mergi la: https://dashboard.render.com
2. Click pe butonul **"+ New"** (sus, dreapta)
3. Selectează **"PostgreSQL"**
4. Completează:
   - **Name**: `afirmatii-postgres`
   - **Database**: `afirmatii_db`
   - **User**: (lasă default)
   - **Region**: `Frankfurt` (sau cel mai apropiat)
   - **PostgreSQL Version**: `16` (sau cel mai nou)
   - **Plan**: `Free` (dacă vrei gratis)
5. Click **"Create Database"**
6. Așteaptă ~1 minut până se creează (Status: Available)

## Pas 2: Copiază Connection String

1. După ce se creează, click pe numele bazei: `afirmatii-postgres`
2. Mergi la secțiunea **"Connections"** sau **"Info"**
3. Găsește **"Internal Database URL"**
4. Arată așa:
   ```
   postgresql://afirmatii_db_user:abc123xyz@dpg-xxxxx-a.frankfurt-postgres.render.com/afirmatii_db
   ```
5. **Copiază întregul string** (include `postgresql://`)

## Pas 3: Adaugă în aplicația ta (essence-afirmatii-api)

1. Mergi la service-ul tău: https://dashboard.render.com → `essence-afirmatii-api`
2. Click pe tab **"Environment"**
3. Click **"+ Add Environment Variable"**
4. Completează:
   - **Key**: `DATABASE_URL`
   - **Value**: (paste connection string-ul copiat)
5. Click **"Save Changes"**

## Pas 4: Deploy

1. Click pe tab **"Manual Deploy"**
2. Click **"Deploy latest commit"**
3. Așteaptă ~5 minute până se deploy-ează
4. Click **"View Logs"** pentru a verifica că nu sunt erori
5. GATA! Datele nu se mai pierd! ✅

## Verificare

După deploy, verifică în logs:
```
Connecting to PostgreSQL...
Database initialized successfully!
```

Dacă vezi asta → Perfect! Database-ul e persistent!

## Important

- **NU mai șterge** variabila `DATABASE_URL`!
- **NU mai șterge** PostgreSQL-ul creat!
- Datele vor fi salvate PERMANENT acum!

## Dacă ai probleme

**Eroare**: "relation does not exist"
- **Fix**: Creează manual tabelele în PostgreSQL sau verifică logs pentru erori de init

**Eroare**: "connection refused"
- **Fix**: Verifică că ai copiat corect connection string-ul și că e folosit **"Internal Database URL"**

## Exemplu Connection String

```
postgresql://afirmatii_db_user:ABC123xyz789@dpg-abc123def456-a.frankfurt-postgres.render.com/afirmatii_db?sslmode=require
```

Copiază EXACT string-ul de deasupra în variabila DATABASE_URL!


