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
import { Splash } from './Splash';
import { EditNodeModal } from './EditNodeModal';
import { useLocalStorage } from '../hooks/useLocalStorage';
import type { SkillNode, SkillData, AppNode, AppEdge } from '../types/skillTypes';
import { shallowEqual } from '../utils/helpers';
import { isSkillNode } from '../utils/helpers';
import { CYCLE_ERROR_MESSAGE, DEFAULT_EDGE_OPTIONS, DEFAULT_NODE_STYLE, DELETE_KEYS, initialEdges, initialNodes } from '../constants/canvasConstants';

type EdgeConnection = Connection & Partial<Pick<AppEdge, 'id' | 'animated'>>;

export default function Flow() {
  /** ---------- Seed graph ---------- */
  const [nodes, setNodes, hadStoredNodes, nodesInitialized] = useLocalStorage<AppNode[]>('skill-tree-nodes', initialNodes);
  const [edges, setEdges, hadStoredEdges, edgesInitialized] = useLocalStorage<AppEdge[]>('skill-tree-edges', initialEdges);

  /** Form / UX */
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [cost, setCost] = useState('');
  const [level, setLevel] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [placeMode, setPlaceMode] = useState(false);
  const [autoConnect, setAutoConnect] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [showSplash, setShowSplash] = useState(true);
  const [hasHydrated, setHasHydrated] = useState(false);
  const storageReady = nodesInitialized && edgesInitialized;
  const hasExistingTree = hadStoredNodes || hadStoredEdges;
  const [editingNodeId, setEditingNodeId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editCost, setEditCost] = useState('');
  const [editLevel, setEditLevel] = useState('');

  /** Selection */
  const [selectedNodeIds, setSelectedNodeIds] = useState<string[]>([]);
  const [selectedEdgeIds, setSelectedEdgeIds] = useState<string[]>([]);

  /** ID source for nodes */
  const idRef = useRef(3);
  const nextId = () => String(idRef.current++);

  /** Ensure all node IDs are always unique */
  useEffect(() => {
    // Find the largest ID
    const maxId = nodes.reduce((max, node) => {
      const numericId = Number(node.id);
      return Number.isFinite(numericId) ? Math.max(max, numericId) : max;
    }, 0);
    // Set current IdRef to largest existing ID + 1
    if (maxId + 1 > idRef.current) {
      idRef.current = maxId + 1;
    }
  }, [nodes]);

  /** Instance (typed with unions) - to place nodes in the correct coordinates on the canvas and delete nodes */
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

  const searchInfo = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    if (!query) {
      return {
        query,
        matchedNodeIds: new Set<string>(),
        pathNodeIds: new Set<string>(),
        pathEdgeIds: new Set<string>(),
      };
    }

    /** Find nodes with name/description that matches the search query */
    const matchedNodeIds = new Set<string>();
    nodes.forEach((node) => {
      if (!isSkillNode(node)) return;
      const data = node.data as SkillData;
      const haystack = `${data.name} ${data.description ?? ''}`.toLowerCase();
      if (haystack.includes(query)) matchedNodeIds.add(node.id);
    });

    const pathNodeIds = new Set<string>(matchedNodeIds);
    const pathEdgeIds = new Set<string>();

    if (matchedNodeIds.size > 0) {
      const incomingMap = new Map<string, AppEdge[]>();
      edges.forEach((edge) => {
        const list = incomingMap.get(edge.target);
        if (list) {
          list.push(edge);
        } else {
          incomingMap.set(edge.target, [edge]);
        }
      });

      const stack = Array.from(matchedNodeIds);
      while (stack.length > 0) {
        const current = stack.pop();
        if (!current) continue;
        const incoming = incomingMap.get(current);
        if (!incoming) continue;
        incoming.forEach((edge) => {
          pathEdgeIds.add(edge.id);
          if (!pathNodeIds.has(edge.source)) {
            pathNodeIds.add(edge.source);
            stack.push(edge.source);
          }
        });
      }
    }

    return {
      query,
      matchedNodeIds,
      pathNodeIds,
      pathEdgeIds,
    };
  }, [searchTerm, nodes, edges]);

  const searchActive = searchInfo.query.length > 0;
  const hasPathNodes = searchInfo.pathNodeIds.size > 0;
  const hasPathEdges = searchInfo.pathEdgeIds.size > 0;

  const renderedNodes = useMemo(() => {
    if (!searchActive || !hasPathNodes) return nodes;
    return nodes.map((node) => {
      if (!isSkillNode(node)) return node;
      const data = node.data as SkillData;
      const match = searchInfo.matchedNodeIds.has(node.id);
      const onPath = searchInfo.pathNodeIds.has(node.id);
      if (!match && !onPath) return {
        ...node,
        data: {
          ...data,
          searchMatch: false,
          searchPath: false,
          searchDimmed: true,
        },
      } as SkillNode;
      return {
        ...node,
        data: {
          ...data,
          searchMatch: match,
          searchPath: onPath,
          searchDimmed: !onPath,
        },
      } as SkillNode;
    });
  }, [nodes, searchActive, hasPathNodes, searchInfo]);

  const renderedEdges = useMemo(() => {
    if (!searchActive || !hasPathEdges) return edges;

    return edges.map((edge) => {
      if (searchInfo.pathEdgeIds.has(edge.id)) {
        return {
          ...edge,
          style: {
            ...(edge.style || {}),
            stroke: '#fcd34d',
            strokeWidth: 3,
            opacity: 1,
          },
        };
      }
      return {
        ...edge,
        style: {
          ...(edge.style || {}),
          opacity: 0.2,
        },
      };
    });
  }, [edges, searchActive, hasPathEdges, searchInfo]);

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

  const startEditNode = useCallback(
    (id: string) => {
      const node = nodes.find(
        (n): n is SkillNode => isSkillNode(n) && n.id === id,
      );
      if (!node) return;
      const data = node.data as SkillData;
      setEditName(data.name ?? '');
      setEditDescription(data.description ?? '');
      setEditCost(
        typeof data.cost === 'number' && Number.isFinite(data.cost)
          ? String(data.cost)
          : '',
      );
      setEditLevel(
        typeof data.level === 'number' && Number.isFinite(data.level)
          ? String(data.level)
          : '',
      );
      setEditingNodeId(id);
    },
    [nodes],
  );

  const closeEditModal = useCallback(() => {
    setEditingNodeId(null);
  }, []);

  const handleEditSave = useCallback(() => {
    if (!editingNodeId) return;
    const safeNumber = (value: string, fallback?: number) => {
      const trimmed = value.trim();
      if (trimmed === '') return undefined;
      const num = Number(trimmed);
      return Number.isFinite(num) ? num : fallback;
    };

    setNodes((prev) =>
      prev.map((node) => {
        if (!isSkillNode(node) || node.id !== editingNodeId) return node;
        const data = node.data as SkillData;
        const updatedName = editName.trim() || data.name;
        const updatedDescription = editDescription.trim() || undefined;
        const updatedCost = safeNumber(editCost, data.cost);
        const updatedLevel = safeNumber(editLevel, data.level);
        return {
          ...node,
          data: {
            ...data,
            name: updatedName,
            description: updatedDescription,
            cost: updatedCost,
            level: updatedLevel,
            onReset: data.onReset ?? (() => resetNode(editingNodeId)),
            onEdit: data.onEdit ?? (() => startEditNode(editingNodeId)),
          },
        } as SkillNode;
      }),
    );
    setEditingNodeId(null);
  }, [editingNodeId, editName, editDescription, editCost, editLevel, resetNode, setNodes, startEditNode]);

  useEffect(() => {
    if (!editingNodeId) return;
    const node = nodes.find(
      (n): n is SkillNode => isSkillNode(n) && n.id === editingNodeId,
    );
    if (!node) return;
    const data = node.data as SkillData;
    setEditName(data.name ?? '');
    setEditDescription(data.description ?? '');
    setEditCost(
      typeof data.cost === 'number' && Number.isFinite(data.cost)
        ? String(data.cost)
        : '',
    );
    setEditLevel(
      typeof data.level === 'number' && Number.isFinite(data.level)
        ? String(data.level)
        : '',
    );
  }, [editingNodeId, nodes]);

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
        onEdit: () => startEditNode(id),
      };

      return {
        id,
        type: 'skill',
        position,
        data,
        sourcePosition: Position.Right,
        targetPosition: Position.Left,
        style: { ...DEFAULT_NODE_STYLE },
      } as SkillNode;
    },
    [name, description, cost, level, resetNode, startEditNode],
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

      setSelectedNodeIds((prev) => (shallowEqual(prev, nodeIds) ? prev : nodeIds));
      setSelectedEdgeIds((prev) => (shallowEqual(prev, edgeIds) ? prev : edgeIds));
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

  const closeSidebarForMobile = () => {
    if (window.innerWidth <= 768) setSidebarOpen(false);
  };


  /** Ensure all skill nodes have reset/edit handlers */
  useEffect(() => {
    setNodes((prev) => {
      let changed = false;
      const next = prev.map((node) => {
        if (!isSkillNode(node)) return node;
        const data = node.data as SkillData;
        let nodeChanged = false;
        const nextData = { ...data } as SkillData;
        if (typeof data.onReset !== 'function') {
          nextData.onReset = () => resetNode(node.id);
          nodeChanged = true;
        }
        if (typeof data.onEdit !== 'function') {
          nextData.onEdit = () => startEditNode(node.id);
          nodeChanged = true;
        }
        let styleChanged = false;
        const nextStyle = { ...(node.style ?? {}) };
        if (typeof nextStyle.width !== 'number') {
          nextStyle.width = DEFAULT_NODE_STYLE.width;
          styleChanged = true;
        }
        if (typeof nextStyle.minHeight !== 'number') {
          nextStyle.minHeight = DEFAULT_NODE_STYLE.minHeight;
          styleChanged = true;
        }
        if (nodeChanged || styleChanged) {
          changed = true;
          return { ...node, data: nextData, style: nextStyle } as SkillNode;
        }
        return node;
      });
      return changed ? next : prev;
    });
  }, [resetNode, startEditNode, setNodes]);

  /** Automatically re-open the sidebar when the screen expands past 768px */
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 768) {
        setSidebarOpen(true);
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  /** Ensure the app has hydrated before rendering the splash to prevent UI mismatches on render */
  useEffect(() => {
    setHasHydrated(true);
  }, []);

  /** ---------- Layout & animated sidebar ---------- */
  const splashCtaLabel =
    hasHydrated && storageReady && hasExistingTree ? 'Continue with my tree' : undefined;
  const showResetButton = hasHydrated && storageReady && hasExistingTree;
  const splashLoading = !hasHydrated;

  return (
    <div className="relative flex h-full w-full flex-col overflow-hidden bg-white/80 text-black dark:bg-zinc-900/40">
      <div className="flex min-h-0 flex-1 w-full">
        {/* Sidebar as animated drawer */}
        <motion.div
          animate={{
            x: sidebarOpen ? 0 : -288,
            width: sidebarOpen ? 288 : 0,
          }}
          initial={false}
          transition={{ duration: 0.45, ease: [0.23, 1.11, 0.32, 1] }}
          className="fixed md:static top-0 left-0 z-30 h-full flex-shrink-0 overflow-hidden bg-zinc-900"
        >
          {/* Sidebar content */}
          <SkillSidebar
            name={name}
            description={description}
            cost={cost}
            level={level}
            searchQuery={searchTerm}
            placeMode={placeMode}
            autoConnect={autoConnect}
            hasSelection={
              selectedNodeIds.length > 0 || selectedEdgeIds.length > 0
            }
            hasSelectedNodes={selectedNodeIds.length > 0}
            onNameChange={setName}
            onDescriptionChange={setDescription}
            onCostChange={setCost}
            onLevelChange={setLevel}
            onSearchChange={setSearchTerm}
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
            onClose={() => setSidebarOpen(false)}
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
            className="absolute top-3 left-3 z-40 md:hidden rounded bg-zinc-800 p-2 text-white shadow"
            aria-label="Open sidebar"
            animate={{ rotate: sidebarOpen ? 90 : 0 }}
            whileTap={{ scale: 0.9 }}
          >
            <span className="flex flex-col items-center justify-center gap-1">
              <span className="block h-0.5 w-4 rounded bg-white" />
              <span className="block h-0.5 w-4 rounded bg-white" />
              <span className="block h-0.5 w-4 rounded bg-white" />
            </span>
          </motion.button>
        )}

        {/* Canvas */}
        <div className="h-full flex-1">
          <ReactFlow<AppNode, AppEdge>
            nodes={renderedNodes}
            edges={renderedEdges}
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
            fitViewOptions={{ padding: 0.2 }}
            defaultEdgeOptions={DEFAULT_EDGE_OPTIONS}
            style={{ width: '100%', height: '100%' }}
          >
            <MiniMap style={{ bottom: 60, right: 16 }} />
            <Controls style={{ bottom: 60, left: 16 }} />
            <Background />
          </ReactFlow>
        </div>
      </div>
      <EditNodeModal
        visible={Boolean(editingNodeId)}
        name={editName}
        description={editDescription}
        cost={editCost}
        level={editLevel}
        onChangeName={setEditName}
        onChangeDescription={setEditDescription}
        onChangeCost={setEditCost}
        onChangeLevel={setEditLevel}
        onCancel={closeEditModal}
        onSave={handleEditSave}
      />
      <ToastContainer position="bottom-right" autoClose={3200} pauseOnHover closeOnClick theme="dark" />
      <Splash
        visible={showSplash}
        onStart={() => setShowSplash(false)}
        ctaLabel={splashCtaLabel}
        onReset={
          showResetButton
            ? () => {
                setNodes(initialNodes);
                setEdges(initialEdges);
                window.localStorage.removeItem('skill-tree-nodes');
                window.localStorage.removeItem('skill-tree-edges');
                setShowSplash(false);
              }
            : undefined
        }
        loading={splashLoading}
      />
    </div>
  );
}
