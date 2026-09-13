import { useEffect, useRef, useState } from "react";
import CodeMirror from "@uiw/react-codemirror";
import { StreamLanguage } from "@codemirror/language";
import { stex } from "@codemirror/legacy-modes/mode/stex";
import { EditorView } from "@codemirror/view";
import { Panel, PanelGroup, PanelResizeHandle } from "react-resizable-panels";
import styled from "styled-components";
import { Icon } from "./components/Icon";
import { breakpoints, colors, shadows } from "./lib/styles";

const initialLatex = `\\documentclass[10pt]{article}
\\usepackage[margin=0.55in]{geometry}
\\usepackage{enumitem, hyperref}
\\pagenumbering{gobble}

\\begin{document}
\\begin{center}
  {\\LARGE \\textbf{Alex Morgan}} \\\\
  Vancouver, BC $\\cdot$ alex@email.com $\\cdot$ github.com/alexm
\\end{center}

\\section*{Experience}
\\textbf{Software Engineering Intern} \\hfill May 2025 -- Aug 2025 \\
\\textit{Northstar Labs} \\hfill Vancouver, BC
\\begin{itemize}[leftmargin=*, itemsep=2pt]
  \\item Built an internal dashboard for engineers using React and TypeScript.
  \\item Improved application performance and fixed bugs.
  \\item Collaborated with the backend team to build new API endpoints.
\\end{itemize}

\\section*{Projects}
\\textbf{Campus Course Planner} $|$ React, Node.js, PostgreSQL
\\begin{itemize}[leftmargin=*, itemsep=2pt]
  \\item Created a course planning tool used by students.
  \\item Added conflict detection and degree requirement tracking.
\\end{itemize}
\\end{document}`;

type Tab = "review" | "source" | "preview";

const issues = [
  {
    id: 1,
    severity: "high",
    label: "Impact is unclear",
    location: "Experience · Northstar Labs",
    detail: "The dashboard bullet explains what you built, but not who relied on it or what changed as a result.",
    question: "Roughly how many engineers used this dashboard, and what did it help them do faster?",
  },
  {
    id: 2,
    severity: "high",
    label: "Performance claim needs evidence",
    location: "Experience · Northstar Labs",
    detail: "“Improved application performance” is too broad to establish your technical contribution.",
    question: "What was slow, what did you change, and do you remember a before-and-after measurement?",
  },
  {
    id: 3,
    severity: "medium",
    label: "Ownership is missing",
    location: "Projects · Course Planner",
    detail: "The project sounds useful, but your role and the technical difficulty are not yet visible.",
    question: "Did you build this independently? What was hardest about conflict detection?",
  },
];

