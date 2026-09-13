# Draftwise

Draftwise is a technical resume-review workspace for software and mechanical engineering students. The current repository contains the first frontend milestone: a responsive three-pane reviewer, LaTeX editor, and resume preview shell.

## Frontend

- Vite, React, and TypeScript
- styled-components with shared tokens in `src/lib/styles.ts`
- CodeMirror 6 with LaTeX syntax support
- Resizable desktop panels and tabbed mobile views
- Local `.tex` upload, autosave, editing, and download

The compiler, persistent review sessions, authentication, and AI reviewer are not connected yet. Preview and review content currently demonstrate the intended product experience with local state.

## Run locally

```bash
npm install
npm run dev
```

Static checks:

```bash
npm run lint
npx tsc -b --pretty false
```

See [Technical Resume Reviewer_ Final Product and Implementation Plan.md](./Technical%20Resume%20Reviewer_%20Final%20Product%20and%20Implementation%20Plan.md) for the complete product plan and phased implementation path.
