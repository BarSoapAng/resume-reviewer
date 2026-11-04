import { colors, fontSize, spacing, radius, alpha, Body } from "../../lib/style";
import { Input } from "../base/Input";
import { Button } from "../base/Button";
import { Form } from "../base/Form";
import styled from "styled-components";
import { PanelTitle } from "../typography/PanelTitle";
import { PanelEyebrow } from "../typography/PanelEyebrow";
import { ReviewerCopy } from "../typography/ReviewerCopy";
import { TextButton } from "../base/TextButton";
import type { WorkspaceModel } from "../../hooks/useResumeWorkspace";
import { signIn } from "../../lib/supabase";

export function AuthModal({ model }: {
  model: Pick<WorkspaceModel,
    "authEmail" | "authMessage" | "emailSignIn" | "authOpen" | "githubOAuthEnabled" | "googleOAuthEnabled" | "setAuthEmail" | "setAuthOpen"
  >;
}) {
  const {
    authEmail,
    authMessage,
    emailSignIn,
    authOpen,
    githubOAuthEnabled,
    googleOAuthEnabled,
    setAuthEmail,
    setAuthOpen,
  } = model;
  if (!authOpen) return null;

  return (
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

  );
}

const ModalBackdrop = styled.div`
  position: fixed;
  z-index: 50;
  inset: 0;
  display: grid;
  place-items: center;
  padding: ${spacing.lg};
  background: ${alpha(colors.paper[900], 0.48)};
`;

const AuthDialog = styled.section`
  display: grid;
  width: min(100%, ${spacing["10xl"]});
  gap: ${spacing.sm};
  padding: ${spacing.lg};
  border-radius: ${radius.lg};
  background: ${colors.paper[0]};
  box-shadow: 0 ${spacing.lg} ${spacing["4xl"]} ${alpha(colors.paper[900], 0.25)};
`;

const AuthActions = styled(Form)`
  display: grid;
  gap: ${spacing.xs};
  margin-top: ${spacing.xxs};
`;

const AuthMessage = styled(Body).attrs({ as: "p" })`
  margin: 0;
  color: ${colors.forest[600]};
  font-size: ${fontSize.xs};
  line-height: 1.4;
`;

const AuthDivider = styled.div`
  display: flex;
  align-items: center;
  gap: ${spacing.xs};
  color: ${colors.paper[600]};
  font-size: ${fontSize.xxs};
  text-transform: uppercase;

  &::before, &::after { height: ${spacing.hairline}; flex: 1; background: ${colors.paper[300]}; content: ""; }
`;

const AuthButton = styled(Button)`
  min-height: ${spacing.xxl};
  border: ${spacing.hairline} solid ${colors.paper[400]};
  border-radius: ${radius.sm};
  color: ${colors.paper[900]};
  background: ${colors.paper[0]};
  font-size: ${fontSize.xs};
  font-weight: 700;

  &:hover { border-color: ${colors.forest[600]}; background: ${colors.forest[100]}; }
`;

const AuthEmailInput = styled(Input)`
  min-height: ${spacing.xxl};
  padding: 0 ${spacing.sm};
  border: ${spacing.hairline} solid ${colors.paper[400]};
  border-radius: ${radius.sm};
  color: ${colors.paper[900]};
  background: ${colors.paper[0]};
  font-size: ${fontSize.xs};
`;
