import React, { useState, useCallback } from 'react';
import {
  ReactFlow,
  applyNodeChanges,
  applyEdgeChanges,
  addEdge,
  Background,
  Controls,
  MiniMap,
  type Node,
  type Edge,
  type OnNodesChange,
  type OnEdgesChange,
  type OnConnect,
} from '@xyflow/react';
import { Layers, Workflow, Database, RefreshCw, Info } from 'lucide-react';

/* -------------------------------------------------------------
   1. C4 Architecture Diagram Nodes & Edges
------------------------------------------------------------- */
const c4Nodes: Node[] = [
  // Actors
  {
    id: 'reader',
    type: 'input',
    position: { x: 50, y: 60 },
    data: { label: '👤 Reader (Browser / Mobile)' },
    style: {
      background: '#0F172A',
      color: '#38BDF8',
      border: '2px solid #0284C7',
      borderRadius: '10px',
      padding: '12px 18px',
      fontWeight: '600',
      fontSize: '13px',
      width: '230px',
      textAlign: 'center',
      boxShadow: '0 4px 12px rgba(2, 132, 199, 0.2)',
    },
  },
  {
    id: 'author',
    type: 'input',
    position: { x: 50, y: 220 },
    data: { label: '✍️ Author / Editor (Studio)' },
    style: {
      background: '#0F172A',
      color: '#FB923C',
      border: '2px solid #EA580C',
      borderRadius: '10px',
      padding: '12px 18px',
      fontWeight: '600',
      fontSize: '13px',
      width: '230px',
      textAlign: 'center',
      boxShadow: '0 4px 12px rgba(234, 88, 12, 0.2)',
    },
  },

  // Frontend Tier
  {
    id: 'frontend',
    position: { x: 340, y: 130 },
    data: { label: '🖥️ Single Page App (React 19 + Vite)' },
    style: {
      background: '#1E293B',
      color: '#F8FAFC',
      border: '2px solid #38BDF8',
      borderRadius: '10px',
      padding: '16px 20px',
      fontWeight: '700',
      fontSize: '14px',
      width: '240px',
      boxShadow: '0 6px 16px rgba(0,0,0,0.4)',
    },
  },

  // API Gateway
  {
    id: 'backend',
    position: { x: 670, y: 130 },
    data: { label: '🛡️ NestJS API Gateway (Port 3001)\nGuards | DTOs | JWT | SSRF Firewall' },
    style: {
      background: '#1E293B',
      color: '#A78BFA',
      border: '2px solid #7C3AED',
      borderRadius: '10px',
      padding: '16px 20px',
      fontWeight: '700',
      fontSize: '13px',
      width: '260px',
      textAlign: 'center',
      whiteSpace: 'pre-line',
      boxShadow: '0 6px 16px rgba(0,0,0,0.4)',
    },
  },

  // Persistence Mesh
  {
    id: 'postgres',
    position: { x: 1040, y: 30 },
    data: { label: '🐘 PostgreSQL 16 (Port 5432)\nUsers | Roles | Argon2id | Taxonomy' },
    style: {
      background: '#0F172A',
      color: '#60A5FA',
      border: '2px solid #2563EB',
      borderRadius: '10px',
      padding: '12px 16px',
      fontSize: '12px',
      fontWeight: '600',
      textAlign: 'center',
      whiteSpace: 'pre-line',
      width: '230px',
    },
  },
  {
    id: 'mongodb',
    position: { x: 1040, y: 140 },
    data: { label: '🍃 MongoDB 7 (Port 27017)\nArticles | Revisions | ProseMirror JSON' },
    style: {
      background: '#0F172A',
      color: '#34D399',
      border: '2px solid #059669',
      borderRadius: '10px',
      padding: '12px 16px',
      fontSize: '12px',
      fontWeight: '600',
      textAlign: 'center',
      whiteSpace: 'pre-line',
      width: '230px',
    },
  },
  {
    id: 'redis',
    position: { x: 1040, y: 250 },
    data: { label: '⚡ Redis 7 & BullMQ (Port 6379)\nSliding Throttler | Queues | Session Revocation' },
    style: {
      background: '#0F172A',
      color: '#F87171',
      border: '2px solid #DC2626',
      borderRadius: '10px',
      padding: '12px 16px',
      fontSize: '12px',
      fontWeight: '600',
      textAlign: 'center',
      whiteSpace: 'pre-line',
      width: '230px',
    },
  },
];