function App() {
  const [source, setSource] = useState(
    () => window.localStorage.getItem("draftwise:resume-source") ?? initialLatex,
  );
  const [activeTab, setActiveTab] = useState<Tab>("review");
  const [reviewOpen, setReviewOpen] = useState(true);
  const [selectedIssue, setSelectedIssue] = useState(issues[0]);
  const [resolved, setResolved] = useState<number[]>([]);
  const [compileState, setCompileState] = useState<"ready" | "compiling">("ready");
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState<string[]>([]);
  const fileInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const saveTimer = window.setTimeout(() => {
      window.localStorage.setItem("draftwise:resume-source", source);
    }, 500);

    return () => window.clearTimeout(saveTimer);
  }, [source]);

  const compile = () => {
    setCompileState("compiling");
    window.setTimeout(() => setCompileState("ready"), 900);
  };

  const upload = (file?: File) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        setSource(reader.result);
        setActiveTab("source");
      }
    };
    reader.readAsText(file);
  };

  const sendMessage = () => {
    const nextMessage = message.trim();
    if (!nextMessage) return;
    setMessages((current) => [...current, nextMessage]);
    setMessage("");
  };

  const downloadSource = () => {
    const url = URL.createObjectURL(new Blob([source], { type: "application/x-tex" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = "resume.tex";
    link.click();
    URL.revokeObjectURL(url);
  };

  const resolveIssue = () => {
    if (!selectedIssue || resolved.includes(selectedIssue.id)) return;
    setResolved((current) => [...current, selectedIssue.id]);
  };

  const unresolvedCount = issues.length - resolved.length;

  return (
    <AppShell>
      <Header>
        <Brand aria-label="Draftwise home">
          <BrandMark><Icon name="sparkles" size={17} /></BrandMark>
          <BrandName>draftwise</BrandName>
        </Brand>
        <DocumentMeta>
          <DocumentTitle>Alex Morgan — Software Resume</DocumentTitle>
          <Discipline>Software engineering</Discipline>
        </DocumentMeta>
        <HeaderActions>
          <SavedState><Icon name="check" size={14} /> Saved just now</SavedState>
          <IconButton aria-label="Version history" title="Version history"><Icon name="history" /></IconButton>
          <IconButton aria-label="More options" title="More options"><Icon name="more" /></IconButton>
          <Avatar>AM</Avatar>
        </HeaderActions>
      </Header>

      <MobileTabs aria-label="Workspace views">
        {(["review", "source", "preview"] as Tab[]).map((tab) => (
          <MobileTab key={tab} $active={activeTab === tab} onClick={() => setActiveTab(tab)}>
            {tab === "review" && unresolvedCount > 0 ? `Review · ${unresolvedCount}` : tab}
          </MobileTab>
        ))}
      </MobileTabs>

      <Workspace>
        <PanelGroup direction="horizontal">
          {reviewOpen && (
            <>
              <Panel className={activeTab === "review" ? "" : "mobile-hidden"} defaultSize={27} minSize={22} order={1}>
                <PanelFrame $mobileActive={activeTab === "review"}>
                  <PanelHeader>
                    <PanelTitleWrap>
                      <PanelEyebrow>AI reviewer</PanelEyebrow>
                      <PanelTitle>Let’s make this stronger.</PanelTitle>
                    </PanelTitleWrap>
                    <IconButton aria-label="Collapse review panel" onClick={() => setReviewOpen(false)} title="Collapse panel">
                      <Icon name="collapse" size={16} />
                    </IconButton>
                  </PanelHeader>
                  <ReviewBody>
                    <ReviewerIntro>
                      <ReviewerIcon><Icon name="sparkles" size={16} /></ReviewerIcon>
                      <div>
                        <ReviewerName>Draftwise reviewer</ReviewerName>
                        <ReviewerCopy>
                          I found {unresolvedCount} {unresolvedCount === 1 ? "area" : "areas"} worth strengthening. I’ll ask before adding any facts.
                        </ReviewerCopy>
                      </div>
                    </ReviewerIntro>

                    <ProgressRow>
                      <ProgressText>Initial review</ProgressText>
                      <ProgressCount>{resolved.length} of {issues.length} resolved</ProgressCount>
                    </ProgressRow>
                    <ProgressTrack><ProgressFill $progress={(resolved.length / issues.length) * 100} /></ProgressTrack>

                    <SectionLabel>Priority feedback</SectionLabel>
                    <IssueList>
                      {issues.map((issue) => (
                        <IssueCard
                          key={issue.id}
                          $active={selectedIssue?.id === issue.id}
                          $resolved={resolved.includes(issue.id)}
                          onClick={() => setSelectedIssue(issue)}
                        >
                          <IssueTopline>
                            <Severity $severity={issue.severity}>
                              {resolved.includes(issue.id) ? "Resolved" : issue.severity}
                            </Severity>
                            <span>{issue.location}</span>
                          </IssueTopline>
                          <IssueTitle>{issue.label}</IssueTitle>
                          {selectedIssue?.id === issue.id && (
                            <IssueExpanded>
                              <p>{issue.detail}</p>
                              <QuestionBlock>
                                <QuestionLabel>One thing I’d ask</QuestionLabel>
                                {issue.question}
                              </QuestionBlock>
                              <IssueActions>
                                <TextButton onClick={resolveIssue}>Skip for now</TextButton>
                                <AnswerButton onClick={() => document.getElementById("review-message")?.focus()}>
                                  Answer <Icon name="arrow" size={15} />
                                </AnswerButton>
                              </IssueActions>
                            </IssueExpanded>
                          )}
                        </IssueCard>
                      ))}
                    </IssueList>

                    {messages.map((item, index) => (
                      <UserMessage key={`${item}-${index}`}>{item}</UserMessage>
                    ))}
                  </ReviewBody>
                  <Composer>
                    <ComposerInput
                      id="review-message"
                      aria-label="Reply to reviewer"
                      onChange={(event) => setMessage(event.target.value)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter" && !event.shiftKey) {
                          event.preventDefault();
                          sendMessage();
                        }
                      }}
                      placeholder="Answer the reviewer…"
                      rows={2}
                      value={message}
                    />
                    <SendButton aria-label="Send message" disabled={!message.trim()} onClick={sendMessage}>
                      <Icon name="arrow" size={17} />
                    </SendButton>
                  </Composer>
                </PanelFrame>
              </Panel>
              <ResizeHandle />
            </>
          )}

          <Panel className={activeTab === "source" ? "" : "mobile-hidden"} defaultSize={reviewOpen ? 37 : 48} minSize={28} order={2}>
            <PanelFrame $mobileActive={activeTab === "source"}>
              <ToolHeader>
                <ToolTitle><Icon name="code" size={16} /> Source</ToolTitle>
                <ToolActions>
                  {!reviewOpen && (
                    <QuietButton onClick={() => setReviewOpen(true)}><Icon name="message" size={15} /> Show review</QuietButton>
                  )}
                  <QuietButton onClick={() => fileInput.current?.click()}><Icon name="upload" size={15} /> Replace</QuietButton>
                  <input
                    ref={fileInput}
                    accept=".tex,text/plain"
                    hidden
                    onChange={(event) => upload(event.target.files?.[0])}
                    type="file"
                  />
                </ToolActions>
              </ToolHeader>
              <EditorMeta>
                <FileName>resume.tex</FileName>
                <SelectedAnchor>{selectedIssue ? "Feedback linked to experience section" : "No issue selected"}</SelectedAnchor>
              </EditorMeta>
              <EditorWrap>
                <CodeMirror
                  basicSetup={{
                    bracketMatching: true,
                    closeBrackets: true,
                    foldGutter: false,
                    highlightActiveLine: true,
                    highlightActiveLineGutter: true,
                    lineNumbers: true,
                  }}
                  extensions={[
                    StreamLanguage.define(stex),
                    EditorView.lineWrapping,
                  ]}
                  height="100%"
                  onChange={setSource}
                  theme="light"
                  value={source}
                />
              </EditorWrap>
              <EditorStatus>
                <span>Ln 14, Col 3</span>
                <span>LaTeX</span>
                <span>UTF-8</span>
              </EditorStatus>
            </PanelFrame>
          </Panel>

          <ResizeHandle />
          <Panel className={activeTab === "preview" ? "" : "mobile-hidden"} defaultSize={36} minSize={28} order={3}>
            <PanelFrame $mobileActive={activeTab === "preview"}>
              <ToolHeader>
                <ToolTitle>Preview</ToolTitle>
                <ToolActions>
                  <CompileButton disabled={compileState === "compiling"} onClick={compile}>
                    <Icon name="play" size={14} /> {compileState === "compiling" ? "Compiling…" : "Compile"}
                  </CompileButton>
                  <IconButton aria-label="PDF download will be available after compiler integration" disabled title="Available after compiler integration"><Icon name="download" size={16} /></IconButton>
                </ToolActions>
              </ToolHeader>
              <PreviewCanvas>
                <Paper>
                  <ResumeName>ALEX MORGAN</ResumeName>
                  <ContactLine>Vancouver, BC &nbsp;·&nbsp; alex@email.com &nbsp;·&nbsp; github.com/alexm</ContactLine>
                  <ResumeSection>EXPERIENCE</ResumeSection>
                  <RoleLine><strong>Software Engineering Intern</strong><span>May 2025 – Aug 2025</span></RoleLine>
                  <RoleLine $muted><em>Northstar Labs</em><span>Vancouver, BC</span></RoleLine>
                  <ResumeList>
                    <li>Built an internal dashboard for engineers using React and TypeScript.</li>
                    <li>Improved application performance and fixed bugs.</li>
                    <li>Collaborated with the backend team to build new API endpoints.</li>
                  </ResumeList>
                  <ResumeSection>PROJECTS</ResumeSection>
                  <RoleLine><strong>Campus Course Planner <small>| React, Node.js, PostgreSQL</small></strong></RoleLine>
                  <ResumeList>
                    <li>Created a course planning tool used by students.</li>
                    <li>Added conflict detection and degree requirement tracking.</li>
                  </ResumeList>
                  <ResumeSection>EDUCATION</ResumeSection>
                  <RoleLine><strong>University of British Columbia</strong><span>Expected May 2027</span></RoleLine>
                  <RoleLine $muted><em>B.A.Sc. in Computer Engineering</em><span>Vancouver, BC</span></RoleLine>
                  <ResumeSection>SKILLS</ResumeSection>
                  <SkillsLine><strong>Languages:</strong> TypeScript, Python, Java, SQL, C++</SkillsLine>
                  <SkillsLine><strong>Tools:</strong> React, Node.js, PostgreSQL, Docker, Git</SkillsLine>
                </Paper>
              </PreviewCanvas>
            </PanelFrame>
          </Panel>
        </PanelGroup>
      </Workspace>

      <FooterBar>
        <CompileStatus $compiling={compileState === "compiling"}>
          <StatusDot /> {compileState === "compiling" ? "Compiling resume" : "Compiled successfully"}
        </CompileStatus>
        <FooterHint>Changes are saved locally</FooterHint>
        <FooterActions>
          <QuietButton onClick={downloadSource}><Icon name="download" size={15} /> Download .tex</QuietButton>
          <PrimaryButton onClick={() => {
            setReviewOpen(true);
            setActiveTab("review");
            document.getElementById("review-message")?.focus();
          }}><Icon name="sparkles" size={15} /> Continue review</PrimaryButton>
        </FooterActions>
      </FooterBar>
    </AppShell>
  );
}

