import { colors, fontSize, spacing, radius, breakpoints, fonts, alpha, shadows, Header2, Text, Strong, Emphasis, Small, ListItem } from "../../lib/style";
import { IconButton } from "../base/IconButton";
import { Loader } from "../base/Loader";
import styled from "styled-components";
import { PanelFrame } from "../layout/PanelFrame";
import { ToolTitle } from "../layout/ToolTitle";
import { ToolHeader } from "../layout/ToolHeader";
import { QuietButton } from "../base/QuietButton";
import { ToolActions } from "../layout/ToolActions";
import type { WorkspaceModel } from "../../hooks/useResumeWorkspace";
import { Icon } from "../base/Icon";

export function PreviewPanel({ model }: {
  model: Pick<WorkspaceModel,
    "activeTab" | "compile" | "compileState" | "isDemoResume" | "pdfUrl" | "downloadPdf"
  >;
}) {
  const {
    activeTab,
    compile,
    compileState,
    isDemoResume,
    pdfUrl,
    downloadPdf,
  } = model;
  return (
    <PanelFrame $mobileActive={activeTab === "preview"} aria-labelledby="workspace-tab-preview" id="workspace-panel-preview" role="tabpanel">
      <ToolHeader>
        <ToolTitle>Preview</ToolTitle>
        <ToolActions>
          <CompileButton disabled={compileState === "compiling"} onClick={() => void compile()} title="Compile (Ctrl/Cmd + Enter)">
            {compileState === "compiling" ? <Loader /> : <Icon name="play" size={spacing.md} />} {compileState === "compiling" ? "Compiling…" : "Compile"}
          </CompileButton>
          <IconButton aria-label="Download PDF" disabled={!pdfUrl} onClick={() => void downloadPdf()} title={pdfUrl ? "Download PDF" : "Compile first"}><Icon name="download" size={spacing.md} /></IconButton>
        </ToolActions>
      </ToolHeader>
      <PreviewCanvas $unavailable={!pdfUrl && !isDemoResume}>
        {pdfUrl ? (
          <PdfFrame src={pdfUrl} title="Compiled resume PDF" />
        ) : !isDemoResume ? (
          <PreviewUnavailable>
            <PreviewUnavailableIcon><Icon name="code" size={spacing.lg} /></PreviewUnavailableIcon>
            <Strong>{compileState === "compiling" ? "Compiling resume" : "Preview unavailable"}</Strong>
            <Text>{compileState === "error" ? "Something went wrong. Try again." : compileState === "compiling" ? "Your preview will appear here when it is ready." : "Compile your resume to see a preview."}</Text>
          </PreviewUnavailable>
        ) : (
          <Paper>
            <PreviewBadge>Sample preview</PreviewBadge>
            <ResumeName>ALEX MORGAN</ResumeName>
            <ContactLine>Vancouver, BC &nbsp;·&nbsp; alex@email.com &nbsp;·&nbsp; github.com/alexm</ContactLine>
            <ResumeSection>EXPERIENCE</ResumeSection>
            <RoleLine><Strong>Software Engineering Intern</Strong><Text>May 2025 – Aug 2025</Text></RoleLine>
            <RoleLine $muted><Emphasis>Northstar Labs</Emphasis><Text>Vancouver, BC</Text></RoleLine>
            <ResumeList>
              <ListItem>Built an internal dashboard for engineers using React and TypeScript.</ListItem>
              <ListItem>Improved application performance and fixed bugs.</ListItem>
              <ListItem>Collaborated with the backend team to build new API endpoints.</ListItem>
            </ResumeList>
            <ResumeSection>PROJECTS</ResumeSection>
            <RoleLine><Strong>Campus Course Planner <Small>| React, Node.js, PostgreSQL</Small></Strong></RoleLine>
            <ResumeList>
              <ListItem>Created a course planning tool used by students.</ListItem>
              <ListItem>Added conflict detection and degree requirement tracking.</ListItem>
            </ResumeList>
            <ResumeSection>EDUCATION</ResumeSection>
            <RoleLine><Strong>University of British Columbia</Strong><Text>Expected May 2027</Text></RoleLine>
            <RoleLine $muted><Emphasis>B.A.Sc. in Computer Engineering</Emphasis><Text>Vancouver, BC</Text></RoleLine>
            <ResumeSection>SKILLS</ResumeSection>
            <SkillsLine><Strong>Languages:</Strong> TypeScript, Python, Java, SQL, C++</SkillsLine>
            <SkillsLine><Strong>Tools:</Strong> React, Node.js, PostgreSQL, Docker, Git</SkillsLine>
          </Paper>
        )}
      </PreviewCanvas>
    </PanelFrame>
  );
}

