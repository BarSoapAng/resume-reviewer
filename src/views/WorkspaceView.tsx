import styled from "styled-components";
import { colors, breakpoints, textSize, typography } from "../lib/style";
import { PanelResizeHandle } from "react-resizable-panels";
import type { WorkspaceModel } from "../hooks/useResumeWorkspace";
import { Panel, PanelGroup } from "react-resizable-panels";
import { WorkspaceHeader } from "../components/WorkspaceHeader";
import { ReviewPanel } from "../components/ReviewPanel";
import { SourcePanel } from "../components/SourcePanel";
import { PreviewPanel } from "../components/PreviewPanel";
import { WorkspaceFooter } from "../components/WorkspaceFooter";
import { AuthModal } from "../components/AuthModal";

export function WorkspaceView({ model }: { model: WorkspaceModel }) {
  const { activeTab, moveTabFocus, reviewOpen, selectTab, tabs, unresolvedCount } = model;
  return (
    <AppShell>
      <WorkspaceHeader model={model} />

      <MobileTabs aria-label="Workspace views" role="tablist">
        {tabs.map((tab) => (
          <MobileTab
            key={tab}
            $active={activeTab === tab}
            aria-controls={`workspace-panel-${tab}`}
            aria-selected={activeTab === tab}
            id={`workspace-tab-${tab}`}
            onClick={() => selectTab(tab)}
            onKeyDown={(event) => {
              if (event.key === "ArrowRight") moveTabFocus(tab, 1);
              if (event.key === "ArrowLeft") moveTabFocus(tab, -1);
            }}
            role="tab"
            tabIndex={activeTab === tab ? 0 : -1}
          >
            {tab === "review" && unresolvedCount > 0 ? `Review · ${unresolvedCount}` : tab}
          </MobileTab>
        ))}
      </MobileTabs>

      <Workspace>
        <PanelGroup direction="horizontal">
          {reviewOpen && (
            <>
              <Panel className={activeTab === "review" ? "" : "mobile-hidden"} defaultSize={27} minSize={22} order={1}>
      <ReviewPanel model={model} />
              </Panel>
              <ResizeHandle />
            </>
          )}

          <Panel className={activeTab === "source" ? "" : "mobile-hidden"} defaultSize={reviewOpen ? 37 : 48} minSize={28} order={2}>
      <SourcePanel model={model} />
          </Panel>

          <ResizeHandle />
          <Panel className={activeTab === "preview" ? "" : "mobile-hidden"} defaultSize={36} minSize={28} order={3}>
      <PreviewPanel model={model} />
          </Panel>
        </PanelGroup>
      </Workspace>

      <WorkspaceFooter model={model} />
      <AuthModal model={model} />
    </AppShell>
  );
}

const AppShell = styled.main`
  ${typography.body}
  display: grid;
  grid-template-rows: 64px 1fr 52px;
  min-height: 100vh;
  background: ${colors.canvas};
  color: ${colors.ink};

  @media (max-width: ${breakpoints.tablet}) {
    grid-template-rows: 64px 44px 1fr 52px;
  }
`;

const Workspace = styled.section`
  ${typography.body}
  min-height: 0;
  overflow: hidden;

  > div { height: 100%; }

  @media (max-width: ${breakpoints.tablet}) {
    > div { display: block !important; }
    [data-panel-group-direction] > [data-panel] { width: 100% !important; height: 100% !important; }
    .mobile-hidden { display: none !important; }
  }
`;

const ResizeHandle = styled(PanelResizeHandle)`
  position: relative;
  width: 5px;
  background: ${colors.border};
  transition: background 160ms ease;

  &::after {
    position: absolute;
    z-index: 2;
    inset: 0 -3px;
    content: "";
  }

  &:hover, &[data-resize-handle-active] { background: ${colors.forest}; }

  @media (max-width: ${breakpoints.tablet}) { display: none; }
`;

const MobileTabs = styled.nav`
  ${typography.body}
  display: none;

  @media (max-width: ${breakpoints.tablet}) {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    min-height: 44px;
    padding: 0 12px;
    border-bottom: 1px solid ${colors.border};
    background: ${colors.surfaceStrong};
  }
`;

const MobileTab = styled.button<{ $active: boolean }>`
  ${typography.body}
  position: relative;
  border: 0;
  color: ${({ $active }) => ($active ? colors.forestDark : colors.inkMuted)};
  background: ${colors.transparent};
  font-size: ${textSize.s11};
  font-weight: 700;
  text-transform: capitalize;

  &::after {
    position: absolute;
    right: 15%;
    bottom: 0;
    left: 15%;
    height: 2px;
    border-radius: 2px 2px 0 0;
    background: ${({ $active }) => ($active ? colors.forest : colors.transparent)};
    content: "";
  }
`;
