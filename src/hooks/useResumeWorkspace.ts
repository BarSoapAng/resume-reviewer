import { useCheckout } from "./useCheckout";
import { useAuth } from "./useAuth";
import { useCompiler } from "./useCompiler";
import { initialLatex } from "../assets/sampleResume";
import { useEffect, useRef, useState } from "react";
import {
  createProject,
  decideEdit,
  sendReviewMessage,
  startReview,
  updateProject,
  type Discipline as DisciplineType,
  type EditProposal,
  type ReviewIssue,
  type ReviewState,
  ApiError,
} from "../lib/api";
import { getSession } from "../lib/supabase";

type Tab = "review" | "source" | "preview";
const tabs: Tab[] = ["review", "source", "preview"];
const googleOAuthEnabled = import.meta.env.VITE_ENABLE_GOOGLE_OAUTH === "true";
const githubOAuthEnabled = import.meta.env.VITE_ENABLE_GITHUB_OAUTH === "true";

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

export function useResumeWorkspace() {
  const { authOpen, setAuthOpen, authEmail, setAuthEmail, authMessage, userEmail, emailSignIn } = useAuth();
  const [source, setSource] = useState(
    () => window.localStorage.getItem("aria:resume-source") ?? window.localStorage.getItem("draftwise:resume-source") ?? initialLatex,
  );
  const [showLanding, setShowLanding] = useState(() => !(window.localStorage.getItem("aria:resume-source") ?? window.localStorage.getItem("draftwise:resume-source")));
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
  const { checkoutPending, openCheckout } = useCheckout(setReviewError);
  const [paymentRequired, setPaymentRequired] = useState(false);
  const { compile, compileState, compileError, diagnostics, pdfUrl, editor } = useCompiler(source, showLanding);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [versions, setVersions] = useState<LocalVersion[]>(() => {
    try {
      return JSON.parse(window.localStorage.getItem("aria:resume-versions") ?? window.localStorage.getItem("draftwise:resume-versions") ?? "[]") as LocalVersion[];
    } catch {
      return [];
    }
  });
  const fileInput = useRef<HTMLInputElement>(null);
  const landingFileInput = useRef<HTMLInputElement>(null);


  useEffect(() => {
    if (showLanding) return;
    const saveTimer = window.setTimeout(() => {
      window.localStorage.setItem("aria:resume-source", source);
    }, 500);

    return () => window.clearTimeout(saveTimer);
  }, [showLanding, source]);

  useEffect(() => {
    window.localStorage.setItem("aria:resume-versions", JSON.stringify(versions.slice(0, 20)));
  }, [versions]);

  useEffect(() => {
    if (!projectId) return;
    const timer = window.setTimeout(() => {
      void updateProject(projectId, { source }).catch(() => undefined);
    }, 500);
    return () => window.clearTimeout(timer);
  }, [projectId, source]);




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
      setPaymentRequired(false);
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

  return { openCheckout, showLanding, activeTab, authEmail, authMessage, emailSignIn, authOpen, beginReview, checkoutPending, compile, compileError, compileState, createCheckpoint, diagnostics, discipline, downloadSource, editor, edits, fileInput, githubOAuthEnabled, googleOAuthEnabled, historyOpen, isDemoResume, issues, landingFileInput, landingSource, message, messages, moveTabFocus, paymentRequired, pdfUrl, projectId, resolveIssue, restoreVersion, reviewBusy, reviewError, reviewId, reviewOpen, reviewState, selectIssue, selectTab, selectedIssue, sendMessage, setActiveTab, setAuthEmail, setAuthOpen, setDiscipline, setEdits, setHistoryOpen, setIsDemoResume, setLandingSource, setMessage, setReviewError, setReviewOpen, setShowLanding, setSource, source, tabs, unresolvedCount, updateEdit, upload, userEmail, versions };
}

export type WorkspaceModel = ReturnType<typeof useResumeWorkspace>;
