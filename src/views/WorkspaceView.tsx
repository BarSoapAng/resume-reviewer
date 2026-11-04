import { Fragment, useLayoutEffect, useRef, useState } from "react";
import { colors, spacing, breakpoints } from "../lib/style";
import styled from "styled-components";
import { Panel, PanelGroup, PanelResizeHandle, type ImperativePanelGroupHandle } from "react-resizable-panels";
import type { WorkspaceModel } from "../hooks/useResumeWorkspace";
import { WorkspaceHeader } from "../components/workspace/WorkspaceHeader";
import { ReviewPanel } from "../components/review/ReviewPanel";
import { SourcePanel } from "../components/editor/SourcePanel";
import { PreviewPanel } from "../components/preview/PreviewPanel";
import { WorkspaceToasts } from "../components/workspace/WorkspaceToasts";
import { AuthModal } from "../components/auth/AuthModal";
import { IconButton } from "../components/base/IconButton";
import { Icon } from "../components/base/Icon";

export function WorkspaceView({ model }: { model: WorkspaceModel }) {
  const [visible, setVisible] = useState({ review: true, source: true, preview: true });
  const group = useRef<ImperativePanelGroupHandle>(null);
  const panels = [
    { id: "review", label: "Ario", icon: "message" },
    { id: "source", label: "Source", icon: "code" },
    { id: "preview", label: "Preview", icon: "preview" },
  ] as const;
  const count = Object.values(visible).filter(Boolean).length;
  const selected = visible[model.activeTab] ? model.activeTab : panels.find((panel) => visible[panel.id])?.id;
  const panelModel = { ...model, activeTab: selected ?? model.activeTab };
  useLayoutEffect(() => {
    const count = Object.values(visible).filter(Boolean).length;
    if (count) group.current?.setLayout([visible.review, visible.source, visible.preview].map((shown) => shown ? 100 / count : 0));
  }, [visible]);
  return (
    <AppShell>
      <WorkspaceHeader model={model} />
      <WorkspaceRow>
        <Sidebar aria-label="Workspace panels">
          {panels.map((panel) => (
            <PanelToggle key={panel.id} id={`workspace-tab-${panel.id}`} aria-label={panel.label} aria-controls={`workspace-panel-${panel.id}`} aria-pressed={visible[panel.id]} aria-current={selected === panel.id ? "true" : undefined} $active={visible[panel.id]} title={`Show or hide ${panel.label}`} onClick={() => {
              const narrow = window.matchMedia(`(max-width: ${breakpoints.tablet})`).matches;
              if (narrow && visible[panel.id] && selected !== panel.id) {
                model.setActiveTab(panel.id);
                return;
              }
              setVisible((current) => ({ ...current, [panel.id]: !current[panel.id] }));
              if (!visible[panel.id]) model.setActiveTab(panel.id);
            }}>
              <Icon name={panel.icon} />
            </PanelToggle>
          ))}
        </Sidebar>
        <Workspace $empty={count === 0}>
          <PanelGroup direction="horizontal" ref={group}>
            {panels.map((panel, index) => (
              <Fragment key={panel.id}>
                <Panel id={panel.id} order={index} minSize={0} maxSize={count && !visible[panel.id] ? 0 : 100} collapsible defaultSize={index === 0 ? 28 : 36} className={`${visible[panel.id] ? "" : "panel-hidden"} ${selected === panel.id ? "" : "mobile-hidden"}`}>
                  {panel.id === "review" ? <ReviewPanel model={panelModel} /> : panel.id === "source" ? <SourcePanel model={panelModel} /> : <PreviewPanel model={panelModel} />}
                </Panel>
                {index < panels.length - 1 && <ResizeHandle $visible={visible[panel.id] && panels.slice(index + 1).some((item) => visible[item.id])} />}
              </Fragment>
            ))}
          </PanelGroup>
        </Workspace>
      </WorkspaceRow>
      <AuthModal model={model} />
      <WorkspaceToasts model={model} />
    </AppShell>
  );
}

const AppShell = styled.main`
  display: grid;
  grid-template-rows: ${spacing.xxxl} minmax(0, 1fr);
  height: 100dvh;
  min-width: 0;
  min-height: 0;
  overflow: hidden;
  background: ${colors.paper[200]};
  color: ${colors.paper[900]};
`;
const WorkspaceRow = styled.div`
  display: flex;
  min-width: 0;
  min-height: 0;
  overflow: hidden;
`;
const Sidebar = styled.nav`
  display: flex;
  flex: 0 0 ${spacing.xxxl};
  flex-direction: column;
  align-items: center;
  gap: ${spacing.xs};
  padding-top: ${spacing.xs};
  border-right: ${spacing.hairline} solid ${colors.paper[300]};
  background: ${colors.paper[100]};
`;
const PanelToggle = styled(IconButton)<{ $active: boolean }>`
  color: ${({ $active }) => $active ? colors.forest[800] : colors.paper[600]};
  background: ${({ $active }) => $active ? colors.forest[100] : "transparent"};
  border-color: ${({ $active }) => $active ? colors.forest[200] : "transparent"};
  @media (max-width: ${breakpoints.tablet}) { &[aria-current="true"] { outline: ${spacing.xxxs} solid ${colors.forest[600]}; } }
`;
const Workspace = styled.section<{ $empty: boolean }>`
  min-height: 0;
  min-width: 0;
  flex: 1;
  overflow: hidden;
  > div { height: 100%; visibility: ${({ $empty }) => $empty ? "hidden" : "visible"}; }
  .panel-hidden { display: none !important; }
  @media (max-width: ${breakpoints.tablet}) {
    [data-panel-group-direction] { display: block !important; }
    [data-panel] { width: 100% !important; height: 100% !important; }
    .mobile-hidden { display: none !important; }
  }
`;
const ResizeHandle = styled(PanelResizeHandle)<{ $visible: boolean }>`
  display: ${({ $visible }) => $visible ? "block" : "none"};
  position: relative;
  width: ${spacing.xxs};
  background: ${colors.paper[300]};
  &::after { position: absolute; z-index: 2; inset: 0 -${spacing.xxs}; content: ""; }
  &:hover, &[data-resize-handle-active] { background: ${colors.forest[600]}; }
  @media (max-width: ${breakpoints.tablet}) { display: none; }
`;
