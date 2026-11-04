import { useEffect, useState } from "react";
import { signInWithEmail, watchSession } from "../lib/supabase";

export function useAuth() {
  const [authOpen, setAuthOpen] = useState(false);
  const [authEmail, setAuthEmail] = useState("");
  const [authMessage, setAuthMessage] = useState<string>();
  const [userEmail, setUserEmail] = useState<string>();
  useEffect(() => watchSession((session) => setUserEmail(session?.user.email)), []);
  const emailSignIn = async () => {
    setAuthMessage(undefined);
    try {
      await signInWithEmail(authEmail.trim());
      setAuthMessage("Check your email for a secure sign-in link.");
    } catch (error) {
      setAuthMessage(error instanceof Error ? error.message : "Could not send the sign-in link.");
    }
  };
  return { authOpen, setAuthOpen, authEmail, setAuthEmail, authMessage, userEmail, emailSignIn };
}
