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
  reconnectEdge,          // ✅ v12 helper
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
  type Connection,        // for onReconnect args
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

/** ---------- Your data model ---------- */
type SkillData = {
  name: string;
  description?: string;
  cost?: number;
  level?: number;
};

/** ---------- Custom node & unions ---------- */
type SkillNode = Node<SkillData, 'skill'>;
type AppNode = BuiltInNode | SkillNode;
type AppEdge = BuiltInEdge;

// put these OUTSIDE the component so they don't re-create every render
const FIT_VIEW = { padding: 0.2 } as const;
const DEFAULT_EDGE_OPTIONS = { animated: true } as const;
const DELETE_KEYS = ['Delete', 'Backspace'] as const;

/** ---------- Custom node component ---------- */
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

export default function Flow() {
  /** Graph state */
  const [nodes, setNodes] = useState<AppNode[]>(initialNodes);
  const [edges, setEdges] = useState<AppEdge[]>(initialEdges);

  /** Form / UX */
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [cost, setCost] = useState('');
  const [level, setLevel] = useState('');
  const [placeMode, setPlaceMode] = useState(false);
  const [autoConnect, setAutoConnect] = useState(false);

  /** Selection */
  const [selectedNodeIds, setSelectedNodeIds] = useState<string[]>([]);
  const [selectedEdgeIds, setSelectedEdgeIds] = useState<string[]>([]);

  /** ID source */
  const idRef = useRef(3);
  const nextId = () => String(idRef.current++);

  /** Instance (typed with your unions) */
  const { screenToFlowPosition, deleteElements } = useReactFlow<AppNode, AppEdge>();

  /** Changes (typed) */
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

  /** ✅ v12 edge reconnection */
  const onReconnect = useCallback(
    (oldEdge: AppEdge, newConnection: Connection) => {
      setEdges((eds) => reconnectEdge(oldEdge, newConnection, eds));
    },
    []
  );

  /** Build a new Skill node */
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

  /** Place by clicking the pane */
  const handlePaneClick = useCallback(
    (evt: React.MouseEvent) => {
      if (!placeMode) return;
      const pos = screenToFlowPosition({ x: evt.clientX, y: evt.clientY });
      const node = buildNode(pos);

      setNodes((nds) => nds.concat(node));

      if (autoConnect && selectedNodeIds[0]) {
        const from = selectedNodeIds[0];
        setEdges((eds) =>
          addEdge<AppEdge>({ id: `e${from}-${node.id}`, source: from, target: node.id, animated: true }, eds)
        );
      }
      setPlaceMode(false);
    },
    [placeMode, screenToFlowPosition, buildNode, autoConnect, selectedNodeIds]
  );

  /** Add at center */
  const addAtCenter = useCallback(() => {
    const renderer = document.querySelector('.react-flow__renderer') as HTMLElement | null;
    if (!renderer) return;

    const rect = renderer.getBoundingClientRect();
    const center = screenToFlowPosition({ x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 });
    const node = buildNode(center);

    setNodes((nds) => nds.concat(node));

    if (autoConnect && selectedNodeIds[0]) {
      const from = selectedNodeIds[0];
      setEdges((eds) =>
        addEdge<AppEdge>({ id: `e${from}-${node.id}`, source: from, target: node.id, animated: true }, eds)
      );
    }
  }, [screenToFlowPosition, buildNode, autoConnect, selectedNodeIds]);

  function shallowEqualIds(a: string[], b: string[]) {
    if (a === b) return true;
    if (a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return false;
    return true;
  }

  // ✅ stable, guarded selection handler
  const onSelectionChange = useCallback(
    ({ nodes: ns, edges: es }: { nodes: AppNode[]; edges: AppEdge[] }) => {
      const nodeIds = ns.map((n) => n.id);
      const edgeIds = es.map((e) => e.id);

      setSelectedNodeIds((prev) => (shallowEqualIds(prev, nodeIds) ? prev : nodeIds));
      setSelectedEdgeIds((prev) => (shallowEqualIds(prev, edgeIds) ? prev : edgeIds));
    },
    []
  );

  /** Delete selected nodes/edges */
  const deleteSelected = useCallback(() => {
    const nodesToDelete = nodes.filter((n) => selectedNodeIds.includes(n.id));
    const edgesToDelete = edges.filter((e) => selectedEdgeIds.includes(e.id));
    if (nodesToDelete.length === 0 && edgesToDelete.length === 0) return;

    deleteElements({ nodes: nodesToDelete, edges: edgesToDelete });
    setSelectedNodeIds([]);
    setSelectedEdgeIds([]);
  }, [deleteElements, nodes, edges, selectedNodeIds, selectedEdgeIds]);

  /** Detach: remove all edges connected to selected nodes */
  const detachSelectedNodes = useCallback(() => {
    if (selectedNodeIds.length === 0) return;
    setEdges((eds) =>
      eds.filter((e) => !selectedNodeIds.includes(e.source) && !selectedNodeIds.includes(e.target))
    );
  }, [selectedNodeIds]);

  const canSubmit = useMemo(() => name.trim().length > 0, [name]);

  /** ---------- LAYOUT ONLY CHANGES BELOW ---------- */
  return (
    <div className="h-full w-full overflow-hidden bg-white/80 text-black dark:bg-zinc-900/40">
      {/* Split layout: left toolbar, right canvas */}
      <div className="flex h-full w-full">
        {/* Left sidebar / toolbar */}
        <aside className="flex h-full w-80 flex-col gap-4 border-r border-zinc-200 bg-zinc-900 p-4 text-white dark:border-zinc-800 dark:bg-zinc-900">
          <h1 className="text-2xl font-bold">Skill Tree Builder</h1>
          <h2 className="text-md font-semibold">Add Skill</h2>

          <div className="flex flex-1 flex-col gap-3 overflow-y-auto">
            <div className="flex flex-col gap-1">
              <label className="text-xs text-white">Name *</label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Skill name"
                className="h-8 rounded border border-zinc-300 bg-white p-2 text-sm text-white dark:bg-zinc-800"
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-xs text-white">Description</label>
              <input
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Optional description"
                className="h-8 rounded border border-zinc-300 bg-white p-2 text-sm text-white dark:bg-zinc-800"
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-xs text-white">Cost (optional)</label>
              <input
                value={cost}
                onChange={(e) => setCost(e.target.value.replace(/[^0-9]/g, ''))}
                placeholder="e.g. 2"
                inputMode="numeric"
                className="h-8 w-24 rounded border border-zinc-300 bg-white p-2 text-sm text-white dark:bg-zinc-800"
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-xs text-white">Level (optional)</label>
              <input
                value={level}
                onChange={(e) => setLevel(e.target.value.replace(/[^0-9]/g, ''))}
                placeholder="e.g. 3"
                inputMode="numeric"
                className="h-8 w-24 rounded border border-zinc-300 bg-white p-2 text-sm text-white dark:bg-zinc-800"
              />
            </div>
          </div>

          {/* Buttons / actions at bottom of sidebar */}
          <div className="flex flex-col gap-2 pt-2">
            <div className="flex gap-2">
              <button
                onClick={() => setPlaceMode((v) => !v)}
                disabled={!canSubmit && !placeMode}
                className={[
                  'min-h-10 flex-1 rounded-lg border p-3 text-sm transition-colors disabled:cursor-not-allowed disabled:opacity-60 cursor-pointer',
                  placeMode
                    ? 'border-blue-600 bg-blue-600 text-white'
                    : 'border-zinc-300 bg-white text-zinc-900 hover:bg-blue-50',
                ].join(' ')}
              >
               Click to place…
              </button>

              <button
                onClick={addAtCenter}
                disabled={!canSubmit}
                className="min-h-10 flex-1 rounded-lg border border-zinc-300 bg-white p-3 text-sm text-zinc-900 hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-60 cursor-pointer"
              >
                Add at center
              </button>
            </div>

            <div className="flex gap-2">
              <button
                onClick={deleteSelected}
                className="min-h-10 flex-1 rounded-lg border border-red-600 bg-red-600 p-3 text-sm text-white disabled:cursor-not-allowed disabled:opacity-60 cursor-pointer, selectedNodeIds.length > 0 ? 'cursor-pointer' : 'cursor-not-allowed'"
                disabled={selectedNodeIds.length === 0 && selectedEdgeIds.length === 0}
              >
                Delete selected
              </button>

              <button
                onClick={detachSelectedNodes}
                className="min-h-10 flex-1 rounded-lg border border-zinc-300 bg-white p-3 text-sm text-zinc-900 disabled:cursor-not-allowed hover:bg-zinc-50 disabled:opacity-60 cursor-pointer, selectedNodeIds.length > 0 ? 'cursor-pointer' : 'cursor-not-allowed',"
                disabled={selectedNodeIds.length === 0}
              >
                Detach selected
              </button>
            </div>

            <label className="mt-1 flex items-center gap-2 text-xs text-white">
              <input
                type="checkbox"
                checked={autoConnect}
                onChange={(e) => setAutoConnect(e.target.checked)}
              />
              Auto-connect from selected
            </label>
          </div>
        </aside>

        {/* Right canvas */}
        <div className="h-full flex-1">
          <ReactFlow<AppNode, AppEdge>
            nodes={nodes}
            edges={edges}
            nodeTypes={nodeTypes}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onReconnect={onReconnect}
            onPaneClick={handlePaneClick}
            onSelectionChange={onSelectionChange}
            deleteKeyCode={DELETE_KEYS as unknown as string[]}
            fitView
            fitViewOptions={FIT_VIEW}
            defaultEdgeOptions={DEFAULT_EDGE_OPTIONS}
            style={{ width: '100%', height: '100%' }}
          >
            <MiniMap style={{ bottom: 40, right: 16 }} />
            <Controls style={{ bottom: 40, left: 16 }} />
            <Background />
          </ReactFlow>
        </div>
      </div>
    </div>
  );
}