export default App;

const AppShell = styled.main`
  display: grid;
  grid-template-rows: 64px 1fr 52px;
  min-height: 100vh;
  background: ${colors.canvas};
  color: ${colors.ink};

  @media (max-width: ${breakpoints.tablet}) {
    grid-template-rows: 64px 44px 1fr 52px;
  }
`;

const Header = styled.header`
  display: grid;
  grid-template-columns: 1fr auto 1fr;
  align-items: center;
  gap: 24px;
  padding: 0 20px;
  border-bottom: 1px solid ${colors.border};
  background: ${colors.surface};

  @media (max-width: ${breakpoints.tablet}) {
    grid-template-columns: 1fr auto;
    .document-meta { display: none; }
  }
`;

const Brand = styled.button`
  display: inline-flex;
  align-items: center;
  justify-self: start;
  gap: 9px;
  padding: 0;
  border: 0;
  color: inherit;
  background: none;
`;

const BrandMark = styled.span`
  display: grid;
  width: 30px;
  height: 30px;
  place-items: center;
  border-radius: 9px;
  color: white;
  background: ${colors.forest};
`;

const BrandName = styled.span`
  font-family: "Manrope", sans-serif;
  font-size: 19px;
  font-weight: 700;
  letter-spacing: -0.6px;
`;

