import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

const email = "creator1@example.com";
const password = "password123";

const { data, error } = await supabase.auth.signInWithPassword({
  email,
  password,
});

if (error) {
  console.error("Login error:", error);
} else {
  console.log("ACCESS TOKEN:", data.session.access_token);
  console.log("USER ID:", data.user.id);
}
