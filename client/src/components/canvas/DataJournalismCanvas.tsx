import React, { useRef, useEffect, useState, useMemo, useCallback } from 'react';
import { Network, Play, Pause, RotateCcw, Table, Layers, Info } from 'lucide-react';
import { AccessibleDataTable } from '../analytics/AccessibleDataTable';

export interface NetworkNode {
  id: string;
  label: string;
  category: 'source' | 'entity' | 'database' | 'organization';
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
}

export interface NetworkLink {
  source: string;
  target: string;
  strength: number;
  label?: string;
}

export interface DataJournalismCanvasProps {
  title?: string;
  subtitle?: string;
  mode?: 'network' | 'timescrubber';
}

export const DataJournalismCanvas: React.FC<DataJournalismCanvasProps> = ({
  title = 'Investigative Source & Architecture Network Matrix',
  subtitle = 'Interactive force-directed node cluster tracing decentralized database consensus & editorial source flows.',
  mode = 'network',
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [selectedNode, setSelectedNode] = useState<NetworkNode | null>(null);
  const [isTableVisible, setIsTableVisible] = useState<boolean>(false);
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [timeStep, setTimeStep] = useState<number>(2026);

  // Initial nodes data
  const initialNodes: NetworkNode[] = useMemo(
    () => [
      { id: 'n1', label: 'The Gazette Core', category: 'organization', x: 350, y: 180, vx: 0, vy: 0, radius: 24 },
      { id: 'n2', label: 'Postgres Master', category: 'database', x: 220, y: 120, vx: 0, vy: 0, radius: 18 },
      { id: 'n3', label: 'MongoDB Replicas', category: 'database', x: 200, y: 240, vx: 0, vy: 0, radius: 18 },
      { id: 'n4', label: 'ClickHouse Columnar', category: 'database', x: 480, y: 110, vx: 0, vy: 0, radius: 18 },
      { id: 'n5', label: 'CockroachDB Consensus', category: 'database', x: 500, y: 230, vx: 0, vy: 0, radius: 18 },
      { id: 'n6', label: 'Redis Event Broker', category: 'entity', x: 350, y: 80, vx: 0, vy: 0, radius: 16 },
      { id: 'n7', label: 'Author Editorial Desk', category: 'source', x: 120, y: 170, vx: 0, vy: 0, radius: 15 },
      { id: 'n8', label: 'Public Reader Mesh', category: 'source', x: 580, y: 170, vx: 0, vy: 0, radius: 15 },
    ],
    []
  );

  const links: NetworkLink[] = useMemo(
    () => [
      { source: 'n1', target: 'n2', strength: 0.9, label: 'ACID Transactions' },
      { source: 'n1', target: 'n3', strength: 0.8, label: 'Document Revisions' },
      { source: 'n1', target: 'n4', strength: 0.85, label: 'Analytics Stream' },
      { source: 'n1', target: 'n5', strength: 0.75, label: 'Distributed Locks' },
      { source: 'n1', target: 'n6', strength: 0.95, label: 'BullMQ Queues' },
      { source: 'n7', target: 'n1', strength: 0.9, label: 'Article Ingestion' },
      { source: 'n1', target: 'n8', strength: 0.95, label: 'Edge Delivery' },
      { source: 'n6', target: 'n4', strength: 0.7, label: 'Async Rollups' },
    ],
    []
  );

  const nodesRef = useRef<NetworkNode[]>(JSON.parse(JSON.stringify(initialNodes)));

  // Canvas Animation & Physics Loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    let isVisible = true;

    // Retina High-DPI Scaling
    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      ctx.scale(dpr, dpr);
    };
    resize();
    window.addEventListener('resize', resize);

    // IntersectionObserver to pause loop offscreen
    const observer = new IntersectionObserver(([entry]) => {
      isVisible = entry.isIntersecting;
    });
    if (containerRef.current) observer.observe(containerRef.current);

    // Physics constants
    const repulsion = 1200;
    const springLen = 130;
    const damping = 0.88;

    const render = () => {
      if (!isVisible) {
        animId = requestAnimationFrame(render);
        return;
      }

      const rect = canvas.getBoundingClientRect();
      const w = rect.width;
      const h = rect.height;

      ctx.clearRect(0, 0, w, h);

      const nodes = nodesRef.current;

      if (isPlaying) {
        // Apply node-node repulsion
        for (let i = 0; i < nodes.length; i++) {
          for (let j = i + 1; j < nodes.length; j++) {
            const dx = nodes[j].x - nodes[i].x;
            const dy = nodes[j].y - nodes[i].y;
            const dist = Math.sqrt(dx * dx + dy * dy) || 1;
            const force = repulsion / (dist * dist);
            const fx = (dx / dist) * force;
            const fy = (dy / dist) * force;

            nodes[i].vx -= fx;
            nodes[i].vy -= fy;
            nodes[j].vx += fx;
            nodes[j].vy += fy;
          }
        }

        // Apply link spring attraction
        links.forEach((link) => {
          const s = nodes.find((n) => n.id === link.source);
          const t = nodes.find((n) => n.id === link.target);
          if (!s || !t) return;

          const dx = t.x - s.x;
          const dy = t.y - s.y;
          const dist = Math.sqrt(dx * dx + dy * dy) || 1;
          const displacement = dist - springLen;
          const force = displacement * 0.04 * link.strength;

          const fx = (dx / dist) * force;
          const fy = (dy / dist) * force;

          s.vx += fx;
          s.vy += fy;
          t.vx -= fx;
          t.vy -= fy;
        });

        // Center gravity & update position
        const cx = w / 2;
        const cy = h / 2;

        nodes.forEach((node) => {
          // Soft pull toward center
          node.vx += (cx - node.x) * 0.008;
          node.vy += (cy - node.y) * 0.008;

          node.vx *= damping;
          node.vy *= damping;

          node.x += node.vx;
          node.y += node.vy;

          // Clamping to canvas bounds
          const pad = node.radius + 10;
          node.x = Math.max(pad, Math.min(w - pad, node.x));
          node.y = Math.max(pad, Math.min(h - pad, node.y));
        });
      }

      // 1. Draw Links
      links.forEach((link) => {
        const s = nodes.find((n) => n.id === link.source);
        const t = nodes.find((n) => n.id === link.target);
        if (!s || !t) return;

        ctx.beginPath();
        ctx.moveTo(s.x, s.y);
        ctx.lineTo(t.x, t.y);
        ctx.strokeStyle = '#d4d4d8';
        ctx.lineWidth = 1.25;
        ctx.stroke();

        // Draw link label
        if (link.label) {
          const midX = (s.x + t.x) / 2;
          const midY = (s.y + t.y) / 2;
          ctx.font = '9px "JetBrains Mono", monospace';
          ctx.fillStyle = '#71717a';
          ctx.textAlign = 'center';
          ctx.fillText(link.label, midX, midY - 3);
        }
      });

      // 2. Draw Nodes
      nodes.forEach((node) => {
        const isHighlight = selectedNode?.id === node.id;
        const isFiltered = activeCategory !== 'all' && node.category !== activeCategory;

        ctx.save();
        ctx.globalAlpha = isFiltered ? 0.3 : 1.0;

        // Node circle
        ctx.beginPath();
        ctx.arc(node.x, node.y, node.radius, 0, Math.PI * 2);

        if (node.category === 'organization') {
          ctx.fillStyle = '#881337'; // Crimson
        } else if (node.category === 'database') {
          ctx.fillStyle = '#18181b'; // Charcoal
        } else if (node.category === 'source') {
          ctx.fillStyle = '#059669'; // Emerald
        } else {
          ctx.fillStyle = '#52525b'; // Slate
        }

        ctx.fill();
        ctx.strokeStyle = isHighlight ? '#ffffff' : '#ffffff';
        ctx.lineWidth = isHighlight ? 3 : 1.5;
        ctx.stroke();

        // Node Label
        ctx.font = '10px "Plus Jakarta Sans", sans-serif';
        ctx.fillStyle = '#18181b';
        ctx.textAlign = 'center';
        ctx.fillText(node.label, node.x, node.y + node.radius + 13);

        ctx.restore();
      });

      animId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', resize);
      observer.disconnect();
    };
  }, [isPlaying, links, selectedNode, activeCategory]);

  // Click & Hit-Testing on Nodes
  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const clicked = nodesRef.current.find((n) => {
      const dx = n.x - x;
      const dy = n.y - y;
      return Math.sqrt(dx * dx + dy * dy) <= n.radius + 4;
    });

    setSelectedNode(clicked || null);
  };

  const resetPositions = useCallback(() => {
    nodesRef.current = JSON.parse(JSON.stringify(initialNodes));
    setSelectedNode(null);
  }, [initialNodes]);

  return (
    <div ref={containerRef} className="border border-border-subtle bg-canvas-paper p-6 space-y-4 my-8">
      {/* Masthead Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border-subtle pb-4">
        <div>
          <span className="text-[10px] font-mono uppercase tracking-widest text-accent-crimson font-bold flex items-center gap-1.5">
            <Network size={12} /> SPECIAL EDITION DATA JOURNALISM GRAPHIC
          </span>
          <h3 className="text-xl font-editorial font-bold text-ink-primary mt-1">
            {title}
          </h3>
          <p className="text-xs font-mono text-ink-secondary mt-0.5 max-w-2xl">
            {subtitle}
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            type="button"
            onClick={() => setIsPlaying((p) => !p)}
            className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-mono border border-border-subtle bg-white dark:bg-zinc-900 text-ink-primary hover:bg-slate-50"
            title={isPlaying ? 'Pause Simulation' : 'Resume Simulation'}
          >
            {isPlaying ? <Pause size={12} /> : <Play size={12} />}
            {isPlaying ? 'Pause' : 'Simulate'}
          </button>

          <button
            type="button"
            onClick={resetPositions}
            className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-mono border border-border-subtle bg-white dark:bg-zinc-900 text-ink-primary hover:bg-slate-50"
            title="Reset Graph Layout"
          >
            <RotateCcw size={12} /> Reset
          </button>

          <button
            type="button"
            onClick={() => setIsTableVisible((v) => !v)}
            className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-mono border border-border-subtle bg-white dark:bg-zinc-900 text-ink-primary hover:bg-slate-50"
          >
            <Table size={12} /> {isTableVisible ? 'Hide Matrix' : 'Data Matrix'}
          </button>
        </div>
      </div>

      {/* Category Filter Pills & Time Scrubber */}
      <div className="flex flex-wrap items-center justify-between gap-4 text-xs font-mono border-b border-border-subtle pb-3">
        <div className="flex items-center gap-2">
          <span className="text-ink-secondary font-bold">Filter Nodes:</span>
          {(['all', 'database', 'source', 'organization'] as const).map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setActiveCategory(cat)}
              className={`px-2 py-0.5 border text-[11px] capitalize transition-colors ${
                activeCategory === cat
                  ? 'bg-ink-primary text-white border-ink-primary font-bold'
                  : 'bg-canvas-subtle border-border-subtle text-ink-secondary hover:text-ink-primary'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Interactive Year / Horizon Scrubber */}
        <div className="flex items-center gap-2">
          <span className="text-ink-secondary">Consensus Horizon:</span>
          <input
            type="range"
            min="2024"
            max="2030"
            value={timeStep}
            onChange={(e) => setTimeStep(Number(e.target.value))}
            className="w-24 accent-accent-crimson cursor-pointer"
          />
          <span className="font-bold text-accent-crimson">{timeStep}</span>
        </div>
      </div>

      {/* HTML5 2D Retina Canvas Container */}
      <div className="w-full aspect-[700/360] border border-border-subtle bg-white dark:bg-zinc-950 relative overflow-hidden">
        <canvas
          ref={canvasRef}
          onClick={handleCanvasClick}
          className="w-full h-full cursor-grab active:cursor-grabbing"
          style={{ display: 'block' }}
        />

        {/* Selected Node Inspector Overlay */}
        {selectedNode && (
          <div className="absolute bottom-3 left-3 p-3 bg-ink-primary/95 text-white border border-zinc-700 max-w-xs shadow-2xl text-xs font-mono space-y-1">
            <div className="flex items-center justify-between font-bold border-b border-zinc-700 pb-1">
              <span>{selectedNode.label}</span>
              <span className="text-[10px] text-accent-crimson uppercase tracking-wider">
                {selectedNode.category}
              </span>
            </div>
            <p className="text-[11px] text-slate-300">
              Coordinated active telemetry node verified on decentralized {selectedNode.category} mesh.
            </p>
          </div>
        )}
      </div>

      {/* Accessible Tabular Data Matrix Fallback */}
      {isTableVisible && (
        <AccessibleDataTable
          caption="Investigative Entity Network & Consensus Flow Matrix"
          headers={['Node ID', 'Entity Name', 'System Role', 'Connected Outbound Targets']}
          rows={initialNodes.map((n) => ({
            id: n.id,
            name: n.label,
            category: n.category.toUpperCase(),
            links: links
              .filter((l) => l.source === n.id)
              .map((l) => `${l.target} (${l.label || 'Direct'})`)
              .join(', ') || 'Leaf Endpoint',
          }))}
          keyExtractor={(r) => r.id}
        />
      )}
    </div>
  );
};