const DocumentMeta = styled.div.attrs({ className: "document-meta" })`
  display: flex;
  align-items: center;
  gap: 10px;
`;

const DocumentTitle = styled.span`
  font-size: 14px;
  font-weight: 600;
`;

const Discipline = styled.span`
  padding: 5px 8px;
  border: 1px solid ${colors.border};
  border-radius: 7px;
  color: ${colors.inkMuted};
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.02em;
  text-transform: uppercase;
`;

const HeaderActions = styled.div`
  display: flex;
  align-items: center;
  justify-self: end;
  gap: 7px;
`;

const SavedState = styled.span`
  display: flex;
  align-items: center;
  gap: 5px;
  margin-right: 6px;
  color: ${colors.inkMuted};
  font-size: 12px;

  svg { color: ${colors.forest}; }

  @media (max-width: ${breakpoints.mobile}) { display: none; }
`;

const Avatar = styled.button`
  display: grid;
  width: 31px;
  height: 31px;
  margin-left: 3px;
  place-items: center;
  border: 0;
  border-radius: 50%;
  color: ${colors.forestDark};
  background: ${colors.apricotPale};
  font-size: 11px;
  font-weight: 700;
`;

const IconButton = styled.button`
  display: grid;
  width: 32px;
  height: 32px;
  padding: 0;
  place-items: center;
  border: 1px solid transparent;
  border-radius: 7px;
  color: ${colors.inkMuted};
  background: transparent;

  &:hover { border-color: ${colors.border}; background: ${colors.surfaceStrong}; color: ${colors.ink}; }
  &:disabled { cursor: not-allowed; opacity: 0.4; }
`;

