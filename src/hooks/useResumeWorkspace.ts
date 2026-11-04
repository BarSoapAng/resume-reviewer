import { useCheckout } from "./useCheckout";
import { useAuth } from "./useAuth";
import { useCompiler } from "./useCompiler";
import { initialLatex } from "../assets/sampleResume";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import {
  createProject,
  decideEdit,
  streamReview,
  listProjectVersions,
  updateProject,
  type Discipline as DisciplineType,
  type EditProposal,
  type ReviewIssue,
  type ReviewState,
  ApiError,
} from "../lib/api";
import { WorkspaceSaver, downloadFilename, migrateVersions, retainVersions } from "../lib/workspacePersistence";
import type { ConversationMessage, DocumentSnapshot, QuestionSubmission, SaveState, WorkspaceVersion } from "../../packages/reviewer/src/conversation";
import { getSession } from "../lib/supabase";

type Tab = "review" | "source" | "preview";
const tabs: Tab[] = ["review", "source", "preview"];
const googleOAuthEnabled = import.meta.env.VITE_ENABLE_GOOGLE_OAUTH === "true";
const githubOAuthEnabled = import.meta.env.VITE_ENABLE_GITHUB_OAUTH === "true";

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

function toDisplayIssues(issues: ReviewIssue[], questions: Array<{ issueIds: string[]; text: string; }>): DisplayIssue[] {
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
  const [initial] = useState(() => {
    try { return (JSON.parse(localStorage.getItem("aria:workspace") ?? "null") as DocumentSnapshot | null) ?? { documentId: crypto.randomUUID(), filename: "resume.tex", discipline: "software" as DisciplineType, source: localStorage.getItem("aria:resume-source") ?? localStorage.getItem("draftwise:resume-source") ?? initialLatex }; }
    catch { return { documentId: crypto.randomUUID(), filename: "resume.tex", discipline: "software" as DisciplineType, source: initialLatex }; }
  });
  const [documentId, setDocumentId] = useState(initial.documentId);
  const [conversationDraft] = useState(() => {
    try { return JSON.parse(localStorage.getItem(`aria:conversation:${initial.documentId}`) ?? "{}") as { message?: string; messages?: ConversationMessage[]; edits?: EditProposal[]; projectId?: string; reviewId?: string }; }
    catch { return {}; }
  });
  const [filename, setFilenameState] = useState(initial.filename);
  const setFilename = (name: string) => { if (name.trim()) setFilenameState(name.trim()); };
  const [source, setSource] = useState(initial.source);
  const [showLanding, setShowLanding] = useState(() => { try { return !localStorage.getItem("aria:workspace") && !localStorage.getItem("aria:resume-source") && !localStorage.getItem("draftwise:resume-source"); } catch { return true; } });
  const [landingSource, setLandingSource] = useState("");
  const [activeTab, setActiveTab] = useState<Tab>("review");
  const [reviewOpen, setReviewOpen] = useState(true);
  const [issues, setIssues] = useState<DisplayIssue[]>([]);
  const [selectedIssue, setSelectedIssue] = useState<DisplayIssue | undefined>(undefined);
  const [isDemoResume, setIsDemoResume] = useState(source === initialLatex);
  const [discipline, setDiscipline] = useState<DisciplineType>(initial.discipline);
  const [message, setMessage] = useState(conversationDraft.message ?? "");
  const [messages, setMessages] = useState<ConversationMessage[]>(conversationDraft.messages ?? []);
  const [reviewId, setReviewId] = useState<string | undefined>(conversationDraft.reviewId);
  const [projectId, setProjectId] = useState<string | undefined>(conversationDraft.projectId);
  const [reviewState, setReviewState] = useState<ReviewState>("imported");
  const [edits, setEdits] = useState<EditProposal[]>(conversationDraft.edits ?? []);
  const [reviewBusy, setReviewBusy] = useState(false);
  const [reviewError, setReviewError] = useState<string>();
  const { checkoutPending, openCheckout } = useCheckout(setReviewError);
  const [paymentRequired, setPaymentRequired] = useState(false);
  const { compile, compileState, compileError, diagnostics, pdfUrl, editor } = useCompiler(source, showLanding);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [versions, setVersions] = useState<WorkspaceVersion[]>(() => {
    try { return migrateVersions(JSON.parse(localStorage.getItem(`aria:versions:${initial.documentId}`) ?? localStorage.getItem("aria:resume-versions") ?? localStorage.getItem("draftwise:resume-versions") ?? "[]"), initial); } catch { return []; }
  });
  const [saveState, setSaveState] = useState<SaveState>("pending");
  const latest = useRef({ documentId, source, filename, discipline, projectId, versions });
  useLayoutEffect(() => { latest.current = { documentId, source, filename, discipline, projectId, versions }; });
  // The persistence callback reads this ref only when a queued save runs.
  // eslint-disable-next-line react-hooks/refs
  const [saver] = useState(() => new WorkspaceSaver(async (snapshot, requestedVersion) => {
    const current = latest.current;
    if (current.documentId !== snapshot.documentId) return false;
    const existing = current.versions[0];
    const unchanged = existing && existing.source === snapshot.source && existing.filename === snapshot.filename && existing.discipline === snapshot.discipline;
    const version: WorkspaceVersion = requestedVersion ?? (unchanged ? existing : { ...snapshot, id: crypto.randomUUID(), createdAt: new Date().toISOString(), reason: "Autosaved", kind: "autosave" });
    const history = retainVersions(current.versions.some((item) => item.id === version.id) ? current.versions : [version, ...current.versions]);
    localStorage.setItem("aria:workspace", JSON.stringify(snapshot));
    localStorage.setItem(`aria:versions:${snapshot.documentId}`, JSON.stringify(history));
    if (current.projectId) await updateProject(current.projectId, { source: snapshot.source, title: snapshot.filename, discipline: snapshot.discipline, version });
    if (latest.current.documentId === snapshot.documentId) setVersions((items) => retainVersions(items.some((v) => v.id === version.id) ? items : [version, ...items]));
    return !!current.projectId;
  }, setSaveState));
  const fileInput = useRef<HTMLInputElement>(null);
  const landingFileInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (showLanding) return;
    saver.schedule({ documentId, source, filename, discipline });
  }, [showLanding, source, filename, discipline, documentId, projectId, saver]);
  useEffect(() => {
    if (!projectId) return;
    let cancelled = false;
    void listProjectVersions(projectId).then((remote) => {
      if (cancelled) return;
      setVersions((local) => retainVersions([...local, ...remote.filter((v) => !local.some((item) => item.id === v.id)).map((v) => ({ ...v, documentId }))].sort((a, b) => b.createdAt.localeCompare(a.createdAt))));
    }).catch(() => undefined);
    return () => { cancelled = true; };
  }, [projectId, documentId]);
  useEffect(() => {
    const preserve = () => {
      try {
        const { documentId, source, filename, discipline, versions } = latest.current;
        localStorage.setItem("aria:workspace", JSON.stringify({ documentId, source, filename, discipline }));
        localStorage.setItem(`aria:versions:${documentId}`, JSON.stringify(versions));
      } catch { setSaveState("failed"); }
    };
    window.addEventListener("pagehide", preserve);
    return () => { window.removeEventListener("pagehide", preserve); saver.cancel(); };
  }, [saver]);
  const retrySave = () => saver.flush({ documentId, source, filename, discipline }).catch(() => undefined);
  useEffect(() => {
    try { localStorage.setItem(`aria:conversation:${documentId}`, JSON.stringify({ message, messages, edits, reviewId, projectId })); }
    catch {
      // Storage failures must be reflected in the persistent save indicator.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setSaveState("failed");
    }
  }, [documentId, message, messages, edits, reviewId, projectId]);

  const upload = (file?: File) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        saver.cancel();
        abortReview.current?.abort();
        retryTurn.current = null;
        const nextId = crypto.randomUUID();
        setDocumentId(nextId); setFilename(file.name);
        setVersions([{ documentId: nextId, source: reader.result, filename: file.name, discipline, id: crypto.randomUUID(), createdAt: new Date().toISOString(), kind: "upload", reason: "Initial upload" }]);
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

  const busy = useRef(false);
  const abortReview = useRef<AbortController | null>(null);
  const retryTurn = useRef<{ id: string; content: string; questions?: QuestionSubmission; path?: string } | null>(null);
  useEffect(() => () => { abortReview.current?.abort(); }, []);
  const submit = async (content: string, questions?: QuestionSubmission) => {
    if (busy.current) return;
    busy.current = true;
    if (!await getSession()) { busy.current = false; setAuthOpen(true); setReviewError("Please sign in to start your review."); return; }
    setReviewBusy(true); setReviewError(undefined); setPaymentRequired(false);
    const turnId = retryTurn.current?.content === content && JSON.stringify(retryTurn.current.questions) === JSON.stringify(questions) ? retryTurn.current.id : crypto.randomUUID();
    retryTurn.current = { id: turnId, content, questions, path: retryTurn.current?.id === turnId ? retryTurn.current.path : undefined };
    const doc = documentId;
    const controller = new AbortController();
    // The mutable controller ref is intentionally replaced for each submission.
    // eslint-disable-next-line react-hooks/immutability
    abortReview.current = controller;
    try {
      await saver.flush({ documentId, source, filename, discipline }, undefined, true);
      const currentProjectId = projectId ?? (await createProject(filename, discipline, source)).id;
      if (latest.current.documentId !== doc) return;
      setProjectId(currentProjectId);
      latest.current.projectId = currentProjectId;
      if (!projectId) saver.invalidate();
      let currentSnapshot: DocumentSnapshot;
      do {
        const current = latest.current;
        currentSnapshot = { documentId: current.documentId, source: current.source, filename: current.filename, discipline: current.discipline };
        if (currentSnapshot.documentId !== doc) return;
        await saver.flush(currentSnapshot, undefined, true);
      } while (currentSnapshot.source !== latest.current.source || currentSnapshot.filename !== latest.current.filename || currentSnapshot.discipline !== latest.current.discipline);
      const path = retryTurn.current!.path ?? (reviewId ? `/api/reviews/${reviewId}/messages` : `/api/projects/${currentProjectId}/reviews`);
      retryTurn.current!.path = path;
      setMessages((items) => items.filter((m) => m.id !== `${turnId}:assistant`));
      setMessages((items) => items.some((m) => m.id === `${turnId}:user`) ? items : [...items, { id: `${turnId}:user`, turnId, documentId: doc, role: "user", content, parts: [{ type: "text", text: content }] }]);
      await streamReview(path, { turnId, content, questions }, (event) => {
        if (latest.current.documentId !== doc) return;
        if (event.type === "turn_start") setReviewId(event.reviewId);
        setMessages((items) => {
          let assistant: ConversationMessage = items.find((m) => m.id === `${turnId}:assistant`) ?? { id: `${turnId}:assistant`, turnId, documentId: doc, role: "assistant", content: "", parts: [] };
          if (event.type === "text_delta") assistant = { ...assistant, content: assistant.content + event.delta, parts: [{ type: "text", text: assistant.content + event.delta }] };
          if (event.type === "tool_start" || event.type === "tool_complete") assistant = { ...assistant, parts: [...assistant.parts.filter((p) => p.type !== "tool" || p.toolCallId !== event.toolCallId), { type: "tool", toolCallId: event.toolCallId, name: event.name, state: event.type === "tool_start" ? "started" : "completed" }] };
          if (event.type === "question_group") assistant = { ...assistant, parts: [...assistant.parts.filter((p) => p.type !== "questions" || p.groupId !== event.groupId), { type: "questions", groupId: event.groupId, questions: event.questions }] };
          if (event.type === "turn_final") {
            assistant = { ...assistant, content: event.turn.message, parts: [{ type: "text", text: event.turn.message }, ...assistant.parts.filter((p) => p.type !== "text" && p.type !== "edits"), { type: "edits", editIds: event.turn.edits.map((e) => e.id) }] };
            if (event.turn.questions.length && !assistant.parts.some((p) => p.type === "questions")) assistant.parts.push({ type: "questions", groupId: turnId, questions: event.turn.questions });
          }
          return [...items.filter((m) => m.id !== assistant.id), assistant];
        });
        if (event.type === "turn_final") { const next = toDisplayIssues(event.turn.issues, event.turn.questions); setIssues(next); setSelectedIssue(next[0]); setReviewState(event.turn.state); setEdits((old) => [...old.filter((e) => !event.turn.edits.some((next) => next.id === e.id)), ...event.turn.edits]); }
      }, controller.signal);
      if (questions) setMessages((items) => items.map((m) => m.turnId === questions.turnId ? { ...m, parts: m.parts.map((p) => p.type === "questions" && p.groupId === questions.groupId ? { ...p, answers: questions.answers } : p) } : m));
      setMessage((draft) => draft.trim() === content ? "" : draft);
      retryTurn.current = null; setIsDemoResume(false);
    } catch (error) {
      if (latest.current.documentId !== doc || controller.signal.aborted) return;
      setPaymentRequired(error instanceof ApiError && error.status === 402);
      setReviewError(error instanceof ApiError ? error.message : "The review connection was interrupted. Try sending your message again.");
    } finally { busy.current = false; setReviewBusy(false); }
  };
  const sendMessage = () => submit(message.trim() || "Review this resume");
  const beginReview = sendMessage;
  const submitQuestions = (questions: QuestionSubmission) => submit("Here are my answers.", questions);

  const downloadSource = () => {
    const url = URL.createObjectURL(new Blob([source], { type: "application/x-tex" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = downloadFilename(filename);
    link.click();
    URL.revokeObjectURL(url);
  };

  const downloadPdf = async () => {
    if (!pdfUrl) return;
    try {
      const response = await fetch(pdfUrl);
      if (!response.ok) throw new Error("Download failed");
      const url = URL.createObjectURL(await response.blob());
      const link = document.createElement("a"); link.href = url; link.download = downloadFilename(filename, true); link.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch { setReviewError("We could not download this PDF. Please try again."); }
  };
  const createCheckpoint = (reason = "Manual checkpoint", checkpointSource = source, kind: WorkspaceVersion["kind"] = "checkpoint", restoredFromId?: string) => {
    const version: WorkspaceVersion = { documentId, source: checkpointSource, filename, discipline, id: crypto.randomUUID(), createdAt: new Date().toISOString(), reason, kind, restoredFromId };
    const history = retainVersions([version, ...latest.current.versions]);
    latest.current.versions = history; setVersions(history);
    try { localStorage.setItem(`aria:versions:${documentId}`, JSON.stringify(history)); } catch { setSaveState("failed"); }
    if (projectId) {
      saver.invalidate();
      void saver.flush({ documentId, source: checkpointSource, filename, discipline }, undefined, true, version).catch(() => undefined);
    }
  };
  const restoreVersion = (version: WorkspaceVersion) => {
    if (version.documentId !== documentId) return;
    if (!versions.some((v) => v.source === source && v.filename === filename && v.discipline === discipline)) createCheckpoint("Draft before restore");
    const restored: WorkspaceVersion = { ...version, id: crypto.randomUUID(), createdAt: new Date().toISOString(), kind: "restore", reason: `Restored to ${new Date(version.createdAt).toLocaleString()}`, restoredFromId: version.id };
    const history = retainVersions([restored, ...latest.current.versions]);
    latest.current.versions = history;
    setVersions(history);
    saver.invalidate();
    void saver.flush({ documentId, source: restored.source, filename: restored.filename, discipline: restored.discipline }, undefined, true, restored).catch(() => undefined);
    setSource(version.source); setFilename(version.filename); setDiscipline(version.discipline);
    setIsDemoResume(false); setHistoryOpen(false);
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
    const draft = latest.current;
    try {
      if (decision === "accept") await saver.flush({ documentId, source, filename, discipline }, undefined, true);
      const result = await decideEdit(edit.id, decision);
      if (latest.current.documentId !== draft.documentId) return;
      setEdits((current) => current.map((item) => item.id === edit.id ? { ...item, status: result.status } : item));
      if (result.source) {
        if (latest.current.source !== draft.source) {
          saver.invalidate();
          saver.schedule({ documentId: draft.documentId, source: latest.current.source, filename: latest.current.filename, discipline: latest.current.discipline });
          setReviewError("Your draft changed while this edit was being accepted. Your draft has been preserved.");
          return;
        }
        setSource(result.source);
        createCheckpoint("AI rewrite", result.source, "edit");
        await compile(result.source);
      }
    } catch {
      setReviewError("We could not update this edit. Please try again.");
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

  return {
    filename, setFilename, documentId, saveState, retrySave, downloadPdf, submitQuestions,
    openCheckout,
    showLanding,
    activeTab,
    authEmail,
    authMessage,
    emailSignIn,
    authOpen,
    beginReview,
    checkoutPending,
    compile,
    compileError,
    compileState,
    createCheckpoint,
    diagnostics,
    discipline,
    downloadSource,
    editor,
    edits,
    fileInput,
    githubOAuthEnabled,
    googleOAuthEnabled,
    historyOpen,
    isDemoResume,
    issues,
    landingFileInput,
    landingSource,
    message,
    messages,
    moveTabFocus,
    paymentRequired,
    pdfUrl,
    projectId,
    resolveIssue,
    restoreVersion,
    reviewBusy,
    reviewError,
    reviewId,
    reviewOpen,
    reviewState,
    selectIssue,
    selectTab,
    selectedIssue,
    sendMessage,
    setActiveTab,
    setAuthEmail,
    setAuthOpen,
    setDiscipline,
    setEdits,
    setHistoryOpen,
    setIsDemoResume,
    setLandingSource,
    setMessage,
    setReviewError,
    setReviewOpen,
    setShowLanding,
    setSource,
    source,
    tabs,
    unresolvedCount,
    updateEdit,
    upload,
    userEmail,
    versions,
  };
}

export type WorkspaceModel = ReturnType<typeof useResumeWorkspace>;
