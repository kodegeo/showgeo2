import { createClient } from "@supabase/supabase-js";

// --------------------------------------------------
// 🔐 Load env vars (Vite style)
// --------------------------------------------------
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

console.log("♻️ [supabase.ts] Initializing Supabase client...");
console.log("   URL:", supabaseUrl);
console.log("   ANON KEY (first 8):", supabaseAnonKey?.slice(0, 8) + "...");

if (!supabaseUrl || !supabaseAnonKey) {
  console.error(
    "❌ [supabase.ts] Missing Supabase environment variables. " +
      "Ensure VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are set in .env"
  );
  throw new Error("Missing Supabase environment variables");
}

// --------------------------------------------------
// 🏗 Create a single, shared Supabase client
// --------------------------------------------------
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  global: {
    headers: {
      // ✅ Critical: ensure every request sends a valid apikey header
      apikey: supabaseAnonKey,
    },
  },
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});

console.log("[supabase.ts] Supabase client created successfully.");

// --------------------------------------------------
// 🧪 Optional: tiny helper to sanity-check auth
// --------------------------------------------------
export async function debugSupabaseAuthPing() {
  console.log("🔎 [supabase.ts] debugSupabaseAuthPing()");
  try {
    const { data, error } = await supabase.auth.getSession();
    console.log("   ▶ getSession data:", data);
    console.log("   ▶ getSession error:", error);
  } catch (err) {
    console.error("   💥 getSession threw:", err);
  }
}


