import { Router } from "express";
import { supabase, supabaseConfigured } from "../config/supabase.js";

const router = Router();

const SYSTEM_PROMPT = `You are EduAI, a friendly educational tutor for school students.
Reply in the language used by the student, preferably Uzbek when unclear.
Explain step by step with age-appropriate language, examples, and a short practice question when useful.
Help students learn rather than simply do their work for them. Be accurate and admit uncertainty.
Do not request personal details.
Formatting: never use LaTeX or dollar signs. Write math in plain text with symbols (², √, ×, ÷, ≤, ≥, π).
Keep answers concise (usually under 250 words). You may use short lists, **bold** and simple tables.`;

const TIMEOUT_MS = 90_000;

router.post("/chat", async (req, res) => {
  try {
    const message = typeof req.body?.message === "string" ? req.body.message.trim() : "";
    const history = Array.isArray(req.body?.history) ? req.body.history : [];

    if (!message) return res.status(400).json({ error: "Savolingizni yozing." });
    if (message.length > 4000) {
      return res.status(413).json({ error: "Savol juda uzun. 4000 belgidan qisqaroq yozing." });
    }

    // Ixtiyoriy: faqat tizimga kirganlar uchun (REQUIRE_LOGIN=true)
    if (process.env.REQUIRE_LOGIN === "true") {
      if (!supabaseConfigured) {
        return res.status(503).json({ error: "Supabase hali sozlanmagan.", code: "AUTH_NOT_CONFIGURED" });
      }
      const header = req.headers.authorization || "";
      const token = header.startsWith("Bearer ") ? header.slice(7) : "";
      const { data, error } = token ? await supabase.auth.getUser(token) : { error: true };
      if (error || !data?.user) {
        return res.status(401).json({
          error: "Savol berish uchun avval tizimga kiring.",
          code: "LOGIN_REQUIRED"
        });
      }
    }

    const apiKey = process.env.OLLAMA_API_KEY;
    if (!apiKey) {
      return res.status(503).json({
        error: "AI API hali sozlanmagan. .env fayliga OLLAMA_API_KEY kiriting.",
        code: "AI_NOT_CONFIGURED"
      });
    }

    const host = (process.env.OLLAMA_HOST || "https://ollama.com").replace(/\/+$/, "");
    const model = process.env.OLLAMA_MODEL || "gpt-oss:120b";

    const safeHistory = history
      .filter((item) =>
        item &&
        ["user", "assistant"].includes(item.role) &&
        typeof item.content === "string" &&
        item.content.trim()
      )
      .slice(-8)
      .map((item) => ({ role: item.role, content: item.content.slice(0, 2000) }));

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

    let response, data;
    try {
      response = await fetch(`${host}/api/chat`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${apiKey}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          model,
          stream: false,
          messages: [
            { role: "system", content: SYSTEM_PROMPT },
            ...safeHistory,
            { role: "user", content: message }
          ],
          // gpt-oss kabi modellar "o'ylash" uchun ham token sarflaydi, shuning uchun limit katta
          options: { temperature: 0.5, num_predict: 2000 }
        }),
        signal: controller.signal
      });
      data = await response.json().catch(() => ({}));
    } catch (error) {
      if (error.name === "AbortError") {
        return res.status(504).json({ error: "AI juda uzoq javob bermadi. Qayta urinib ko‘ring." });
      }
      throw error;
    } finally {
      clearTimeout(timer);
    }

    if (!response.ok) {
      const detail = typeof data?.error === "string" ? data.error : data?.error?.message || "Unknown error";
      console.error("Ollama error:", response.status, detail);
      if (response.status === 429) {
        return res.status(429).json({ error: "AI xizmati hozir band yoki limit tugagan. Birozdan so‘ng urinib ko‘ring." });
      }
      if (response.status === 401 || response.status === 403) {
        return res.status(502).json({ error: "Ollama API kaliti noto‘g‘ri yoki ruxsat yo‘q. .env dagi OLLAMA_API_KEY ni tekshiring." });
      }
      if (response.status === 404) {
        return res.status(502).json({ error: `“${model}” modeli topilmadi. .env dagi OLLAMA_MODEL ni tekshiring.` });
      }
      return res.status(502).json({ error: "AI xizmatidan javob olishda muammo yuz berdi." });
    }

    const answer = data?.message?.content;
    if (typeof answer !== "string" || !answer.trim()) {
      return res.status(502).json({ error: "AI javobni tugata olmadi. Qayta urinib ko‘ring." });
    }

    res.json({ answer: answer.trim() });
  } catch (error) {
    console.error("AI route error:", error.message);
    res.status(500).json({ error: "Serverda xatolik yuz berdi." });
  }
});

export default router;
