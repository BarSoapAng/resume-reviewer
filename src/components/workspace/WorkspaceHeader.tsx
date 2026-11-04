import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { colors, fontSize, spacing, radius, breakpoints, alpha, shadows, Body, Text, Strong } from "../../lib/style";
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
  const actions = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const element = actions.current;
    if (!element) return;
    const update = () => element.parentElement?.style.setProperty("--header-actions-width", `${element.offsetWidth}px`);
    update();
    const observer = new ResizeObserver(update);
    observer.observe(element);
    return () => observer.disconnect();
  }, []);
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
  const extension = filename.match(/(\.[^./\\]+)$/)?.[0] ?? "";
  const commit = () => { if (draft.trim()) setFilename(`${draft.trim()}${extension}`); setEditing(false); };
  return (
    <Header>
      {editing ? <TitleEditor><TitleInput aria-label="Document filename" autoFocus value={draft} onChange={(event) => setDraft(event.target.value)} onBlur={commit} onKeyDown={(event) => {
        if (event.key === "Enter") { event.preventDefault(); commit(); }
        if (event.key === "Escape") { event.preventDefault(); setEditing(false); }
      }} /><Text>{extension}</Text></TitleEditor> : <DocumentTitle title="Rename document" onClick={() => { setDraft(filename.slice(0, filename.length - extension.length)); setEditing(true); }}><Text>{filename}</Text><Icon name="pencil" size={spacing.sm} /></DocumentTitle>}
      <HeaderActions ref={actions}>
        <SaveActions>
          <SavedState role="status">{saveState === "pending" ? "Unsaved changes" : saveState === "saving" ? "Saving..." : saveState === "local" ? "Saved locally" : saveState === "failed" ? "Not saved" : "Saved"}</SavedState>
          {saveState === "failed" && <TextButton onClick={() => void retrySave()}>Retry save</TextButton>}
        </SaveActions>
        <IconButton ref={historyButton} aria-expanded={historyOpen} aria-controls="version-history" aria-label="Version history" onClick={() => setHistoryOpen((open) => !open)} title="Version history"><Icon name="history" /></IconButton>
        <Avatar aria-label={userEmail ? `Sign out ${userEmail}` : "Sign in"} onClick={() => userEmail ? void signOut() : setAuthOpen(true)} title={userEmail ?? "Sign in"}>{userEmail ? userEmail.slice(0, 2).toUpperCase() : "?"}</Avatar>
      </HeaderActions>
      {historyOpen && createPortal(<HistoryPopover ref={popover} id="version-history" role="dialog" aria-label="Version history" tabIndex={-1}>
        <HistoryHeading><Strong>Version history</Strong><IconButton aria-label="Create checkpoint" title="Create checkpoint" onClick={() => createCheckpoint()}><Icon name="flag" /></IconButton></HistoryHeading>
        {versions.length === 0 ? <HistoryEmpty>No versions yet.</HistoryEmpty> : versions.map((version) => <HistoryItem key={version.id} onClick={() => { restoreVersion(version); historyButton.current?.focus(); }}>
          <Strong>{new Date(version.createdAt).toLocaleString()}</Strong>
          {version.reason && <Text>{version.reason}</Text>}
        </HistoryItem>)}
      </HistoryPopover>, document.body)}
    </Header>
  );
}
const Header = styled.header`
  position: relative;
  display: flex;
  justify-content: flex-end;
  min-width: 0;
  align-items: center;
  gap: ${spacing.sm};
  padding: 0 ${spacing.sm};
  border-bottom: ${spacing.hairline} solid ${colors.paper[300]};
  background: ${colors.paper[100]};
`;
const DocumentTitle = styled(Button)`
  position: absolute;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  align-items: center;
  justify-content: center;
  gap: ${spacing.xxs};
  max-width: max(0px, calc(100% - 2 * (var(--header-actions-width, 160px) + ${spacing.lg})));
  min-width: 0;
  padding: ${spacing.xxs};
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  border: 0;
  background: transparent;
  font-size: ${fontSize.sm};
  font-weight: 600;
  text-align: center;
  span { min-width: 0; overflow: hidden; text-overflow: ellipsis; }
  svg { flex-shrink: 0; }
  @media (max-width: ${breakpoints.mobile}) {
    top: 0;
    height: ${spacing.lg};
    max-width: calc(100% - ${spacing.lg});
    padding: 0 ${spacing.xxs};
    font-size: ${fontSize.xs};
  }
`;
const TitleEditor = styled.div`
  position: absolute;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  min-width: 0;
  max-width: max(0px, calc(100% - 2 * (var(--header-actions-width, 160px) + ${spacing.lg})));
  align-items: center;
  font-size: ${fontSize.sm};
  @media (max-width: ${breakpoints.mobile}) {
    top: 0;
    height: ${spacing.lg};
    width: min(calc(100% - ${spacing.lg}), ${spacing["10xl"]});
    max-width: calc(100% - ${spacing.lg});
    font-size: ${fontSize.xs};
  }
`;
const TitleInput = styled.input`
  min-width: 0;
  width: min(35vw, ${spacing["10xl"]});
  flex: 1;
  padding: ${spacing.xxs};
  border: ${spacing.hairline} solid ${colors.paper[400]};
  border-radius: ${radius.xs};
  font-size: ${fontSize.sm};
  @media (max-width: ${breakpoints.mobile}) {
    height: calc(${spacing.lg} - ${spacing.xxxs});
    padding: 0 ${spacing.xxs};
    font-size: ${fontSize.xs};
  }
`;
const SaveActions = styled.div`
  display: flex;
  min-width: 0;
  flex-direction: column;
  align-items: flex-end;
  @media (max-width: ${breakpoints.mobile}) {
    flex-direction: row;
    align-items: center;
    gap: ${spacing.xs};
  }
`;
const HeaderActions = styled.div`
  display: flex;
  flex-shrink: 0;
  align-items: center;
  gap: ${spacing.xxs};
  justify-self: end;
  @media (max-width: ${breakpoints.mobile}) {
    align-self: flex-end;
    height: ${spacing.lg};
    > button { width: ${spacing.lg}; height: ${spacing.lg}; }
  }
`;
const HistoryPopover = styled.div`
  position: fixed;
  z-index: 20;
  top: ${spacing.xxxl};
  right: ${spacing.sm};
  width: min(${spacing["9xl"]}, calc(100vw - ${spacing.lg}));
  max-height: min(480px, calc(100dvh - ${spacing["4xl"]}));
  padding: ${spacing.sm};
  overflow-y: auto;
  overflow-x: hidden;
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
  font-size: ${fontSize.sm};
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
