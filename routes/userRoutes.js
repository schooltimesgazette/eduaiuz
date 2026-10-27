import { Router } from "express";
import { supabase, supabaseConfigured } from "../config/supabase.js";

const router = Router();

// The browser signs users in with Supabase Auth. This route verifies a session token
// without ever exposing a service-role key.
router.get("/me", async (req, res) => {
  if (!supabaseConfigured) {
    return res.status(503).json({ error: "Supabase hali sozlanmagan." });
  }

  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : "";
  if (!token) return res.status(401).json({ error: "Kirish tokeni topilmadi." });

  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data?.user) {
    return res.status(401).json({ error: "Sessiya yaroqsiz yoki muddati tugagan." });
  }

  res.json({
    user: {
      id: data.user.id,
      email: data.user.email,
      created_at: data.user.created_at
    }
  });
});

export default router;
