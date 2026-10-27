# EduAI — Ollama bilan ishlaydigan AI ustoz

Telefon va kompyuterda bir xil ishlaydigan o‘quv platformasi: AI ustoz (Ollama), mini-testlar, haftalik reja, Supabase orqali kirish va natijalarni saqlash.

## Papkalar tuzilishi (muhim!)

```text
EduAI/
├── public/        index.html, style.css, app.js, config.js
├── config/        supabase.js
├── routes/        aiRoutes.js, userRoutes.js
├── supabase/      schema.sql
├── .env.example
├── .gitignore
├── package.json
└── server.js
```

Fayllar aynan shu papkalarda bo‘lishi kerak, aks holda `import` xato beradi.

## Ishga tushirish

```bash
npm install
cp .env.example .env     # Windows: copy .env.example .env
npm start
```

`.env` ichida kamida shuni to‘ldiring:

```env
OLLAMA_API_KEY=sizning_ollama_kalitingiz
OLLAMA_MODEL=gpt-oss:120b
```

Kalitni https://ollama.com/settings/keys sahifasidan olasiz. Uni faqat `.env` ga yozing; `public/` ichiga va GitHub’ga qo‘ymang.

`http://localhost:3000` ni oching. Holatni `http://localhost:3000/api/health` da ko‘rasiz.

## Telefondan sinash

Kompyuter va telefon bir xil Wi-Fi’da bo‘lsin. Server ishga tushganda yozilgan manzilni (`http://<kompyuter-IP>:3000`) telefon brauzerida oching.

## Muhim sozlamalar (.env)

- `OLLAMA_MODEL` — cloud API’da modelni `:cloud` qo‘shimchasisiz yozing (`gpt-oss:120b`, `gpt-oss:20b`). Ro‘yxat: https://ollama.com/search?c=cloud
- `REQUIRE_LOGIN=true` — AI ustozdan faqat tizimga kirganlar foydalanadi (xarajatdan himoya).
- `TRUST_PROXY=1` — Render/Railway/Nginx orqasida (productionda avtomatik 1).
- `APP_ORIGIN` — odatda bo‘sh qoldiring.

## Supabase

1. `supabase/schema.sql` ni Supabase SQL Editor’da bajaring (test natijalari uchun jadval).
2. `.env` ga `SUPABASE_URL` va `SUPABASE_ANON_KEY` ni kiriting.
3. `public/config.js` ga shu URL va public (publishable) kalitni kiriting. `service_role` kalitni hech qachon qo‘ymang.

## API yo‘llari

- `GET /api/health`
- `POST /api/ai/chat` — `{ "message": "...", "history": [] }`
- `GET /api/users/me` — Bearer token bilan
