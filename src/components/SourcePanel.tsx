import styled from "styled-components";
import { Text, colors, fonts, textSize, typography } from "../lib/style";
import { PanelFrame } from "./PanelFrame";
import { ToolTitle } from "./ToolTitle";
import { ToolHeader } from "./ToolHeader";
import { QuietButton } from "./base/QuietButton";
import { ToolActions } from "./ToolActions";
import type { WorkspaceModel } from "../hooks/useResumeWorkspace";
import { Icon } from "./Icon";
import CodeMirror from "@uiw/react-codemirror";
import { StreamLanguage } from "@codemirror/language";
import { stex } from "@codemirror/legacy-modes/mode/stex";
import { EditorView } from "@codemirror/view";
import { searchKeymap } from "@codemirror/search";
import { keymap } from "@codemirror/view";

export function SourcePanel({ model }: { model: WorkspaceModel }) {
  const { activeTab, compileError, diagnostics, editor, fileInput, reviewOpen, selectedIssue, setEdits, setIsDemoResume, setReviewOpen, setSource, source, upload } = model;
  return (
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
                <Text>Ln 14, Col 3</Text>
                <Text>LaTeX</Text>
                <Text>UTF-8</Text>
              </EditorStatus>
            </PanelFrame>
  );
}

const EditorMeta = styled.div`
  ${typography.body}
  display: flex;
  min-height: 36px;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 0 13px;
  border-bottom: 1px solid ${colors.border};
  background: ${colors.editorToolbar};
`;

const FileName = styled(Text).attrs({ as: "span" })`
  ${typography.body}
  font-family: ${fonts.mono};
  font-size: ${textSize.s10};
  font-weight: 500;
`;

const SelectedAnchor = styled(Text).attrs({ as: "span" })`
  ${typography.body}
  overflow: hidden;
  color: ${colors.inkMuted};
  font-size: ${textSize.s9};
  text-overflow: ellipsis;
  white-space: nowrap;
`;

const EditorWrap = styled.div`
  ${typography.body}
  min-height: 0;
  flex: 1;
  overflow: hidden;
  background: ${colors.editorSurface};

  .cm-theme, .cm-editor { height: 100%; }
  .cm-scroller { overflow: auto; font-family: ${fonts.mono}; }
  .cm-content, .cm-gutter { font-size: ${textSize.s11}; line-height: 1.75; }
  .cm-gutters { border-right: 1px solid ${colors.border}; color: ${colors.gutterText}; background: ${colors.canvas}; }
  .cm-activeLine, .cm-activeLineGutter { background: ${colors.forestPale}; }
  .cm-focused { outline: none !important; }
  .cm-cursor { border-left-color: ${colors.forest}; }
  .cm-selectionBackground { background: ${colors.selection} !important; }
`;

const EditorStatus = styled.div`
  ${typography.body}
  display: flex;
  min-height: 25px;
  align-items: center;
  justify-content: flex-end;
  gap: 14px;
  padding: 0 12px;
  border-top: 1px solid ${colors.border};
  color: ${colors.inkMuted};
  background: ${colors.surfaceStrong};
  font-family: ${fonts.mono};
  font-size: ${textSize.s9};
`;

const DiagnosticsPanel = styled.div`
  ${typography.body}
  max-height: 112px;
  padding: 8px 12px;
  overflow: auto;
  border-top: 1px solid ${colors.border};
  background: ${colors.surfaceStrong};
`;

const DiagnosticRow = styled.div<{ $severity: "error" | "warning" }>`
  ${typography.body}
  padding: 3px 0;
  color: ${({ $severity }) => ($severity === "error" ? colors.red : colors.inkMuted)};
  font-family: ${fonts.mono};
  font-size: ${textSize.s9};
  line-height: 1.4;
`;
