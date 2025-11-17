'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  addEdge,
  applyEdgeChanges,
  applyNodeChanges,
  reconnectEdge,
  useReactFlow,
  Position,
  type OnEdgesChange,
  type OnNodesChange,
  type OnConnect,
  type Connection,
  type NodeMouseHandler,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import { motion } from 'framer-motion';

import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

import { nodeTypes } from './SkillNode';
import { SkillSidebar } from './SkillSidebar';
import type { SkillNode, SkillData, AppNode, AppEdge } from './skillTypes';

// constants
const FIT_VIEW = { padding: 0.2 } as const;
const DEFAULT_EDGE_OPTIONS = { animated: true } as const;
const DELETE_KEYS = ['Delete', 'Backspace'] as const;

const initialEdges: AppEdge[] = [{ id: 'e1-2', source: '1', target: '2', animated: true }];
const CYCLE_ERROR_MESSAGE = 'Circular skill connections are not allowed.';

type EdgeConnection = Connection & Partial<Pick<AppEdge, 'id' | 'animated'>>;

// Small helper so TS knows when we have a SkillNode
function isSkillNode(node: AppNode): node is SkillNode {
  return node.type === 'skill';
}

function shallowEqualIds(a: string[], b: string[]) {
  if (a === b) return true;
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return false;
  return true;
}

