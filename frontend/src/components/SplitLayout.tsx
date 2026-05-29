import type { ReactNode } from "react";
import { Panel, PanelGroup, PanelResizeHandle } from "react-resizable-panels";

interface SplitLayoutProps {
  left: ReactNode;
  right: ReactNode;
}

export default function SplitLayout({ left, right }: SplitLayoutProps) {
  return (
    <PanelGroup direction="horizontal" style={{ flex: 1 }}>
      <Panel defaultSize={40} minSize={25}>
        {left}
      </Panel>
      <PanelResizeHandle style={{ width: 4, background: "#ddd", cursor: "col-resize" }} />
      <Panel defaultSize={60} minSize={30}>
        {right}
      </Panel>
    </PanelGroup>
  );
}
