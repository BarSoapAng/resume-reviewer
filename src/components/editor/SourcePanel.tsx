import { colors, fontSize, spacing, fonts, Text, Code } from "../../lib/style";
import styled from "styled-components";
import { PanelFrame } from "../layout/PanelFrame";
import { ToolTitle } from "../layout/ToolTitle";
import { ToolHeader } from "../layout/ToolHeader";
import { QuietButton } from "../base/QuietButton";
import { ToolActions } from "../layout/ToolActions";
import type { WorkspaceModel } from "../../hooks/useResumeWorkspace";
import { Icon } from "../base/Icon";
import CodeMirror from "@uiw/react-codemirror";
import { StreamLanguage } from "@codemirror/language";
import { stex } from "@codemirror/legacy-modes/mode/stex";
import { EditorView } from "@codemirror/view";
import { searchKeymap } from "@codemirror/search";
import { keymap } from "@codemirror/view";

export function SourcePanel({ model }: {
  model: Pick<WorkspaceModel,
    "activeTab" | "compileError" | "diagnostics" | "editor" | "fileInput" | "reviewOpen" | "selectedIssue" | "setEdits" | "setIsDemoResume" | "setReviewOpen" | "setSource" | "source" | "upload"
  >;
}) {
  const {
    activeTab,
    compileError,
    diagnostics,
    editor,
    fileInput,
    reviewOpen,
    selectedIssue,
    setEdits,
    setIsDemoResume,
    setReviewOpen,
    setSource,
    source,
    upload,
  } = model;
  return (
    <PanelFrame $mobileActive={activeTab === "source"} aria-labelledby="workspace-tab-source" id="workspace-panel-source" role="tabpanel">
      <ToolHeader>
        <ToolTitle><Icon name="code" size={spacing.md} /> Source</ToolTitle>
        <ToolActions>
          {!reviewOpen && (
            <QuietButton onClick={() => setReviewOpen(true)}><Icon name="message" size={spacing.md} /> Show review</QuietButton>
          )}
          <QuietButton onClick={() => fileInput.current?.click()}><Icon name="upload" size={spacing.md} /> Replace</QuietButton>
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
  display: flex;
  min-height: ${spacing.xxl};
  align-items: center;
  justify-content: space-between;
  gap: ${spacing.sm};
  padding: 0 ${spacing.sm};
  border-bottom: ${spacing.hairline} solid ${colors.paper[300]};
  background: ${colors.paper[200]};
`;

const FileName = styled(Text).attrs({ as: "span" })`
  font-family: ${fonts.mono};
  font-size: ${fontSize.xxs};
  font-weight: 500;
`;

const SelectedAnchor = styled(Text).attrs({ as: "span" })`
  overflow: hidden;
  color: ${colors.paper[600]};
  font-size: ${fontSize.xxs};
  text-overflow: ellipsis;
  white-space: nowrap;
`;

const EditorWrap = styled.div`
  min-height: 0;
  flex: 1;
  overflow: hidden;
  background: ${colors.paper[100]};

  .cm-theme, .cm-editor { height: 100%; }
  .cm-scroller { overflow: auto; font-family: ${fonts.mono}; }
  .cm-content, .cm-gutter { font-size: ${fontSize.xs}; line-height: 1.75; }
  .cm-gutters { border-right: ${spacing.hairline} solid ${colors.paper[300]}; color: ${colors.paper[500]}; background: ${colors.paper[200]}; }
  .cm-activeLine, .cm-activeLineGutter { background: ${colors.forest[100]}; }
  .cm-focused { outline: none !important; }
  .cm-cursor { border-left-color: ${colors.forest[600]}; }
  .cm-selectionBackground { background: ${colors.forest[200]} !important; }
`;

const EditorStatus = styled(Code).attrs({ as: "div" })`
  display: flex;
  min-height: ${spacing.lg};
  align-items: center;
  justify-content: flex-end;
  gap: ${spacing.md};
  padding: 0 ${spacing.sm};
  border-top: ${spacing.hairline} solid ${colors.paper[300]};
  color: ${colors.paper[600]};
  background: ${colors.paper[0]};
  font-family: ${fonts.mono};
  font-size: ${fontSize.xxs};
`;

const DiagnosticsPanel = styled.div`
  max-height: ${spacing["6xl"]};
  padding: ${spacing.xs} ${spacing.sm};
  overflow: auto;
  border-top: ${spacing.hairline} solid ${colors.paper[300]};
  background: ${colors.paper[0]};
`;

const DiagnosticRow = styled(Code).attrs({ as: "div" }) <{ $severity: "error" | "warning"; }>`
  padding: ${spacing.xxs} 0;
  color: ${({ $severity }) => ($severity === "error" ? colors.error[600] : colors.warning[800])};
  font-family: ${fonts.mono};
  font-size: ${fontSize.xxs};
  line-height: 1.4;
`;
