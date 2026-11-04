import { colors, fontSize, spacing, radius, breakpoints, fonts, alpha, shadows, Header2, Text, Strong, Emphasis, Small, ListItem } from "../../lib/style";
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
    "activeTab" | "compile" | "compileError" | "compileState" | "isDemoResume" | "pdfUrl"
  >;
}) {
  const {
    activeTab,
    compile,
    compileError,
    compileState,
    isDemoResume,
    pdfUrl,
  } = model;
  return (
    <PanelFrame $mobileActive={activeTab === "preview"} aria-labelledby="workspace-tab-preview" id="workspace-panel-preview" role="tabpanel">
      <ToolHeader>
        <ToolTitle>Preview</ToolTitle>
        <ToolActions>
          <CompileButton disabled={compileState === "compiling"} onClick={() => void compile()} title="Compile (Ctrl/Cmd + Enter)">
            {compileState === "compiling" ? <Loader /> : <Icon name="play" size={spacing[16]} />} {compileState === "compiling" ? "Compiling…" : "Compile"}
          </CompileButton>
          <DownloadIconLink aria-label="Download PDF" download="resume.pdf" href={pdfUrl} $disabled={!pdfUrl} onClick={(event) => { if (!pdfUrl) event.preventDefault(); }} title={pdfUrl ? "Download PDF" : "Compile first"}><Icon name="download" size={spacing[16]} /></DownloadIconLink>
        </ToolActions>
      </ToolHeader>
      <PreviewCanvas>
        {pdfUrl ? (
          <PdfFrame src={pdfUrl} title="Compiled resume PDF" />
        ) : !isDemoResume ? (
          <PreviewUnavailable>
            <PreviewUnavailableIcon><Icon name="code" size={spacing[24]} /></PreviewUnavailableIcon>
            <Strong>{compileState === "compiling" ? "Compiling resume" : "Preview unavailable"}</Strong>
            <Text>{compileError ?? "Start the compiler service, then retry. Your LaTeX source is still saved locally."}</Text>
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

const DownloadIconLink = styled.a<{ $disabled: boolean; }>`
  display: grid;
  width: ${spacing[32]};
  height: ${spacing[32]};
  place-items: center;
  border-radius: ${radius[8]};
  color: ${colors.paper[600]};
  opacity: ${({ $disabled }) => ($disabled ? 0.4 : 1)};
  pointer-events: ${({ $disabled }) => ($disabled ? "none" : "auto")};

  &:hover { background: ${colors.paper[0]}; color: ${colors.paper[900]}; }
`;

const CompileButton = styled(QuietButton)`
  color: ${colors.forest[800]};
  background: ${colors.forest[100]};

  &:disabled { cursor: wait; opacity: 0.7; }
`;

const PreviewCanvas = styled.div`
  min-height: 0;
  flex: 1;
  padding: ${spacing[24]};
  overflow: auto;
  background-color: ${colors.paper[300]};
  background-image: radial-gradient(${colors.paper[400]} ${spacing[1]}, ${alpha(colors.paper[0], 0)} ${spacing[1]});
  background-size: ${spacing[12]} ${spacing[12]};

  @media (max-width: ${breakpoints.mobile}) { padding: ${spacing[16]}; }
`;

const PdfFrame = styled.iframe`
  display: block;
  width: min(100%, ${spacing[768]});
  height: 100%;
  min-height: ${spacing[640]};
  margin: 0 auto;
  border: 0;
  background: ${colors.paper[0]};
  box-shadow: ${shadows.paper};
`;

const PreviewUnavailable = styled.div`
  display: flex;
  width: min(100%, ${spacing[384]});
  min-height: ${spacing[256]};
  margin: ${spacing[64]} auto;
  align-items: center;
  justify-content: center;
  flex-direction: column;
  gap: ${spacing[8]};
  padding: ${spacing[32]};
  border: ${spacing[1]} solid ${colors.paper[400]};
  border-radius: ${radius[12]};
  color: ${colors.paper[900]};
  background: ${colors.paper[100]};
  text-align: center;

  strong { font-size: ${fontSize[14]}; }
  span { max-width: ${spacing[256]}; color: ${colors.paper[600]}; font-size: ${fontSize[12]}; line-height: 1.5; }
`;

const PreviewUnavailableIcon = styled.div`
  display: grid;
  width: ${spacing[40]};
  height: ${spacing[40]};
  margin-bottom: ${spacing[4]};
  place-items: center;
  border-radius: ${radius[12]};
  color: ${colors.forest[600]};
  background: ${colors.forest[100]};
`;

const Paper = styled.article`
  font-family: ${fonts.resume};
  position: relative;
  width: min(100%, ${spacing[512]});
  min-height: ${spacing[640]};
  margin: 0 auto;
  padding: ${spacing[40]} ${spacing[40]};
  color: ${colors.paper[900]};
  background: ${colors.paper[0]};
  box-shadow: ${shadows.paper};

  @media (max-width: ${breakpoints.mobile}) { padding: ${spacing[32]} ${spacing[24]}; }
`;

const PreviewBadge = styled(Text).attrs({ as: "span" })`
  position: absolute;
  top: ${spacing[12]};
  right: ${spacing[12]};
  padding: ${spacing[4]} ${spacing[8]};
  border-radius: ${radius[4]};
  color: ${colors.paper[600]};
  background: ${colors.paper[200]};
  font-family: ${fonts.body};
  font-size: ${fontSize[8]};
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
`;

const ResumeName = styled(Header2).attrs({ as: "h2" })`
  font-family: ${fonts.resume};
  margin: 0;
  text-align: center;
  font-size: ${fontSize[24]};
  letter-spacing: 0.08em;
`;

const ContactLine = styled(Text).attrs({ as: "div" })`
  font-family: ${fonts.resume};
  margin-top: ${spacing[8]};
  text-align: center;
  font-size: ${fontSize[8]};
`;

const ResumeSection = styled(Header2).attrs({ as: "h3" })`
  font-family: ${fonts.resume};
  margin: ${spacing[16]} 0 ${spacing[8]};
  padding-bottom: ${spacing[4]};
  border-bottom: ${spacing[1]} solid ${colors.paper[900]};
  font-size: ${fontSize[10]};
  letter-spacing: 0.08em;
`;

const RoleLine = styled(Text).attrs({ as: "div" }) <{ $muted?: boolean; }>`
  font-family: ${fonts.resume};
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: ${spacing[12]};
  margin-top: ${({ $muted }) => ($muted ? spacing[2] : "0")};
  font-size: ${fontSize[8]};

  small { font-size: ${fontSize[8]}; font-weight: 400; }
  span { flex: 0 0 auto; }
`;

const ResumeList = styled.ul`
  font-family: ${fonts.resume};
  margin: ${spacing[4]} 0 0;
  padding-left: ${spacing[12]};
  font-size: ${fontSize[8]};
  line-height: 1.55;
`;

const SkillsLine = styled(Text).attrs({ as: "div" })`
  font-family: ${fonts.resume};
  margin-top: ${spacing[4]};
  font-size: ${fontSize[8]};
`;
