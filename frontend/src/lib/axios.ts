import axios from "axios";
import { supabase } from "@/lib/supabase";
import { getRestApiBaseUrl } from "@/lib/apiBase";

export const api = axios.create({
  baseURL: getRestApiBaseUrl(),
  withCredentials: true,
});

// Some files may import default; support both:
export default api;

// Attach token to every request
api.interceptors.request.use(async (config) => {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;

  config.headers = config.headers ?? {};

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  } else {
    // ensure we don't send a stale header
    delete (config.headers as any).Authorization;
  }

  return config;
});

