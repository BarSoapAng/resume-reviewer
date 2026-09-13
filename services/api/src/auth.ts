import { createClient } from "@supabase/supabase-js";
import type { Authenticator } from "./ports.js";

export function createSupabaseAuthenticator(url: string, publishableKey: string): Authenticator {
  const client = createClient(url, publishableKey, { auth: { persistSession: false, autoRefreshToken: false } });
  return {
    async authenticate(token) {
      const { data, error } = await client.auth.getUser(token);
      if (error || !data.user?.email) return null;
      return { userId: data.user.id, email: data.user.email.toLowerCase() };
    },
  };
}
