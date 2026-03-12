# 🛡️ מקלט רעננה – מוניטור התראות פיקוד העורף

דף ניטור בזמן אמת של התראות פיקוד העורף בעיר רעננה.  
מציג רמזור אדום/צהוב/ירוק, שעון, וטיימר שהייה במקלט.

---

## 🏗️ ארכיטקטורה

```
GitHub Pages (index.html)  →  Render.com (server.js)  →  oref.org.il
```

- **Frontend** – מתארח חינם ב-GitHub Pages
- **Backend** – שרת Node.js מתארח חינם ב-Render.com
- **Render** עושה את הקריאה ל-oref.org.il מצד השרת (עוקף CORS)

---

## 🚀 הוראות העלאה

### שלב 1 – GitHub

1. היכנס ל-[github.com](https://github.com) וצור חשבון אם אין לך
2. לחץ **New repository**
3. שם: `oref-raanana`  
4. בחר **Public**
5. לחץ **Create repository**
6. העלה את כל הקבצים (גרור לתוך הדף, או השתמש ב-git):

```bash
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/oref-raanana.git
git push -u origin main
```

---

### שלב 2 – Render.com (שרת Node.js חינמי)

1. היכנס ל-[render.com](https://render.com) (חינמי, אין צורך בכרטיס אשראי)
2. לחץ **New → Web Service**
3. חבר את ה-GitHub repository שלך
4. הגדרות:
   | שדה | ערך |
   |-----|-----|
   | **Name** | `oref-raanana` |
   | **Environment** | `Node` |
   | **Build Command** | `npm install` |
   | **Start Command** | `node server.js` |
   | **Plan** | `Free` |
5. לחץ **Create Web Service**
6. המתן ~2 דקות לסיום ה-deploy
7. שמור את הכתובת שקיבלת: `https://oref-raanana.onrender.com`

---

### שלב 3 – עדכון ה-Frontend עם כתובת ה-Render

פתח את `public/index.html` ומצא את השורה:

```javascript
const API_BASE = window.__API_BASE__ || '';
```

שנה אותה ל:

```javascript
const API_BASE = 'https://oref-raanana.onrender.com';  // ← הכתובת שלך
```

כמובן שיש להחליף `oref-raanana` בשם שנתת ב-Render.

---

### שלב 4 – GitHub Pages (hosting לקובץ HTML)

1. ב-GitHub, לך ל-**Settings → Pages**
2. תחת **Source** בחר: `main` branch, תיקייה `/public`
3. לחץ **Save**
4. תוך כדקה תקבל כתובת כמו: `https://YOUR_USERNAME.github.io/oref-raanana`

---

## ✅ בדיקה

פתח את כתובת ה-GitHub Pages שלך בדפדפן.  
אם הכל תקין תראה:
- ✅ **ירוק** – מחובר, אין התראות
- ⏱ עדכון כל 60 שניות

לבדיקת ה-API ישירות:  
`https://YOUR-RENDER-URL.onrender.com/health`

---

## ⚙️ הגדרות

בקובץ `public/index.html` ניתן לשנות:

```javascript
const CITY        = 'רעננה';   // עיר לסינון
const SHELTER_SEC = 90;         // שניות שהייה מומלצות
const POLL_MS     = 60_000;     // דגימה במילישניות (60 שניות)
```

---

## 📋 מבנה הפרויקט

```
oref-raanana/
├── server.js          ← שרת Node.js (proxy ל-oref.org.il)
├── package.json       ← הגדרות Node.js
├── README.md          ← המדריך שאתה קורא
└── public/
    └── index.html     ← ממשק המשתמש
```

---

## 🔴 רמות ההתראה

| צבע | משמעות | תנאי |
|-----|--------|------|
| 🔴 אדום | **היכנסו למקלט!** | התראה פעילה כרגע ברעננה |
| 🟡 צהוב | **להתכונן** | הייתה התראה בפחות מ-90 שניות |
| 🟢 ירוק | **ניתן לצאת** | אין התראות אחרונות |

---

## 📝 הערות

- שרת Render בתוכנית חינמית "נרדם" אחרי 15 דקות של חוסר פעילות.  
  הדגימה הראשונה לאחר שינה עשויה לקחת עד 30 שניות.
- כדי למנוע שינה, ניתן להשתמש ב-[UptimeRobot](https://uptimerobot.com) (חינמי) לפינג כל 5 דקות.

---

נבנה עם ❤️ עבור תושבי רעננה
