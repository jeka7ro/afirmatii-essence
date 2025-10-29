# PROBLEMA: PostgreSQL Free Plan

PostgreSQL Free pe Render se resetează la fiecare restart de serviciu!

**De ce?**
- Free tier-ul nu păstrează datele între deploay-uri
- Service-ul se restartează când:
  - L-ai redeploy-at
  - Render face auto-update
  - Service-ul e inactiv > 15 minute (sleep)

**Ce s-a întâmplat?**
- Utilizatorul "Eugen" a fost pierdut pentru că baza se resetează

**Soluții:**

1. **PAID PLANS** (Recomandat pentru production)
   - $20/lună pentru PostgreSQL persistent
   - Datele NU se mai pierd la niciodată

2. **SQLite + Backup** (Deja implementat, gratuit)
   - Folosește SQLite în /tmp
   - Backup automat la 6 ore
   - Mai ușor pentru început

3. **Manual Re-creation**
   - Creez utilizatorul când spui
   - Dar se pierde la următorul restart

**Acțiune urgentă:**
Șterge variabila `DATABASE_URL` din Environment pentru a folosi SQLite cu backup automat!

