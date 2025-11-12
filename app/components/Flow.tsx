// app/components/Flow.tsx
'use client';

import { useCallback, useMemo, useRef, useState } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  Handle,
  Position,
  addEdge,
  applyEdgeChanges,
  applyNodeChanges,
  useReactFlow,
  type Node,
  type Edge,
  type OnEdgesChange,
  type OnNodesChange,
  type OnConnect,
  type NodeProps,
  type BuiltInNode,
  type BuiltInEdge,
  type NodeTypes,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

/** ---------- Your data model ---------- */
type SkillData = {
  name: string;
  description?: string;
  cost?: number;
  level?: number;
};

/** ---------- Custom node & unions (per docs) ---------- */
// A specific node type called 'skill' that carries SkillData
type SkillNode = Node<SkillData, 'skill'>;

// Unions of ALL nodes/edges in your app (add more as you grow)
type AppNode = BuiltInNode | SkillNode;
type AppEdge = BuiltInEdge; // you can define custom edges later and union them here

/** ---------- Custom node component (typed) ---------- */
function SkillNodeComponent({ data }: NodeProps<SkillNode>) {
  const { name, description, cost, level } = data;

  return (
    <div className="relative max-w-[240px] rounded-lg border border-zinc-300 bg-white px-3 py-2 text-black shadow-sm">
      <div className="text-sm font-medium leading-tight">{name}</div>
      {description && (
        <div className="mt-0.5 text-[11px] leading-snug text-zinc-600">{description}</div>
      )}
      {(cost ?? level) !== undefined && (
        <div className="mt-1 flex flex-wrap items-center gap-1">
          {typeof cost === 'number' && (
            <span className="rounded border border-amber-200 bg-amber-100 px-1.5 py-0.5 text-[10px]">
              Cost: {cost}
            </span>
          )}
          {typeof level === 'number' && (
            <span className="rounded border border-blue-200 bg-blue-100 px-1.5 py-0.5 text-[10px]">
              Lv {level}
            </span>
          )}
        </div>
      )}
      <Handle type="target" position={Position.Left} />
      <Handle type="source" position={Position.Right} />
    </div>
  );
}

/** ---------- nodeTypes map ---------- */
const nodeTypes: NodeTypes = {
  skill: SkillNodeComponent,
};

/** ---------- Seed graph ---------- */
const initialNodes: AppNode[] = [
  {
    id: '1',
    type: 'skill',
    position: { x: 40, y: 40 },
    data: { name: 'Slash', description: 'Basic melee attack', cost: 1, level: 1 },
    sourcePosition: Position.Right,
    targetPosition: Position.Left,
  } as SkillNode,
  {
    id: '2',
    type: 'skill',
    position: { x: 280, y: 120 },
    data: { name: 'Cleave', description: 'Arc attack hits multiple foes' },
    sourcePosition: Position.Right,
    targetPosition: Position.Left,
  } as SkillNode,
];

const initialEdges: AppEdge[] = [{ id: 'e1-2', source: '1', target: '2', animated: true }];

