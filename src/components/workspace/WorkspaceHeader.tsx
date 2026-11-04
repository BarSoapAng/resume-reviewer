import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { colors, fontSize, spacing, radius, alpha, shadows, Body, Text, Strong } from "../../lib/style";
import { Button } from "../base/Button";
import styled from "styled-components";
import { IconButton } from "../base/IconButton";
import { TextButton } from "../base/TextButton";
import type { WorkspaceModel } from "../../hooks/useResumeWorkspace";
import { Icon } from "../base/Icon";
import { signOut } from "../../lib/supabase";

export function WorkspaceHeader({ model }: { model: Pick<WorkspaceModel,
  "createCheckpoint" | "historyOpen" | "restoreVersion" | "setAuthOpen" | "setHistoryOpen" | "userEmail" | "versions" | "filename" | "setFilename" | "saveState" | "retrySave"
> }) {
  const { createCheckpoint, historyOpen, restoreVersion, setAuthOpen, setHistoryOpen, userEmail, versions, filename, setFilename, saveState, retrySave } = model;
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(filename);
  const historyButton = useRef<HTMLButtonElement>(null);
  const popover = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!historyOpen) return;
    const previous = document.activeElement;
    popover.current?.focus();
    const close = () => { setHistoryOpen(false); historyButton.current?.focus(); };
    const outside = (event: PointerEvent) => {
      if (!popover.current?.contains(event.target as Node) && !historyButton.current?.contains(event.target as Node)) setHistoryOpen(false);
    };
    const keydown = (event: KeyboardEvent) => { if (event.key === "Escape") { event.preventDefault(); close(); } };
    document.addEventListener("pointerdown", outside);
    document.addEventListener("keydown", keydown);
    return () => {
      document.removeEventListener("pointerdown", outside);
      document.removeEventListener("keydown", keydown);
      if (document.activeElement === document.body && previous instanceof HTMLElement) previous.focus();
    };
  }, [historyOpen, setHistoryOpen]);
  const commit = () => { if (draft.trim()) setFilename(draft.trim()); setEditing(false); };
  return (
    <Header>
      {editing ? <TitleInput aria-label="Document filename" autoFocus value={draft} onChange={(event) => setDraft(event.target.value)} onBlur={commit} onKeyDown={(event) => {
        if (event.key === "Enter") { event.preventDefault(); commit(); }
        if (event.key === "Escape") { event.preventDefault(); setEditing(false); }
      }} /> : <DocumentTitle title="Rename document" onClick={() => { setDraft(filename); setEditing(true); }}>{filename}</DocumentTitle>}
      <HeaderActions>
        <SavedState role="status">{saveState === "pending" ? "Unsaved changes" : saveState === "saving" ? "Saving…" : saveState === "local" ? "Saved locally" : saveState === "failed" ? "Not saved" : "Saved"}</SavedState>
        {saveState === "failed" && <TextButton onClick={() => void retrySave()}>Retry save</TextButton>}
        <IconButton aria-label="Create checkpoint" title="Create checkpoint" onClick={() => createCheckpoint()}><Icon name="flag" /></IconButton>
        <IconButton ref={historyButton} aria-expanded={historyOpen} aria-controls="version-history" aria-label="Version history" onClick={() => setHistoryOpen((open) => !open)} title="Version history"><Icon name="history" /></IconButton>
        <Avatar aria-label={userEmail ? `Sign out ${userEmail}` : "Sign in"} onClick={() => userEmail ? void signOut() : setAuthOpen(true)} title={userEmail ?? "Sign in"}>{userEmail ? userEmail.slice(0, 2).toUpperCase() : "?"}</Avatar>
      </HeaderActions>
      {historyOpen && createPortal(<HistoryPopover ref={popover} id="version-history" role="dialog" aria-label="Version history" tabIndex={-1}>
        <HistoryHeading><Strong>Version history</Strong><TextButton onClick={() => { setHistoryOpen(false); historyButton.current?.focus(); }}>Close</TextButton></HistoryHeading>
        {versions.length === 0 ? <HistoryEmpty>No versions yet.</HistoryEmpty> : versions.map((version) => <HistoryItem key={version.id} onClick={() => { restoreVersion(version); historyButton.current?.focus(); }}>
          <Strong>{new Date(version.createdAt).toLocaleString()}</Strong>
          {version.reason && <Text>{version.reason}</Text>}
        </HistoryItem>)}
      </HistoryPopover>, document.body)}
    </Header>
  );
}
const Header = styled.header`
  display: flex;
  min-width: 0;
  align-items: center;
  gap: ${spacing.sm};
  padding: 0 ${spacing.sm};
  border-bottom: ${spacing.hairline} solid ${colors.paper[300]};
  background: ${colors.paper[100]};
`;
const DocumentTitle = styled(Button)`
  min-width: 0;
  padding: ${spacing.xxs};
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  border: 0;
  background: transparent;
  font-size: ${fontSize.sm};
  font-weight: 600;
  text-align: left;
`;
const TitleInput = styled.input`
  min-width: 0;
  width: min(45vw, ${spacing["10xl"]});
  padding: ${spacing.xxs};
  border: ${spacing.hairline} solid ${colors.paper[400]};
  border-radius: ${radius.xs};
  font-size: ${fontSize.sm};
`;
const HeaderActions = styled.div`
  display: flex;
  flex-shrink: 0;
  align-items: center;
  gap: ${spacing.xxs};
  margin-left: auto;
`;
const HistoryPopover = styled.div`
  position: fixed;
  z-index: 20;
  top: ${spacing.xxxl};
  right: ${spacing.sm};
  width: min(${spacing["9xl"]}, calc(100vw - ${spacing.lg}));
  max-height: calc(100dvh - ${spacing["4xl"]});
  padding: ${spacing.sm};
  overflow: auto;
  border: ${spacing.hairline} solid ${colors.paper[400]};
  border-radius: ${radius.md};
  background: ${colors.paper[0]};
  box-shadow: ${shadows.soft};
`;
const HistoryHeading = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-bottom: ${spacing.xs};
  font-size: ${fontSize.xs};
`;
const HistoryItem = styled(Button)`
  display: grid;
  width: 100%;
  gap: ${spacing.xxs};
  padding: ${spacing.xs};
  border: 0;
  border-radius: ${radius.sm};
  color: ${colors.paper[900]};
  background: ${alpha(colors.paper[0], 0)};
  text-align: left;
  overflow-wrap: anywhere;
  &:hover { background: ${colors.forest[100]}; }
  strong { font-size: ${fontSize.xs}; }
  span { color: ${colors.paper[600]}; font-size: ${fontSize.xxs}; }
`;
const HistoryEmpty = styled(Body)`
  color: ${colors.paper[600]};
  font-size: ${fontSize.xs};
`;
const SavedState = styled(Text)`
  color: ${colors.paper[600]};
  font-size: ${fontSize.xxs};
`;
const Avatar = styled(IconButton)`
  border-radius: ${radius.full};
  color: ${colors.forest[800]};
  background: ${colors.apricot[100]};
  font-size: ${fontSize.xs};
  font-weight: 700;
`;
