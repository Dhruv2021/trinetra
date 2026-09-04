import React, { useState } from 'react';
import { 
  GitFork, 
  ArrowRight, 
  CheckCircle2, 
  AlertTriangle, 
  Search, 
  Sparkles, 
  Share2, 
  FileText,
  User,
  Phone,
  Car,
  FolderGit2,
  MapPin,
  CreditCard,
  Building2,
  ChevronRight
} from 'lucide-react';
import { GraphData, ShortestPathResult, CaseRecord, ConnectionExplanation } from '../types';

interface HiddenConnectionViewProps {
  graphData: GraphData;
  cases: CaseRecord[];
  explanations: ConnectionExplanation[];
  onOpenCase: (caseRecord: CaseRecord) => void;
  onViewNetwork: (entityName: string) => void;
  prefillEntity?: string | null;
}

export const HiddenConnectionView: React.FC<HiddenConnectionViewProps> = ({
  graphData,
  cases,
  explanations,
  onOpenCase,
  onViewNetwork,
  prefillEntity
}) => {
  const [startEntity, setStartEntity] = useState(prefillEntity || 'Rahul Sharma');
  const [targetEntity, setTargetEntity] = useState('Suresh Yadav');
  const [isSearching, setIsSearching] = useState(false);
  const [pathResult, setPathResult] = useState<ShortestPathResult | null>(null);

  // Quick Demo Presets
  const presets = [
    { label: 'Rahul Sharma ➔ Suresh Yadav (4 Hops Syndicate Link)', a: 'Rahul Sharma', b: 'Suresh Yadav' },
    { label: 'Case 101 ➔ Case 117 (Hawala & Cross-Border Theft)', a: 'FIR-2026/DL-101', b: 'FIR-2026/DL-117' },
    { label: 'DL01AB1234 ➔ Vikas Dubey (Vehicle to Kingpin)', a: 'DL01AB1234', b: 'Vikas Dubey' },
    { label: 'Amit Kumar ➔ FIR-2026/DL-104 (Direct Intercept)', a: 'Amit Kumar', b: 'FIR-2026/DL-104' }
  ];

  const handleRunSearch = async (entityA?: string, entityB?: string) => {
    const a = entityA || startEntity;
    const b = entityB || targetEntity;
    if (!a || !b) return;

    setIsSearching(true);
    try {
      const res = await fetch('/api/find-connection', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ startEntity: a, targetEntity: b })
      });
      const data: ShortestPathResult = await res.json();
      setPathResult(data);
    } catch (err) {
      console.error('Failed to find connection:', err);
    } finally {
      setIsSearching(false);
    }
  };

  const getNodeIcon = (type: string) => {
    switch (type) {
      case 'PERSON': return <User className="w-4 h-4 text-amber-400" />;
      case 'PHONE': return <Phone className="w-4 h-4 text-sky-400" />;
      case 'VEHICLE': return <Car className="w-4 h-4 text-emerald-400" />;
      case 'CASE': return <FolderGit2 className="w-4 h-4 text-rose-400" />;
      case 'LOCATION': return <MapPin className="w-4 h-4 text-purple-400" />;
      case 'FINANCIAL': return <CreditCard className="w-4 h-4 text-yellow-400" />;
      default: return <Building2 className="w-4 h-4 text-indigo-400" />;
    }
  };

  return (
    <div className="p-8 space-y-8 max-w-6xl mx-auto">
      {/* Header */}
      <div className="border-b border-slate-800 pb-6">
        <div className="flex items-center gap-2.5">
          <GitFork className="w-6 h-6 text-cyan-400" />
          <h2 className="text-2xl font-bold tracking-tight text-white font-mono">Hidden Connection Finder</h2>
          <span className="text-xs px-2.5 py-0.5 rounded-full bg-cyan-950 text-cyan-400 border border-cyan-800 font-mono">
            BFS Graph Engine
          </span>
        </div>
        <p className="text-sm text-slate-400 mt-1">
          Discover multi-hop indirect relationships, shared burner phones, vehicle overlaps, and cross-case conduits between disparate suspects or cases.
        </p>
      </div>

      {/* Input Selector & Presets */}
      <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-6 shadow-sm space-y-6">
        
        {/* Preset Pills */}
        <div className="space-y-2">
          <span className="text-[10px] font-mono font-bold text-slate-500 uppercase tracking-widest block">
            Investigation Demo Pathways:
          </span>
          <div className="flex flex-wrap gap-2">
            {presets.map((p, idx) => (
              <button
                key={idx}
                onClick={() => {
                  setStartEntity(p.a);
                  setTargetEntity(p.b);
                  handleRunSearch(p.a, p.b);
                }}
                className="px-3 py-1.5 rounded-xl bg-slate-900/80 hover:bg-slate-800 hover:border-slate-700 text-slate-300 text-xs border border-slate-800 transition cursor-pointer font-mono"
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        {/* Input Fields */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
          <div>
            <label className="block text-xs font-mono text-slate-400 mb-1">Entity / Suspect / Case A</label>
            <div className="relative">
              <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={startEntity}
                onChange={(e) => setStartEntity(e.target.value)}
                placeholder="e.g. Rahul Sharma or DL01AB1234"
                className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-9 pr-4 py-2.5 text-xs text-white font-mono focus:border-cyan-600 focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-mono text-slate-400 mb-1">Entity / Suspect / Case B</label>
            <div className="relative">
              <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={targetEntity}
                onChange={(e) => setTargetEntity(e.target.value)}
                placeholder="e.g. Suresh Yadav or Case 104"
                className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-9 pr-4 py-2.5 text-xs text-white font-mono focus:border-cyan-600 focus:outline-none"
              />
            </div>
          </div>
        </div>

        {/* Action Button */}
        <div className="flex items-center justify-end">
          <button
            onClick={() => handleRunSearch()}
            disabled={isSearching || !startEntity || !targetEntity}
            className="px-6 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-semibold text-xs flex items-center gap-2 shadow-lg shadow-cyan-900/20 disabled:opacity-50 transition cursor-pointer"
          >
            <GitFork className="w-4 h-4" />
            <span>{isSearching ? 'Traversing Graph Adjacencies...' : 'Compute Shortest Relationship Path'}</span>
          </button>
        </div>

      </div>

      {/* Path Results Container */}
      {pathResult && (
        <div className="space-y-6 animate-in fade-in duration-200">
          
          {pathResult.found ? (
            <div className="bg-slate-900/40 border border-cyan-500/30 rounded-2xl p-6 shadow-xl space-y-6">
              
              {/* Summary Banner */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
                <div>
                  <span className="text-[10px] font-mono font-bold px-2.5 py-1 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 uppercase tracking-wider">
                    POTENTIAL INDIRECT CONNECTION FOUND
                  </span>
                  <h3 className="text-xl font-bold text-white mt-2 font-mono">
                    {pathResult.hops} Hop(s) Separation between {pathResult.startEntity.name} and {pathResult.targetEntity.name}
                  </h3>
                </div>

                <button
                  onClick={() => onViewNetwork(pathResult.startEntity.name)}
                  className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-200 text-xs font-semibold flex items-center gap-2 border border-slate-800 transition cursor-pointer self-start sm:self-auto"
                >
                  <Share2 className="w-3.5 h-3.5 text-cyan-400" />
                  <span>View in Full Graph</span>
                </button>
              </div>

              {/* SECTION 7: Multi-Hop Visual Pipeline Flow */}
              <div className="space-y-3">
                <span className="text-xs font-mono font-bold text-slate-400 uppercase tracking-wider block">
                  Path Pipeline:
                </span>
                
                <div className="p-4 rounded-xl bg-[#0a0a0a] border border-slate-800 flex flex-wrap items-center gap-2">
                  {pathResult.pathNodes.map((node, idx) => (
                    <React.Fragment key={idx}>
                      <div className="px-3.5 py-2.5 rounded-xl bg-slate-900/80 border border-slate-800 flex items-center gap-2.5 shadow-sm">
                        {getNodeIcon(node.type)}
                        <div>
                          <div className="text-xs font-semibold text-white font-mono">{node.name}</div>
                          <div className="text-[10px] text-slate-400 font-mono">[{node.type}]</div>
                        </div>
                      </div>

                      {idx < pathResult.pathNodes.length - 1 && (
                        <div className="flex items-center text-cyan-400 px-1">
                          <ArrowRight className="w-4 h-4" />
                        </div>
                      )}
                    </React.Fragment>
                  ))}
                </div>
              </div>

              {/* SECTION 8: Explainable Connection Evidence Breakdown */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                {/* Evidence Points */}
                <div className="space-y-3">
                  <span className="text-xs font-mono font-bold text-slate-400 uppercase tracking-wider block">
                    Evidence Supporting Each Link:
                  </span>
                  <div className="space-y-2">
                    {pathResult.evidenceSummary.map((ev, i) => (
                      <div key={i} className="p-3.5 rounded-xl bg-[#0a0a0a] border border-slate-800 flex items-start gap-2.5 text-xs text-slate-200">
                        <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                        <span className="leading-relaxed">{ev}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Connecting Cases of Interest */}
                <div className="space-y-3">
                  <span className="text-xs font-mono font-bold text-slate-400 uppercase tracking-wider block">
                    Intersecting FIR Cases ({pathResult.connectedCases.length}):
                  </span>
                  <div className="space-y-2">
                    {pathResult.connectedCases.map(c => (
                      <div
                        key={c.id}
                        onClick={() => onOpenCase(c)}
                        className="p-3.5 rounded-xl bg-[#0a0a0a] border border-slate-800 hover:border-cyan-500/50 cursor-pointer transition flex items-center justify-between group"
                      >
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-mono font-bold text-cyan-400 group-hover:underline">{c.firNumber}</span>
                            <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-800 text-slate-300 font-mono">
                              {c.crimeType}
                            </span>
                          </div>
                          <p className="text-xs text-slate-300 mt-1 line-clamp-1">{c.title}</p>
                          <span className="text-[10px] text-slate-500 font-mono">{c.date} • {c.city}</span>
                        </div>
                        <ChevronRight className="w-4 h-4 text-slate-500 group-hover:text-cyan-400 transition" />
                      </div>
                    ))}
                  </div>
                </div>

              </div>

              {/* Disclaimer */}
              <div className="p-3.5 rounded-xl bg-[#0a0a0a] border border-slate-800 text-[11px] text-slate-400 font-mono">
                Investigative Lead Note: Graph hops indicate recorded relational co-occurrence in FIR evidence logs. Independent verification by investigating officers is mandatory.
              </div>

            </div>
          ) : (
            <div className="p-8 rounded-2xl bg-slate-900/40 border border-slate-800 text-center space-y-2">
              <AlertTriangle className="w-6 h-6 text-amber-400 mx-auto" />
              <h3 className="text-base font-semibold text-white">No Connected Path Discovered</h3>
              <p className="text-xs text-slate-400 max-w-md mx-auto">
                No direct or indirect relationship pathway was found between "{startEntity}" and "{targetEntity}" within the indexed graph.
              </p>
            </div>
          )}

        </div>
      )}

      {/* High-Scoring Precomputed Cross-Case Explanations Section */}
      <div className="space-y-4 pt-4 border-t border-slate-800">
        <h3 className="text-base font-semibold text-white font-mono">Pre-Computed Cross-Case Connections</h3>
        <p className="text-xs text-slate-400">
          Cases automatically flagged with high relationship scores based on multi-attribute evidence overlap.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {explanations.slice(0, 6).map((exp, idx) => (
            <div
              key={idx}
              className="p-5 rounded-2xl bg-slate-900/40 border border-slate-800 hover:border-slate-700 transition space-y-3"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono font-semibold text-cyan-400">
                  {exp.source.name} ↔ {exp.target.name}
                </span>
                <span className="text-xs font-mono font-bold px-2.5 py-0.5 rounded-lg bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                  {Math.round(exp.relationshipScore * 100)}% Match
                </span>
              </div>

              <div className="space-y-1.5 text-xs text-slate-300">
                {exp.reasons.map((r, rIdx) => (
                  <div key={rIdx} className="flex items-center gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    <span>{r}</span>
                  </div>
                ))}
              </div>

              <div className="pt-2.5 border-t border-slate-800/80 text-xs text-slate-400 flex items-center justify-between">
                <span className="truncate pr-2">Shared: {exp.sharedEntities.map(e => e.name).join(', ')}</span>
                <button
                  onClick={() => {
                    setStartEntity(exp.source.name);
                    setTargetEntity(exp.target.name);
                    handleRunSearch(exp.source.name, exp.target.name);
                  }}
                  className="text-cyan-400 hover:underline font-semibold text-xs shrink-0 cursor-pointer"
                >
                  Analyze Path ➔
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
};
