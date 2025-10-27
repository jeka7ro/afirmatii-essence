# ✨ Afirmatii Essence Advanced

Aplicație web premium pentru perseverență și afirmații pozitive cu backend real, sincronizare multi-user și panou de administrare complet.

## 🚀 Deployment Online

### Metodă Rapidă (Recomandată)

1. **Backend (Render.com)**
   - Crează cont pe [Render.com](https://render.com)
   - New → Web Service
   - Conectează cu GitHub repo
   - Build Command: `pip install -r requirements.txt`
   - Start Command: `gunicorn server:app`
   - Environment: `PYTHON_VERSION=3.9.0`
   - URL va fi: `https://afirmatii-backend.onrender.com`

2. **Frontend (Vercel.com)**
   - Crează cont pe [Vercel.com](https://vercel.com)
   - Import Git Repository
   - Framework Preset: **Other**
   - Nu modifică setările
   - Deploy!

3. **Update API URL**
   - După deployment backend, editează `app.js` linia 75:
   ```javascript
   const API_URL = 'https://YOUR-RENDER-URL.onrender.com/api';
   ```
   - Re-deploy pe Vercel

## 🎯 Caracteristici

### ✅ Complet Funcțional
- **Multi-User**: Suporți până la 30 de utilizatori
- **Înregistrare**: Email obligatoriu, PIN 4 cifre, număr telefon, data naștere, avatar
- **Resetare PIN**: Prin email cu cod de 6 cifre
- **Super Admin**: Eugen (jeka7ro@gmail.com) poate crea grupuri
- **Sistem Grupuri**: Cod secret pentru acces
- **Mobile Optimized**: Layout responsive pentru telefoane
- **Buton Istoric**: "+" pentru afișare/ascundere repetări
- **Chat Grupuri**: Comunicare între membrii grupului

### 🔐 Securitate
- Autentificare cu PIN
- Email obligatoriu
- Date personale private (afirmația nu e publică)
- Coduri secrete pentru grupuri
- Resetare sigură PIN

### 📱 Mobile First
- Responsive design
- Touch-friendly buttons
- Optimizat pentru ecrane mici
- Logo Essence adaptiv

## 📊 Structură

### Backend (server.py)
- Flask API cu SQLite
- Endpoints pentru: users, groups, messages, activities
- Super admin protection
- Database persistence

### Frontend (index.html + app.js + styles.css)
- HTML5 cu web components
- JavaScript ES6+
- Responsive CSS
- Real-time updates

## 🛠️ Development Local

```bash
# Backend
cd /Users/eugeniucazmal/dev/afirmatii
python3 server.py
# Rulează pe http://localhost:3000

# Frontend
python3 -m http.server 8000
# Accesează http://localhost:8000
```

## 📝 Deployment Notes

- Backend: [Render.com](https://render.com) - Python Flask
- Frontend: [Vercel.com](https://vercel.com) - Static hosting
- Database: SQLite (local) sau PostgreSQL (production)
- Logo: Essence Advanced (logo-essence-int.png)
- Super Admin: jeka7ro@gmail.com
