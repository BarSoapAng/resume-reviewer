import { useCallback, useEffect, useRef, useState } from "react";
import CodeMirror, { type ReactCodeMirrorRef } from "@uiw/react-codemirror";
import { StreamLanguage } from "@codemirror/language";
import { stex } from "@codemirror/legacy-modes/mode/stex";
import { EditorView } from "@codemirror/view";
import { searchKeymap } from "@codemirror/search";
import { keymap } from "@codemirror/view";
import { type Diagnostic, setDiagnostics } from "@codemirror/lint";
import { Panel, PanelGroup, PanelResizeHandle } from "react-resizable-panels";
import styled from "styled-components";
import { Icon } from "./components/Icon";
import { breakpoints, colors, shadows } from "./lib/styles";
import {
  compileLatex,
  createProject,
  decideEdit,
  sendReviewMessage,
  startReview,
  updateProject,
  type CompileDiagnostic,
  type Discipline as DisciplineType,
  type EditProposal,
  type ReviewIssue,
  type ReviewState,
  ApiError,
} from "./lib/api";
import { getSession, signIn, signOut, supabase } from "./lib/supabase";

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
const tabs: Tab[] = ["review", "source", "preview"];

const demoIssues = [
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

type DisplayIssue = {
  id: string;
  severity: "high" | "medium" | "low";
  label: string;
  location: string;
  detail: string;
  question?: string;
  anchor?: ReviewIssue["sourceAnchor"];
  status: ReviewIssue["status"];
};

type LocalVersion = { id: string; source: string; reason: string; createdAt: string };

const initialIssues: DisplayIssue[] = demoIssues.map((issue) => ({
  ...issue,
  id: String(issue.id),
  severity: issue.severity as DisplayIssue["severity"],
  status: "open",
}));

function toDisplayIssues(issues: ReviewIssue[], questions: Array<{ issueIds: string[]; text: string }>): DisplayIssue[] {
  return issues.map((issue) => ({
    id: issue.id,
    severity: issue.severity,
    label: issue.description,
    location: issue.category,
    detail: issue.reasoning,
    question: questions.find((question) => question.issueIds.includes(issue.id))?.text,
    anchor: issue.sourceAnchor,
    status: issue.status,
  }));
}

function App() {
  const [source, setSource] = useState(
    () => window.localStorage.getItem("draftwise:resume-source") ?? initialLatex,
  );
  const [showLanding, setShowLanding] = useState(() => !window.localStorage.getItem("draftwise:resume-source"));
  const [landingSource, setLandingSource] = useState("");
  const [activeTab, setActiveTab] = useState<Tab>("review");
  const [reviewOpen, setReviewOpen] = useState(true);
  const [issues, setIssues] = useState<DisplayIssue[]>(initialIssues);
  const [selectedIssue, setSelectedIssue] = useState<DisplayIssue | undefined>(initialIssues[0]);
  const [isDemoResume, setIsDemoResume] = useState(source === initialLatex);
  const [discipline, setDiscipline] = useState<DisciplineType>("software");
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState<Array<{ role: "user" | "assistant"; content: string }>>([]);
  const [reviewId, setReviewId] = useState<string>();
  const [projectId, setProjectId] = useState<string>();
  const [reviewState, setReviewState] = useState<ReviewState>("imported");
  const [edits, setEdits] = useState<EditProposal[]>([]);
  const [reviewBusy, setReviewBusy] = useState(false);
  const [reviewError, setReviewError] = useState<string>();
  const [paymentRequired, setPaymentRequired] = useState(false);
  const [compileState, setCompileState] = useState<"idle" | "compiling" | "success" | "error">("idle");
  const [compileError, setCompileError] = useState<string>();
  const [diagnostics, setCompileDiagnostics] = useState<CompileDiagnostic[]>([]);
  const [pdfUrl, setPdfUrl] = useState<string>();
  const [historyOpen, setHistoryOpen] = useState(false);
  const [authOpen, setAuthOpen] = useState(false);
  const [userEmail, setUserEmail] = useState<string>();
  const [versions, setVersions] = useState<LocalVersion[]>(() => {
    try {
      return JSON.parse(window.localStorage.getItem("draftwise:resume-versions") ?? "[]") as LocalVersion[];
    } catch {
      return [];
    }
  });
  const fileInput = useRef<HTMLInputElement>(null);
  const landingFileInput = useRef<HTMLInputElement>(null);
  const editor = useRef<ReactCodeMirrorRef>(null);

  const compile = useCallback(async (latex = source) => {
    setCompileState("compiling");
    setCompileError(undefined);
    try {
      const result = await compileLatex(latex);
      const nextUrl = result.pdfUrl ?? (result.pdfBase64 ? `data:application/pdf;base64,${result.pdfBase64}` : undefined);
      setPdfUrl(nextUrl);
      setCompileDiagnostics(result.diagnostics ?? []);
      setCompileState(result.diagnostics?.some((item) => item.severity === "error") ? "error" : "success");
    } catch (error) {
      setCompileState("error");
      setCompileError(error instanceof Error ? error.message : "Compilation failed");
    }
  }, [source]);

  useEffect(() => {
    if (showLanding) return;
    const saveTimer = window.setTimeout(() => {
      window.localStorage.setItem("draftwise:resume-source", source);
    }, 500);

    return () => window.clearTimeout(saveTimer);
  }, [showLanding, source]);

  useEffect(() => {
    window.localStorage.setItem("draftwise:resume-versions", JSON.stringify(versions.slice(0, 20)));
  }, [versions]);

  useEffect(() => {
    if (!projectId) return;
    const timer = window.setTimeout(() => {
      void updateProject(projectId, { source }).catch(() => undefined);
    }, 500);
    return () => window.clearTimeout(timer);
  }, [projectId, source]);

  useEffect(() => {
    void getSession().then((session) => setUserEmail(session?.user.email));
    const subscription = supabase?.auth.onAuthStateChange((_event, session) => setUserEmail(session?.user.email));
    return () => subscription?.data.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (showLanding) return;
    const compileTimer = window.setTimeout(() => void compile(source), 700);
    return () => window.clearTimeout(compileTimer);
  }, [compile, showLanding, source]);

  useEffect(() => {
    if (showLanding) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
        event.preventDefault();
        void compile();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [compile, showLanding]);

  useEffect(() => {
    if (!editor.current?.view) return;
    const codeMirrorDiagnostics: Diagnostic[] = diagnostics.map((diagnostic) => {
      const lineNumber = Math.min(Math.max(diagnostic.line ?? 1, 1), editor.current!.view!.state.doc.lines);
      const line = editor.current!.view!.state.doc.line(lineNumber);
      return {
        from: Math.min(line.from + Math.max((diagnostic.column ?? 1) - 1, 0), line.to),
        to: line.to,
        severity: diagnostic.severity,
        message: diagnostic.message,
      };
    });
    editor.current.view.dispatch(setDiagnostics(editor.current.view.state, codeMirrorDiagnostics));
  }, [diagnostics]);

  const upload = (file?: File) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        createCheckpoint("Initial upload", reader.result);
        setSource(reader.result);
        setIsDemoResume(false);
        setIssues([]);
        setSelectedIssue(undefined);
        setReviewId(undefined);
        setProjectId(undefined);
        setReviewState("imported");
        setMessages([]);
        setEdits([]);
        setActiveTab("source");
        setShowLanding(false);
      }
    };
    reader.readAsText(file);
  };

  const applyTurn = (turn: Awaited<ReturnType<typeof sendReviewMessage>>) => {
    const nextIssues = toDisplayIssues(turn.issues, turn.questions);
    setIssues(nextIssues);
    setSelectedIssue((current) => nextIssues.find((issue) => issue.id === current?.id) ?? nextIssues[0]);
    setReviewState(turn.state);
    setEdits(turn.edits);
    if (turn.message) setMessages((current) => [...current, { role: "assistant", content: turn.message }]);
  };

  const sendMessage = async () => {
    const nextMessage = message.trim();
    if (!nextMessage || !reviewId || reviewBusy) return;
    setMessages((current) => [...current, { role: "user", content: nextMessage }]);
    setMessage("");
    setReviewBusy(true);
    setReviewError(undefined);
    setPaymentRequired(false);
    try {
      applyTurn(await sendReviewMessage(reviewId, nextMessage));
    } catch (error) {
      setReviewError(error instanceof Error ? error.message : "The reviewer could not respond");
    } finally {
      setReviewBusy(false);
    }
  };

  const beginReview = async () => {
    if (reviewBusy) return;
    if (!await getSession()) {
      setAuthOpen(true);
      return;
    }
    setReviewOpen(true);
    setActiveTab("review");
    setReviewBusy(true);
    setReviewError(undefined);
    try {
      const currentProjectId = projectId ?? (await createProject("Technical resume", discipline, source)).id;
      setProjectId(currentProjectId);
      const turn = await startReview(currentProjectId);
      setReviewId(turn.id);
      applyTurn(turn);
      setIsDemoResume(false);
    } catch (error) {
      setPaymentRequired(error instanceof ApiError && error.status === 402);
      setReviewError(error instanceof Error ? error.message : "Sign in is required to start a review");
    } finally {
      setReviewBusy(false);
    }
  };

  const downloadSource = () => {
    const url = URL.createObjectURL(new Blob([source], { type: "application/x-tex" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = "resume.tex";
    link.click();
    URL.revokeObjectURL(url);
  };

  const createCheckpoint = (reason = "Manual checkpoint", checkpointSource = source) => {
    setVersions((current) => [{ id: crypto.randomUUID(), source: checkpointSource, reason, createdAt: new Date().toISOString() }, ...current].slice(0, 20));
  };

  const restoreVersion = (version: LocalVersion) => {
    createCheckpoint("Before restore");
    setSource(version.source);
    setIsDemoResume(false);
    setHistoryOpen(false);
    void compile(version.source);
  };

  const resolveIssue = () => {
    if (!selectedIssue) return;
    setIssues((current) => current.map((issue) => issue.id === selectedIssue.id ? { ...issue, status: "skipped" } : issue));
    setSelectedIssue((current) => current ? { ...current, status: "skipped" } : current);
  };

  const unresolvedCount = issues.filter((issue) => issue.status === "open" || issue.status === "probing").length;

  const selectIssue = (issue: DisplayIssue) => {
    setSelectedIssue(issue);
    const exactText = issue.anchor?.exactText;
    if (!exactText || !editor.current?.view) return;
    const from = source.indexOf(exactText);
    if (from < 0) return;
    editor.current.view.dispatch({ selection: { anchor: from, head: from + exactText.length }, scrollIntoView: true });
  };

  const updateEdit = async (edit: EditProposal, decision: "accept" | "reject") => {
    try {
      const result = await decideEdit(edit.id, decision);
      setEdits((current) => current.map((item) => item.id === edit.id ? { ...item, status: result.status } : item));
      if (result.source) {
        setSource(result.source);
        createCheckpoint("AI rewrite", result.source);
        await compile(result.source);
      }
    } catch (error) {
      setReviewError(error instanceof Error ? error.message : "The edit could not be updated");
    }
  };

  const selectTab = (tab: Tab) => {
    if (tab === "review") setReviewOpen(true);
    setActiveTab(tab);
  };

  const moveTabFocus = (currentTab: Tab, direction: 1 | -1) => {
    const nextIndex = (tabs.indexOf(currentTab) + direction + tabs.length) % tabs.length;
    const nextTab = tabs[nextIndex]!;
    selectTab(nextTab);
    document.getElementById(`workspace-tab-${nextTab}`)?.focus();
  };

  if (showLanding) {
    return (
      <LandingShell>
        <LandingNav>
          <Brand><BrandMark><Icon name="sparkles" size={17} /></BrandMark><BrandName>draftwise</BrandName></Brand>
          <LandingNote>Open source · No account needed to compile</LandingNote>
        </LandingNav>
        <LandingMain>
          <LandingEyebrow>For software & mechanical engineering students</LandingEyebrow>
          <LandingTitle>A technical resume reviewer that asks before it assumes.</LandingTitle>
          <LandingCopy>Compile your existing one-file LaTeX resume, understand what is weak, and turn verified details into stronger bullets.</LandingCopy>
          <ImportCard>
            <ImportTabs>Paste LaTeX or upload a <code>.tex</code> file</ImportTabs>
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

  return (
    <AppShell>
      <Header>
        <Brand>
          <BrandMark><Icon name="sparkles" size={17} /></BrandMark>
          <BrandName>draftwise</BrandName>
        </Brand>
        <DocumentMeta>
          <DocumentTitle>{isDemoResume ? "Alex Morgan — Software Resume" : "Uploaded resume"}</DocumentTitle>
          <Discipline
            aria-label="Resume discipline"
            onChange={(event) => {
              const next = event.target.value as DisciplineType;
              setDiscipline(next);
              if (projectId) void updateProject(projectId, { discipline: next });
            }}
            value={discipline}
          >
            <option value="software">Software engineering</option>
            <option value="mechanical">Mechanical engineering</option>
          </Discipline>
        </DocumentMeta>
        <HeaderActions>
          <SavedState><Icon name="check" size={14} /> Saved just now</SavedState>
          <HistoryWrap>
            <IconButton aria-expanded={historyOpen} aria-label="Version history" onClick={() => setHistoryOpen((open) => !open)} title="Version history"><Icon name="history" /></IconButton>
            {historyOpen && (
              <HistoryPopover>
                <HistoryHeading>
                  <strong>Version history</strong>
                  <TextButton onClick={() => createCheckpoint()}>Checkpoint</TextButton>
                </HistoryHeading>
                {versions.length === 0 ? <HistoryEmpty>No checkpoints yet.</HistoryEmpty> : versions.map((version) => (
                  <HistoryItem key={version.id} onClick={() => restoreVersion(version)}>
                    <strong>{version.reason}</strong>
                    <span>{new Date(version.createdAt).toLocaleString()}</span>
                  </HistoryItem>
                ))}
              </HistoryPopover>
            )}
          </HistoryWrap>
          <Avatar as="button" aria-label={userEmail ? `Sign out ${userEmail}` : "Sign in"} onClick={() => userEmail ? void signOut() : setAuthOpen(true)} title={userEmail ?? "Sign in"}>{userEmail ? userEmail.slice(0, 2).toUpperCase() : "?"}</Avatar>
        </HeaderActions>
      </Header>

      <MobileTabs aria-label="Workspace views" role="tablist">
        {tabs.map((tab) => (
          <MobileTab
            key={tab}
            $active={activeTab === tab}
            aria-controls={`workspace-panel-${tab}`}
            aria-selected={activeTab === tab}
            id={`workspace-tab-${tab}`}
            onClick={() => selectTab(tab)}
            onKeyDown={(event) => {
              if (event.key === "ArrowRight") moveTabFocus(tab, 1);
              if (event.key === "ArrowLeft") moveTabFocus(tab, -1);
            }}
            role="tab"
            tabIndex={activeTab === tab ? 0 : -1}
          >
            {tab === "review" && unresolvedCount > 0 ? `Review · ${unresolvedCount}` : tab}
          </MobileTab>
        ))}
      </MobileTabs>

      <Workspace>
        <PanelGroup direction="horizontal">
          {reviewOpen && (
            <>
              <Panel className={activeTab === "review" ? "" : "mobile-hidden"} defaultSize={27} minSize={22} order={1}>
                <PanelFrame $mobileActive={activeTab === "review"} aria-labelledby="workspace-tab-review" id="workspace-panel-review" role="tabpanel">
                  <PanelHeader>
                    <PanelTitleWrap>
                      <PanelEyebrow>{isDemoResume && !reviewId ? "AI reviewer · Demo" : `AI reviewer · ${reviewState.replaceAll("_", " ")}`}</PanelEyebrow>
                      <PanelTitle>{reviewBusy ? "Reviewing your evidence…" : "Let’s make this stronger."}</PanelTitle>
                    </PanelTitleWrap>
                    <IconButton aria-label="Collapse review panel" onClick={() => {
                      setReviewOpen(false);
                      setActiveTab("source");
                    }} title="Collapse panel">
                      <Icon name="collapse" size={16} />
                    </IconButton>
                  </PanelHeader>
                  <ReviewBody>
                    {!isDemoResume && !reviewId && (
                      <UnavailableNotice>
                        <ReviewerIcon><Icon name="sparkles" size={16} /></ReviewerIcon>
                        <div>
                          <ReviewerName>Review not started</ReviewerName>
                          <ReviewerCopy>Your source is ready. Sign in and start a review when you want structured feedback.</ReviewerCopy>
                        </div>
                      </UnavailableNotice>
                    )}
                    {issues.length > 0 && <>
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
                      <ProgressCount>{issues.length - unresolvedCount} of {issues.length} addressed</ProgressCount>
                    </ProgressRow>
                    <ProgressTrack><ProgressFill $progress={issues.length ? ((issues.length - unresolvedCount) / issues.length) * 100 : 0} /></ProgressTrack>

                    <SectionLabel>Priority feedback</SectionLabel>
                    <IssueList>
                      {issues.map((issue) => (
                        <IssueCard
                          key={issue.id}
                          $active={selectedIssue?.id === issue.id}
                          $resolved={issue.status === "resolved" || issue.status === "skipped"}
                        >
                          <IssueSummaryButton
                            aria-expanded={selectedIssue?.id === issue.id}
                            onClick={() => selectIssue(issue)}
                          >
                            <IssueTopline>
                              <Severity $severity={issue.severity}>
                                {issue.status === "resolved" || issue.status === "skipped" ? issue.status : issue.severity}
                              </Severity>
                              <span>{issue.location}</span>
                            </IssueTopline>
                            <IssueTitle>{issue.label}</IssueTitle>
                          </IssueSummaryButton>
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

                    {messages.map((item, index) => item.role === "user" ? (
                      <UserMessage key={`${item.content}-${index}`}>{item.content}</UserMessage>
                    ) : (
                      <AssistantMessage key={`${item.content}-${index}`}>{item.content}</AssistantMessage>
                    ))}
                    {edits.filter((edit) => edit.status === "pending" || edit.status === "stale").map((edit) => (
                      <EditCard key={edit.id}>
                        <QuestionLabel>Proposed edit</QuestionLabel>
                        <DiffLine $removed>- {edit.oldText}</DiffLine>
                        <DiffLine>+ {edit.newText}</DiffLine>
                        <ReviewerCopy>{edit.explanation}</ReviewerCopy>
                        <IssueActions>
                          <TextButton onClick={() => void updateEdit(edit, "reject")}>Reject</TextButton>
                          <AnswerButton disabled={edit.status === "stale"} onClick={() => void updateEdit(edit, "accept")}>
                            {edit.status === "stale" ? "Outdated" : "Accept"}
                          </AnswerButton>
                        </IssueActions>
                      </EditCard>
                    ))}
                    {reviewError && <ErrorNotice role="alert">{reviewError}</ErrorNotice>}
                    {paymentRequired && (
                      <PaymentCard>
                        <strong>Pay what you want, starting at $1</strong>
                        <span>Use the same email as your Draftwise account. One payment unlocks one complete review.</span>
                        <a href={import.meta.env.VITE_KOFI_PAYMENT_URL ?? "#"} rel="noreferrer" target="_blank">Continue to Ko-fi</a>
                        <TextButton onClick={() => void beginReview()}>I’ve paid — check again</TextButton>
                      </PaymentCard>
                    )}
                    </>}
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
                      disabled={!reviewId || reviewBusy}
                      placeholder={reviewId ? "Answer the reviewer…" : "Start a review to answer questions"}
                      rows={2}
                      value={message}
                    />
                    <SendButton aria-label="Send message" disabled={!reviewId || reviewBusy || !message.trim()} onClick={() => void sendMessage()}>
                      <Icon name="arrow" size={17} />
                    </SendButton>
                  </Composer>
                </PanelFrame>
              </Panel>
              <ResizeHandle />
            </>
          )}

          <Panel className={activeTab === "source" ? "" : "mobile-hidden"} defaultSize={reviewOpen ? 37 : 48} minSize={28} order={2}>
            <PanelFrame $mobileActive={activeTab === "source"} aria-labelledby="workspace-tab-source" id="workspace-panel-source" role="tabpanel">
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
                <SelectedAnchor>{selectedIssue?.anchor?.exactText ?? (selectedIssue ? "Select feedback to locate its source" : "No feedback linked")}</SelectedAnchor>
              </EditorMeta>
              <EditorWrap>
                <CodeMirror
                  ref={editor}
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
                    keymap.of(searchKeymap),
                  ]}
                  height="100%"
                  onChange={(value) => {
                    setSource(value);
                    setIsDemoResume(false);
                    setEdits((current) => current.map((edit) => edit.status === "pending" ? { ...edit, status: "stale" } : edit));
                  }}
                  theme="light"
                  value={source}
                />
              </EditorWrap>
              {(diagnostics.length > 0 || compileError) && (
                <DiagnosticsPanel aria-live="polite">
                  {compileError && <DiagnosticRow $severity="error">{compileError}</DiagnosticRow>}
                  {diagnostics.slice(0, 4).map((diagnostic, index) => (
                    <DiagnosticRow key={`${diagnostic.line}-${diagnostic.message}-${index}`} $severity={diagnostic.severity}>
                      {diagnostic.line ? `Line ${diagnostic.line}: ` : ""}{diagnostic.message}
                    </DiagnosticRow>
                  ))}
                </DiagnosticsPanel>
              )}
              <EditorStatus>
                <span>Ln 14, Col 3</span>
                <span>LaTeX</span>
                <span>UTF-8</span>
              </EditorStatus>
            </PanelFrame>
          </Panel>

          <ResizeHandle />
          <Panel className={activeTab === "preview" ? "" : "mobile-hidden"} defaultSize={36} minSize={28} order={3}>
            <PanelFrame $mobileActive={activeTab === "preview"} aria-labelledby="workspace-tab-preview" id="workspace-panel-preview" role="tabpanel">
              <ToolHeader>
                <ToolTitle>Preview</ToolTitle>
                <ToolActions>
                  <CompileButton disabled={compileState === "compiling"} onClick={() => void compile()} title="Compile (Ctrl/Cmd + Enter)">
                    <Icon name="play" size={14} /> {compileState === "compiling" ? "Compiling…" : "Compile"}
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
                    <strong>{compileState === "compiling" ? "Compiling resume" : "Preview unavailable"}</strong>
                    <span>{compileError ?? "Start the compiler service, then retry. Your LaTeX source is still saved locally."}</span>
                  </PreviewUnavailable>
                ) : (
                <Paper>
                  <PreviewBadge>Sample preview</PreviewBadge>
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
                )}
              </PreviewCanvas>
            </PanelFrame>
          </Panel>
        </PanelGroup>
      </Workspace>

      <FooterBar>
        <CompileStatus>
          <StatusDot $state={compileState} /> {compileState === "success" ? "Compiled" : compileState === "compiling" ? "Compiling…" : compileState === "error" ? "Compile failed" : "Ready to compile"}
        </CompileStatus>
        <FooterHint>{diagnostics.length ? `${diagnostics.length} compiler diagnostic${diagnostics.length === 1 ? "" : "s"}` : "Changes are saved locally"}</FooterHint>
        <FooterActions>
          <FooterDownloadButton aria-label="Download .tex source" onClick={downloadSource}><Icon name="download" size={15} /><span>Download .tex</span></FooterDownloadButton>
          <PrimaryButton disabled={reviewBusy || Boolean(reviewId)} onClick={() => void beginReview()}>
            <Icon name="sparkles" size={15} /> {reviewId ? "Review active" : reviewBusy ? "Starting…" : "Start review"}
          </PrimaryButton>
        </FooterActions>
      </FooterBar>
      {authOpen && (
        <ModalBackdrop role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setAuthOpen(false); }}>
          <AuthDialog aria-labelledby="auth-title" role="dialog" aria-modal="true">
            <PanelEyebrow>Save and review</PanelEyebrow>
            <PanelTitle id="auth-title">Sign in to start your AI review</PanelTitle>
            <ReviewerCopy>Your current draft will stay here while you sign in. Hosted reviews require one review entitlement.</ReviewerCopy>
            <AuthActions>
              <AuthButton onClick={() => void signIn("google")}>Continue with Google</AuthButton>
              <AuthButton onClick={() => void signIn("github")}>Continue with GitHub</AuthButton>
            </AuthActions>
            <TextButton onClick={() => setAuthOpen(false)}>Not now</TextButton>
          </AuthDialog>
        </ModalBackdrop>
      )}
    </AppShell>
  );
}

export default App;

const LandingShell = styled.main`
  min-height: 100vh;
  color: ${colors.ink};
  background: radial-gradient(circle at 50% 20%, ${colors.forestPale}, ${colors.canvas} 42%);
`;

const LandingNav = styled.header`
  display: flex;
  height: 64px;
  align-items: center;
  justify-content: space-between;
  padding: 0 24px;
  border-bottom: 1px solid ${colors.border};
  background: rgba(251, 251, 248, 0.85);
`;

const LandingNote = styled.span`
  color: ${colors.inkMuted};
  font-size: 11px;

  @media (max-width: ${breakpoints.mobile}) { display: none; }
`;

const LandingMain = styled.section`
  display: grid;
  width: min(100% - 32px, 760px);
  margin: 0 auto;
  padding: 72px 0;
  justify-items: center;
  text-align: center;
`;

const LandingEyebrow = styled.div`
  color: ${colors.forest};
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.1em;
  text-transform: uppercase;
`;

const LandingTitle = styled.h1`
  max-width: 680px;
  margin: 17px 0 13px;
  font-family: "Manrope", sans-serif;
  font-size: clamp(36px, 6vw, 58px);
  line-height: 1.04;
  letter-spacing: -0.055em;
`;

const LandingCopy = styled.p`
  max-width: 590px;
  margin: 0;
  color: ${colors.inkMuted};
  font-size: 16px;
  line-height: 1.6;
`;

const ImportCard = styled.div`
  width: min(100%, 650px);
  margin-top: 35px;
  padding: 15px;
  border: 1px solid ${colors.borderStrong};
  border-radius: 14px;
  background: ${colors.surfaceStrong};
  box-shadow: ${shadows.soft};
  text-align: left;
`;

const ImportTabs = styled.div`
  padding: 2px 2px 11px;
  color: ${colors.inkMuted};
  font-size: 11px;
  font-weight: 600;
`;

const ImportTextarea = styled.textarea`
  width: 100%;
  min-height: 190px;
  padding: 13px;
  resize: vertical;
  border: 1px solid ${colors.border};
  border-radius: 9px;
  color: ${colors.code};
  background: #fafaf7;
  font-family: "DM Mono", monospace;
  font-size: 11px;
  line-height: 1.55;
`;

const ImportActions = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding-top: 12px;
`;

const LandingPrivacy = styled.p`
  max-width: 520px;
  margin: 16px 0 0;
  color: ${colors.inkMuted};
  font-size: 10px;
`;

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

const Brand = styled.div`
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

const Discipline = styled.select`
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

const HistoryWrap = styled.div`
  position: relative;
`;

const HistoryPopover = styled.div`
  position: absolute;
  z-index: 20;
  top: 40px;
  right: 0;
  width: 270px;
  max-height: 360px;
  padding: 10px;
  overflow: auto;
  border: 1px solid ${colors.borderStrong};
  border-radius: 10px;
  background: ${colors.surfaceStrong};
  box-shadow: ${shadows.soft};
`;

const HistoryHeading = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 3px 4px 8px;
  font-size: 12px;
`;

const HistoryItem = styled.button`
  display: grid;
  width: 100%;
  gap: 3px;
  padding: 9px;
  border: 0;
  border-radius: 7px;
  color: ${colors.ink};
  background: transparent;
  text-align: left;

  &:hover { background: ${colors.forestPale}; }
  strong { font-size: 11px; }
  span { color: ${colors.inkMuted}; font-size: 9px; }
`;

const HistoryEmpty = styled.p`
  margin: 4px;
  color: ${colors.inkMuted};
  font-size: 11px;
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

const Avatar = styled.div`
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

const DownloadIconLink = styled.a<{ $disabled: boolean }>`
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

const UnavailableNotice = styled(ReviewerIntro)`
  padding: 13px;
  border: 1px solid ${colors.border};
  border-radius: 10px;
  background: ${colors.surfaceStrong};
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

const IssueCard = styled.div<{ $active: boolean; $resolved: boolean }>`
  width: 100%;
  border: 1px solid ${({ $active }) => ($active ? colors.forest : colors.border)};
  border-radius: 10px;
  color: inherit;
  background: ${({ $active, $resolved }) => ($resolved ? colors.forestPale : $active ? colors.surfaceStrong : "transparent")};
  box-shadow: ${({ $active }) => ($active ? "0 4px 16px rgba(35, 37, 31, 0.06)" : "none")};
  transition: border-color 150ms ease, background 150ms ease, box-shadow 150ms ease;

  &:hover { border-color: ${colors.borderStrong}; }
`;

const IssueSummaryButton = styled.button`
  width: 100%;
  padding: 13px;
  border: 0;
  color: inherit;
  background: transparent;
  text-align: left;
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
  padding: 0 13px 13px;

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

const TextButton = styled.button`
  padding: 6px 4px;
  border: 0;
  color: ${colors.inkMuted};
  background: transparent;
  font-size: 11px;
  font-weight: 600;
`;

const AnswerButton = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 7px 9px;
  border: 0;
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

const AssistantMessage = styled.div`
  max-width: 92%;
  margin-top: 14px;
  padding: 10px 12px;
  border: 1px solid ${colors.border};
  border-radius: 2px 10px 10px 10px;
  background: ${colors.surfaceStrong};
  font-size: 12px;
  line-height: 1.5;
`;

const EditCard = styled.div`
  display: grid;
  gap: 8px;
  margin-top: 14px;
  padding: 12px;
  border: 1px solid ${colors.borderStrong};
  border-radius: 10px;
  background: ${colors.surfaceStrong};
`;

const DiffLine = styled.code<{ $removed?: boolean }>`
  display: block;
  padding: 7px 8px;
  border-radius: 5px;
  color: ${({ $removed }) => ($removed ? colors.red : colors.forestDark)};
  background: ${({ $removed }) => ($removed ? colors.redPale : colors.forestPale)};
  font-size: 10px;
  line-height: 1.45;
  white-space: pre-wrap;
`;

const ErrorNotice = styled.p`
  margin: 14px 0 0;
  padding: 10px;
  border-radius: 7px;
  color: ${colors.red};
  background: ${colors.redPale};
  font-size: 11px;
  line-height: 1.45;
`;

const PaymentCard = styled.div`
  display: grid;
  gap: 9px;
  margin-top: 10px;
  padding: 13px;
  border: 1px solid ${colors.apricot};
  border-radius: 9px;
  background: ${colors.apricotPale};
  font-size: 11px;
  line-height: 1.45;

  span { color: ${colors.inkMuted}; }
  a { padding: 8px 10px; border-radius: 6px; color: white; background: ${colors.forest}; font-weight: 700; text-align: center; text-decoration: none; }
`;

const Composer = styled.div`
  position: relative;
  margin: auto 14px 14px;
  border: 1px solid ${colors.borderStrong};
  border-radius: 10px;
  background: ${colors.surfaceStrong};
  box-shadow: ${shadows.soft};

  &:focus-within {
    border-color: ${colors.forest};
    box-shadow: 0 0 0 2px ${colors.forestPale};
  }
`;

const ComposerInput = styled.textarea`
  display: block;
  width: 100%;
  min-height: 68px;
  padding: 12px 43px 12px 12px;
  resize: none;
  border: 0;
  color: ${colors.ink};
  background: transparent;
  font-size: 12px;
  line-height: 1.45;

  &::placeholder { color: #9a9c94; }
  &:focus-visible { outline: none; }
  &:disabled { cursor: not-allowed; background: #f5f5f1; }
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

const DiagnosticsPanel = styled.div`
  max-height: 112px;
  padding: 8px 12px;
  overflow: auto;
  border-top: 1px solid ${colors.border};
  background: ${colors.surfaceStrong};
`;

const DiagnosticRow = styled.div<{ $severity: "error" | "warning" }>`
  padding: 3px 0;
  color: ${({ $severity }) => ($severity === "error" ? colors.red : colors.inkMuted)};
  font-family: "DM Mono", monospace;
  font-size: 9px;
  line-height: 1.4;
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

const PdfFrame = styled.iframe`
  display: block;
  width: min(100%, 760px);
  height: 100%;
  min-height: 620px;
  margin: 0 auto;
  border: 0;
  background: white;
  box-shadow: ${shadows.paper};
`;

const PreviewUnavailable = styled.div`
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
  background: rgba(251, 251, 248, 0.92);
  text-align: center;

  strong { font-size: 14px; }
  span { max-width: 260px; color: ${colors.inkMuted}; font-size: 12px; line-height: 1.5; }
`;

const PreviewUnavailableIcon = styled.div`
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
  position: relative;
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

const PreviewBadge = styled.span`
  position: absolute;
  top: 12px;
  right: 12px;
  padding: 4px 6px;
  border-radius: 4px;
  color: ${colors.inkMuted};
  background: ${colors.canvas};
  font-family: "DM Sans", sans-serif;
  font-size: 7px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
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

const CompileStatus = styled.div`
  display: flex;
  align-items: center;
  gap: 7px;
  color: ${colors.inkMuted};
  font-size: 11px;
  font-weight: 600;
`;

const StatusDot = styled.span<{ $state: "idle" | "compiling" | "success" | "error" }>`
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: ${({ $state }) => $state === "success" ? colors.forest : $state === "error" ? colors.red : $state === "compiling" ? colors.apricot : colors.inkMuted};
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

const FooterDownloadButton = styled(QuietButton)`
  @media (max-width: ${breakpoints.mobile}) {
    width: 32px;
    padding: 0;
    justify-content: center;

    span { display: none; }
  }
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
  &:disabled { cursor: not-allowed; opacity: 0.45; }
`;

const ModalBackdrop = styled.div`
  position: fixed;
  z-index: 50;
  inset: 0;
  display: grid;
  place-items: center;
  padding: 20px;
  background: rgba(24, 29, 24, 0.48);
`;

const AuthDialog = styled.section`
  display: grid;
  width: min(100%, 390px);
  gap: 13px;
  padding: 24px;
  border-radius: 14px;
  background: ${colors.surfaceStrong};
  box-shadow: 0 24px 70px rgba(20, 24, 20, 0.25);
`;

const AuthActions = styled.div`
  display: grid;
  gap: 8px;
  margin-top: 5px;
`;

const AuthButton = styled.button`
  min-height: 40px;
  border: 1px solid ${colors.borderStrong};
  border-radius: 8px;
  color: ${colors.ink};
  background: ${colors.surfaceStrong};
  font-size: 12px;
  font-weight: 700;

  &:hover { border-color: ${colors.forest}; background: ${colors.forestPale}; }
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
