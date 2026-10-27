import { createClient } from "@supabase/supabase-js";

const url = process.env.SUPABASE_URL;
const anonKey = process.env.SUPABASE_ANON_KEY;

export const supabaseConfigured = Boolean(url && anonKey);

const baseOptions = {
  auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false }
};

// Umumiy (anon) mijoz: faqat tokenni tekshirish uchun.
export const supabase = supabaseConfigured ? createClient(url, anonKey, baseOptions) : null;

// Foydalanuvchi nomidan ishlaydigan mijoz: barcha so'rovlar RLS qoidalaridan o'tadi.
// service_role kaliti kerak emas va ishlatilmaydi.
export function createUserClient(token) {
  if (!supabaseConfigured || !token) return null;
  return createClient(url, anonKey, {
    ...baseOptions,
    global: { headers: { Authorization: `Bearer ${token}` } }
  });
}

export function bearerToken(req) {
  const header = req.headers.authorization || "";
  return header.startsWith("Bearer ") ? header.slice(7).trim() : "";
}

export async function getUserFromToken(token) {
  if (!supabase || !token) return null;
  const { data, error } = await supabase.auth.getUser(token);
  return error || !data?.user ? null : data.user;
}
