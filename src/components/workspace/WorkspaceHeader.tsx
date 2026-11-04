import { colors, fontSize, spacing, radius, breakpoints, alpha, shadows, Body, Text, Strong } from "../../lib/style";
import { Dropdown } from "../base/Dropdown";
import { Button } from "../base/Button";
import styled from "styled-components";
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
        <SavedState><Icon name="check" size={spacing.md} /> Saved just now</SavedState>
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
  display: grid;
  grid-template-columns: 1fr auto 1fr;
  align-items: center;
  gap: ${spacing.lg};
  padding: 0 ${spacing.lg};
  border-bottom: ${spacing.hairline} solid ${colors.paper[300]};
  background: ${colors.paper[100]};

  @media (max-width: ${breakpoints.tablet}) {
    grid-template-columns: 1fr auto;
    .document-meta { display: none; }
  }
`;

const DocumentMeta = styled.div.attrs({ className: "document-meta" })`
  display: flex;
  align-items: center;
  gap: ${spacing.sm};
`;

const DocumentTitle = styled(Text).attrs({ as: "span" })`
  font-size: ${fontSize.sm};
  font-weight: 600;
`;

const HeaderActions = styled.div`
  display: flex;
  align-items: center;
  justify-self: end;
  gap: ${spacing.xs};
`;

const HistoryWrap = styled.div`
  position: relative;
`;

const HistoryPopover = styled.div`
  position: absolute;
  z-index: 20;
  top: ${spacing.xxl};
  right: 0;
  width: ${spacing["8xl"]};
  max-height: ${spacing["10xl"]};
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
  padding: ${spacing.xxs} ${spacing.xxs} ${spacing.xs};
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

  &:hover { background: ${colors.forest[100]}; }
  strong { font-size: ${fontSize.xs}; }
  span { color: ${colors.paper[600]}; font-size: ${fontSize.xxs}; }
`;

const HistoryEmpty = styled(Body).attrs({ as: "p" })`
  margin: ${spacing.xxs};
  color: ${colors.paper[600]};
  font-size: ${fontSize.xs};
`;

const SavedState = styled(Text).attrs({ as: "span" })`
  display: flex;
  align-items: center;
  gap: ${spacing.xxs};
  margin-right: ${spacing.xs};
  color: ${colors.paper[600]};
  font-size: ${fontSize.xs};

  svg { color: ${colors.forest[600]}; }

  @media (max-width: ${breakpoints.mobile}) { display: none; }
`;

const Avatar = styled(Button)`
  display: grid;
  width: ${spacing.xl};
  height: ${spacing.xl};
  margin-left: ${spacing.xxs};
  place-items: center;
  border: 0;
  border-radius: ${radius.full};
  color: ${colors.forest[800]};
  background: ${colors.apricot[100]};
  font-size: ${fontSize.xs};
  font-weight: 700;
`;

const Discipline = styled(Dropdown)`
  padding: ${spacing.xxs} ${spacing.xs};
  border: ${spacing.hairline} solid ${colors.paper[300]};
  border-radius: ${radius.sm};
  color: ${colors.paper[600]};
  font-size: ${fontSize.xs};
  font-weight: 600;
  letter-spacing: 0.02em;
  text-transform: uppercase;
`;
