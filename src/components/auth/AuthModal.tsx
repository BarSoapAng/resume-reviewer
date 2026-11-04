import { useEffect, useRef, useState } from "react";
import { colors, fontSize, spacing, radius, alpha, Body } from "../../lib/style";
import { Input } from "../base/Input";
import { Button } from "../base/Button";
import { Form } from "../base/Form";
import styled from "styled-components";
import { PanelTitle } from "../typography/PanelTitle";
import { TextButton } from "../base/TextButton";
import type { WorkspaceModel } from "../../hooks/useResumeWorkspace";
import { signIn } from "../../lib/supabase";

export function AuthModal({ model }: { model: Pick<WorkspaceModel,
  "authEmail" | "authMessage" | "emailSignIn" | "authOpen" | "githubOAuthEnabled" | "googleOAuthEnabled" | "setAuthEmail" | "setAuthOpen"
> }) {
  const { authEmail, authMessage, emailSignIn, authOpen, githubOAuthEnabled, googleOAuthEnabled, setAuthEmail, setAuthOpen } = model;
  const dialog = useRef<HTMLElement>(null);
  const [providerError, setProviderError] = useState(false);
  useEffect(() => {
    if (!authOpen) return;
    const previous = document.activeElement as HTMLElement | null;
    const element = dialog.current;
    const controls = () => Array.from(element?.querySelectorAll<HTMLElement>('button:not(:disabled), input:not(:disabled), [tabindex="0"]') ?? []);
    (controls()[0] ?? element)?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") { event.preventDefault(); setAuthOpen(false); }
      if (event.key !== "Tab") return;
      const items = controls();
      const first = items[0];
      const last = items[items.length - 1];
      if (event.shiftKey && (document.activeElement === first || document.activeElement === element)) { event.preventDefault(); last?.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
    };
    document.addEventListener("keydown", onKeyDown);
    const siblings = Array.from(element?.parentElement?.parentElement?.children ?? []).filter((item): item is HTMLElement => item instanceof HTMLElement && item !== element?.parentElement);
    const previousInert = siblings.map((item) => item.inert);
    siblings.forEach((item) => { item.inert = true; });
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      siblings.forEach((item, index) => { item.inert = previousInert[index]; });
      previous?.focus();
    };
  }, [authOpen, setAuthOpen]);
  if (!authOpen) return null;
  const oauth = async (provider: "google" | "github") => {
    setProviderError(false);
    try { await signIn(provider); } catch { setProviderError(true); }
  };
  return (
    <ModalBackdrop role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setAuthOpen(false); }}>
      <AuthDialog ref={dialog} tabIndex={-1} aria-labelledby="auth-title" role="dialog" aria-modal="true">
        <PanelTitle id="auth-title">Sign in</PanelTitle>
        {googleOAuthEnabled && <GoogleButton type="button" onClick={() => void oauth("google")} aria-label="Sign in with Google"><img src="https://developers.google.com/static/identity/gsi/web/images/standard-button-white.png" alt="Sign in with Google" /></GoogleButton>}
        {githubOAuthEnabled && <AuthButton type="button" onClick={() => void oauth("github")}>Continue with GitHub</AuthButton>}
        {(googleOAuthEnabled || githubOAuthEnabled) && <AuthDivider>or</AuthDivider>}
        <AuthActions onSubmit={(event) => { event.preventDefault(); if (authEmail.trim()) void emailSignIn(); }}>
          <AuthEmailInput aria-label="Email address" autoComplete="email" onChange={(event) => setAuthEmail(event.target.value)} placeholder="you@example.com" type="email" value={authEmail} required />
          <AuthButton disabled={!authEmail.trim()} type="submit">Email me a sign-in link</AuthButton>
          {authMessage && <AuthMessage role="status">{authMessage === "Check your email for a secure sign-in link." ? authMessage : "We couldn’t send a sign-in link. Please try again."}</AuthMessage>}
        </AuthActions>
        {providerError && <AuthMessage role="alert">We couldn’t open sign-in. Please try again.</AuthMessage>}
        <TextButton onClick={() => setAuthOpen(false)}>Not now</TextButton>
      </AuthDialog>
    </ModalBackdrop>
  );
}

const ModalBackdrop = styled.div`position: fixed; z-index: 50; inset: 0; display: grid; place-items: center; padding: ${spacing.md}; background: ${alpha(colors.paper[900], 0.48)};`;
const AuthDialog = styled.section`display: grid; width: min(100%, ${spacing["10xl"]}); max-height: calc(100dvh - 32px); overflow-y: auto; gap: ${spacing.sm}; padding: ${spacing.lg}; border-radius: ${radius.lg}; background: ${colors.paper[0]}; box-shadow: 0 ${spacing.lg} ${spacing["4xl"]} ${alpha(colors.paper[900], 0.25)};`;
const AuthActions = styled(Form)`display: grid; gap: ${spacing.xs};`;
const AuthMessage = styled(Body)`margin: 0; font-size: ${fontSize.xs}; line-height: 1.4; overflow-wrap: anywhere;`;
const AuthDivider = styled.div`display: flex; align-items: center; gap: ${spacing.xs}; color: ${colors.paper[600]}; font-size: ${fontSize.xxs}; &::before, &::after { height: 1px; flex: 1; background: ${colors.paper[300]}; content: ""; }`;
const AuthButton = styled(Button)`min-height: ${spacing.xxl}; border: 1px solid ${colors.paper[400]}; border-radius: ${radius.sm}; color: ${colors.paper[900]}; background: ${colors.paper[0]}; font-size: ${fontSize.xs}; font-weight: 700; &:hover { border-color: ${colors.forest[600]}; background: ${colors.forest[100]}; }`;
// Official pre-approved artwork; preserve the supplied aspect ratio and Supabase OAuth.
const GoogleButton = styled(Button)`display: flex; width: fit-content; max-width: 100%; padding: 0; border: 0; background: white; border-radius: 4px; img { display: block; height: 40px; width: auto; max-width: 100%; object-fit: contain; } &:focus-visible { outline: 2px solid ${colors.forest[600]}; outline-offset: 2px; }`;
const AuthEmailInput = styled(Input)`min-width: 0; width: 100%; min-height: ${spacing.xxl}; padding: 0 ${spacing.sm}; border: 1px solid ${colors.paper[400]}; border-radius: ${radius.sm}; color: ${colors.paper[900]}; background: ${colors.paper[0]}; font-size: ${fontSize.xs};`;
