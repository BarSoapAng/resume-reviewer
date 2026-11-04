import { createClient, type Provider, type Session } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL;
const publishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

export const supabase = url && publishableKey
  ? createClient(url, publishableKey, { auth: { persistSession: true, detectSessionInUrl: true } })
  : undefined;

export async function getSession(): Promise<Session | null> {
  if (!supabase) return null;
  return (await supabase.auth.getSession()).data.session;
}

export function watchSession(onSession: (session: Session | null) => void) {
  // Supabase emits INITIAL_SESSION after restoring storage or finishing OAuth.
  const subscription = supabase?.auth.onAuthStateChange((_event, session) => onSession(session));
  return () => subscription?.data.subscription.unsubscribe();
}

export async function signIn(provider: Extract<Provider, "github" | "google">) {
  if (!supabase) throw new Error("Supabase browser configuration is missing");
  const { error } = await supabase.auth.signInWithOAuth({
    provider,
    options: { redirectTo: window.location.origin },
  });
  if (error) throw error;
}

export async function signInWithEmail(email: string) {
  if (!supabase) throw new Error("Supabase browser configuration is missing");
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: { emailRedirectTo: window.location.origin },
  });
  if (error) throw error;
}

export async function signOut() {
  if (!supabase) return;
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}
