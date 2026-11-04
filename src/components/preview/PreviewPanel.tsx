import { Loader } from "../base/Loader";
import styled from "styled-components";
import { Emphasis, Header2, ListItem, Small, Strong, Text, breakpoints, colors, fonts, shadows, textSize, typography } from "../../lib/style";
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
            {compileState === "compiling" ? <Loader /> : <Icon name="play" size={14} />} {compileState === "compiling" ? "Compiling…" : "Compile"}
          </CompileButton>
          <DownloadIconLink aria-label="Download PDF" download="resume.pdf" href={pdfUrl} $disabled={!pdfUrl} onClick={(event) => { if (!pdfUrl) event.preventDefault(); }} title={pdfUrl ? "Download PDF" : "Compile first"}><Icon name="download" size={16} /></DownloadIconLink>
        </ToolActions>
      </ToolHeader>
      <PreviewCanvas>
        {pdfUrl ? (
          <PdfFrame src={pdfUrl} title="Compiled resume PDF" />
        ) : !isDemoResume ? (
          <PreviewUnavailable>
            <PreviewUnavailableIcon><Icon name="code" size={20} /></PreviewUnavailableIcon>
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
  ${typography.body}
  display: grid;
  width: 32px;
  height: 32px;
  place-items: center;
  border-radius: 7px;
  color: ${colors.inkMuted};
  opacity: ${({ $disabled }) => ($disabled ? 0.4 : 1)};
  pointer-events: ${({ $disabled }) => ($disabled ? "none" : "auto")};

  &:hover { background: ${colors.surfaceStrong}; color: ${colors.ink}; }
`;

const CompileButton = styled(QuietButton)`
  color: ${colors.forestDark};
  background: ${colors.forestPale};

  &:disabled { cursor: wait; opacity: 0.7; }
`;

const PreviewCanvas = styled.div`
  ${typography.body}
  min-height: 0;
  flex: 1;
  padding: 25px;
  overflow: auto;
  background-color: ${colors.previewCanvas};
  background-image: radial-gradient(${colors.previewDot} 0.7px, transparent 0.7px);
  background-size: 12px 12px;

  @media (max-width: ${breakpoints.mobile}) { padding: 14px; }
`;

const PdfFrame = styled.iframe`
  ${typography.body}
  display: block;
  width: min(100%, 760px);
  height: 100%;
  min-height: 620px;
  margin: 0 auto;
  border: 0;
  background: ${colors.white};
  box-shadow: ${shadows.paper};
`;

const PreviewUnavailable = styled.div`
  ${typography.body}
  display: flex;
  width: min(100%, 360px);
  min-height: 230px;
  margin: 60px auto;
  align-items: center;
  justify-content: center;
  flex-direction: column;
  gap: 9px;
  padding: 32px;
  border: 1px solid ${colors.borderStrong};
  border-radius: 12px;
  color: ${colors.ink};
  background: ${colors.previewSurface};
  text-align: center;

  strong { font-size: ${textSize.s14}; }
  span { max-width: 260px; color: ${colors.inkMuted}; font-size: ${textSize.s12}; line-height: 1.5; }
`;

const PreviewUnavailableIcon = styled.div`
  ${typography.body}
  display: grid;
  width: 40px;
  height: 40px;
  margin-bottom: 3px;
  place-items: center;
  border-radius: 10px;
  color: ${colors.forest};
  background: ${colors.forestPale};
`;

const Paper = styled.article`
  ${typography.resume}
  position: relative;
  width: min(100%, 520px);
  min-height: 690px;
  margin: 0 auto;
  padding: 42px 40px;
  color: ${colors.resumeInk};
  background: ${colors.white};
  box-shadow: ${shadows.paper};
  font-family: ${fonts.resume};

  @media (max-width: ${breakpoints.mobile}) { padding: 28px 24px; }
`;

const PreviewBadge = styled(Text).attrs({ as: "span" })`
  ${typography.body}
  position: absolute;
  top: 12px;
  right: 12px;
  padding: 4px 6px;
  border-radius: 4px;
  color: ${colors.inkMuted};
  background: ${colors.canvas};
  font-family: ${fonts.body};
  font-size: ${textSize.s7};
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
`;

const ResumeName = styled(Header2).attrs({ as: "h2" })`
  ${typography.resume}
  margin: 0;
  text-align: center;
  font-size: ${textSize.s21};
  letter-spacing: 0.08em;
`;

const ContactLine = styled(Text).attrs({ as: "div" })`
  ${typography.resume}
  margin-top: 6px;
  text-align: center;
  font-size: ${textSize.s7_5};
`;

const ResumeSection = styled(Header2).attrs({ as: "h3" })`
  ${typography.resume}
  margin: 17px 0 7px;
  padding-bottom: 3px;
  border-bottom: 1px solid ${colors.resumeRule};
  font-size: ${textSize.s10};
  letter-spacing: 0.08em;
`;

const RoleLine = styled(Text).attrs({ as: "div" }) <{ $muted?: boolean; }>`
  ${typography.resume}
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 12px;
  margin-top: ${({ $muted }) => ($muted ? "2px" : "0")};
  font-size: ${({ $muted }) => ($muted ? textSize.s8 : textSize.s8_5)};

  small { font-size: ${textSize.s7_5}; font-weight: 400; }
  span { flex: 0 0 auto; }
`;

const ResumeList = styled.ul`
  ${typography.resume}
  margin: 5px 0 0;
  padding-left: 13px;
  font-size: ${textSize.s7_5};
  line-height: 1.55;
`;

const SkillsLine = styled(Text).attrs({ as: "div" })`
  ${typography.resume}
  margin-top: 4px;
  font-size: ${textSize.s7_5};
`;
