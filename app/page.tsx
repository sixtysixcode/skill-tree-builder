// app/page.tsx
import { ReactFlowProvider } from '@xyflow/react';
import Flow from './components/Flow';

export default function Home() {
  return (
    <ReactFlowProvider>
      {/* full viewport, no padding */}
      <div className="h-screen w-screen overflow-hidden bg-zinc-950">
        <Flow />
      </div>
    </ReactFlowProvider>
  );
}