const CompileButton = styled(QuietButton)`
  color: ${colors.forest[800]};
  background: ${colors.forest[100]};

  &:disabled { cursor: wait; opacity: 0.7; }
`;

const PreviewCanvas = styled.div<{ $unavailable: boolean }>`
  display: ${({ $unavailable }) => $unavailable ? "grid" : "block"};
  place-items: center;
  min-width: 0;
  min-height: 0;
  flex: 1;
  padding: ${spacing.lg};
  overflow: auto;
  background-color: ${colors.paper[300]};
  background-image: radial-gradient(${colors.paper[400]} ${spacing.hairline}, ${alpha(colors.paper[0], 0)} ${spacing.hairline});
  background-size: ${spacing.sm} ${spacing.sm};

  @media (max-width: ${breakpoints.mobile}) { padding: ${spacing.md}; }
`;

const PdfFrame = styled.iframe`
  display: block;
  width: min(100%, ${spacing["13xl"]});
  height: 100%;
  min-height: ${spacing["12xl"]};
  margin: 0 auto;
  border: 0;
  background: ${colors.paper[0]};
  box-shadow: ${shadows.paper};
`;

const PreviewUnavailable = styled.div`
  display: flex;
  width: min(100%, ${spacing["10xl"]});
  min-height: ${spacing["8xl"]};
  margin: 0 auto;
  align-items: center;
  justify-content: center;
  flex-direction: column;
  gap: ${spacing.xs};
  padding: ${spacing.xl};
  border: ${spacing.hairline} solid ${colors.paper[400]};
  border-radius: ${radius.md};
  color: ${colors.paper[900]};
  background: ${colors.paper[100]};
  text-align: center;

  strong { font-size: ${fontSize.sm}; }
  span { max-width: ${spacing["8xl"]}; color: ${colors.paper[600]}; font-size: ${fontSize.xs}; line-height: 1.5; }
`;

const PreviewUnavailableIcon = styled.div`
  display: grid;
  width: ${spacing.xxl};
  height: ${spacing.xxl};
  margin-bottom: ${spacing.xxs};
  place-items: center;
  border-radius: ${radius.md};
  color: ${colors.forest[600]};
  background: ${colors.forest[100]};
`;

const Paper = styled.article`
  font-family: ${fonts.resume};
  position: relative;
  width: min(100%, ${spacing["11xl"]});
  min-height: ${spacing["12xl"]};
  margin: 0 auto;
  padding: ${spacing.xxl} ${spacing.xxl};
  color: ${colors.paper[900]};
  background: ${colors.paper[0]};
  box-shadow: ${shadows.paper};

  @media (max-width: ${breakpoints.mobile}) { padding: ${spacing.xl} ${spacing.lg}; }
`;

const PreviewBadge = styled(Text).attrs({ as: "span" })`
  position: absolute;
  top: ${spacing.sm};
  right: ${spacing.sm};
  padding: ${spacing.xxs} ${spacing.xs};
  border-radius: ${radius.xs};
  color: ${colors.paper[600]};
  background: ${colors.paper[200]};
  font-family: ${fonts.body};
  font-size: ${fontSize.xxxs};
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
`;

const ResumeName = styled(Header2).attrs({ as: "h2" })`
  font-family: ${fonts.resume};
  margin: 0;
  text-align: center;
  font-size: ${fontSize.lg};
  letter-spacing: 0.08em;
`;

const ContactLine = styled(Text).attrs({ as: "div" })`
  font-family: ${fonts.resume};
  margin-top: ${spacing.xs};
  text-align: center;
  font-size: ${fontSize.xxxs};
`;

const ResumeSection = styled(Header2).attrs({ as: "h3" })`
  font-family: ${fonts.resume};
  margin: ${spacing.md} 0 ${spacing.xs};
  padding-bottom: ${spacing.xxs};
  border-bottom: ${spacing.hairline} solid ${colors.paper[900]};
  font-size: ${fontSize.xxs};
  letter-spacing: 0.08em;
`;

const RoleLine = styled(Text).attrs({ as: "div" }) <{ $muted?: boolean; }>`
  font-family: ${fonts.resume};
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: ${spacing.sm};
  margin-top: ${({ $muted }) => ($muted ? spacing.xxxs : "0")};
  font-size: ${fontSize.xxxs};

  small { font-size: ${fontSize.xxxs}; font-weight: 400; }
  span { flex: 0 0 auto; }
`;

const ResumeList = styled.ul`
  font-family: ${fonts.resume};
  margin: ${spacing.xxs} 0 0;
  padding-left: ${spacing.sm};
  font-size: ${fontSize.xxxs};
  line-height: 1.55;
`;

const SkillsLine = styled(Text).attrs({ as: "div" })`
  font-family: ${fonts.resume};
  margin-top: ${spacing.xxs};
  font-size: ${fontSize.xxxs};
`;
