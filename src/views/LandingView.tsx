import styled from "styled-components";
import { Body, Code, Header, Text, breakpoints, colors, fonts, textSize, typography } from "../lib/style";
import { BrandName } from "../components/BrandName";
import { ImportCard } from "../components/base/ImportCard";
import { ImportTextarea } from "../components/base/ImportTextarea";
import { Brand } from "../components/Brand";
import { BrandMark } from "../components/BrandMark";
import { QuietButton } from "../components/base/QuietButton";
import { PrimaryButton } from "../components/base/PrimaryButton";
import type { WorkspaceModel } from "../hooks/useResumeWorkspace";
import { Icon } from "../components/Icon";

export function LandingView({ model }: { model: WorkspaceModel }) {
  const { createCheckpoint, landingFileInput, landingSource, setIsDemoResume, setLandingSource, setShowLanding, setSource, upload } = model;
  return (
      <LandingShell>
        <LandingNav>
          <Brand><BrandMark><Icon name="sparkles" size={17} /></BrandMark><BrandName>Aria</BrandName></Brand>
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
              <QuietButton onClick={() => landingFileInput.current?.click()}><Icon name="upload" size={15} /> Upload .tex</QuietButton>
              <input ref={landingFileInput} accept=".tex,text/plain" hidden onChange={(event) => upload(event.target.files?.[0])} type="file" />
              <PrimaryButton disabled={!landingSource.trim()} onClick={() => {
                setSource(landingSource);
                setIsDemoResume(false);
                createCheckpoint("Initial paste", landingSource);
                setShowLanding(false);
              }}>Review my resume <Icon name="arrow" size={15} /></PrimaryButton>
            </ImportActions>
          </ImportCard>
          <LandingPrivacy>Your source stays in this browser until you choose to sign in and start an AI review.</LandingPrivacy>
        </LandingMain>
      </LandingShell>
  );
}

const LandingShell = styled.main`
  ${typography.body}
  min-height: 100vh;
  color: ${colors.ink};
  background: radial-gradient(circle at 50% 20%, ${colors.forestPale}, ${colors.canvas} 42%);
`;

const LandingNav = styled.header`
  ${typography.body}
  display: flex;
  height: 64px;
  align-items: center;
  justify-content: space-between;
  padding: 0 24px;
  border-bottom: 1px solid ${colors.border};
  background: ${colors.navSurface};
`;

const LandingNote = styled(Text).attrs({ as: "span" })`
  ${typography.body}
  color: ${colors.inkMuted};
  font-size: ${textSize.s11};

  @media (max-width: ${breakpoints.mobile}) { display: none; }
`;

const LandingMain = styled.section`
  ${typography.body}
  display: grid;
  width: min(100% - 32px, 760px);
  margin: 0 auto;
  padding: 72px 0;
  justify-items: center;
  text-align: center;
`;

const LandingEyebrow = styled.div`
  ${typography.body}
  color: ${colors.forest};
  font-size: ${textSize.s11};
  font-weight: 700;
  letter-spacing: 0.1em;
  text-transform: uppercase;
`;

const LandingTitle = styled(Header).attrs({ as: "h1" })`
  ${typography.body}
  max-width: 680px;
  margin: 17px 0 13px;
  font-family: ${fonts.heading};
  font-size: ${textSize.hero};
  line-height: 1.04;
  letter-spacing: -0.055em;
`;

const LandingCopy = styled(Body).attrs({ as: "p" })`
  ${typography.body}
  max-width: 590px;
  margin: 0;
  color: ${colors.inkMuted};
  font-size: ${textSize.s16};
  line-height: 1.6;
`;

const ImportTabs = styled.div`
  ${typography.body}
  padding: 2px 2px 11px;
  color: ${colors.inkMuted};
  font-size: ${textSize.s11};
  font-weight: 600;
`;

const ImportActions = styled.div`
  ${typography.body}
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding-top: 12px;
`;

const LandingPrivacy = styled(Body).attrs({ as: "p" })`
  ${typography.body}
  max-width: 520px;
  margin: 16px 0 0;
  color: ${colors.inkMuted};
  font-size: ${textSize.s10};
`;
