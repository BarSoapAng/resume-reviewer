import { useResumeWorkspace } from "./hooks/useResumeWorkspace";
import { LandingView } from "./views/LandingView";
import { WorkspaceView } from "./views/WorkspaceView";

export default function App() {
  const model = useResumeWorkspace();
  return model.showLanding ? <LandingView model={model} /> : <WorkspaceView model={model} />;
}
