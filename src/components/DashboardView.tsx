import React from 'react';
import { 
  FolderGit2, 
  Users, 
  Share2, 
  GitFork, 
  ShieldAlert, 
  Network, 
  ArrowUpRight, 
  AlertTriangle, 
  CheckCircle2, 
  ChevronRight,
  TrendingUp,
  MapPin,
  Calendar
} from 'lucide-react';
import { CaseRecord, ConnectionExplanation, EmergingNetwork, GraphData } from '../types';

interface DashboardViewProps {
  cases: CaseRecord[];
  graphData: GraphData;
  explanations: ConnectionExplanation[];
  emergingNetworks: EmergingNetwork[];
  onOpenCase: (caseRecord: CaseRecord) => void;
  onNavigateTab: (tab: any) => void;
  onSelectLead: (explanation: ConnectionExplanation) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  cases,
  graphData,
  explanations,
  emergingNetworks,
  onOpenCase,
  onNavigateTab,
  onSelectLead
}) => {
  const totalPersons = graphData.nodes.filter(n => n.type === 'PERSON').length;
  const totalEntities = graphData.nodes.filter(n => n.type !== 'CASE').length;
  const activeCases = cases.filter(c => c.status === 'Active').length;
  const highPriorityLeads = explanations.slice(0, 4);
  const primaryAlert = emergingNetworks[0];

  return (
    <div className="p-6 md:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Clean Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-5">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-white font-mono">Overview</h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Cross-case links, suspect networks, and live FIR intelligence
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => onNavigateTab('network')}
            className="px-3.5 py-1.5 rounded-xl bg-white/[0.08] hover:bg-white/[0.12] border border-white/15 text-slate-200 text-xs font-medium flex items-center gap-1.5 transition cursor-pointer"
          >
            <Share2 className="w-3.5 h-3.5 text-sky-300" />
            <span>Syndicate Graph</span>
          </button>
          <button
            onClick={() => onNavigateTab('copilot')}
            className="px-3.5 py-1.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 text-slate-300 text-xs font-medium flex items-center gap-1.5 transition cursor-pointer"
          >
            <span>AI Copilot</span>
            <ArrowUpRight className="w-3.5 h-3.5 text-slate-400" />
          </button>
        </div>
      </div>

      {/* Simplified KPI Metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/10 space-y-1">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span>Cases</span>
            <FolderGit2 className="w-3.5 h-3.5 text-sky-300" />
          </div>
          <div className="text-2xl font-bold text-white font-mono">{cases.length}</div>
        </div>

        <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/10 space-y-1">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span>Suspects</span>
            <Users className="w-3.5 h-3.5 text-amber-300" />
          </div>
          <div className="text-2xl font-bold text-white font-mono">{totalPersons}</div>
        </div>

        <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/10 space-y-1">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span>Entities</span>
            <Network className="w-3.5 h-3.5 text-emerald-300" />
          </div>
          <div className="text-2xl font-bold text-white font-mono">{totalEntities}</div>
        </div>

        <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/10 space-y-1">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span>Connections</span>
            <GitFork className="w-3.5 h-3.5 text-rose-300" />
          </div>
          <div className="text-2xl font-bold text-white font-mono">{explanations.length}</div>
        </div>

        <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/10 space-y-1">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span>Active FIRs</span>
            <ShieldAlert className="w-3.5 h-3.5 text-indigo-300" />
          </div>
          <div className="text-2xl font-bold text-white font-mono">{activeCases}</div>
        </div>

        <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/10 space-y-1">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span>Syndicates</span>
            <TrendingUp className="w-3.5 h-3.5 text-purple-300" />
          </div>
          <div className="text-2xl font-bold text-white font-mono">{emergingNetworks.length}</div>
        </div>
      </div>

      {/* Minimalist Syndicate Alert (Single Line / Compact Card) */}
      {primaryAlert && (
        <div className="p-4 rounded-2xl bg-amber-400/[0.05] border border-amber-300/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-amber-400/15 text-amber-300 border border-amber-400/25 flex items-center justify-center shrink-0">
              <AlertTriangle className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-white">{primaryAlert.name}</span>
                <span className="text-[10px] px-1.5 py-0.2 rounded bg-amber-400/15 text-amber-200 font-mono">
                  {primaryAlert.alertLevel}
                </span>
              </div>
              <p className="text-[11px] text-slate-400 mt-0.5">
                {primaryAlert.casesCount} Cases • {primaryAlert.personsCount} Suspects • {primaryAlert.growthVelocity30Days}
              </p>
            </div>
          </div>

          <button
            onClick={() => onNavigateTab('network')}
            className="px-3 py-1.5 rounded-xl bg-amber-300/15 hover:bg-amber-300/25 text-amber-200 border border-amber-300/30 text-xs font-medium transition cursor-pointer self-start sm:self-center"
          >
            Inspect Syndicate ➔
          </button>
        </div>
      )}

      {/* Two Column Grid: Priority Leads & Recent FIRs */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Priority Cross-Case Leads */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-200">Cross-Case Leads</h3>
            <button
              onClick={() => onNavigateTab('connections')}
              className="text-xs text-sky-300 hover:text-sky-200 flex items-center gap-0.5 cursor-pointer"
            >
              <span>View All ({explanations.length})</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="space-y-2.5">
            {highPriorityLeads.map((lead, idx) => (
              <div
                key={idx}
                onClick={() => onSelectLead(lead)}
                className="p-3.5 rounded-xl bg-white/[0.03] hover:bg-white/[0.06] border border-white/10 transition cursor-pointer space-y-2 group"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-slate-100 group-hover:text-sky-200 transition">
                    {lead.source.name} ↔ {lead.target.name}
                  </span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-sky-400/15 text-sky-200 font-mono font-medium">
                    {Math.round(lead.relationshipScore * 100)}% Link
                  </span>
                </div>

                {lead.reasons[0] && (
                  <div className="flex items-center gap-1.5 text-[11px] text-slate-300">
                    <CheckCircle2 className="w-3 h-3 text-emerald-400 shrink-0" />
                    <span className="line-clamp-1">{lead.reasons[0]}</span>
                  </div>
                )}

                <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1.5 border-t border-white/5">
                  <span className="truncate max-w-[240px]">
                    Shared: {lead.sharedEntities.map(e => e.name).join(', ')}
                  </span>
                  <span className="text-sky-300 group-hover:underline">Inspect ➔</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Recent FIRs */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-200">Recent FIRs</h3>
            <button
              onClick={() => onNavigateTab('cases')}
              className="text-xs text-sky-300 hover:text-sky-200 flex items-center gap-0.5 cursor-pointer"
            >
              <span>View All ({cases.length})</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="space-y-2.5">
            {cases.slice(0, 4).map((c) => (
              <div
                key={c.id}
                onClick={() => onOpenCase(c)}
                className="p-3.5 rounded-xl bg-white/[0.03] hover:bg-white/[0.06] border border-white/10 transition cursor-pointer space-y-2 group"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono font-semibold text-slate-200 group-hover:text-sky-200 transition">
                      {c.firNumber}
                    </span>
                    <span className="text-[10px] px-1.5 py-0.2 rounded bg-white/[0.06] text-slate-300">
                      {c.crimeType}
                    </span>
                  </div>
                  <span className={`text-[10px] px-1.5 py-0.2 rounded font-mono ${
                    c.priority === 'Critical' ? 'bg-rose-400/15 text-rose-300' : 'bg-amber-400/15 text-amber-300'
                  }`}>
                    {c.priority}
                  </span>
                </div>

                <p className="text-xs text-slate-300 line-clamp-1">{c.title}</p>

                <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1.5 border-t border-white/5">
                  <div className="flex items-center gap-3">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3 h-3 text-slate-500" />
                      {c.date}
                    </span>
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3 h-3 text-slate-500" />
                      {c.city}
                    </span>
                  </div>
                  <span className="text-sky-300 font-mono">{c.detectedConnectionsCount} links</span>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
};