const c4Edges: Edge[] = [
  {
    id: 'e-reader-front',
    source: 'reader',
    target: 'frontend',
    animated: true,
    label: 'HTTPS / Public Browse',
    style: { stroke: '#38BDF8', strokeWidth: 2 },
    labelStyle: { fill: '#94A3B8', fontSize: 11 },
  },
  {
    id: 'e-author-front',
    source: 'author',
    target: 'frontend',
    animated: true,
    label: 'WSS / Studio Authoring',
    style: { stroke: '#FB923C', strokeWidth: 2 },
    labelStyle: { fill: '#94A3B8', fontSize: 11 },
  },
  {
    id: 'e-front-back',
    source: 'frontend',
    target: 'backend',
    animated: true,
    label: 'REST API + JWT HttpOnly',
    style: { stroke: '#818CF8', strokeWidth: 2.5 },
    labelStyle: { fill: '#CBD5E1', fontSize: 11, fontWeight: '600' },
  },
  {
    id: 'e-back-pg',
    source: 'backend',
    target: 'postgres',
    label: 'TypeORM / ACID Relations',
    style: { stroke: '#3B82F6', strokeWidth: 2 },
    labelStyle: { fill: '#94A3B8', fontSize: 10 },
  },
  {
    id: 'e-back-mongo',
    source: 'backend',
    target: 'mongodb',
    animated: true,
    label: 'Mongoose / JSON Docs',
    style: { stroke: '#10B981', strokeWidth: 2 },
    labelStyle: { fill: '#94A3B8', fontSize: 10 },
  },
  {
    id: 'e-back-redis',
    source: 'backend',
    target: 'redis',
    animated: true,
    label: 'BullMQ Async Jobs',
    style: { stroke: '#EF4444', strokeWidth: 2 },
    labelStyle: { fill: '#94A3B8', fontSize: 10 },
  },
];

/* -------------------------------------------------------------
   2. Editorial Pipeline Nodes & Edges
------------------------------------------------------------- */
const editorialNodes: Node[] = [
  {
    id: 'ed-1',
    type: 'input',
    position: { x: 50, y: 120 },
    data: { label: '1. Author Writing\nTipTap + ProseMirror' },
    style: {
      background: '#1E293B',
      color: '#38BDF8',
      border: '2px solid #0284C7',
      borderRadius: '8px',
      padding: '12px',
      fontSize: '12px',
      fontWeight: '600',
      textAlign: 'center',
      whiteSpace: 'pre-line',
      width: '180px',
    },
  },
  {
    id: 'ed-2',
    position: { x: 280, y: 50 },
    data: { label: '2A. Local IndexedDB\nDebounced Autosave (500ms)' },
    style: {
      background: '#0F172A',
      color: '#34D399',
      border: '1.5px dashed #10B981',
      borderRadius: '8px',
      padding: '12px',
      fontSize: '12px',
      fontWeight: '600',
      textAlign: 'center',
      whiteSpace: 'pre-line',
      width: '210px',
    },
  },
  {
    id: 'ed-3',
    position: { x: 280, y: 190 },
    data: { label: '2B. Server Snapshot\nMongoDB Revision Tree' },
    style: {
      background: '#0F172A',
      color: '#A78BFA',
      border: '1.5px solid #8B5CF6',
      borderRadius: '8px',
      padding: '12px',
      fontSize: '12px',
      fontWeight: '600',
      textAlign: 'center',
      whiteSpace: 'pre-line',
      width: '210px',
    },
  },
  {
    id: 'ed-4',
    position: { x: 550, y: 120 },
    data: { label: '3. Editorial Review\nVisual Diff & Checklist' },
    style: {
      background: '#1E293B',
      color: '#FBBF24',
      border: '2px solid #D97706',
      borderRadius: '8px',
      padding: '12px',
      fontSize: '12px',
      fontWeight: '600',
      textAlign: 'center',
      whiteSpace: 'pre-line',
      width: '190px',
    },
  },
  {
    id: 'ed-5',
    position: { x: 800, y: 50 },
    data: { label: '4A. Delayed Slot\nBullMQ Redis Timer' },
    style: {
      background: '#0F172A',
      color: '#F472B6',
      border: '1.5px solid #DB2777',
      borderRadius: '8px',
      padding: '12px',
      fontSize: '12px',
      fontWeight: '600',
      textAlign: 'center',
      whiteSpace: 'pre-line',
      width: '190px',
    },
  },
  {
    id: 'ed-6',
    type: 'output',
    position: { x: 1050, y: 120 },
    data: { label: '5. Published Live\nCache Invalidation + Push' },
    style: {
      background: '#022C22',
      color: '#6EE7B7',
      border: '2px solid #059669',
      borderRadius: '8px',
      padding: '14px',
      fontSize: '13px',
      fontWeight: '700',
      textAlign: 'center',
      whiteSpace: 'pre-line',
      width: '200px',
      boxShadow: '0 4px 14px rgba(5, 150, 105, 0.3)',
    },
  },
];

