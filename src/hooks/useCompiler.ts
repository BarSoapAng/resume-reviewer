import { useCallback, useEffect, useRef, useState } from "react";
import type { ReactCodeMirrorRef } from "@uiw/react-codemirror";
import { type Diagnostic, setDiagnostics } from "@codemirror/lint";
import { compileLatex, type CompileDiagnostic } from "../lib/api";

export function useCompiler(source: string, showLanding: boolean) {
  const [compileState, setCompileState] = useState<"idle" | "compiling" | "success" | "error">("idle");
  const [compileError, setCompileError] = useState<string>();
  const [diagnostics, setCompileDiagnostics] = useState<CompileDiagnostic[]>([]);
  const [pdfUrl, setPdfUrl] = useState<string>();
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

  return { compile, compileState, compileError, diagnostics, pdfUrl, editor };
}
