import { Form } from "./base/Form";
import styled from "styled-components";
import { Body, colors, textSize, typography } from "../lib/style";
import { PanelTitle } from "./PanelTitle";
import { PanelEyebrow } from "./PanelEyebrow";
import { AuthEmailInput } from "./base/AuthEmailInput";
import { AuthButton } from "./base/AuthButton";
import { ReviewerCopy } from "./ReviewerCopy";
import { TextButton } from "./base/TextButton";
import type { WorkspaceModel } from "../hooks/useResumeWorkspace";
import { signIn } from "../lib/supabase";

export function AuthModal({ model }: { model: WorkspaceModel }) {
  const { authEmail, authMessage, emailSignIn, authOpen, githubOAuthEnabled, googleOAuthEnabled, setAuthEmail, setAuthOpen } = model;
  return (
<>      {authOpen && (
        <ModalBackdrop role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setAuthOpen(false); }}>
          <AuthDialog aria-labelledby="auth-title" role="dialog" aria-modal="true">
            <PanelEyebrow>Save and review</PanelEyebrow>
            <PanelTitle id="auth-title">Sign in to start your AI review</PanelTitle>
            <ReviewerCopy>Your current draft will stay here while you sign in. Hosted reviews require one review entitlement.</ReviewerCopy>
            <AuthActions onSubmit={(event) => { event.preventDefault(); if (authEmail.trim()) void emailSignIn(); }}>
              <AuthEmailInput aria-label="Email address" autoComplete="email" onChange={(event) => setAuthEmail(event.target.value)} placeholder="you@example.com" type="email" value={authEmail} />
              <AuthButton disabled={!authEmail.trim()} type="submit">Email me a sign-in link</AuthButton>
              {authMessage && <AuthMessage role="status">{authMessage}</AuthMessage>}
              {(googleOAuthEnabled || githubOAuthEnabled) && <AuthDivider>or</AuthDivider>}
              {googleOAuthEnabled && <AuthButton type="button" onClick={() => void signIn("google")}>Continue with Google</AuthButton>}
              {githubOAuthEnabled && <AuthButton type="button" onClick={() => void signIn("github")}>Continue with GitHub</AuthButton>}
            </AuthActions>
            <TextButton onClick={() => setAuthOpen(false)}>Not now</TextButton>
          </AuthDialog>
        </ModalBackdrop>
      )}</>
  );
}

const ModalBackdrop = styled.div`
  ${typography.body}
  position: fixed;
  z-index: 50;
  inset: 0;
  display: grid;
  place-items: center;
  padding: 20px;
  background: ${colors.overlay};
`;

const AuthDialog = styled.section`
  ${typography.body}
  display: grid;
  width: min(100%, 390px);
  gap: 13px;
  padding: 24px;
  border-radius: 14px;
  background: ${colors.surfaceStrong};
  box-shadow: 0 24px 70px ${colors.modalShadow};
`;

const AuthActions = styled(Form)`
  ${typography.body}
  display: grid;
  gap: 8px;
  margin-top: 5px;
`;

const AuthMessage = styled(Body).attrs({ as: "p" })`
  ${typography.body}
  margin: 0;
  color: ${colors.forest};
  font-size: ${textSize.s11};
  line-height: 1.4;
`;

const AuthDivider = styled.div`
  ${typography.body}
  display: flex;
  align-items: center;
  gap: 8px;
  color: ${colors.inkMuted};
  font-size: ${textSize.s9};
  text-transform: uppercase;

  &::before, &::after { height: 1px; flex: 1; background: ${colors.border}; content: ""; }
`;