export default function Flow() {
  /** ---------- Seed graph ---------- */
  const [nodes, setNodes] = useState<AppNode[]>([
    {
      id: '1',
      type: 'skill',
      position: { x: 40, y: 40 },
      data: {
        name: 'Slash',
        description: 'Basic melee attack',
        cost: 1,
        level: 1,
        unlocked: true,
        // onReset is wired up after resetNode is defined, via closure
      } as SkillData,
      sourcePosition: Position.Right,
      targetPosition: Position.Left,
    } as SkillNode,
    {
      id: '2',
      type: 'skill',
      position: { x: 280, y: 120 },
      data: {
        name: 'Cleave',
        description: 'Arc attack hits multiple foes',
        unlocked: false,
      } as SkillData,
      sourcePosition: Position.Right,
      targetPosition: Position.Left,
    } as SkillNode,
  ]);

  const [edges, setEdges] = useState<AppEdge[]>(initialEdges);

  /** Form / UX */
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [cost, setCost] = useState('');
  const [level, setLevel] = useState('');
  const [placeMode, setPlaceMode] = useState(false);
  const [autoConnect, setAutoConnect] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  /** Selection */
  const [selectedNodeIds, setSelectedNodeIds] = useState<string[]>([]);
  const [selectedEdgeIds, setSelectedEdgeIds] = useState<string[]>([]);

  /** ID source */
  const idRef = useRef(3);
  const nextId = () => String(idRef.current++);

  /** Instance (typed with your unions) */
  const { screenToFlowPosition, deleteElements } = useReactFlow<AppNode, AppEdge>();

  /** Reset a node to locked */
  const resetNode = useCallback((id: string) => {
    setNodes((prev) =>
      prev.map((n) => {
        if (!isSkillNode(n) || n.id !== id) return n;
        return {
          ...n,
          data: { ...(n.data as SkillData), unlocked: false },
        } as SkillNode;
      }),
    );
  }, []);

  /** Ensure all skill nodes can reset themselves */
  useEffect(() => {
    setNodes((prev) => {
      let changed = false;
      const next = prev.map((node) => {
        if (!isSkillNode(node)) return node;
        const data = node.data as SkillData;
        if (typeof data.onReset === 'function') return node;
        changed = true;
        return {
          ...node,
          data: {
            ...data,
            onReset: () => resetNode(node.id),
          },
        } as SkillNode;
      });
      return changed ? next : prev;
    });
  }, [resetNode]);

  /** Changes (typed) */
  const onNodesChange: OnNodesChange<AppNode> = useCallback(
    (changes) => setNodes((nds) => applyNodeChanges<AppNode>(changes, nds)),
    [],
  );

  const onEdgesChange: OnEdgesChange<AppEdge> = useCallback(
    (changes) => setEdges((eds) => applyEdgeChanges<AppEdge>(changes, eds)),
    [],
  );

  const wouldCreateCycle = useCallback(
    (sourceId?: string | null, targetId?: string | null) => {
      if (!sourceId || !targetId) return false;
      if (sourceId === targetId) return true;

      const adjacency = new Map<string, string[]>();
      edges.forEach(({ source, target }) => {
        if (!source || !target) return;
        const list = adjacency.get(source);
        if (list) {
          list.push(target);
        } else {
          adjacency.set(source, [target]);
        }
      });

      const stack = [targetId];
      const visited = new Set<string>();

      while (stack.length > 0) {
        const current = stack.pop();
        if (!current || visited.has(current)) continue;
        if (current === sourceId) return true;
        visited.add(current);
        const next = adjacency.get(current);
        if (next) stack.push(...next);
      }

      return false;
    },
    [edges],
  );

  const addEdgeSafely = useCallback(
    (connection: EdgeConnection) => {
      if (connection.source && connection.target && wouldCreateCycle(connection.source, connection.target)) {
        toast.error(CYCLE_ERROR_MESSAGE, { autoClose: 3200 });
        return false;
      }
      setEdges((eds) =>
        addEdge<AppEdge>(
          {
            animated: true,
            ...connection,
          },
          eds,
        ),
      );
      return true;
    },
    [wouldCreateCycle],
  );

  const onConnect: OnConnect = useCallback(
    (connection) => {
      addEdgeSafely(connection);
    },
    [addEdgeSafely],
  );

  const onReconnect = useCallback(
    (oldEdge: AppEdge, newConnection: Connection) => {
      setEdges((eds) => reconnectEdge(oldEdge, newConnection, eds));
    },
    [],
  );

  /** Build new node (starts locked) */
  const buildNode = useCallback(
    (position: { x: number; y: number }): SkillNode => {
      const id = nextId();
      const costNumRaw = cost.trim() === '' ? undefined : Number(cost);
      const levelNumRaw = level.trim() === '' ? undefined : Number(level);
      const costNum =
        typeof costNumRaw === 'number' && Number.isFinite(costNumRaw)
          ? costNumRaw
          : undefined;
      const levelNum =
        typeof levelNumRaw === 'number' && Number.isFinite(levelNumRaw)
          ? levelNumRaw
          : undefined;

      const data: SkillData = {
        name: name.trim() || `Skill ${id}`,
        description: description.trim() || undefined,
        cost: costNum,
        level: levelNum,
        unlocked: false,
        onReset: () => resetNode(id),
      };

      return {
        id,
        type: 'skill',
        position,
        data: {
          ...data,
        },
        sourcePosition: Position.Right,
        targetPosition: Position.Left,
      } as SkillNode;
    },
    [name, description, cost, level, resetNode],
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
        addEdgeSafely({
          id: `e${from}-${node.id}`,
          source: from,
          sourceHandle: null,
          target: node.id,
          targetHandle: null,
          animated: true,
        });
      }
      setPlaceMode(false);
    },
    [placeMode, screenToFlowPosition, buildNode, autoConnect, selectedNodeIds, addEdgeSafely],
  );

  /** Add at center */
  const addAtCenter = useCallback(() => {
    const renderer = document.querySelector(
      '.react-flow__renderer',
    ) as HTMLElement | null;
    if (!renderer) return;

    const rect = renderer.getBoundingClientRect();
    const center = screenToFlowPosition({
      x: rect.left + rect.width / 2,
      y: rect.top + rect.height / 2,
    });
    const node = buildNode(center);

    setNodes((nds) => nds.concat(node));

    if (autoConnect && selectedNodeIds[0]) {
      const from = selectedNodeIds[0];
      addEdgeSafely({
        id: `e${from}-${node.id}`,
        source: from,
        sourceHandle: null,
        target: node.id,
        targetHandle: null,
        animated: true,
      });
    }
  }, [screenToFlowPosition, buildNode, autoConnect, selectedNodeIds, addEdgeSafely]);

  /** Selection handler (typed) */
  const onSelectionChange = useCallback(
    ({ nodes: ns, edges: es }: { nodes: AppNode[]; edges: AppEdge[] }) => {
      const nodeIds = ns.map((n) => n.id);
      const edgeIds = es.map((e) => e.id);

      setSelectedNodeIds((prev) => (shallowEqualIds(prev, nodeIds) ? prev : nodeIds));
      setSelectedEdgeIds((prev) => (shallowEqualIds(prev, edgeIds) ? prev : edgeIds));
    },
    [],
  );

  /** Unlock on node click if prerequisites met */
  const onNodeClick: NodeMouseHandler<AppNode> = useCallback(
    (_evt, node) => {
      if (!isSkillNode(node)) return;

      setNodes((prevNodes) => {
        const current = prevNodes.find(
          (n): n is SkillNode => isSkillNode(n) && n.id === node.id,
        );
        if (!current) return prevNodes;

        const currentData = current.data as SkillData;
        if (currentData.unlocked) return prevNodes;

        // edges that point into this node
        const incoming = edges.filter((e) => e.target === node.id);
        const prereqIds = incoming.map((e) => e.source);

        const prerequisitesMet =
          prereqIds.length === 0 ||
          prereqIds.every((pid) => {
            const prereq = prevNodes.find(
              (n): n is SkillNode => isSkillNode(n) && n.id === pid,
            );
            return prereq ? (prereq.data as SkillData).unlocked : false;
          });

        if (!prerequisitesMet) return prevNodes;

        return prevNodes.map((n) => {
          if (!isSkillNode(n) || n.id !== node.id) return n;
          const d = n.data as SkillData;
          return {
            ...n,
            data: { ...d, unlocked: true },
          } as SkillNode;
        });
      });
    },
    [edges],
  );

  /** Delete selected */
  const deleteSelected = useCallback(() => {
    const nodesToDelete = nodes.filter((n) => selectedNodeIds.includes(n.id));
    const edgesToDelete = edges.filter((e) => selectedEdgeIds.includes(e.id));
    if (nodesToDelete.length === 0 && edgesToDelete.length === 0) return;

    deleteElements({ nodes: nodesToDelete, edges: edgesToDelete });
    setSelectedNodeIds([]);
    setSelectedEdgeIds([]);
  }, [deleteElements, nodes, edges, selectedNodeIds, selectedEdgeIds]);

  /** Detach selected nodes */
  const detachSelectedNodes = useCallback(() => {
    if (selectedNodeIds.length === 0) return;
    setEdges((eds) =>
      eds.filter(
        (e) =>
          !selectedNodeIds.includes(e.source) &&
          !selectedNodeIds.includes(e.target),
      ),
    );
  }, [selectedNodeIds]);

  const canSubmit = useMemo(() => name.trim().length > 0, [name]);

  const closeSidebarForMobile = () => {
    if (window.innerWidth <= 768) setSidebarOpen(false);
  };

  /** ---------- Layout & animated sidebar ---------- */
  return (
    <div className="h-full w-full overflow-hidden bg-white/80 text-black dark:bg-zinc-900/40">
      <div className="flex h-full w-full">
        {/* Sidebar as animated drawer */}
        <motion.div
          animate={{ x: sidebarOpen ? 0 : -288 }} // w-72 = 18rem = 288px
          transition={{ duration: 0.45, ease: [0.23, 1.11, 0.32, 1] }}
          className="fixed md:static top-0 left-0 h-full w-72 z-30 bg-zinc-900"
        >
          {/* Close button (mobile) */}
          {sidebarOpen && (
            <motion.button
              onClick={() => setSidebarOpen(false)}
              className="absolute top-3 right-3 z-40 md:hidden rounded bg-zinc-800 px-2 py-1 text-white shadow"
              initial={false}
              animate={{ rotate: 180 }}
              whileTap={{ scale: 0.9 }}
              transition={{ duration: 0.3 }}
            >
              ×
            </motion.button>
          )}

          {/* Sidebar content */}
          <SkillSidebar
            name={name}
            description={description}
            cost={cost}
            level={level}
            placeMode={placeMode}
            autoConnect={autoConnect}
            canSubmit={canSubmit}
            hasSelection={
              selectedNodeIds.length > 0 || selectedEdgeIds.length > 0
            }
            hasSelectedNodes={selectedNodeIds.length > 0}
            onNameChange={setName}
            onDescriptionChange={setDescription}
            onCostChange={(v: string) => setCost(v.replace(/[^0-9]/g, ''))}
            onLevelChange={(v: string) => setLevel(v.replace(/[^0-9]/g, ''))}
            onTogglePlaceMode={() => {
              closeSidebarForMobile();
              setPlaceMode((v) => !v);
            }}
            onAddAtCenter={() => {
              closeSidebarForMobile();
              addAtCenter();
            }}
            onDeleteSelected={deleteSelected}
            onDetachSelected={detachSelectedNodes}
            onToggleAutoConnect={setAutoConnect}
            closeSidebarForMobile={closeSidebarForMobile}
          />
        </motion.div>

        {/* Overlay on mobile when sidebar open */}
        {sidebarOpen && (
          <motion.div
            className="fixed inset-0 bg-black/40 backdrop-blur-sm md:hidden z-20"
            onClick={() => setSidebarOpen(false)}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          />
        )}

        {/* Hamburger when sidebar closed (mobile only) */}
        {!sidebarOpen && (
          <motion.button
            onClick={() => setSidebarOpen(true)}
            className="absolute top-3 left-3 z-40 md:hidden rounded bg-zinc-800 px-2 py-1 text-white shadow"
            animate={{ rotate: sidebarOpen ? 90 : 0 }}
            whileTap={{ scale: 0.9 }}
          >
            ☰
          </motion.button>
        )}

        {/* Canvas */}
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
            onNodeClick={onNodeClick}
            deleteKeyCode={DELETE_KEYS as unknown as string[]}
            fitView
            fitViewOptions={FIT_VIEW}
            defaultEdgeOptions={DEFAULT_EDGE_OPTIONS}
            style={{ width: '100%', height: '100%' }}
          >
            <MiniMap style={{ bottom: 60, right: 16 }} />
            <Controls style={{ bottom: 60, left: 16 }} />
            <Background />
          </ReactFlow>
        </div>
      </div>
      <ToastContainer position="bottom-right" autoClose={3200} pauseOnHover closeOnClick theme="dark" />
    </div>
  );
}