const Workspace = styled.section`
  min-height: 0;
  overflow: hidden;

  > div { height: 100%; }

  @media (max-width: ${breakpoints.tablet}) {
    > div { display: block !important; }
    [data-panel-group-direction] > [data-panel] { width: 100% !important; height: 100% !important; }
    .mobile-hidden { display: none !important; }
  }
`;

const PanelFrame = styled.section<{ $mobileActive: boolean }>`
  display: flex;
  height: 100%;
  min-width: 0;
  flex-direction: column;
  background: ${colors.surface};

  @media (max-width: ${breakpoints.tablet}) {
    display: ${({ $mobileActive }) => ($mobileActive ? "flex" : "none")};
  }
`;

const ResizeHandle = styled(PanelResizeHandle)`
  position: relative;
  width: 5px;
  background: ${colors.border};
  transition: background 160ms ease;

  &::after {
    position: absolute;
    z-index: 2;
    inset: 0 -3px;
    content: "";
  }

  &:hover, &[data-resize-handle-active] { background: ${colors.forest}; }

  @media (max-width: ${breakpoints.tablet}) { display: none; }
`;

const PanelHeader = styled.div`
  display: flex;
  min-height: 104px;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  padding: 20px 18px 17px;
  border-bottom: 1px solid ${colors.border};
  background: ${colors.surfaceStrong};
`;

const PanelTitleWrap = styled.div`
  display: grid;
  gap: 7px;
`;

const PanelEyebrow = styled.span`
  color: ${colors.forest};
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
`;

const PanelTitle = styled.h1`
  margin: 0;
  font-family: "Manrope", sans-serif;
  font-size: 20px;
  line-height: 1.2;
  letter-spacing: -0.6px;
`;

const ReviewBody = styled.div`
  min-height: 0;
  padding: 18px;
  overflow: auto;
  scrollbar-width: thin;
`;

const ReviewerIntro = styled.div`
  display: grid;
  grid-template-columns: auto 1fr;
  gap: 11px;
  padding-bottom: 17px;
`;

