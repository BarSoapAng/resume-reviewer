import { colors, fontSize, spacing, radius, breakpoints, alpha } from "../lib/style";
import { Button } from "../components/base/Button";
import styled from "styled-components";
import { PanelResizeHandle } from "react-resizable-panels";
import type { WorkspaceModel } from "../hooks/useResumeWorkspace";
import { Panel, PanelGroup } from "react-resizable-panels";
import { WorkspaceHeader } from "../components/workspace/WorkspaceHeader";
import { ReviewPanel } from "../components/review/ReviewPanel";
import { SourcePanel } from "../components/editor/SourcePanel";
import { PreviewPanel } from "../components/preview/PreviewPanel";
import { WorkspaceFooter } from "../components/workspace/WorkspaceFooter";
import { AuthModal } from "../components/auth/AuthModal";

export function WorkspaceView({ model }: { model: WorkspaceModel; }) {
  const {
    activeTab,
    moveTabFocus,
    reviewOpen,
    selectTab,
    tabs,
    unresolvedCount,
  } = model;
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
  display: grid;
  grid-template-rows: ${spacing["4xl"]} 1fr ${spacing.xxxl};
  min-height: 100vh;
  background: ${colors.paper[200]};
  color: ${colors.paper[900]};

  @media (max-width: ${breakpoints.tablet}) {
    grid-template-rows: ${spacing["4xl"]} ${spacing.xxxl} 1fr ${spacing.xxxl};
  }
`;

const Workspace = styled.section`
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
  width: ${spacing.xxs};
  background: ${colors.paper[300]};
  transition: background 160ms ease;

  &::after {
    position: absolute;
    z-index: 2;
    inset: 0 -${spacing.xxs};
    content: "";
  }

  &:hover, &[data-resize-handle-active] { background: ${colors.forest[600]}; }

  @media (max-width: ${breakpoints.tablet}) { display: none; }
`;

const MobileTabs = styled.nav`
  display: none;

  @media (max-width: ${breakpoints.tablet}) {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    min-height: ${spacing.xxxl};
    padding: 0 ${spacing.sm};
    border-bottom: ${spacing.hairline} solid ${colors.paper[300]};
    background: ${colors.paper[0]};
  }
`;

const MobileTab = styled(Button) <{ $active: boolean; }>`
  position: relative;
  border: 0;
  color: ${({ $active }) => ($active ? colors.forest[800] : colors.paper[600])};
  background: ${alpha(colors.paper[0], 0)};
  font-size: ${fontSize.xs};
  font-weight: 700;
  text-transform: capitalize;

  &::after {
    position: absolute;
    right: 15%;
    bottom: 0;
    left: 15%;
    height: ${spacing.xxxs};
    border-radius: ${radius.xxs} ${radius.xxs} 0 0;
    background: ${({ $active }) => ($active ? colors.forest[600] : alpha(colors.paper[0], 0))};
    content: "";
  }
`;
