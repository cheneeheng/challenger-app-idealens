import AppHeader from "../components/AppHeader";
import ChatPanel from "../components/ChatPanel";
import GraphPanel from "../components/GraphPanel";
import SplitLayout from "../components/SplitLayout";

export default function SessionPage() {
  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <AppHeader />
      <SplitLayout left={<ChatPanel />} right={<GraphPanel />} />
    </div>
  );
}
