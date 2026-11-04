import { colors, fontSize, spacing, radius, breakpoints, fonts, shadows, Header, Body, Text, Label, Code } from "../lib/style";
import { Textarea } from "../components/base/Textarea";
import { Card } from "../components/base/Card";
import styled from "styled-components";
import { Brand } from "../components/brand/Brand";
import { QuietButton } from "../components/base/QuietButton";
import { PrimaryButton } from "../components/base/PrimaryButton";
import type { WorkspaceModel } from "../hooks/useResumeWorkspace";
import { Icon } from "../components/base/Icon";

export function LandingView({ model }: {
  model: Pick<WorkspaceModel,
    "createCheckpoint" | "landingFileInput" | "landingSource" | "setIsDemoResume" | "setLandingSource" | "setShowLanding" | "setSource" | "upload"
  >;
}) {
  const {
    createCheckpoint,
    landingFileInput,
    landingSource,
    setIsDemoResume,
    setLandingSource,
    setShowLanding,
    setSource,
    upload,
  } = model;
  return (
    <LandingShell>
      <LandingNav>
        <Brand />
        <LandingNote>Open source · No account needed to compile</LandingNote>
      </LandingNav>
      <LandingMain>
        <LandingEyebrow>For software & mechanical engineering students</LandingEyebrow>
        <LandingTitle>A technical resume reviewer that asks before it assumes.</LandingTitle>
        <LandingCopy>Compile your existing one-file LaTeX resume, understand what is weak, and turn verified details into stronger bullets.</LandingCopy>
        <ImportCard>
          <ImportTabs>Paste LaTeX or upload a <Code>.tex</Code> file</ImportTabs>
          <ImportTextarea aria-label="LaTeX resume source" onChange={(event) => setLandingSource(event.target.value)} placeholder="\\documentclass{article}\n..." value={landingSource} />
          <ImportActions>
            <QuietButton onClick={() => landingFileInput.current?.click()}><Icon name="upload" size={spacing[16]} /> Upload .tex</QuietButton>
            <input ref={landingFileInput} accept=".tex,text/plain" hidden onChange={(event) => upload(event.target.files?.[0])} type="file" />
            <PrimaryButton disabled={!landingSource.trim()} onClick={() => {
              setSource(landingSource);
              setIsDemoResume(false);
              createCheckpoint("Initial paste", landingSource);
              setShowLanding(false);
            }}>Review my resume <Icon name="arrow" size={spacing[16]} /></PrimaryButton>
          </ImportActions>
        </ImportCard>
        <LandingPrivacy>Your source stays in this browser until you choose to sign in and start an AI review.</LandingPrivacy>
      </LandingMain>
    </LandingShell>
  );
}

const LandingShell = styled.main`
  min-height: 100vh;
  color: ${colors.paper[900]};
  background: radial-gradient(circle at 50% 20%, ${colors.forest[100]}, ${colors.paper[200]} 42%);
`;

const LandingNav = styled.header`
  display: flex;
  height: ${spacing[64]};
  align-items: center;
  justify-content: space-between;
  padding: 0 ${spacing[24]};
  border-bottom: ${spacing[1]} solid ${colors.paper[300]};
  background: ${colors.paper[100]};
`;

const LandingNote = styled(Text).attrs({ as: "span" })`
  color: ${colors.paper[600]};
  font-size: ${fontSize[12]};

  @media (max-width: ${breakpoints.mobile}) { display: none; }
`;

const LandingMain = styled.section`
  display: grid;
  width: min(100% - ${spacing[32]}, ${spacing[768]});
  margin: 0 auto;
  padding: ${spacing[64]} 0;
  justify-items: center;
  text-align: center;
`;

const LandingEyebrow = styled(Label).attrs({ as: "div" })`
  color: ${colors.forest[600]};
  font-size: ${fontSize[12]};
  font-weight: 700;
  letter-spacing: 0.1em;
  text-transform: uppercase;
`;

const LandingTitle = styled(Header).attrs({ as: "h1" })`
  max-width: ${spacing[640]};
  margin: ${spacing[16]} 0 ${spacing[12]};
  font-family: ${fonts.heading};
  font-size: ${fontSize[48]};

  @media (max-width: ${breakpoints.mobile}) { font-size: ${fontSize[36]}; }
  line-height: 1.04;
  letter-spacing: -0.055em;
`;

const LandingCopy = styled(Body).attrs({ as: "p" })`
  max-width: ${spacing[640]};
  margin: 0;
  color: ${colors.paper[600]};
  font-size: ${fontSize[18]};
  line-height: 1.6;
`;

const ImportTabs = styled(Label).attrs({ as: "div" })`
  padding: ${spacing[2]} ${spacing[2]} ${spacing[12]};
  color: ${colors.paper[600]};
  font-size: ${fontSize[12]};
  font-weight: 600;
`;

const ImportActions = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: ${spacing[12]};
  padding-top: ${spacing[12]};
`;

const LandingPrivacy = styled(Body).attrs({ as: "p" })`
  max-width: ${spacing[512]};
  margin: ${spacing[16]} 0 0;
  color: ${colors.paper[600]};
  font-size: ${fontSize[10]};
`;

const ImportCard = styled(Card)`
  width: min(100%, ${spacing[640]});
  margin-top: ${spacing[32]};
  padding: ${spacing[16]};
  border: ${spacing[1]} solid ${colors.paper[400]};
  border-radius: ${radius[16]};
  background: ${colors.paper[0]};
  box-shadow: ${shadows.soft};
  text-align: left;
`;

const ImportTextarea = styled(Textarea)`
  width: 100%;
  min-height: ${spacing[192]};
  padding: ${spacing[12]};
  resize: vertical;
  border: ${spacing[1]} solid ${colors.paper[300]};
  border-radius: ${radius[8]};
  color: ${colors.paper[900]};
  background: ${colors.paper[100]};
  font-family: ${fonts.mono};
  font-size: ${fontSize[12]};
  line-height: 1.55;
`;