const ReviewerIcon = styled.div`
  display: grid;
  width: 31px;
  height: 31px;
  place-items: center;
  border-radius: 9px;
  color: ${colors.forest};
  background: ${colors.forestPale};
`;

const ReviewerName = styled.div`
  margin: 1px 0 5px;
  font-size: 12px;
  font-weight: 700;
`;

const ReviewerCopy = styled.p`
  margin: 0;
  color: ${colors.inkMuted};
  font-size: 13px;
  line-height: 1.55;
`;

const ProgressRow = styled.div`
  display: flex;
  justify-content: space-between;
  margin-top: 2px;
`;

const ProgressText = styled.span`
  font-size: 11px;
  font-weight: 700;
`;

const ProgressCount = styled.span`
  color: ${colors.inkMuted};
  font-size: 11px;
`;

const ProgressTrack = styled.div`
  height: 4px;
  margin-top: 8px;
  overflow: hidden;
  border-radius: 99px;
  background: ${colors.border};
`;

const ProgressFill = styled.div<{ $progress: number }>`
  width: ${({ $progress }) => `${$progress}%`};
  height: 100%;
  border-radius: inherit;
  background: ${colors.forest};
  transition: width 220ms ease;
`;

const SectionLabel = styled.div`
  margin: 23px 0 10px;
  color: ${colors.inkMuted};
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.1em;
  text-transform: uppercase;
`;

const IssueList = styled.div`
  display: grid;
  gap: 8px;
`;

const IssueCard = styled.button<{ $active: boolean; $resolved: boolean }>`
  width: 100%;
  padding: 13px;
  border: 1px solid ${({ $active }) => ($active ? colors.forest : colors.border)};
  border-radius: 10px;
  color: inherit;
  background: ${({ $active, $resolved }) => ($resolved ? colors.forestPale : $active ? colors.surfaceStrong : "transparent")};
  text-align: left;
  box-shadow: ${({ $active }) => ($active ? "0 4px 16px rgba(35, 37, 31, 0.06)" : "none")};
  transition: border-color 150ms ease, background 150ms ease, box-shadow 150ms ease;

  &:hover { border-color: ${colors.borderStrong}; }
`;

const IssueTopline = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  color: ${colors.inkMuted};
  font-size: 10px;
  white-space: nowrap;
  overflow: hidden;

  span:last-child { overflow: hidden; text-overflow: ellipsis; }
`;

const Severity = styled.span<{ $severity: string }>`
  flex: 0 0 auto;
  padding: 3px 6px;
  border-radius: 4px;
  color: ${({ $severity }) => ($severity === "high" ? colors.red : colors.forestDark)};
  background: ${({ $severity }) => ($severity === "high" ? colors.redPale : colors.apricotPale)};
  font-size: 9px;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
`;

const IssueTitle = styled.div`
  margin-top: 9px;
  font-size: 13px;
  font-weight: 700;
`;

const IssueExpanded = styled.div`
  margin-top: 9px;

  > p { margin: 0; color: ${colors.inkMuted}; font-size: 12px; line-height: 1.5; }
`;

const QuestionBlock = styled.div`
  margin-top: 11px;
  padding: 11px;
  border-left: 2px solid ${colors.apricot};
  border-radius: 0 6px 6px 0;
  background: ${colors.apricotPale};
  font-size: 12px;
  line-height: 1.45;
`;

const QuestionLabel = styled.span`
  display: block;
  margin-bottom: 4px;
  color: ${colors.inkMuted};
  font-size: 9px;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
`;

const IssueActions = styled.div`
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 8px;
  margin-top: 11px;
`;

const TextButton = styled.span`
  padding: 6px 4px;
  color: ${colors.inkMuted};
  font-size: 11px;
  font-weight: 600;
`;

const AnswerButton = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 7px 9px;
  border-radius: 6px;
  color: white;
  background: ${colors.forest};
  font-size: 11px;
  font-weight: 700;
`;

