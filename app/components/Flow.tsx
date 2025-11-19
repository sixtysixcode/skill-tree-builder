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

import Link from 'next/link';
import bcrypt from 'bcryptjs';
import { motion } from 'framer-motion';

import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

import { nodeTypes } from './SkillNode';
import { SkillSidebar } from './SkillSidebar';
import { EditNodeModal } from './EditNodeModal';
import { ShareTreeModal } from './ShareTreeModal';
import type { SkillNode, SkillData, AppNode, AppEdge, FlowProps, EdgeConnection, RemoteCursor, SkillEdgeRow, SkillNodeRow } from '../types/skillTypes';
import { shallowEqual, isSkillNode, generateId, mapNodeRow, buildSeedGraph, mapEdgeRow } from '../utils/helpers';
import { computeSearchInfo, graphWouldCreateCycle } from '../utils/graphHelpers';
import { CURSOR_COLORS, CYCLE_ERROR_MESSAGE, DEFAULT_EDGE_OPTIONS, DEFAULT_NODE_STYLE, DELETE_KEYS } from '../constants/canvasConstants';
import { supabase } from '../lib/supabaseClient';
import type { RealtimeChannel } from '@supabase/supabase-js';

export default function Flow({ treeId }: FlowProps) {
  /** ---------- Seed graph ---------- */
  const [nodes, setNodes] = useState<AppNode[]>([]);
  const [edges, setEdges] = useState<AppEdge[]>([]);
  const nodesRef = useRef<AppNode[]>([]);
  const edgesRef = useRef<AppEdge[]>([]);
  const [treeLoading, setTreeLoading] = useState(true);
  const [treeError, setTreeError] = useState<string | null>(null);
  const [hasExistingTree, setHasExistingTree] = useState(false);

  /** Form / UX */
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [cost, setCost] = useState('');
  const [level, setLevel] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [placeMode, setPlaceMode] = useState(false);
  const [autoConnect, setAutoConnect] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [editingNodeId, setEditingNodeId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editCost, setEditCost] = useState('');
  const [editLevel, setEditLevel] = useState('');
  const [treeTitle, setTreeTitle] = useState<string>('Skill Tree');
  const titleSaveTimeout = useRef<NodeJS.Timeout | null>(null);
  const [hasTreePassword, setHasTreePassword] = useState(false);
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [shareCopied, setShareCopied] = useState(false);
  const [newPasswordInput, setNewPasswordInput] = useState('');
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [passwordMessage, setPasswordMessage] = useState<string | null>(null);
  const [lastSharedPassword, setLastSharedPassword] = useState<string | null>(null);
  const [remoteCursors, setRemoteCursors] = useState<Record<string, RemoteCursor>>({});

  /** Selection */
  const [selectedNodeIds, setSelectedNodeIds] = useState<string[]>([]);
  const [selectedEdgeIds, setSelectedEdgeIds] = useState<string[]>([]);

  /** Instance (typed with unions) - to place nodes in the correct coordinates on the canvas and delete nodes */
  const { screenToFlowPosition, deleteElements, getViewport } = useReactFlow<AppNode, AppEdge>();
  const canvasRef = useRef<HTMLDivElement | null>(null);
  const presenceChannelRef = useRef<RealtimeChannel | null>(null);
  const changeChannelRef = useRef<RealtimeChannel | null>(null);
  const lastCursorSendRef = useRef(0);
  const lastNodeBroadcastRef = useRef<Record<string, number>>({});
  const clientId = useMemo(() => generateId(), []);
  const userColor = useMemo(() => CURSOR_COLORS[Math.floor(Math.random() * CURSOR_COLORS.length)], []);
  const displayName = useMemo(() => `User ${clientId.slice(-4)}`, [clientId]);
  const isMountedRef = useRef(true);

  // Track whether the component is still mounted to avoid state updates post-unmount.
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // Keep refs in sync so callbacks can read the latest nodes without re-subscribing.
  useEffect(() => {
    nodesRef.current = nodes;
  }, [nodes]);

  // Same for edges to power graph helpers without extra dependencies.
  useEffect(() => {
    edgesRef.current = edges;
  }, [edges]);

  // Fetch the freshest copy of a skill node without triggering rerenders.
  const findSkillNode = useCallback(
    (id: string) => nodesRef.current.find((n): n is SkillNode => isSkillNode(n) && n.id === id),
    [],
  );

  // Write changes to Supabase while ensuring position sticks unless explicitly overwritten.
  const persistNodeUpdate = useCallback(
    (id: string, changes: Record<string, unknown>) => {
      const existing = findSkillNode(id);
      const payload = { ...changes };
      if (!('position' in payload) && existing?.position) {
        payload.position = existing.position;
      }
      return supabase.from('skill_nodes').update(payload).eq('id', id);
    },
    [findSkillNode],
  );

  const shareLink = typeof window !== 'undefined' ? `${window.location.origin}/tree/${treeId}` : '';

  // Copy the share link to the clipboard and give quick visual feedback.
  const handleCopyShareLink = async () => {
    try {
      await navigator.clipboard.writeText(shareLink);
      setShareCopied(true);
      setTimeout(() => setShareCopied(false), 1500);
    } catch {
      toast.error('Failed to copy link');
    }
  };

  // Persist a password change for the current tree.
  const handlePasswordUpdate = async () => {
    if (!newPasswordInput.trim()) {
      setPasswordMessage('Enter a password before saving.');
      return;
    }
    setPasswordSaving(true);
    setPasswordMessage(null);
    try {
      const hash = await bcrypt.hash(newPasswordInput, 10);
      const { error } = await supabase.from('trees').update({ password_hash: hash }).eq('id', treeId);
      if (error) throw error;
      setHasTreePassword(true);
      if (typeof window !== 'undefined') {
        sessionStorage.setItem(`tree-auth:${treeId}`, 'granted');
      }
      setLastSharedPassword(newPasswordInput);
      setNewPasswordInput('');
      setPasswordMessage('Password updated. Share it with collaborators.');
      broadcastAction('Updated tree password');
    } catch (err) {
      setPasswordMessage(err instanceof Error ? err.message : 'Failed to update password');
    } finally {
      setPasswordSaving(false);
    }
  };

  // Broadcast the user cursor position with a small throttle.
  const sendCursorPosition = useCallback(
    (flowX: number, flowY: number) => {
      const channel = presenceChannelRef.current;
      if (!channel) return;
      const now = Date.now();
      if (now - lastCursorSendRef.current < 40) return;
      lastCursorSendRef.current = now;
      channel.send({
        type: 'broadcast',
        event: 'cursor-move',
        payload: { id: clientId, flowX, flowY, color: userColor, name: displayName },
      });
    },
    [clientId, displayName, userColor],
  );

  // Push live node position updates to collaborators while dragging.
  const sendNodePosition = useCallback(
    (nodeId: string, position: { x: number; y: number }) => {
      const channel = presenceChannelRef.current;
      if (!channel) return;
      const now = Date.now();
      const last = lastNodeBroadcastRef.current[nodeId] ?? 0;
      if (now - last < 60) return;
      lastNodeBroadcastRef.current[nodeId] = now;
      channel.send({
        type: 'broadcast',
        event: 'node-position',
        payload: { id: clientId, nodeId, position },
      });
    },
    [clientId],
  );

  // Send high-level notifications (reset, unlock, etc.) to collaborators.
  const broadcastAction = useCallback(
    (message: string, options?: { refetch?: boolean }) => {
      const channel = presenceChannelRef.current;
      if (!channel) return;
      channel.send({
        type: 'broadcast',
        event: 'action',
        payload: { id: clientId, message, refetch: options?.refetch ?? false },
      });
    },
    [clientId],
  );

  // Remove any stored password, effectively making the tree public.
  const handleRemovePassword = async () => {
    setPasswordSaving(true);
    setPasswordMessage(null);
    try {
      const { error } = await supabase.from('trees').update({ password_hash: null }).eq('id', treeId);
      if (error) throw error;
      setHasTreePassword(false);
      setLastSharedPassword(null);
      if (typeof window !== 'undefined') {
        sessionStorage.removeItem(`tree-auth:${treeId}`);
      }
      setPasswordMessage('Password removed. Tree is now public.');
      broadcastAction('Removed tree password');
    } catch (err) {
      setPasswordMessage(err instanceof Error ? err.message : 'Failed to remove password');
    } finally {
      setPasswordSaving(false);
    }
  };

  /** Reset a node to locked */
  // Flip the unlocked flag locally and remotely (optionally silently).
  const resetNode = useCallback(
    (id: string, options?: { silent?: boolean; reason?: string }) => {
      let changed = false;
      let nodeName: string | undefined;
      setNodes((prev) =>
        prev.map((n) => {
          if (!isSkillNode(n) || n.id !== id) return n;
          const data = n.data as SkillData;
          if (!data.unlocked) return n;
          changed = true;
          nodeName = data.name;
          return {
            ...n,
            data: { ...data, unlocked: false },
          } as SkillNode;
        }),
      );
      if (!changed) return;
      void persistNodeUpdate(id, { unlocked: false });
      if (!options?.silent) {
        broadcastAction(options?.reason ?? `Locked "${nodeName ?? 'Skill'}"`);
      }
    },
    [setNodes, broadcastAction, persistNodeUpdate],
  );

  // When prerequisite nodes get locked, ensure dependent nodes relock too.
  const lockNodeIfPrereqsMissing = useCallback(
    (nodeId: string, incomingOverride?: Array<{ source: string }>) => {
      const node = nodesRef.current.find((n): n is SkillNode => isSkillNode(n) && n.id === nodeId);
      if (!node) return;
      const data = node.data as SkillData;
      if (!data.unlocked) return;
      const incoming =
        incomingOverride ??
        edgesRef.current.filter((edge) => edge.target === nodeId).map((edge) => ({ source: edge.source }));
      if (incoming.length === 0) return;
      const prerequisitesMet = incoming.every((edge) => {
        const prereq = nodesRef.current.find((n): n is SkillNode => isSkillNode(n) && n.id === edge.source);
        return prereq ? (prereq.data as SkillData).unlocked : false;
      });
      if (!prerequisitesMet) {
        resetNode(nodeId, { silent: true });
      }
    },
    [resetNode],
  );

  // Populate the edit modal fields for the given node.
  const startEditNode = useCallback((id: string) => {
    const node = findSkillNode(id);
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
  }, [findSkillNode]);

  // Guarantee each node has the handlers + sizing ReactFlow expects.
  const ensureNodeBehavior = useCallback(
    (node: AppNode): AppNode => {
      if (!isSkillNode(node)) return node;
      const data = node.data as SkillData;
      let dataChanged = false;
      const nextData = { ...data };
      if (typeof data.onReset !== 'function') {
        nextData.onReset = () => resetNode(node.id);
        dataChanged = true;
      }
      if (typeof data.onEdit !== 'function') {
        nextData.onEdit = () => startEditNode(node.id);
        dataChanged = true;
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
      if (!dataChanged && !styleChanged) return node;
      return {
        ...node,
        data: dataChanged ? nextData : data,
        style: styleChanged ? nextStyle : node.style,
      } as SkillNode;
    },
    [resetNode, startEditNode],
  );

  // Merge a realtime DB row into an existing node while preserving position.
  const mergeNodeRow = useCallback(
    (node: AppNode, row: SkillNodeRow, fallbackPosition?: { x: number; y: number } | null): AppNode => {
      if (!isSkillNode(node)) return node;
      const data = node.data as SkillData;
      const merged = {
        ...node,
        position: row.position ?? fallbackPosition ?? node.position,
        data: {
          ...data,
          name: row.name,
          description: row.description ?? undefined,
          cost: row.cost ?? undefined,
          level: row.level ?? undefined,
          unlocked: row.unlocked,
        },
      } as SkillNode;
      return ensureNodeBehavior(merged);
    },
    [ensureNodeBehavior],
  );

  // Normalize an entire node list after loading from Supabase.
  const decorateNodes = useCallback(
    (list: AppNode[]) => list.map(ensureNodeBehavior),
    [ensureNodeBehavior],
  );

  // Track whether we have any nodes/edges; used for Reset button state.
  useEffect(() => {
    setHasExistingTree(nodes.length > 0 || edges.length > 0);
  }, [nodes, edges]);

  // Listen for realtime changes to nodes/edges coming from Supabase.
  useEffect(() => {
    const channel = supabase.channel(`tree-updates:${treeId}`, {
      config: { broadcast: { ack: false } },
    });
    changeChannelRef.current = channel;
    channel
      .on('postgres_changes', { event: '*', schema: 'public', table: 'skill_nodes', filter: `tree_id=eq.${treeId}` }, (payload) => {
        if (payload.eventType === 'INSERT' && payload.new) {
          setNodes((prev) => {
            if (prev.some((n) => n.id === payload.new.id)) return prev;
            return prev.concat(ensureNodeBehavior(mapNodeRow(payload.new as SkillNodeRow)));
          });
        } else if (payload.eventType === 'UPDATE' && payload.new) {
          setNodes((prev) =>
            prev.map((node) =>
              node.id === payload.new.id
                ? mergeNodeRow(node, payload.new as SkillNodeRow, (payload.old as SkillNodeRow | undefined)?.position)
                : node,
            ),
          );
        } else if (payload.eventType === 'DELETE' && payload.old) {
          setNodes((prev) => prev.filter((node) => node.id !== payload.old.id));
        }
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'skill_edges', filter: `tree_id=eq.${treeId}` }, (payload) => {
        if (payload.eventType === 'INSERT' && payload.new) {
          let nextEdges: AppEdge[] = [];
          setEdges((prev) => {
            if (prev.some((edge) => edge.id === payload.new.id)) {
              nextEdges = prev;
              return prev;
            }
            nextEdges = prev.concat(mapEdgeRow(payload.new as SkillEdgeRow));
            return nextEdges;
          });
          const targetId = (payload.new as SkillEdgeRow).target;
          if (targetId) {
            const incomingForTarget = nextEdges
              .filter((edge) => edge.target === targetId)
              .map((edge) => ({ source: edge.source }));
            lockNodeIfPrereqsMissing(targetId, incomingForTarget);
          }
        } else if (payload.eventType === 'UPDATE' && payload.new) {
          setEdges((prev) =>
            prev.map((edge) => (edge.id === payload.new.id ? mapEdgeRow(payload.new as SkillEdgeRow) : edge)),
          );
        } else if (payload.eventType === 'DELETE' && payload.old) {
          setEdges((prev) => prev.filter((edge) => edge.id !== payload.old.id));
        }
      });

    channel.subscribe();

    return () => {
      supabase.removeChannel(channel);
      changeChannelRef.current = null;
    };
  }, [treeId, lockNodeIfPrereqsMissing, ensureNodeBehavior, mergeNodeRow]);

  // Periodically prune stale remote cursor markers.
  useEffect(() => {
    const interval = window.setInterval(() => {
      const now = Date.now();
      setRemoteCursors((prev) => {
        let changed = false;
        const next: Record<string, RemoteCursor> = {};
        Object.values(prev).forEach((cursor) => {
          if (now - cursor.lastUpdated <= 5000) {
            next[cursor.id] = cursor;
          } else {
            changed = true;
          }
        });
        return changed ? next : prev;
      });
    }, 4000);
    return () => window.clearInterval(interval);
  }, []);

  // Load nodes/edges/password state for the current tree.
  const fetchTreeData = useCallback(
    async (options?: { silent?: boolean }) => {
      const silent = options?.silent ?? false;
      if (!silent) setTreeLoading(true);
      setTreeError(null);
      const [nodesResult, edgesResult, treeResult] = await Promise.all([
        supabase.from('skill_nodes').select('*').eq('tree_id', treeId),
        supabase.from('skill_edges').select('*').eq('tree_id', treeId),
        supabase.from('trees').select('title,password_hash').eq('id', treeId).single(),
      ]);
      if (!isMountedRef.current) return;
      if (treeResult.error) {
        setTreeError(treeResult.error.message);
        if (!silent) setTreeLoading(false);
        return;
      }
      setTreeTitle(treeResult.data?.title ?? 'Skill Tree');
      setHasTreePassword(Boolean(treeResult.data?.password_hash));
      if (nodesResult.error || edgesResult.error) {
        setTreeError(nodesResult.error?.message ?? edgesResult.error?.message ?? 'Failed to load tree');
        if (!silent) setTreeLoading(false);
        return;
      }
      const mappedNodes = (nodesResult.data as SkillNodeRow[]).map((row) => mapNodeRow(row));
      const mappedEdges = (edgesResult.data as SkillEdgeRow[]).map(mapEdgeRow);
      setNodes(decorateNodes(mappedNodes));
      setEdges(mappedEdges);
      setHasExistingTree(mappedNodes.length > 0 || mappedEdges.length > 0);
      if (!silent) setTreeLoading(false);
    },
    [treeId, decorateNodes],
  );

  // Fetch the initial tree data once we have a treeId.
  useEffect(() => {
    fetchTreeData();
  }, [fetchTreeData]);

  // Debounce and persist tree title changes to Supabase.
  const persistTreeTitle = useCallback(
    (nextTitle: string) => {
      setTreeTitle(nextTitle);
      if (titleSaveTimeout.current) {
        clearTimeout(titleSaveTimeout.current);
      }
      titleSaveTimeout.current = setTimeout(() => {
        supabase
          .from('trees')
          .update({ title: nextTitle.trim() || 'Skill Tree' })
          .eq('id', treeId)
          .then(({ error }) => {
            if (error) {
              toast.error('Failed to save tree title');
            }
          });
      }, 500);
    },
    [treeId],
  );

  // Join the Supabase presence channel to show collaborator cursors.
  useEffect(() => {
    const channel = supabase.channel(`tree-presence:${treeId}`, {
      config: { presence: { key: clientId } },
    });
    presenceChannelRef.current = channel;

    const syncPresence = () => {
      const state = channel.presenceState() as Record<string, Array<{ name?: string; color?: string }>>;
      setRemoteCursors((prev) => {
        const next: Record<string, RemoteCursor> = {};
        Object.entries(state).forEach(([key, sessions]) => {
          if (key === clientId || sessions.length === 0) return;
          const meta = sessions[sessions.length - 1];
          const existing = prev[key];
          next[key] = {
            id: key,
            flowX: existing?.flowX,
            flowY: existing?.flowY,
            action: existing?.action,
            lastUpdated: existing?.lastUpdated ?? Date.now(),
            color: (meta?.color as string | undefined) ?? existing?.color ?? '#f97316',
            label: (meta?.name as string | undefined) ?? existing?.label ?? `User ${key.slice(-4)}`,
          };
        });
        return next;
      });
    };

    channel
      .on('presence', { event: 'sync' }, syncPresence)
      .on('presence', { event: 'leave' }, ({ key }) => {
        if (key === clientId) return;
        setRemoteCursors((prev) => {
          const next = { ...prev };
          delete next[key];
          return next;
        });
      })
      .on('broadcast', { event: 'cursor-move' }, ({ payload }) => {
        if (!payload || payload.id === clientId) return;
        if (payload.hidden) {
          setRemoteCursors((prev) => {
            const next = { ...prev };
            delete next[payload.id];
            return next;
          });
          return;
        }
        setRemoteCursors((prev) => {
          const existing: RemoteCursor =
            prev[payload.id] ?? {
              id: payload.id,
              color: payload.color ?? '#f97316',
              label: payload.name ?? `User ${payload.id.slice(-4)}`,
              lastUpdated: Date.now(),
            };
          return {
            ...prev,
            [payload.id]: {
              ...existing,
              flowX: payload.flowX ?? existing.flowX,
              flowY: payload.flowY ?? existing.flowY,
              lastUpdated: Date.now(),
              action: payload.action ?? existing.action,
            },
          };
        });
      })
      .on('broadcast', { event: 'action' }, ({ payload }) => {
        if (!payload || payload.id === clientId) return;
        setRemoteCursors((prev) => {
          const existing = prev[payload.id];
          if (!existing) return prev;
          return {
            ...prev,
            [payload.id]: { ...existing, action: payload.message, lastUpdated: Date.now() },
          };
        });
        if (payload.refetch) {
          fetchTreeData({ silent: true });
        }
      })
      .on('broadcast', { event: 'node-position' }, ({ payload }) => {
        if (!payload || payload.id === clientId) return;
        const { nodeId, position } = payload;
        if (!nodeId || !position) return;
        setNodes((prev) =>
          prev.map((node) => (node.id === nodeId ? { ...node, position } : node)),
        );
      });

    channel.subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        channel.track({ treeId, name: displayName, color: userColor });
      }
    });

    return () => {
      supabase.removeChannel(channel);
      presenceChannelRef.current = null;
      setRemoteCursors({});
    };
  }, [treeId, clientId, displayName, userColor, fetchTreeData]);

  const searchInfo = useMemo(() => computeSearchInfo(nodes, edges, searchTerm), [searchTerm, nodes, edges]);

  const searchActive = searchInfo.query.length > 0;
  const hasPathNodes = searchInfo.pathNodeIds.size > 0;
  const hasPathEdges = searchInfo.pathEdgeIds.size > 0;

  // Recompute search highlighting data when filters change.
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

  // Dim non-path edges when search is active.
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
  // ReactFlow change handler for drag/move events.
  const onNodesChange: OnNodesChange<AppNode> = useCallback(
    (changes) => {
      const updates: { id: string; position: { x: number; y: number } }[] = [];
      setNodes((nds) => {
        const next = applyNodeChanges<AppNode>(changes, nds);
        changes.forEach((change) => {
          if (change.type === 'position') {
            const node = next.find((n) => n.id === change.id);
            if (node) {
              if (change.dragging) {
                sendNodePosition(node.id, node.position);
              } else {
                updates.push({ id: node.id, position: node.position });
              }
            }
          }
        });
        return next;
      });
      updates.forEach(({ id, position }) => {
        void persistNodeUpdate(id, { position });
      });
    },
    [sendNodePosition, persistNodeUpdate],
  );

  // Lightweight passthrough for edge updates.
  const onEdgesChange: OnEdgesChange<AppEdge> = useCallback(
    (changes) => setEdges((eds) => applyEdgeChanges<AppEdge>(changes, eds)),
    [],
  );

  // Detect if connecting `source -> target` would introduce a loop.
  const wouldCreateCycle = useCallback(
    (sourceId?: string | null, targetId?: string | null) => graphWouldCreateCycle(edges, sourceId, targetId),
    [edges],
  );

  // Create an edge if it won't cause a cycle and persist it.
  const addEdgeSafely = useCallback(
    (connection: EdgeConnection) => {
      if (connection.source && connection.target && wouldCreateCycle(connection.source, connection.target)) {
        toast.error(CYCLE_ERROR_MESSAGE, { autoClose: 3200 });
        return false;
      }
      const id = connection.id ?? generateId();
      let latestEdges: AppEdge[] = [];
      setEdges((eds) => {
        const next = addEdge<AppEdge>(
          {
            animated: true,
            ...connection,
            id,
          },
          eds,
        );
        latestEdges = next;
        return next;
      });
      if (connection.target) {
        const incomingForTarget = latestEdges
          .filter((edge) => edge.target === connection.target)
          .map((edge) => ({ source: edge.source }));
        lockNodeIfPrereqsMissing(connection.target, incomingForTarget);
      }
      void supabase
        .from('skill_edges')
        .insert({
          id,
          tree_id: treeId,
          source: connection.source,
          target: connection.target,
          animated: connection.animated ?? true,
        })
        .then(({ error }) => {
          if (error) {
            toast.error('Failed to save edge');
          } else {
            broadcastAction('Created a connection');
          }
        });
      return true;
    },
    [wouldCreateCycle, treeId, broadcastAction, lockNodeIfPrereqsMissing],
  );

  // ReactFlow hook for new drag-to-connect edges.
  const onConnect: OnConnect = useCallback(
    (connection) => {
      addEdgeSafely(connection);
    },
    [addEdgeSafely],
  );

  // Allow users to reconnect existing edges without deleting.
  const onReconnect = useCallback(
    (oldEdge: AppEdge, newConnection: Connection) => {
      setEdges((eds) => reconnectEdge(oldEdge, newConnection, eds));
    },
    [setEdges],
  );

  // Hide the edit modal without saving changes.
  const closeEditModal = useCallback(() => {
    setEditingNodeId(null);
  }, []);

  // Persist edit modal changes to both state and Supabase.
  const handleEditSave = useCallback(() => {
    if (!editingNodeId) return;
    const editingNode = findSkillNode(editingNodeId);
    const editingPosition = editingNode?.position;

    const safeNumber = (value: string, fallback?: number) => {
      const trimmed = value.trim();
      if (trimmed === '') return undefined;
      const num = Number(trimmed);
      return Number.isFinite(num) ? num : fallback;
    };

    let updatedName = '';
    let updatedDescription: string | undefined;
    let updatedCost: number | undefined;
    let updatedLevel: number | undefined;
    let nodeUpdated = false;
    setNodes((prev) =>
      prev.map((node) => {
        if (!isSkillNode(node) || node.id !== editingNodeId) return node;
        nodeUpdated = true;
        const data = node.data as SkillData;
        updatedName = editName.trim() || data.name;
        updatedDescription = editDescription.trim() || undefined;
        updatedCost = safeNumber(editCost, data.cost);
        updatedLevel = safeNumber(editLevel, data.level);
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
    if (!nodeUpdated) return;
    broadcastAction(`Updated "${updatedName}"`);
    const payload: Record<string, unknown> = {
      name: updatedName,
      description: updatedDescription ?? null,
      cost: typeof updatedCost === 'number' ? updatedCost : null,
      level: typeof updatedLevel === 'number' ? updatedLevel : null,
    };
    if (editingPosition && Number.isFinite(editingPosition.x) && Number.isFinite(editingPosition.y)) {
      payload.position = editingPosition;
    }
    void persistNodeUpdate(editingNodeId, payload).then(({ error }) => {
      if (error) toast.error('Failed to update node');
    });
  }, [editingNodeId, editName, editDescription, editCost, editLevel, resetNode, setNodes, startEditNode, broadcastAction, persistNodeUpdate, findSkillNode]);

  /** Build new node (starts locked) */
  // Build a new local node + insert it into Supabase.
  const buildNode = useCallback(
    (position: { x: number; y: number }): SkillNode => {
      const id = generateId();
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

      const node = {
        id,
        type: 'skill',
        position,
        data,
        sourcePosition: Position.Right,
        targetPosition: Position.Left,
        style: { ...DEFAULT_NODE_STYLE },
      } as SkillNode;

      void supabase
        .from('skill_nodes')
        .insert({
          id,
          tree_id: treeId,
          name: data.name,
          description: data.description ?? null,
          cost: costNum ?? null,
          level: levelNum ?? null,
          unlocked: data.unlocked,
          position,
        })
        .then(({ error }) => {
          if (error) {
            toast.error('Failed to save node');
          }
        });

      return node;
    },
    [name, description, cost, level, resetNode, startEditNode, treeId],
  );

  /** Place by clicking the pane */
  // When in place mode, clicking the canvas drops a new node.
  const handlePaneClick = useCallback(
    (evt: React.MouseEvent) => {
      if (!placeMode) return;
      const pos = screenToFlowPosition({ x: evt.clientX, y: evt.clientY });
      const node = buildNode(pos);

      setNodes((nds) => nds.concat(node));
      broadcastAction(`Added "${(node.data as SkillData).name}"`);

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
    [placeMode, screenToFlowPosition, buildNode, autoConnect, selectedNodeIds, addEdgeSafely, setNodes, setPlaceMode, broadcastAction],
  );

  /** Add at center */
  // Drop a new node in the center of the current viewport.
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
    broadcastAction(`Added "${(node.data as SkillData).name}" at center`);

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
  }, [screenToFlowPosition, buildNode, autoConnect, selectedNodeIds, addEdgeSafely, setNodes, broadcastAction]);

  // Hide the sidebar on small screens to keep the canvas accessible.
  const closeSidebarForMobile = useCallback(() => {
    if (window.innerWidth <= 768) setSidebarOpen(false);
  }, [setSidebarOpen]);
  
  // Toggle click-to-place mode (closing sidebar on mobile).
  const handleTogglePlaceMode = useCallback(() => {
    closeSidebarForMobile();
    setPlaceMode((v) => !v);
  }, [closeSidebarForMobile, setPlaceMode]);

  // Wrapper so sidebar button can reuse addAtCenter logic.
  const handleAddAtCenterFromSidebar = useCallback(() => {
    closeSidebarForMobile();
    addAtCenter();
  }, [closeSidebarForMobile, addAtCenter]);

  // Open the share modal from the sidebar.
  const handleOpenShareModal = useCallback(() => {
    setShareModalOpen(true);
  }, [setShareModalOpen]);

  // Close the sidebar (used on mobile overlay).
  const handleSidebarClose = useCallback(() => {
    setSidebarOpen(false);
  }, [setSidebarOpen]);

  /** Selection handler (typed) */
  // Keep selection state in sync with ReactFlow's internal store.
  const onSelectionChange = useCallback(
    ({ nodes: ns, edges: es }: { nodes: AppNode[]; edges: AppEdge[] }) => {
      const nodeIds = ns.map((n) => n.id);
      const edgeIds = es.map((e) => e.id);

      setSelectedNodeIds((prev) => (shallowEqual(prev, nodeIds) ? prev : nodeIds));
      setSelectedEdgeIds((prev) => (shallowEqual(prev, edgeIds) ? prev : edgeIds));

      const firstSkill = ns.find((n): n is SkillNode => isSkillNode(n));
      if (firstSkill) {
        const name = (firstSkill.data as SkillData).name ?? 'Skill';
        broadcastAction(`Activated "${name}"`);
      }
    },
    [setSelectedNodeIds, setSelectedEdgeIds, broadcastAction],
  );

  /** Unlock on node click if prerequisites met */
  // Unlock a node when its prerequisites are met and it is clicked.
  const onNodeClick: NodeMouseHandler<AppNode> = useCallback(
    (_evt, node) => {
      if (!isSkillNode(node)) return;
      let unlockedCurrent = false;
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

        unlockedCurrent = true;
        return prevNodes.map((n) => {
          if (!isSkillNode(n) || n.id !== node.id) return n;
          const d = n.data as SkillData;
          return {
            ...n,
            data: { ...d, unlocked: true },
          } as SkillNode;
        });
      });
      if (unlockedCurrent) {
        void persistNodeUpdate(node.id, { unlocked: true }).then(() => {
          const data = node.data as SkillData;
          broadcastAction(`Unlocked "${data.name}"`);
        });
      }
    },
    [edges, setNodes, broadcastAction, persistNodeUpdate],
  );

  /** Delete selected */
  // Remove selected nodes/edges from both UI and Supabase.
  const deleteSelected = useCallback(() => {
    const currentNodes = nodesRef.current;
    const currentEdges = edgesRef.current;
    const nodesToDelete = currentNodes.filter((n) => selectedNodeIds.includes(n.id));
    const edgesToDelete = currentEdges.filter((e) => selectedEdgeIds.includes(e.id));
    if (nodesToDelete.length === 0 && edgesToDelete.length === 0) return;

    deleteElements({ nodes: nodesToDelete, edges: edgesToDelete });
    setSelectedNodeIds([]);
    setSelectedEdgeIds([]);
    const nodeIds = nodesToDelete.map((n) => n.id);
    const edgeIds = edgesToDelete.map((e) => e.id);
    if (nodeIds.length > 0) {
      void supabase.from('skill_nodes').delete().in('id', nodeIds);
    }
    if (edgeIds.length > 0) {
      void supabase.from('skill_edges').delete().in('id', edgeIds);
    }
    if (nodesToDelete.length > 0 || edgesToDelete.length > 0) {
      broadcastAction('Deleted selection', { refetch: true });
    }
  }, [deleteElements, selectedNodeIds, selectedEdgeIds, broadcastAction]);

  /** Detach selected nodes */
  // Delete edges attached to currently selected nodes.
  const detachSelectedNodes = useCallback(() => {
    if (selectedNodeIds.length === 0) return;
    setEdges((eds) =>
      eds.filter(
        (e) =>
          !selectedNodeIds.includes(e.source) &&
          !selectedNodeIds.includes(e.target),
      ),
    );
    void supabase.from('skill_edges').delete().in('source', selectedNodeIds);
    void supabase.from('skill_edges').delete().in('target', selectedNodeIds);
    broadcastAction('Detached selected nodes');
  }, [selectedNodeIds, setEdges, broadcastAction]);

  // Wipe the canvas and reseed from the default template.
  const handleResetTree = useCallback(async () => {
    setTreeLoading(true);
    const { seededNodes, seededEdges } = buildSeedGraph();
    setNodes(decorateNodes(seededNodes));
    setEdges(seededEdges);
    try {
      await supabase.from('skill_edges').delete().eq('tree_id', treeId);
      await supabase.from('skill_nodes').delete().eq('tree_id', treeId);
      const nodePayload = seededNodes.map((node) => {
        const data = node.data as SkillData;
        return {
          id: node.id,
          tree_id: treeId,
          name: data.name,
          description: data.description ?? null,
          cost: data.cost ?? null,
          level: data.level ?? null,
          unlocked: data.unlocked ?? false,
          position: node.position,
        };
      });
      if (nodePayload.length > 0) {
        await supabase.from('skill_nodes').insert(nodePayload);
      }
      if (seededEdges.length > 0) {
        await supabase.from('skill_edges').insert(
          seededEdges.map((edge) => ({
            id: edge.id,
            tree_id: treeId,
            source: edge.source,
            target: edge.target,
            animated: edge.animated ?? true,
          })),
        );
      }
      broadcastAction('Reset tree to default nodes', { refetch: true });
    } catch {
      toast.error('Failed to reset tree');
    } finally {
      setTreeLoading(false);
    }
  }, [treeId, broadcastAction, decorateNodes]);

  /** Automatically re-open the sidebar when the screen expands past 768px */
  // Ensure the sidebar doesn't stay hidden when the viewport widens.
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 768) {
        setSidebarOpen(true);
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Translate pointer movement into flow coordinates for remote cursors.
  const handlePointerMove = useCallback(
    (event: React.MouseEvent<HTMLDivElement>) => {
      const flowPos = screenToFlowPosition({ x: event.clientX, y: event.clientY });
      sendCursorPosition(flowPos.x, flowPos.y);
    },
    [screenToFlowPosition, sendCursorPosition],
  );

  // Signal to collaborators that our cursor left the canvas.
  const handlePointerLeave = useCallback(() => {
    const channel = presenceChannelRef.current;
    if (!channel) return;
    channel.send({
      type: 'broadcast',
      event: 'cursor-move',
      payload: { id: clientId, hidden: true },
    });
  }, [clientId]);

  /** ---------- Layout & animated sidebar ---------- */

  if (treeLoading) {
    return (
      <div className="flex h-full items-center justify-center text-white">Loading tree…</div>
    );
  }

  if (treeError) {
    return (
      <div className="flex h-full flex-col items-center justify-center text-white">
        <p className="text-red-400">{treeError}</p>
        <Link href="/" className="mt-4 rounded bg-white px-3 py-2 text-sm text-black">
          Back home
        </Link>
      </div>
    );
  }

  return (
    <div
      ref={canvasRef}
      onMouseMove={handlePointerMove}
      onMouseLeave={handlePointerLeave}
      className="relative flex h-full w-full flex-col overflow-hidden bg-white/80 text-black dark:bg-zinc-900/40"
    >
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
            treeId={treeId}
            treeTitle={treeTitle}
            onTreeTitleChange={persistTreeTitle}
            canResetTree={hasExistingTree}
            onResetTree={hasExistingTree ? handleResetTree : undefined}
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
            onTogglePlaceMode={handleTogglePlaceMode}
            onAddAtCenter={handleAddAtCenterFromSidebar}
            onDeleteSelected={deleteSelected}
            onDetachSelected={detachSelectedNodes}
            onToggleAutoConnect={setAutoConnect}
            onOpenShareModal={handleOpenShareModal}
            onClose={handleSidebarClose}
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
      <div className="pointer-events-none absolute inset-0 z-40">
        {Object.values(remoteCursors).map((cursor) => {
          if (typeof cursor.flowX !== 'number' || typeof cursor.flowY !== 'number') return null;
          const { x: viewportX, y: viewportY, zoom } = getViewport();
          const screenX = cursor.flowX * zoom + viewportX;
          const screenY = cursor.flowY * zoom + viewportY;
          return (
            <div
              key={cursor.id}
              className="absolute -translate-x-1/2 -translate-y-full"
              style={{ transform: `translate(${screenX}px, ${screenY}px)` }}
            >
              <div
                className="rounded-full px-2 py-1 text-[11px] font-medium"
                style={{
                  backgroundColor: `${cursor.color}33`,
                  color: cursor.color,
                }}
              >
                {cursor.label}
              </div>
              {cursor.action && (
                <div className="mt-1 rounded bg-black/70 px-2 py-1 text-[10px] text-white">
                  {cursor.action}
                </div>
              )}
            </div>
          );
        })}
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
      <ShareTreeModal
        visible={shareModalOpen}
        shareLink={shareLink}
        treeId={treeId}
        shareCopied={shareCopied}
        hasTreePassword={hasTreePassword}
        newPasswordInput={newPasswordInput}
        passwordSaving={passwordSaving}
        passwordMessage={passwordMessage}
        lastSharedPassword={lastSharedPassword}
        onCopyLink={handleCopyShareLink}
        onChangePasswordInput={setNewPasswordInput}
        onUpdatePassword={handlePasswordUpdate}
        onRemovePassword={handleRemovePassword}
        onClose={() => setShareModalOpen(false)}
      />
    </div>
  );
}
