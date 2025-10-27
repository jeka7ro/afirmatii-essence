# 🚀 Deployment Rapid - Afirmatii Essence Advanced

## ✅ Repo GitHub
**URL**: https://github.com/jeka7ro/afirmatii-essence

## 1️⃣ Deploy Backend pe Render (5 minute)

1. Mergi la: https://dashboard.render.com
2. **New → Web Service**
3. **Connect a repository** → `jeka7ro/afirmatii-essence`
4. Setări:
   ```
   Name: afirmatii-backend
   Region: Frankfurt (sau cel mai apropiat)
   Branch: main
   Root Directory: /Users/eugeniucazmal/dev/afirmatii
   Runtime: Python 3
   Build Command: pip install -r requirements.txt
   Start Command: gunicorn server:app --bind 0.0.0.0:$PORT
   ```
5. **Environment Variables**: Lasă gol
6. **Create Web Service**
7. Așteaptă 2-3 minute → URL va fi: `https://afirmatii-backend-xxx.onrender.com`
8. Copiază URL-ul!

## 2️⃣ Deploy Frontend pe Vercel (2 minute)

1. Mergi la: https://vercel.com
2. **Add New Project**
3. **Import Git Repository** → `jeka7ro/afirmatii-essence`
4. Setări:
   ```
   Framework Preset: Other
   Root Directory: ./
   Build Command: (lasă gol - e static)
   Output Directory: ./
   ```
5. **Deploy** (nu pune environment variables acum)
6. URL va fi: `https://afirmatii-essence.vercel.app`

## 3️⃣ Linkează Backend cu Frontend (important!)

1. După ce ai URL-ul de la Render, editează local:
   ```bash
   # Editează app.js
   nano app.js
   # Sau în Cursor
   ```

2. Schimbă linia 74-76:
   ```javascript
   const API_URL = 'https://YOUR-RENDER-URL.onrender.com/api';
   ```
   (Înlocuiește `YOUR-RENDER-URL` cu URL-ul tău real de la Render)

3. Push:
   ```bash
   git add app.js
   git commit -m "Update API URL for production"
   git push
   ```

4. Vercel va re-deploy automat în 30 secunde!

## 🎯 Testare Online

1. Accesează URL-ul de la Vercel
2. Login cu Eugen / PIN: 1155
3. Click pe butonul **⚡ Admin**
4. Creează un grup
5. Testează funcționalitățile

## 📝 Notes

- ✅ Database SQLite persistă pe Render (disk storage)
- ✅ Frontend static pe Vercel (CDN global)
- ✅ All features work online
- ✅ Mobile optimized
- ✅ Logo Essence

**Live URL**: https://afirmatii-essence.vercel.app  
**Backend API**: https://afirmatii-backend-xxx.onrender.com