const editorialEdges: Edge[] = [
  { id: 'ed-e1', source: 'ed-1', target: 'ed-2', animated: true, style: { stroke: '#34D399', strokeWidth: 2 } },
  { id: 'ed-e2', source: 'ed-1', target: 'ed-3', animated: true, style: { stroke: '#8B5CF6', strokeWidth: 2 } },
  { id: 'ed-e3', source: 'ed-2', target: 'ed-4', style: { stroke: '#CBD5E1', strokeDasharray: '4' } },
  { id: 'ed-e4', source: 'ed-3', target: 'ed-4', style: { stroke: '#CBD5E1' } },
  { id: 'ed-e5', source: 'ed-4', target: 'ed-5', animated: true, label: 'Schedule', style: { stroke: '#DB2777', strokeWidth: 2 } },
  { id: 'ed-e6', source: 'ed-4', target: 'ed-6', label: 'Direct Publish', style: { stroke: '#10B981', strokeWidth: 2 } },
  { id: 'ed-e7', source: 'ed-5', target: 'ed-6', animated: true, label: 'Trigger At Timestamp', style: { stroke: '#10B981', strokeWidth: 2 } },
];

export const ArchitectureStudioPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'c4' | 'workflow'>('c4');

  // React Flow state
  const [nodes, setNodes] = useState<Node[]>(c4Nodes);
  const [edges, setEdges] = useState<Edge[]>(c4Edges);

  const switchTab = (tab: 'c4' | 'workflow') => {
    setActiveTab(tab);
    if (tab === 'c4') {
      setNodes(c4Nodes);
      setEdges(c4Edges);
    } else {
      setNodes(editorialNodes);
      setEdges(editorialEdges);
    }
  };

  const onNodesChange: OnNodesChange = useCallback(
    (changes) => setNodes((nds) => applyNodeChanges(changes, nds)),
    [],
  );

  const onEdgesChange: OnEdgesChange = useCallback(
    (changes) => setEdges((eds) => applyEdgeChanges(changes, eds)),
    [],
  );

  const onConnect: OnConnect = useCallback(
    (params) => setEdges((eds) => addEdge(params, eds)),
    [],
  );

  return (
    <div className="h-screen w-screen bg-slate-950 text-slate-100 flex flex-col overflow-hidden">
      {/* Top Navigation Bar */}
      <header className="h-[68px] border-b border-slate-800 bg-slate-900/90 backdrop-blur px-6 py-3 flex flex-wrap items-center justify-between gap-4 shrink-0 z-20">
        <div>
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
            <h1 className="text-base font-bold text-white tracking-wide">The Gazette — Interactive Architecture Studio</h1>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Built with React Flow (@xyflow/react) — Live draggable C4 topology & editorial pipeline
          </p>
        </div>

        {/* Tab Controls */}
        <div className="flex items-center bg-slate-950 p-1 rounded-lg border border-slate-800">
          <button
            onClick={() => switchTab('c4')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-md text-xs font-semibold transition ${
              activeTab === 'c4'
                ? 'bg-sky-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            C4 System Topology
          </button>
          <button
            onClick={() => switchTab('workflow')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-md text-xs font-semibold transition ${
              activeTab === 'workflow'
                ? 'bg-amber-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Workflow className="w-3.5 h-3.5" />
            Editorial & BullMQ Pipeline
          </button>
        </div>
      </header>

      {/* Main Flow Canvas */}
      <main className="w-full relative bg-slate-950 overflow-hidden" style={{ width: '100%', height: 'calc(100vh - 68px)' }}>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          fitView
          fitViewOptions={{ padding: 0.25 }}
        >
          <Background color="#334155" gap={20} size={1.2} />
          <Controls className="bg-slate-900 border-slate-700 text-white fill-white shadow-xl" />
          <MiniMap
            nodeStrokeWidth={3}
            nodeColor={(n) => {
              if (n.id.includes('reader') || n.id.includes('front')) return '#38BDF8';
              if (n.id.includes('mongo') || n.id.includes('ed-6')) return '#10B981';
              if (n.id.includes('redis') || n.id.includes('ed-5')) return '#EF4444';
              return '#F59E0B';
            }}
            maskColor="rgba(15, 23, 42, 0.75)"
            className="bg-slate-900/90 border border-slate-800 rounded-xl"
          />
        </ReactFlow>

        {/* Legend Overlay */}
        <div className="absolute bottom-6 left-6 z-10 bg-slate-900/90 backdrop-blur border border-slate-800 p-3 rounded-lg shadow-xl text-xs max-w-sm pointer-events-auto">
          <div className="flex items-center gap-1.5 font-semibold text-slate-200 mb-1.5">
            <Info className="w-3.5 h-3.5 text-sky-400" />
            Interactive Diagram Canvas
          </div>
          <p className="text-slate-400 leading-relaxed text-[11px]">
            Drag nodes to re-layout. Use scroll to zoom in/out. Click and hold canvas to pan. You can take screenshots of this interactive view for Chapter 4 & 5 of your project documentation!
          </p>
        </div>
      </main>
    </div>
  );
};

export default ArchitectureStudioPage;