const UserMessage = styled.div`
  max-width: 88%;
  margin: 14px 0 0 auto;
  padding: 10px 12px;
  border-radius: 10px 10px 2px 10px;
  color: white;
  background: ${colors.forest};
  font-size: 12px;
  line-height: 1.45;
`;

const Composer = styled.div`
  position: relative;
  margin: auto 14px 14px;
  border: 1px solid ${colors.borderStrong};
  border-radius: 10px;
  background: ${colors.surfaceStrong};
  box-shadow: ${shadows.soft};
`;

const ComposerInput = styled.textarea`
  display: block;
  width: 100%;
  min-height: 68px;
  padding: 12px 43px 12px 12px;
  resize: none;
  border: 0;
  outline: 0 !important;
  color: ${colors.ink};
  background: transparent;
  font-size: 12px;
  line-height: 1.45;

  &::placeholder { color: #9a9c94; }
`;

const SendButton = styled.button`
  position: absolute;
  right: 8px;
  bottom: 8px;
  display: grid;
  width: 29px;
  height: 29px;
  padding: 0;
  place-items: center;
  border: 0;
  border-radius: 7px;
  color: white;
  background: ${colors.forest};

  &:disabled { cursor: default; opacity: 0.35; }
`;

const ToolHeader = styled.div`
  display: flex;
  min-height: 48px;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 0 12px 0 15px;
  border-bottom: 1px solid ${colors.border};
  background: ${colors.surfaceStrong};
`;

const ToolTitle = styled.div`
  display: flex;
  align-items: center;
  gap: 7px;
  font-size: 12px;
  font-weight: 700;
`;

const ToolActions = styled.div`
  display: flex;
  align-items: center;
  gap: 4px;
`;

const QuietButton = styled.button`
  display: inline-flex;
  height: 31px;
  align-items: center;
  gap: 6px;
  padding: 0 9px;
  border: 1px solid transparent;
  border-radius: 7px;
  color: ${colors.inkMuted};
  background: transparent;
  font-size: 11px;
  font-weight: 600;

  &:hover { border-color: ${colors.border}; background: ${colors.surfaceStrong}; color: ${colors.ink}; }
`;

const CompileButton = styled(QuietButton)`
  color: ${colors.forestDark};
  background: ${colors.forestPale};

  &:disabled { cursor: wait; opacity: 0.7; }
`;

const EditorMeta = styled.div`
  display: flex;
  min-height: 36px;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 0 13px;
  border-bottom: 1px solid ${colors.border};
  background: #f7f7f3;
`;

const FileName = styled.span`
  font-family: "DM Mono", monospace;
  font-size: 10px;
  font-weight: 500;
`;

