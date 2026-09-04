import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { 
  Search, 
  ZoomIn, 
  ZoomOut, 
  Maximize2, 
  Filter, 
  X, 
  GitFork, 
  ExternalLink,
  Calendar, 
  Shield, 
  MapPin,
  User,
  Phone,
  Car,
  DollarSign,
  Building,
  RotateCcw,
  CheckCircle,
  Sparkles,
  ArrowRight,
  Crosshair,
  Link2
} from 'lucide-react';
import { GraphData, GraphNode, GraphEdge, CaseRecord, ConnectionExplanation, EntityType } from '../types';
import { buildClientCaseCentricGraph } from '../utils/caseSimilarity';

interface NetworkGraphViewProps {
  graphData: GraphData;
  cases: CaseRecord[];
  explanations: ConnectionExplanation[];
  onOpenCase: (caseRecord: CaseRecord) => void;
  onFindConnections: (entityName: string) => void;
  selectedCaseId?: string | null;
  onSelectCaseId?: (caseId: string) => void;
}

interface SimNode extends GraphNode {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  isRoot?: boolean;
  isSimilarCase?: boolean;
  similarityScore?: number;
  similarityReasons?: string[];
  metadata?: Record<string, any>;
}

export const NetworkGraphView: React.FC<NetworkGraphViewProps> = ({
  cases,
  onOpenCase,
  onFindConnections,
  selectedCaseId,
  onSelectCaseId
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Active root case ID
  const [activeRootId, setActiveRootId] = useState<string>(() => {
    if (selectedCaseId && cases.some(c => c.id === selectedCaseId || c.firNumber === selectedCaseId)) {
      return selectedCaseId;
    }
    return cases[0]?.id || '';
  });

  // Keep synced if parent changes selectedCaseId
  useEffect(() => {
    if (selectedCaseId && cases.some(c => c.id === selectedCaseId || c.firNumber === selectedCaseId)) {
      setActiveRootId(selectedCaseId);
    }
  }, [selectedCaseId, cases]);

  // Current active root case record
  const currentRootCase = useMemo(() => {
    return cases.find(c => c.id === activeRootId || c.firNumber === activeRootId) || cases[0];
  }, [activeRootId, cases]);

  // Case search input in left panel
  const [caseSearchQuery, setCaseSearchQuery] = useState('');
  const [selectedCrimeFilter, setSelectedCrimeFilter] = useState('All');

  // Filtered case list in search results
  const filteredCaseList = useMemo(() => {
    return cases.filter(c => {
      const q = caseSearchQuery.toLowerCase().trim();
      const matchesSearch = !q || (
        c.firNumber.toLowerCase().includes(q) ||
        c.title.toLowerCase().includes(q) ||
        c.assignedOfficer.toLowerCase().includes(q) ||
        c.entities.persons.some(p => p.toLowerCase().includes(q)) ||
        c.entities.vehicles.some(v => v.toLowerCase().includes(q)) ||
        c.entities.phones.some(ph => ph.includes(q))
      );
      const matchesCrime = selectedCrimeFilter === 'All' || c.crimeType === selectedCrimeFilter;
      return matchesSearch && matchesCrime;
    });
  }, [cases, caseSearchQuery, selectedCrimeFilter]);

  // Entity Type Filter Toggles for Canvas
  const [activeEntityFilters, setActiveEntityFilters] = useState<Record<string, boolean>>({
    PERSON: true,
    PHONE: true,
    VEHICLE: true,
    LOCATION: true,
    FINANCIAL: true,
    ORGANIZATION: true,
    SIMILAR_CASE: true
  });

  // Canvas search & selection
  const [canvasSearch, setCanvasSearch] = useState('');
  const [selectedNode, setSelectedNode] = useState<SimNode | null>(null);
  const [hoveredNode, setHoveredNode] = useState<SimNode | null>(null);

  // Transform / Camera State
  const [transform, setTransform] = useState({ x: 0, y: 0, scale: 1 });
  const isDraggingCanvas = useRef(false);
  const dragStart = useRef({ x: 0, y: 0 });
  const draggedNode = useRef<SimNode | null>(null);

  // Simulation state
  const simNodesRef = useRef<SimNode[]>([]);
  const animFrameId = useRef<number | null>(null);

  // Build the local, case-centric graph for currentRootCase (strictly >=90% similarity)
  const caseCentricResult = useMemo(() => {
    if (!currentRootCase) return null;
    return buildClientCaseCentricGraph(currentRootCase, cases, 90);
  }, [currentRootCase, cases]);

  // Handle case selection
  const handleSelectCase = useCallback((c: CaseRecord) => {
    setActiveRootId(c.id);
    if (onSelectCaseId) {
      onSelectCaseId(c.id);
    }
  }, [onSelectCaseId]);

  // Pastel Color Palette for Nodes with High-End Cyber Glow
  const nodePalette: Record<EntityType, { bg: string; stroke: string; text: string; glow: string; shadow: string }> = {
    CASE: { bg: '#fda4af', stroke: '#ffe4e6', text: '#881337', glow: 'rgba(253, 164, 175, 0.5)', shadow: 'rgba(244, 63, 94, 0.4)' },
    PERSON: { bg: '#fdba74', stroke: '#ffedd5', text: '#7c2d12', glow: 'rgba(253, 186, 116, 0.4)', shadow: 'rgba(249, 115, 22, 0.3)' },
    PHONE: { bg: '#7dd3fc', stroke: '#e0f2fe', text: '#0369a1', glow: 'rgba(125, 211, 252, 0.4)', shadow: 'rgba(56, 189, 248, 0.3)' },
    VEHICLE: { bg: '#86efac', stroke: '#dcfce7', text: '#166534', glow: 'rgba(134, 239, 172, 0.4)', shadow: 'rgba(52, 211, 153, 0.3)' },
    LOCATION: { bg: '#d8b4fe', stroke: '#f3e8ff', text: '#6b21a8', glow: 'rgba(216, 180, 254, 0.4)', shadow: 'rgba(192, 132, 252, 0.3)' },
    FINANCIAL: { bg: '#fde047', stroke: '#fef08a', text: '#854d0e', glow: 'rgba(253, 224, 71, 0.4)', shadow: 'rgba(250, 204, 21, 0.3)' },
    ORGANIZATION: { bg: '#a5b4fc', stroke: '#e0e7ff', text: '#3730a3', glow: 'rgba(165, 180, 252, 0.4)', shadow: 'rgba(129, 140, 248, 0.3)' },
    DATE: { bg: '#cbd5e1', stroke: '#f1f5f9', text: '#334155', glow: 'rgba(203, 213, 225, 0.4)', shadow: 'rgba(148, 163, 184, 0.3)' }
  };

  // Filtered nodes & edges for rendering
  const visibleNodes = useMemo(() => {
    if (!caseCentricResult) return [];
    return caseCentricResult.nodes.filter(n => {
      if (n.isRoot) return true;
      if (n.isSimilarCase) return activeEntityFilters.SIMILAR_CASE;
      return activeEntityFilters[n.type] ?? true;
    });
  }, [caseCentricResult, activeEntityFilters]);

  const visibleNodeIds = useMemo(() => {
    return new Set(visibleNodes.map(n => n.id));
  }, [visibleNodes]);

  const visibleEdges = useMemo(() => {
    if (!caseCentricResult) return [];
    return caseCentricResult.edges.filter(e => visibleNodeIds.has(e.source) && visibleNodeIds.has(e.target));
  }, [caseCentricResult, visibleNodeIds]);

  // Initialize simulation when root case changes
  useEffect(() => {
    if (!caseCentricResult) return;

    const width = containerRef.current?.clientWidth || 900;
    const height = containerRef.current?.clientHeight || 650;
    const centerX = width / 2;
    const centerY = height / 2;

    // Reset previous simulation
    simNodesRef.current = [];

    const rawNodes = caseCentricResult.nodes;
    const entities = rawNodes.filter(n => !n.isRoot && !n.isSimilarCase);
    const similarCases = rawNodes.filter(n => n.isSimilarCase);

    const initialized: SimNode[] = [];

    // 1. Root Node (Placed firmly in the exact center)
    const rootRaw = rawNodes.find(n => n.isRoot);
    if (rootRaw) {
      const rootSim: SimNode = {
        ...rootRaw,
        x: centerX,
        y: centerY,
        vx: 0,
        vy: 0,
        radius: 34,
        isRoot: true
      };
      initialized.push(rootSim);
    }

    // 2. Direct Entities (Arranged in an inner orbit around Root)
    const entityCount = entities.length;
    entities.forEach((ent, i) => {
      const angle = (i / (entityCount || 1)) * 2 * Math.PI + (Math.random() * 0.2);
      const dist = 140 + (i % 3) * 35;
      initialized.push({
        ...ent,
        x: centerX + Math.cos(angle) * dist,
        y: centerY + Math.sin(angle) * dist,
        vx: 0,
        vy: 0,
        radius: 20
      });
    });

    // 3. Similar Cases (Arranged in an outer orbit with prominent spacing)
    const simCount = similarCases.length;
    similarCases.forEach((sim, i) => {
      const angle = (i / (simCount || 1)) * 2 * Math.PI + Math.PI / 4;
      const dist = 280 + (i % 2) * 40;
      initialized.push({
        ...sim,
        x: centerX + Math.cos(angle) * dist,
        y: centerY + Math.sin(angle) * dist,
        vx: 0,
        vy: 0,
        radius: 28,
        isSimilarCase: true
      });
    });

    simNodesRef.current = initialized;
    setTransform({ x: 0, y: 0, scale: 0.95 });
  }, [caseCentricResult]);

  // Simulation physics loop and Canvas Drawing
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let isRunning = true;
    let stepCount = 0;

    const tick = () => {
      if (!isRunning) return;

      const nodes = simNodesRef.current.filter(n => visibleNodeIds.has(n.id));
      const width = canvas.width;
      const height = canvas.height;
      const centerX = width / 2;
      const centerY = height / 2;

      // Physics Relaxation
      if (stepCount < 300 || draggedNode.current) {
        // Node Repulsion
        for (let i = 0; i < nodes.length; i++) {
          for (let j = i + 1; j < nodes.length; j++) {
            const a = nodes[i];
            const b = nodes[j];
            const dx = b.x - a.x;
            const dy = b.y - a.y;
            const distSq = dx * dx + dy * dy + 1;
            const minDist = (a.radius + b.radius) * 2.8;

            if (distSq < minDist * minDist) {
              const dist = Math.sqrt(distSq);
              const force = (minDist - dist) / (dist * 12);
              const fx = dx * force;
              const fy = dy * force;

              if (!a.isRoot && a !== draggedNode.current) {
                a.x -= fx;
                a.y -= fy;
              }
              if (!b.isRoot && b !== draggedNode.current) {
                b.x += fx;
                b.y += fy;
              }
            }
          }
        }

        // Edge Spring Attraction
        const nodeMap = new Map<string, SimNode>(nodes.map(n => [n.id, n]));
        for (const edge of visibleEdges) {
          const source = nodeMap.get(edge.source);
          const target = nodeMap.get(edge.target);
          if (source && target) {
            const dx = target.x - source.x;
            const dy = target.y - source.y;
            const dist = Math.sqrt(dx * dx + dy * dy) || 1;
            const idealDist = (source.isRoot || target.isRoot) 
              ? (target.isSimilarCase || source.isSimilarCase ? 270 : 160)
              : 120;
            const force = (dist - idealDist) * 0.025;
            const fx = (dx / dist) * force;
            const fy = (dy / dist) * force;

            if (!source.isRoot && source !== draggedNode.current) {
              source.x += fx;
              source.y += fy;
            }
            if (!target.isRoot && target !== draggedNode.current) {
              target.x -= fx;
              target.y -= fy;
            }
          }
        }

        // Gentle pull towards center for non-root nodes
        for (const n of nodes) {
          if (!n.isRoot && n !== draggedNode.current) {
            const dx = centerX - n.x;
            const dy = centerY - n.y;
            n.x += dx * 0.005;
            n.y += dy * 0.005;
          }
        }

        stepCount++;
      }

      // ---------------- RENDER ----------------
      ctx.clearRect(0, 0, width, height);

      ctx.save();
      // Apply Pan & Zoom Transform
      ctx.translate(transform.x, transform.y);
      ctx.scale(transform.scale, transform.scale);

      // Subtle Background Grid Dots
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.04)';
      ctx.lineWidth = 1;
      const gridSize = 40;
      const startX = -transform.x / transform.scale - 200;
      const endX = (width - transform.x) / transform.scale + 200;
      const startY = -transform.y / transform.scale - 200;
      const endY = (height - transform.y) / transform.scale + 200;

      for (let gx = Math.floor(startX / gridSize) * gridSize; gx < endX; gx += gridSize) {
        for (let gy = Math.floor(startY / gridSize) * gridSize; gy < endY; gy += gridSize) {
          ctx.fillStyle = 'rgba(255, 255, 255, 0.06)';
          ctx.beginPath();
          ctx.arc(gx, gy, 1, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      const nodeMap = new Map<string, SimNode>(nodes.map(n => [n.id, n]));

      // 1. Draw Edges
      for (const edge of visibleEdges) {
        const source = nodeMap.get(edge.source);
        const target = nodeMap.get(edge.target);
        if (!source || !target) continue;

        const isSimilarCaseEdge = edge.type === 'SIMILAR_CASE';
        const isHighlighted = selectedNode && (source.id === selectedNode.id || target.id === selectedNode.id);

        ctx.beginPath();
        ctx.moveTo(source.x, source.y);
        ctx.lineTo(target.x, target.y);

        if (isSimilarCaseEdge) {
          // High-similarity edge: prominent dashed line
          ctx.setLineDash([6, 4]);
          ctx.strokeStyle = isHighlighted ? '#fda4af' : 'rgba(253, 164, 175, 0.55)';
          ctx.lineWidth = isHighlighted ? 2.5 : 1.8;
        } else if (isHighlighted) {
          ctx.setLineDash([]);
          ctx.strokeStyle = 'rgba(125, 211, 252, 0.8)';
          ctx.lineWidth = 2.2;
        } else {
          ctx.setLineDash([]);
          ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
          ctx.lineWidth = 1.2;
        }
        ctx.stroke();
        ctx.setLineDash([]);

        // Edge label (similarity percentage or relationship type)
        const midX = (source.x + target.x) / 2;
        const midY = (source.y + target.y) / 2;

        if (isSimilarCaseEdge) {
          ctx.save();
          ctx.font = 'bold 10px monospace';
          const matchConfidence = edge.confidence ? `${Math.round(edge.confidence * 100)}% SIMILAR` : '90%+ MATCH';
          const textMetrics = ctx.measureText(matchConfidence);
          
          ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
          ctx.fillRect(midX - textMetrics.width / 2 - 4, midY - 7, textMetrics.width + 8, 14);
          ctx.strokeStyle = 'rgba(253, 164, 175, 0.6)';
          ctx.strokeRect(midX - textMetrics.width / 2 - 4, midY - 7, textMetrics.width + 8, 14);

          ctx.fillStyle = '#fda4af';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(matchConfidence, midX, midY);
          ctx.restore();
        }
      }

      // 2. Draw Nodes
      for (const node of nodes) {
        const isSelected = selectedNode?.id === node.id;
        const isHovered = hoveredNode?.id === node.id;
        const palette = nodePalette[node.type] || nodePalette.ORGANIZATION;

        ctx.save();

        // High-end Cyber Glow Shadow
        ctx.shadowColor = node.isRoot ? 'rgba(244, 63, 94, 0.6)' : (node.isSimilarCase ? 'rgba(251, 191, 36, 0.5)' : palette.shadow);
        ctx.shadowBlur = isSelected || isHovered ? 22 : 12;
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = 2;

        // Aura glow for Root node or Selected node
        if (node.isRoot) {
          ctx.beginPath();
          ctx.arc(node.x, node.y, node.radius + 16, 0, Math.PI * 2);
          ctx.fillStyle = 'rgba(244, 63, 94, 0.15)';
          ctx.fill();

          ctx.beginPath();
          ctx.arc(node.x, node.y, node.radius + 8, 0, Math.PI * 2);
          ctx.fillStyle = 'rgba(244, 63, 94, 0.25)';
          ctx.fill();
        } else if (node.isSimilarCase) {
          ctx.beginPath();
          ctx.arc(node.x, node.y, node.radius + 6, 0, Math.PI * 2);
          ctx.strokeStyle = 'rgba(251, 191, 36, 0.5)';
          ctx.lineWidth = 2;
          ctx.stroke();
        } else if (isSelected || isHovered) {
          ctx.beginPath();
          ctx.arc(node.x, node.y, node.radius + 8, 0, Math.PI * 2);
          ctx.fillStyle = palette.glow;
          ctx.fill();
        }

        // Main Node Body Circle with Refined Radial Gradient
        ctx.beginPath();
        ctx.arc(node.x, node.y, node.radius, 0, Math.PI * 2);

        if (node.isRoot) {
          const grad = ctx.createRadialGradient(node.x - 6, node.y - 6, 4, node.x, node.y, node.radius);
          grad.addColorStop(0, '#fb7185');
          grad.addColorStop(0.5, '#e11d48');
          grad.addColorStop(1, '#881337');
          ctx.fillStyle = grad;
          ctx.strokeStyle = '#ffe4e6';
          ctx.lineWidth = 3.5;
        } else if (node.isSimilarCase) {
          const grad = ctx.createRadialGradient(node.x - 4, node.y - 4, 3, node.x, node.y, node.radius);
          grad.addColorStop(0, '#fde047');
          grad.addColorStop(0.5, '#f59e0b');
          grad.addColorStop(1, '#78350f');
          ctx.fillStyle = grad;
          ctx.strokeStyle = '#fef08a';
          ctx.lineWidth = 2.8;
        } else {
          const grad = ctx.createRadialGradient(node.x - 4, node.y - 4, 2, node.x, node.y, node.radius);
          grad.addColorStop(0, palette.stroke);
          grad.addColorStop(1, palette.bg);
          ctx.fillStyle = grad;
          ctx.strokeStyle = isSelected ? '#ffffff' : palette.stroke;
          ctx.lineWidth = isSelected ? 3 : 1.5;
        }

        ctx.fill();
        ctx.stroke();

        // Reset shadow for inner elements to keep icons sharp
        ctx.shadowBlur = 0;
        ctx.shadowColor = 'transparent';

        // Node Inner Icon or Monogram
        ctx.fillStyle = node.isRoot || node.isSimilarCase ? '#ffffff' : palette.text;
        ctx.font = node.isRoot ? 'bold 13px sans-serif' : 'bold 12px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        let symbol = '';
        if (node.isRoot) symbol = '★';
        else if (node.isSimilarCase) symbol = '⇄';
        else if (node.type === 'PERSON') symbol = '👤';
        else if (node.type === 'PHONE') symbol = '📞';
        else if (node.type === 'VEHICLE') symbol = '🚗';
        else if (node.type === 'FINANCIAL') symbol = '💳';
        else if (node.type === 'LOCATION') symbol = '📍';
        else if (node.type === 'ORGANIZATION') symbol = '🏢';
        else symbol = '•';

        ctx.fillText(symbol, node.x, node.y - (node.isRoot ? 4 : 0));

        // Root Label Badge above node
        if (node.isRoot) {
          ctx.font = 'bold 9px monospace';
          ctx.fillStyle = '#ffe4e6';
          ctx.fillText('ROOT CASE', node.x, node.y + 11);
        } else if (node.isSimilarCase) {
          ctx.font = 'bold 9px monospace';
          ctx.fillStyle = '#fef08a';
          ctx.fillText(`${node.similarityScore || 90}% MATCH`, node.x, node.y + 10);
        }

        // Node Label below circle with subtle backing pill for readability
        ctx.font = node.isRoot ? 'bold 11px sans-serif' : '10.5px sans-serif';
        const labelText = node.name;
        const textMetrics = ctx.measureText(labelText);
        
        ctx.fillStyle = 'rgba(9, 11, 16, 0.85)';
        ctx.fillRect(node.x - textMetrics.width / 2 - 5, node.y + node.radius + 6, textMetrics.width + 10, 16);
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
        ctx.lineWidth = 0.5;
        ctx.strokeRect(node.x - textMetrics.width / 2 - 5, node.y + node.radius + 6, textMetrics.width + 10, 16);

        ctx.fillStyle = node.isRoot ? '#fda4af' : (node.isSimilarCase ? '#fde047' : '#f1f5f9');
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(labelText, node.x, node.y + node.radius + 14);

        ctx.restore();
      }

      ctx.restore();

      animFrameId.current = requestAnimationFrame(tick);
    };

    animFrameId.current = requestAnimationFrame(tick);

    return () => {
      isRunning = false;
      if (animFrameId.current) cancelAnimationFrame(animFrameId.current);
    };
  }, [visibleNodeIds, visibleEdges, transform, selectedNode, hoveredNode]);

  // Handle Resize of Canvas
  useEffect(() => {
    const handleResize = () => {
      const canvas = canvasRef.current;
      const container = containerRef.current;
      if (!canvas || !container) return;
      canvas.width = container.clientWidth;
      canvas.height = container.clientHeight;
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Canvas Mouse Interactions (Pan, Zoom, Drag Node, Click)
  const getCanvasMousePos = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const screenX = e.clientX - rect.left;
    const screenY = e.clientY - rect.top;
    const worldX = (screenX - transform.x) / transform.scale;
    const worldY = (screenY - transform.y) / transform.scale;
    return { screenX, screenY, worldX, worldY };
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const { screenX, screenY, worldX, worldY } = getCanvasMousePos(e);

    // Check if clicking a node
    const clicked = simNodesRef.current.find(n => {
      if (!visibleNodeIds.has(n.id)) return false;
      const dx = n.x - worldX;
      const dy = n.y - worldY;
      return dx * dx + dy * dy <= (n.radius + 5) * (n.radius + 5);
    });

    if (clicked) {
      draggedNode.current = clicked;
      setSelectedNode(clicked);
    } else {
      isDraggingCanvas.current = true;
      dragStart.current = { x: screenX - transform.x, y: screenY - transform.y };
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const { screenX, screenY, worldX, worldY } = getCanvasMousePos(e);

    if (draggedNode.current) {
      draggedNode.current.x = worldX;
      draggedNode.current.y = worldY;
      draggedNode.current.vx = 0;
      draggedNode.current.vy = 0;
      return;
    }

    if (isDraggingCanvas.current) {
      setTransform(prev => ({
        ...prev,
        x: screenX - dragStart.current.x,
        y: screenY - dragStart.current.y
      }));
      return;
    }

    // Hover detection
    const hovered = simNodesRef.current.find(n => {
      if (!visibleNodeIds.has(n.id)) return false;
      const dx = n.x - worldX;
      const dy = n.y - worldY;
      return dx * dx + dy * dy <= (n.radius + 5) * (n.radius + 5);
    });
    setHoveredNode(hovered || null);
  };

  const handleMouseUp = () => {
    draggedNode.current = null;
    isDraggingCanvas.current = false;
  };

  const handleWheel = (e: React.WheelEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    const zoomFactor = e.deltaY < 0 ? 1.1 : 0.9;
    const newScale = Math.min(Math.max(transform.scale * zoomFactor, 0.35), 2.8);

    setTransform(prev => ({
      x: mouseX - (mouseX - prev.x) * (newScale / prev.scale),
      y: mouseY - (mouseY - prev.y) * (newScale / prev.scale),
      scale: newScale
    }));
  };

  const handleRecenter = () => {
    setTransform({ x: 0, y: 0, scale: 0.95 });
  };

  const handleZoom = (direction: 'in' | 'out') => {
    const factor = direction === 'in' ? 1.2 : 0.8;
    setTransform(prev => ({
      ...prev,
      scale: Math.min(Math.max(prev.scale * factor, 0.35), 2.8)
    }));
  };

  // Search entity inside graph canvas
  const handleCanvasSearch = (query: string) => {
    setCanvasSearch(query);
    if (!query.trim()) return;
    const match = simNodesRef.current.find(n => 
      n.name.toLowerCase().includes(query.toLowerCase()) && visibleNodeIds.has(n.id)
    );
    if (match && containerRef.current) {
      setSelectedNode(match);
      const width = containerRef.current.clientWidth;
      const height = containerRef.current.clientHeight;
      setTransform({
        x: width / 2 - match.x * 1.2,
        y: height / 2 - match.y * 1.2,
        scale: 1.2
      });
    }
  };

  // Direct entity counts for selected case
  const entityStats = useMemo(() => {
    if (!currentRootCase) return { suspects: 0, phones: 0, vehicles: 0, locations: 0, financials: 0 };
    return {
      suspects: currentRootCase.entities.persons.length,
      phones: currentRootCase.entities.phones.length,
      vehicles: currentRootCase.entities.vehicles.length,
      locations: currentRootCase.entities.locations.length,
      financials: currentRootCase.entities.financials.length
    };
  }, [currentRootCase]);

  // High-similarity cases (≥90%)
  const similarCasesList = caseCentricResult?.similarCases || [];

  return (
    <div ref={containerRef} className="flex-1 relative flex flex-col h-full w-full overflow-hidden bg-[#090b10]">
      
      {/* Top Floating Control Bar */}
      <div className="absolute top-4 left-4 right-4 z-10 pointer-events-none flex items-center justify-between gap-3">
        
        {/* Active Root Case Indicator & Case Selector */}
        <div className="pointer-events-auto bg-slate-900/80 backdrop-blur-xl border border-white/10 px-3.5 py-2 rounded-2xl flex items-center gap-3 shadow-xl">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-400 animate-pulse"></span>
            <select
              value={activeRootId}
              onChange={(e) => {
                const c = cases.find(item => item.id === e.target.value || item.firNumber === e.target.value);
                if (c) handleSelectCase(c);
              }}
              className="bg-transparent text-xs font-semibold text-slate-200 font-mono focus:outline-none cursor-pointer"
            >
              {cases.map(c => (
                <option key={c.id} value={c.id} className="bg-slate-900 text-slate-200">
                  {c.firNumber} - {c.crimeType}
                </option>
              ))}
            </select>
          </div>
          <span className="h-3.5 w-px bg-white/15"></span>
          <div className="flex items-center gap-2 text-[11px] text-slate-400">
            <span className="text-slate-300">1 Root</span>
            <span>•</span>
            <span className="text-slate-300">{visibleNodes.length - 1 - similarCasesList.length} Entities</span>
            <span>•</span>
            <span className="text-amber-300 font-medium">{similarCasesList.length} Similar (≥90%)</span>
          </div>
        </div>

        {/* Filter Chips & Search on Canvas */}
        <div className="pointer-events-auto flex items-center gap-2 bg-slate-900/80 backdrop-blur-xl border border-white/10 p-1.5 rounded-2xl shadow-xl">
          
          {/* Search within Graph */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={canvasSearch}
              onChange={(e) => handleCanvasSearch(e.target.value)}
              placeholder="Find in graph..."
              className="w-32 sm:w-40 pl-7 pr-2 py-1 text-[11px] rounded-xl bg-white/[0.04] border border-white/10 text-slate-200 placeholder-slate-500 focus:outline-none focus:border-sky-300/40"
            />
          </div>

          <span className="h-4 w-px bg-white/15"></span>

          {/* Quick Filter Toggles */}
          <div className="hidden md:flex items-center gap-1">
            {[
              { key: 'PERSON', label: 'Suspects', color: 'text-orange-300' },
              { key: 'PHONE', label: 'Phones', color: 'text-sky-300' },
              { key: 'VEHICLE', label: 'Vehicles', color: 'text-emerald-300' },
              { key: 'SIMILAR_CASE', label: 'Similar (≥90%)', color: 'text-amber-300' }
            ].map(f => (
              <button
                key={f.key}
                onClick={() => setActiveEntityFilters(prev => ({ ...prev, [f.key]: !prev[f.key] }))}
                className={`px-2 py-1 rounded-xl text-[10px] font-medium transition cursor-pointer border ${
                  activeEntityFilters[f.key]
                    ? 'bg-white/10 border-white/20 text-slate-200'
                    : 'bg-transparent border-transparent text-slate-500 hover:text-slate-400'
                }`}
              >
                <span className={activeEntityFilters[f.key] ? f.color : 'text-slate-500'}>●</span> {f.label}
              </button>
            ))}
          </div>

          <span className="h-4 w-px bg-white/15"></span>

          {/* Zoom Controls */}
          <div className="flex items-center gap-0.5">
            <button
              onClick={() => handleZoom('in')}
              className="p-1.5 rounded-lg hover:bg-white/10 text-slate-400 hover:text-slate-200 transition cursor-pointer"
              title="Zoom In"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => handleZoom('out')}
              className="p-1.5 rounded-lg hover:bg-white/10 text-slate-400 hover:text-slate-200 transition cursor-pointer"
              title="Zoom Out"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* HTML5 Canvas */}
      <canvas
        ref={canvasRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onWheel={handleWheel}
        className="w-full h-full cursor-grab active:cursor-grabbing"
      />

      {/* Node Hover Tooltip */}
      {hoveredNode && !draggedNode.current && (
        <div 
          className="pointer-events-none absolute z-20 px-3 py-1.5 rounded-xl bg-slate-900/90 border border-white/20 text-xs shadow-2xl backdrop-blur-md"
          style={{
            left: Math.min(Math.max(20, hoveredNode.x * transform.scale + transform.x + 15), (containerRef.current?.clientWidth || 800) - 180),
            top: Math.max(20, hoveredNode.y * transform.scale + transform.y - 30)
          }}
        >
          <div className="flex items-center gap-1.5 font-medium">
            <span className="text-[10px] px-1.5 py-0.2 rounded bg-white/10 text-slate-300 font-mono">
              {hoveredNode.type}
            </span>
            <span className="text-slate-100">{hoveredNode.name}</span>
          </div>
          {hoveredNode.isRoot && (
            <p className="text-[10px] text-rose-300 font-semibold mt-0.5">Central Investigation Target</p>
          )}
          {hoveredNode.isSimilarCase && (
            <p className="text-[10px] text-amber-300 font-semibold mt-0.5">
              {hoveredNode.similarityScore}% Similarity Match
            </p>
          )}
        </div>
      )}

      {/* Node Detail Slideout Drawer (when a node is clicked) */}
      {selectedNode && (
        <div className="absolute top-20 right-4 bottom-4 w-80 z-20 bg-slate-900/90 backdrop-blur-2xl border border-white/15 rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in fade-in slide-in-from-right-4 duration-200">
          
          {/* Drawer Header */}
          <div className="p-3.5 border-b border-white/10 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono uppercase text-slate-400">Node Inspector</span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/10 text-slate-300 font-mono">
                {selectedNode.type}
              </span>
            </div>
            <button
              onClick={() => setSelectedNode(null)}
              className="p-1 rounded-lg hover:bg-white/10 text-slate-400 hover:text-slate-200 transition cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Drawer Content */}
          <div className="p-4 flex-1 overflow-y-auto space-y-4">
            
            {/* Title & Badge */}
            <div>
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-semibold text-slate-100 font-mono">{selectedNode.name}</h4>
                {selectedNode.isRoot && (
                  <span className="text-[10px] px-2 py-0.5 rounded bg-rose-400/20 text-rose-300 font-semibold">
                    ROOT
                  </span>
                )}
                {selectedNode.isSimilarCase && (
                  <span className="text-[10px] px-2 py-0.5 rounded bg-amber-400/20 text-amber-300 font-semibold">
                    {selectedNode.similarityScore}% MATCH
                  </span>
                )}
              </div>
              {selectedNode.metadata?.title && (
                <p className="text-xs text-slate-300 mt-1">{selectedNode.metadata.title}</p>
              )}
            </div>

            {/* Similar Case Breakdown */}
            {selectedNode.isSimilarCase && (
              <div className="p-3 rounded-xl bg-amber-400/[0.08] border border-amber-400/25 space-y-2">
                <span className="text-[10px] font-mono uppercase tracking-wider text-amber-300 font-semibold block">
                  Similarity Corroboration
                </span>
                <div className="space-y-1 text-xs text-slate-300">
                  {(selectedNode.similarityReasons || []).map((r, i) => (
                    <div key={i} className="flex items-start gap-1.5 text-[11px]">
                      <CheckCircle className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                      <span>{r}</span>
                    </div>
                  ))}
                </div>

                <button
                  onClick={() => {
                    const matchedCase = cases.find(c => c.firNumber === selectedNode.name || c.id === selectedNode.metadata?.caseId);
                    if (matchedCase) handleSelectCase(matchedCase);
                  }}
                  className="w-full mt-2 py-2 rounded-xl bg-amber-300/20 hover:bg-amber-300/30 border border-amber-300/40 text-amber-200 text-xs font-semibold transition flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <span>Pivot: Make This Case Root Node</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            {/* Entity Details */}
            {!selectedNode.isRoot && !selectedNode.isSimilarCase && (
              <div className="space-y-3">
                <div className="p-3 rounded-xl bg-white/[0.03] border border-white/10 space-y-1.5">
                  <span className="text-[10px] text-slate-400 uppercase font-mono block">Direct Association</span>
                  <p className="text-xs text-slate-200">
                    Explicitly named in active FIR: <span className="font-mono text-rose-300">{currentRootCase.firNumber}</span>
                  </p>
                </div>

                <button
                  onClick={() => onFindConnections(selectedNode.name)}
                  className="w-full py-2 rounded-xl bg-sky-300/15 hover:bg-sky-300/25 border border-sky-300/35 text-sky-200 text-xs font-medium transition flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Link2 className="w-3.5 h-3.5" />
                  <span>Cross-Case Network Search</span>
                </button>
              </div>
            )}

            {/* Root Case Actions */}
            {selectedNode.isRoot && (
              <div className="space-y-2">
                <div className="p-3 rounded-xl bg-rose-400/[0.08] border border-rose-400/20 space-y-1 text-xs">
                  <span className="text-[10px] text-rose-300 uppercase font-mono block font-semibold">Active Root Case</span>
                  <p className="text-slate-300 leading-relaxed">
                    All nodes and similarity calculations on this canvas are strictly centered on this primary record.
                  </p>
                </div>
                <button
                  onClick={() => onOpenCase(currentRootCase)}
                  className="w-full py-2 rounded-xl bg-white/10 hover:bg-white/15 border border-white/20 text-slate-100 text-xs font-medium transition flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <ExternalLink className="w-3.5 h-3.5 text-rose-300" />
                  <span>Open Case Summary</span>
                </button>
              </div>
            )}

          </div>
        </div>
      )}

    </div>
  );
};
