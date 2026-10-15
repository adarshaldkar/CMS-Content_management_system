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

const initialNodes: Node[] = [
  {
    id: 'draft',
    type: 'input',
    position: { x: 50, y: 120 },
    data: { label: '📝 Author Draft (TipTap + IndexedDB)' },
    style: {
      background: '#1E293B',
      color: '#F8FAFC',
      border: '1px solid #38BDF8',
      borderRadius: '8px',
      padding: '12px 16px',
      fontSize: '13px',
      fontWeight: '600',
    },
  },
  {
    id: 'review',
    position: { x: 340, y: 120 },
    data: { label: '🔍 Editorial Review & Diff Check' },
    style: {
      background: '#1E293B',
      color: '#F8FAFC',
      border: '1px solid #F59E0B',
      borderRadius: '8px',
      padding: '12px 16px',
      fontSize: '13px',
      fontWeight: '600',
    },
  },
  {
    id: 'bullmq',
    position: { x: 630, y: 40 },
    data: { label: '⏱️ Scheduled Slot (BullMQ + Redis)' },
    style: {
      background: '#1E293B',
      color: '#F8FAFC',
      border: '1px solid #8B5CF6',
      borderRadius: '8px',
      padding: '12px 16px',
      fontSize: '13px',
      fontWeight: '600',
    },
  },
  {
    id: 'publish',
    type: 'output',
    position: { x: 920, y: 120 },
    data: { label: '🚀 Live Published Story (MongoDB + CDN)' },
    style: {
      background: '#0F172A',
      color: '#34D399',
      border: '2px solid #10B981',
      borderRadius: '8px',
      padding: '12px 16px',
      fontSize: '13px',
      fontWeight: '700',
    },
  },
];

const initialEdges: Edge[] = [
  {
    id: 'e-draft-review',
    source: 'draft',
    target: 'review',
    animated: true,
    label: 'Submit for Review',
    style: { stroke: '#38BDF8', strokeWidth: 2 },
    labelStyle: { fill: '#94A3B8', fontSize: 11 },
  },
  {
    id: 'e-review-bullmq',
    source: 'review',
    target: 'bullmq',
    animated: true,
    label: 'Approve & Schedule',
    style: { stroke: '#8B5CF6', strokeWidth: 2 },
    labelStyle: { fill: '#94A3B8', fontSize: 11 },
  },
  {
    id: 'e-bullmq-publish',
    source: 'bullmq',
    target: 'publish',
    animated: true,
    label: 'Worker Triggers Slot',
    style: { stroke: '#10B981', strokeWidth: 2 },
    labelStyle: { fill: '#94A3B8', fontSize: 11 },
  },
  {
    id: 'e-review-publish',
    source: 'review',
    target: 'publish',
    label: 'Direct Publish',
    style: { stroke: '#F59E0B', strokeDasharray: '4', strokeWidth: 2 },
    labelStyle: { fill: '#94A3B8', fontSize: 11 },
  },
];

export const EditorialWorkflowFlow: React.FC<{ height?: string }> = ({ height = '500px' }) => {
  const [nodes, setNodes] = useState<Node[]>(initialNodes);
  const [edges, setEdges] = useState<Edge[]>(initialEdges);

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
    <div style={{ width: '100%', height }} className="rounded-xl border border-border bg-card/60 backdrop-blur overflow-hidden shadow-lg">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        fitView
      >
        <Background color="#334155" gap={16} size={1} />
        <Controls className="bg-slate-800 border-slate-700 text-white fill-white" />
        <MiniMap
          nodeStrokeWidth={3}
          nodeColor={(n) => {
            if (n.type === 'input') return '#38BDF8';
            if (n.type === 'output') return '#10B981';
            return '#F59E0B';
          }}
          maskColor="rgba(15, 23, 42, 0.7)"
          className="bg-slate-900 border border-slate-700 rounded-lg"
        />
      </ReactFlow>
    </div>
  );
};

export default EditorialWorkflowFlow;
