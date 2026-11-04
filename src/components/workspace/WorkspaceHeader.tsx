import { Dropdown } from "../base/Dropdown";
import { Button } from "../base/Button";
import styled from "styled-components";
import { Body, Strong, Text, breakpoints, colors, shadows, textSize, typography } from "../../lib/style";
import { IconButton } from "../base/IconButton";
import { Brand } from "../brand/Brand";
import { TextButton } from "../base/TextButton";
import type { WorkspaceModel } from "../../hooks/useResumeWorkspace";
import { Icon } from "../base/Icon";
import { updateProject, type Discipline as DisciplineType } from "../../lib/api";
import { signOut } from "../../lib/supabase";

export function WorkspaceHeader({ model }: {
  model: Pick<WorkspaceModel,
    "createCheckpoint" | "discipline" | "historyOpen" | "isDemoResume" | "projectId" | "restoreVersion" | "setAuthOpen" | "setDiscipline" | "setHistoryOpen" | "userEmail" | "versions"
  >;
}) {
  const {
    createCheckpoint,
    discipline,
    historyOpen,
    isDemoResume,
    projectId,
    restoreVersion,
    setAuthOpen,
    setDiscipline,
    setHistoryOpen,
    userEmail,
    versions,
  } = model;
  return (
    <Header>
      <Brand />
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
                <Strong>Version history</Strong>
                <TextButton onClick={() => createCheckpoint()}>Checkpoint</TextButton>
              </HistoryHeading>
              {versions.length === 0 ? <HistoryEmpty>No checkpoints yet.</HistoryEmpty> : versions.map((version) => (
                <HistoryItem key={version.id} onClick={() => restoreVersion(version)}>
                  <Strong>{version.reason}</Strong>
                  <Text>{new Date(version.createdAt).toLocaleString()}</Text>
                </HistoryItem>
              ))}
            </HistoryPopover>
          )}
        </HistoryWrap>
        <Avatar as="button" aria-label={userEmail ? `Sign out ${userEmail}` : "Sign in"} onClick={() => userEmail ? void signOut() : setAuthOpen(true)} title={userEmail ?? "Sign in"}>{userEmail ? userEmail.slice(0, 2).toUpperCase() : "?"}</Avatar>
      </HeaderActions>
    </Header>
  );
}

const Header = styled.header`
  ${typography.body}
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

const DocumentMeta = styled.div.attrs({ className: "document-meta" })`
  ${typography.body}
  display: flex;
  align-items: center;
  gap: 10px;
`;

const DocumentTitle = styled(Text).attrs({ as: "span" })`
  ${typography.body}
  font-size: ${textSize.s14};
  font-weight: 600;
`;

const HeaderActions = styled.div`
  ${typography.body}
  display: flex;
  align-items: center;
  justify-self: end;
  gap: 7px;
`;

const HistoryWrap = styled.div`
  ${typography.body}
  position: relative;
`;

const HistoryPopover = styled.div`
  ${typography.body}
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
  ${typography.body}
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 3px 4px 8px;
  font-size: ${textSize.s12};
`;

const HistoryItem = styled(Button)`
  ${typography.body}
  display: grid;
  width: 100%;
  gap: 3px;
  padding: 9px;
  border: 0;
  border-radius: 7px;
  color: ${colors.ink};
  background: ${colors.transparent};
  text-align: left;

  &:hover { background: ${colors.forestPale}; }
  strong { font-size: ${textSize.s11}; }
  span { color: ${colors.inkMuted}; font-size: ${textSize.s9}; }
`;

const HistoryEmpty = styled(Body).attrs({ as: "p" })`
  ${typography.body}
  margin: 4px;
  color: ${colors.inkMuted};
  font-size: ${textSize.s11};
`;

const SavedState = styled(Text).attrs({ as: "span" })`
  ${typography.body}
  display: flex;
  align-items: center;
  gap: 5px;
  margin-right: 6px;
  color: ${colors.inkMuted};
  font-size: ${textSize.s12};

  svg { color: ${colors.forest}; }

  @media (max-width: ${breakpoints.mobile}) { display: none; }
`;

const Avatar = styled(Button)`
  ${typography.body}
  display: grid;
  width: 31px;
  height: 31px;
  margin-left: 3px;
  place-items: center;
  border: 0;
  border-radius: 50%;
  color: ${colors.forestDark};
  background: ${colors.apricotPale};
  font-size: ${textSize.s11};
  font-weight: 700;
`;

const Discipline = styled(Dropdown)`
  ${typography.body}
  padding: 5px 8px;
  border: 1px solid ${colors.border};
  border-radius: 7px;
  color: ${colors.inkMuted};
  font-size: ${textSize.s11};
  font-weight: 600;
  letter-spacing: 0.02em;
  text-transform: uppercase;
`;