/** ---------- Component ---------- */
export default function Flow() {
  // Typed state with your unions
  const [nodes, setNodes] = useState<AppNode[]>(initialNodes);
  const [edges, setEdges] = useState<AppEdge[]>(initialEdges);

  // Form/UX state
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [cost, setCost] = useState('');
  const [level, setLevel] = useState('');
  const [placeMode, setPlaceMode] = useState(false);
  const [autoConnect, setAutoConnect] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // ID source
  const idRef = useRef(3);
  const nextId = () => String(idRef.current++);

  // Get instance with correctly typed generics (Node/Edge unions)
  // The docs show passing your custom node & edge types here. :contentReference[oaicite:1]{index=1}
  const { screenToFlowPosition } = useReactFlow<AppNode, AppEdge>();

  /** ---------- Typed change handlers (pass your Node union) ---------- */
  const onNodesChange: OnNodesChange<AppNode> = useCallback(
    (changes) => setNodes((nds) => applyNodeChanges<AppNode>(changes, nds)),
    []
  );

  const onEdgesChange: OnEdgesChange<AppEdge> = useCallback(
    (changes) => setEdges((eds) => applyEdgeChanges<AppEdge>(changes, eds)),
    []
  );

  const onConnect: OnConnect = useCallback(
    (connection) => setEdges((eds) => addEdge<AppEdge>({ ...connection, animated: true }, eds)),
    []
  );

  /** ---------- Build new Skill node (returns a SkillNode, not data) ---------- */
  const buildNode = useCallback(
    (position: { x: number; y: number }): SkillNode => {
      const id = nextId();
      const costNum = cost.trim() === '' ? undefined : Number(cost);
      const levelNum = level.trim() === '' ? undefined : Number(level);

      return {
        id,
        type: 'skill',
        position,
        data: {
          name: name.trim() || `Skill ${id}`,
          description: description.trim() || undefined,
          cost: Number.isFinite(costNum as number) ? (costNum as number) : undefined,
          level: Number.isFinite(levelNum as number) ? (levelNum as number) : undefined,
        },
        sourcePosition: Position.Right,
        targetPosition: Position.Left,
      };
    },
    [name, description, cost, level]
  );

  /** ---------- Place by clicking the pane ---------- */
  const handlePaneClick = useCallback(
    (evt: React.MouseEvent) => {
      if (!placeMode) return;
      const pos = screenToFlowPosition({ x: evt.clientX, y: evt.clientY });
      const node = buildNode(pos);

      // ✅ Append the NODE (typed as SkillNode, compatible with AppNode union)
      setNodes((nds) => nds.concat(node));

      if (autoConnect && selectedId) {
        setEdges((eds) =>
          addEdge<AppEdge>({ id: `e${selectedId}-${node.id}`, source: selectedId, target: node.id, animated: true }, eds)
        );
      }
      setPlaceMode(false);
    },
    [placeMode, screenToFlowPosition, buildNode, autoConnect, selectedId]
  );

  /** ---------- Add near the center of the current renderer ---------- */
  const addAtCenter = useCallback(() => {
    const renderer = document.querySelector('.react-flow__renderer') as HTMLElement | null;
    if (!renderer) return;

    const rect = renderer.getBoundingClientRect();
    const center = screenToFlowPosition({ x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 });
    const node = buildNode(center);

    setNodes((nds) => nds.concat(node));

    if (autoConnect && selectedId) {
      setEdges((eds) =>
        addEdge<AppEdge>({ id: `e${selectedId}-${node.id}`, source: selectedId, target: node.id, animated: true }, eds)
      );
    }
  }, [screenToFlowPosition, buildNode, autoConnect, selectedId]);

  /** ---------- Track selection for auto-connect ---------- */
  const onSelectionChange = useCallback(
    ({ nodes: selectedNodes }: { nodes: AppNode[]; edges: AppEdge[] }) => {
      setSelectedId(selectedNodes[0]?.id ?? null);
    },
    []
  );

  const canSubmit = useMemo(() => name.trim().length > 0, [name]);

  return (
    <div className="h-[72vh] w-full overflow-hidden rounded-xl border border-zinc-200 bg-white/80 text-black dark:border-zinc-800 dark:bg-zinc-900/40">
      {/* Toolbar */}
      <div className="flex flex-wrap items-end gap-2 border-b border-zinc-200 text-white p-3 dark:border-zinc-800 dark:bg-zinc-900">
        <div className="flex flex-col">
          <label className="text-xs text-zinc-500">Name *</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Skill name"
            className="h-8 w-48 rounded border border-zinc-300 bg-white px-2 text-sm dark:bg-zinc-800"
          />
        </div>
        <div className="flex min-w-[16rem] flex-1 flex-col">
          <label className="text-xs text-zinc-500">Description</label>
          <input
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Optional description"
            className="h-8 rounded border border-zinc-300 bg-white px-2 text-sm dark:bg-zinc-800"
          />
        </div>
        <div className="flex flex-col">
          <label className="text-xs text-zinc-500">Cost (optional)</label>
          <input
            value={cost}
            onChange={(e) => setCost(e.target.value.replace(/[^0-9]/g, ''))}
            placeholder="e.g. 2"
            inputMode="numeric"
            className="h-8 w-24 rounded border border-zinc-300 bg-white px-2 text-sm dark:bg-zinc-800"
          />
        </div>
        <div className="flex flex-col">
          <label className="text-xs text-zinc-500">Level (optional)</label>
          <input
            value={level}
            onChange={(e) => setLevel(e.target.value.replace(/[^0-9]/g, ''))}
            placeholder="e.g. 3"
            inputMode="numeric"
            className="h-8 w-24 rounded border border-zinc-300 bg-white px-2 text-sm dark:bg-zinc-800"
          />
        </div>

        <div className="ml-auto flex items-center gap-3">
          {/* Blue when active */}
          <button
            onClick={() => setPlaceMode((v) => !v)}
            disabled={!canSubmit && !placeMode}
            style={{ cursor: 'pointer' }}
            className={[
              'h-8 rounded-lg border px-3 text-sm transition-colors disabled:cursor-not-allowed disabled:opacity-60',
              placeMode
                ? 'border-blue-600 bg-blue-600 text-white'
                : 'border-zinc-300 bg-white text-zinc-900 hover:bg-blue-50',
            ].join(' ')}
            title="Click anywhere on the canvas to place"
          >
            {placeMode ? 'Click to place…' : 'Add (click to place)'}
          </button>

          <button
            onClick={addAtCenter}
            disabled={!canSubmit}
            style={{ cursor: 'pointer' }}
            className="h-8 rounded-lg border border-zinc-300 bg-white px-3 text-sm text-zinc-900 hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Add at center
          </button>

          <label className="flex items-center gap-2 text-xs text-zinc-600">
            <input
              type="checkbox"
              checked={autoConnect}
              onChange={(e) => setAutoConnect(e.target.checked)}
            />
            Auto-connect from selected
          </label>
        </div>
      </div>

      {/* Canvas */}
      <div className="h-[calc(100%-52px)] w-full">
        {/* Pass your unions here so callbacks & hooks narrow correctly (docs pattern). */}
        <ReactFlow<AppNode, AppEdge>
          nodes={nodes}
          edges={edges}
          nodeTypes={nodeTypes}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onPaneClick={handlePaneClick}
          onSelectionChange={onSelectionChange}
          fitView
          fitViewOptions={{ padding: 0.2 }}
          defaultEdgeOptions={{ animated: true }}
          style={{ width: '100%', height: '100%' }}
        >
          <MiniMap />
          <Controls />
          <Background />
        </ReactFlow>
      </div>
    </div>
  );
}