const SelectedAnchor = styled.span`
  overflow: hidden;
  color: ${colors.inkMuted};
  font-size: 9px;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

const EditorWrap = styled.div`
  min-height: 0;
  flex: 1;
  overflow: hidden;
  background: #fafaf7;

  .cm-theme, .cm-editor { height: 100%; }
  .cm-scroller { overflow: auto; font-family: "DM Mono", monospace; }
  .cm-content, .cm-gutter { font-size: 11px; line-height: 1.75; }
  .cm-gutters { border-right: 1px solid ${colors.border}; color: #a2a59b; background: #f4f4ef; }
  .cm-activeLine, .cm-activeLineGutter { background: ${colors.forestPale}; }
  .cm-focused { outline: none !important; }
  .cm-cursor { border-left-color: ${colors.forest}; }
  .cm-selectionBackground { background: #ccded1 !important; }
`;

const EditorStatus = styled.div`
  display: flex;
  min-height: 25px;
  align-items: center;
  justify-content: flex-end;
  gap: 14px;
  padding: 0 12px;
  border-top: 1px solid ${colors.border};
  color: ${colors.inkMuted};
  background: ${colors.surfaceStrong};
  font-family: "DM Mono", monospace;
  font-size: 9px;
`;

const PreviewCanvas = styled.div`
  min-height: 0;
  flex: 1;
  padding: 25px;
  overflow: auto;
  background-color: #e5e5de;
  background-image: radial-gradient(#cacbc3 0.7px, transparent 0.7px);
  background-size: 12px 12px;

  @media (max-width: ${breakpoints.mobile}) { padding: 14px; }
`;

const Paper = styled.article`
  width: min(100%, 520px);
  min-height: 690px;
  margin: 0 auto;
  padding: 42px 40px;
  color: #10110f;
  background: white;
  box-shadow: ${shadows.paper};
  font-family: Georgia, serif;

  @media (max-width: ${breakpoints.mobile}) { padding: 28px 24px; }
`;

const ResumeName = styled.h2`
  margin: 0;
  text-align: center;
  font-size: 21px;
  letter-spacing: 0.08em;
`;

const ContactLine = styled.div`
  margin-top: 6px;
  text-align: center;
  font-size: 7.5px;
`;

const ResumeSection = styled.h3`
  margin: 17px 0 7px;
  padding-bottom: 3px;
  border-bottom: 1px solid #222;
  font-size: 10px;
  letter-spacing: 0.08em;
`;

const RoleLine = styled.div<{ $muted?: boolean }>`
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 12px;
  margin-top: ${({ $muted }) => ($muted ? "2px" : "0")};
  font-size: ${({ $muted }) => ($muted ? "8px" : "8.5px")};

  small { font-size: 7.5px; font-weight: 400; }
  span { flex: 0 0 auto; }
`;

const ResumeList = styled.ul`
  margin: 5px 0 0;
  padding-left: 13px;
  font-size: 7.5px;
  line-height: 1.55;
`;

const SkillsLine = styled.div`
  margin-top: 4px;
  font-size: 7.5px;
`;

const FooterBar = styled.footer`
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 0 14px 0 18px;
  border-top: 1px solid ${colors.border};
  background: ${colors.surfaceStrong};
`;

const CompileStatus = styled.div<{ $compiling: boolean }>`
  display: flex;
  align-items: center;
  gap: 7px;
  color: ${({ $compiling }) => ($compiling ? colors.inkMuted : colors.forest)};
  font-size: 11px;
  font-weight: 600;
`;

const StatusDot = styled.span`
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: currentColor;
  box-shadow: 0 0 0 3px ${colors.forestPale};
`;

const FooterHint = styled.span`
  color: ${colors.inkMuted};
  font-size: 10px;

  @media (max-width: ${breakpoints.mobile}) { display: none; }
`;

const FooterActions = styled.div`
  display: flex;
  align-items: center;
  gap: 4px;
  margin-left: auto;
`;

const PrimaryButton = styled.button`
  display: inline-flex;
  height: 34px;
  align-items: center;
  gap: 7px;
  padding: 0 12px;
  border: 0;
  border-radius: 7px;
  color: white;
  background: ${colors.forest};
  font-size: 11px;
  font-weight: 700;

  &:hover { background: ${colors.forestDark}; }
`;

const MobileTabs = styled.nav`
  display: none;

  @media (max-width: ${breakpoints.tablet}) {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    min-height: 44px;
    padding: 0 12px;
    border-bottom: 1px solid ${colors.border};
    background: ${colors.surfaceStrong};
  }
`;

const MobileTab = styled.button<{ $active: boolean }>`
  position: relative;
  border: 0;
  color: ${({ $active }) => ($active ? colors.forestDark : colors.inkMuted)};
  background: transparent;
  font-size: 11px;
  font-weight: 700;
  text-transform: capitalize;

  &::after {
    position: absolute;
    right: 15%;
    bottom: 0;
    left: 15%;
    height: 2px;
    border-radius: 2px 2px 0 0;
    background: ${({ $active }) => ($active ? colors.forest : "transparent")};
    content: "";
  }
`;
