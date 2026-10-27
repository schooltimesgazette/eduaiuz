import "dotenv/config";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import path from "node:path";
import { fileURLToPath } from "node:url";
import aiRoutes from "./routes/aiRoutes.js";
import userRoutes from "./routes/userRoutes.js";
import { supabaseConfigured } from "./config/supabase.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const port = Number(process.env.PORT || 3000);
const isProd = process.env.NODE_ENV === "production";

// Render / Railway / Nginx orqasida rate limit to'g'ri IP ko'rishi uchun.
// Productionda default 1, lokalda 0. Kerak bo'lsa TRUST_PROXY=0 yoki 1 deb o'zgartiring.
const trustProxy = Number(process.env.TRUST_PROXY ?? (isProd ? 1 : 0));
if (trustProxy) app.set("trust proxy", trustProxy);

app.use(helmet({
  contentSecurityPolicy: {
    useDefaults: true,
    directives: {
      "default-src": ["'self'"],
      "script-src": ["'self'", "https://cdn.jsdelivr.net"],
      "style-src": ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      "font-src": ["'self'", "https://fonts.gstatic.com", "data:"],
      "connect-src": ["'self'", "https://*.supabase.co", "wss://*.supabase.co"],
      "img-src": ["'self'", "data:", "https:"],
      // http://localhost yoki lokal tarmoqda (telefon orqali) Safari/Chrome sahifani buzmasligi uchun
      "upgrade-insecure-requests": isProd ? [] : null
    }
  }
}));

// Boshqa domen so'rovlarida CORS sarlavhalari berilmaydi; xato (500) qaytarilmaydi.
// Bir xil domen (telefon/IP orqali ochilgan sayt ham) har doim ishlaydi.
const allowedOrigin = process.env.APP_ORIGIN;
app.use(cors({
  origin(origin, callback) {
    callback(null, !origin || !allowedOrigin || origin === allowedOrigin);
  }
}));

app.use(express.json({ limit: "30kb" }));
app.use("/api/ai", rateLimit({
  windowMs: 60 * 1000,
  limit: 20,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: { error: "Juda ko‘p so‘rov yuborildi. Biroz kutib qayta urinib ko‘ring." }
}));

app.get("/api/health", (_req, res) => {
  res.json({
    ok: true,
    app: "EduAI",
    supabaseConfigured,
    aiConfigured: Boolean(process.env.OLLAMA_API_KEY),
    model: process.env.OLLAMA_MODEL || "gpt-oss:120b",
    requireLogin: process.env.REQUIRE_LOGIN === "true"
  });
});
app.use("/api/ai", aiRoutes);
app.use("/api/users", userRoutes);
app.use("/api", (_req, res) => res.status(404).json({ error: "Yo‘l topilmadi." }));

app.use(express.static(path.join(__dirname, "public"), { maxAge: isProd ? "1h" : 0 }));
app.get("/{*splat}", (_req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

app.use((err, _req, res, _next) => {
  const status = err.status || err.statusCode || 500;
  if (status >= 500) console.error(err.message);
  const known = status >= 400 && status < 500;
  res.status(known ? status : 500).json({
    error: status === 413 ? "So‘rov juda katta."
      : known ? "Noto‘g‘ri so‘rov."
      : "Kutilmagan server xatosi."
  });
});

app.listen(port, "0.0.0.0", () => {
  console.log(`EduAI ishlayapti: http://localhost:${port}`);
  console.log(`Telefondan ochish uchun: http://<kompyuter-IP-manzili>:${port} (bir xil Wi-Fi)`);
  console.log(`AI (Ollama): ${process.env.OLLAMA_API_KEY ? "sozlangan" : "sozlanmagan"} · model: ${process.env.OLLAMA_MODEL || "gpt-oss:120b"}`);
  console.log(`Supabase: ${supabaseConfigured ? "sozlangan" : "sozlanmagan"}`);
});
