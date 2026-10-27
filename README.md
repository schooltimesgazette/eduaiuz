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

1. `supabase/schema.sql` ni Supabase → SQL Editor’ga to‘liq joylab, **Run** bosing (bir necha marta ishga tushirsa ham bo‘ladi). U yaratadi:
   - `profiles` — ro‘yxatdan o‘tganda avtomatik yaratiladi
   - `learning_progress` — test natijalari
   - `chat_messages` — AI ustoz suhbat tarixi
   - `ai_usage` + `consume_ai_quota()` — kunlik AI limiti (standart 50, SQL ichidagi `v_limit` da o‘zgartiriladi)
   - `get_my_stats()`, `get_my_activity()` — statistika va seriya
   - barcha jadvallarda RLS: foydalanuvchi faqat o‘z ma’lumotini ko‘radi
2. `.env` ga `SUPABASE_URL` va `SUPABASE_ANON_KEY` ni kiriting.
3. `public/config.js` ga shu URL va public (publishable) kalitni kiriting. `service_role` kalitni hech qachon qo‘ymang.
4. Authentication → URL Configuration: Site URL va Redirect URL’larga saytingiz manzilini qo‘shing. Production uchun email tasdiqlashni yoqing.

## API yo‘llari

- `GET /api/health`
- `POST /api/ai/chat` — `{ "message": "...", "history": [] }`
- `GET /api/users/me` — Bearer token bilan
