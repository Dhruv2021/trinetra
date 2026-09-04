import React, { useState } from 'react';
import { 
  X, 
  Share2, 
  GitFork, 
  Bot, 
  FileText, 
  Calendar, 
  MapPin, 
  Shield, 
  CheckCircle2, 
  User, 
  Phone, 
  Car, 
  CreditCard, 
  Building2,
  Clock,
  Sparkles
} from 'lucide-react';
import { CaseRecord, ConnectionExplanation } from '../types';

interface CaseWorkspaceModalProps {
  caseRecord: CaseRecord;
  connections: ConnectionExplanation[];
  onClose: () => void;
  onViewNetwork: (caseRecord: CaseRecord) => void;
  onFindConnections: (entityName: string) => void;
  onAskAI: (query: string) => void;
  onGenerateReport: (caseRecord: CaseRecord) => void;
}

export const CaseWorkspaceModal: React.FC<CaseWorkspaceModalProps> = ({
  caseRecord,
  connections,
  onClose,
  onViewNetwork,
  onFindConnections,
  onAskAI,
  onGenerateReport
}) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'entities' | 'connections' | 'evidence' | 'ai'>('overview');

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xl flex items-center justify-center p-4">
      <div className="w-full max-w-4xl max-h-[90vh] bg-slate-950/85 backdrop-blur-2xl border border-white/10 rounded-3xl shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Workspace Header */}
        <div className="p-6 border-b border-white/10 bg-white/[0.03] backdrop-blur-md flex items-start justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-3">
              <span className="text-xs font-mono font-semibold text-sky-200 px-2.5 py-0.5 rounded-lg bg-sky-300/10 border border-sky-300/25 backdrop-blur-sm">
                CASE {caseRecord.firNumber}
              </span>
              <span className="text-xs px-2.5 py-0.5 rounded-lg bg-white/[0.06] text-slate-300 border border-white/10 font-medium">
                {caseRecord.crimeType}
              </span>
              <span className={`text-xs px-2.5 py-0.5 rounded-lg font-mono font-medium border ${
                caseRecord.priority === 'Critical' 
                  ? 'bg-rose-300/10 text-rose-200 border-rose-300/25' 
                  : 'bg-amber-200/10 text-amber-200 border-amber-200/25'
              }`}>
                {caseRecord.priority} Priority
              </span>
            </div>
            <h2 className="text-lg font-semibold text-white tracking-wide">
              {caseRecord.title}
            </h2>
            <div className="flex flex-wrap items-center gap-4 text-xs text-slate-400 font-mono">
              <span className="flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                {caseRecord.date}
              </span>
              <span className="flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-slate-400" />
                {caseRecord.location}
              </span>
              <span className="flex items-center gap-1">
                <Shield className="w-3.5 h-3.5 text-slate-400" />
                {caseRecord.assignedOfficer}
              </span>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-xl bg-white/[0.05] text-slate-300 hover:text-white border border-white/10 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Primary Workspace Action Buttons Bar */}
        <div className="px-6 py-3 bg-white/[0.02] border-b border-white/10 flex flex-wrap items-center justify-between gap-3 backdrop-blur-md">
          {/* Tabs */}
          <div className="flex items-center gap-1.5 text-xs font-medium">
            {[
              { id: 'overview', label: 'Overview' },
              { id: 'entities', label: `Entities (${caseRecord.entities.persons.length + caseRecord.entities.vehicles.length + caseRecord.entities.phones.length})` },
              { id: 'connections', label: `Cross-Case Links (${connections.length})` },
              { id: 'evidence', label: 'Evidence & Timeline' },
              { id: 'ai', label: 'AI Insights' },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`px-3 py-1.5 rounded-xl transition cursor-pointer backdrop-blur-sm ${
                  activeTab === tab.id
                    ? 'bg-sky-300/15 text-sky-200 border border-sky-300/30 font-semibold'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-white/[0.05]'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Action CTAs */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => onViewNetwork(caseRecord)}
              className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-sky-300/90 to-indigo-300/90 hover:from-sky-200 hover:to-indigo-200 text-slate-950 text-xs font-semibold flex items-center gap-1.5 shadow transition cursor-pointer backdrop-blur-md"
            >
              <Share2 className="w-3.5 h-3.5" />
              <span>View Network</span>
            </button>
            <button
              onClick={() => onFindConnections(caseRecord.entities.persons[0] || caseRecord.firNumber)}
              className="px-3 py-1.5 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] text-slate-200 border border-white/10 text-xs font-medium flex items-center gap-1.5 transition cursor-pointer backdrop-blur-md"
            >
              <GitFork className="w-3.5 h-3.5 text-amber-200" />
              <span>Find Connections</span>
            </button>
            <button
              onClick={() => onAskAI(`Why is ${caseRecord.firNumber} connected to other cases?`)}
              className="px-3 py-1.5 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] text-slate-200 border border-white/10 text-xs font-medium flex items-center gap-1.5 transition cursor-pointer backdrop-blur-md"
            >
              <Bot className="w-3.5 h-3.5 text-emerald-300" />
              <span>Ask AI</span>
            </button>
            <button
              onClick={() => onGenerateReport(caseRecord)}
              className="px-3 py-1.5 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] text-slate-200 border border-white/10 text-xs font-medium flex items-center gap-1.5 transition cursor-pointer backdrop-blur-md"
            >
              <FileText className="w-3.5 h-3.5 text-purple-300" />
              <span>Generate Report</span>
            </button>
          </div>
        </div>

        {/* Workspace Tab Content */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {/* Incident Synopsis */}
              <div>
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider font-mono mb-2">
                  Incident Narrative & FIR Record
                </h3>
                <div className="p-4 rounded-2xl bg-white/[0.03] backdrop-blur-xl border border-white/10 text-sm text-slate-200 leading-relaxed">
                  {caseRecord.description}
                </div>
              </div>

              {/* Officer Notes */}
              {caseRecord.notes && (
                <div>
                  <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider font-mono mb-2">
                    Investigative Leads / Modus Operandi Notes
                  </h3>
                  <div className="p-3.5 rounded-2xl bg-sky-300/[0.05] border border-sky-300/20 text-xs text-sky-200 leading-relaxed font-mono backdrop-blur-md">
                    {caseRecord.notes}
                  </div>
                </div>
              )}

              {/* Detected Connections Overview */}
              <div>
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider font-mono mb-2">
                  Correlated Cases in Intelligence Grid ({connections.length})
                </h3>
                {connections.length === 0 ? (
                  <p className="text-xs text-slate-500 italic">No direct entity overlaps discovered yet.</p>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {connections.map((conn, idx) => (
                      <div key={idx} className="p-3.5 rounded-2xl bg-white/[0.03] backdrop-blur-xl border border-white/10 hover:border-sky-300/30 transition space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-mono font-bold text-sky-300">
                            {conn.target.name === caseRecord.firNumber ? conn.source.name : conn.target.name}
                          </span>
                          <span className="text-[11px] font-mono font-medium px-2 py-0.5 rounded-md bg-sky-300/10 text-sky-200 border border-sky-300/20">
                            Score: {Math.round(conn.relationshipScore * 100)}%
                          </span>
                        </div>
                        <div className="space-y-1">
                          {conn.reasons.map((r, rIdx) => (
                            <div key={rIdx} className="text-xs text-slate-300 flex items-center gap-1.5">
                              <CheckCircle2 className="w-3 h-3 text-emerald-300 shrink-0" />
                              <span>{r}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'entities' && (
            <div className="space-y-6">
              {/* Extracted Persons */}
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-amber-200 font-mono flex items-center gap-1.5 mb-2">
                  <User className="w-3.5 h-3.5" />
                  <span>Persons of Interest ({caseRecord.entities.persons.length})</span>
                </h4>
                <div className="flex flex-wrap gap-2">
                  {caseRecord.entities.persons.map((p, idx) => (
                    <div key={idx} className="px-3 py-1.5 rounded-xl bg-amber-200/10 border border-amber-200/25 text-xs text-amber-200 flex items-center gap-2 backdrop-blur-sm">
                      <span>👤 {p}</span>
                      <button
                        onClick={() => onFindConnections(p)}
                        className="text-[10px] text-sky-300 hover:underline cursor-pointer font-medium"
                      >
                        Trace ➔
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Extracted Phones */}
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-sky-300 font-mono flex items-center gap-1.5 mb-2">
                  <Phone className="w-3.5 h-3.5" />
                  <span>Communication Identifiers / Phones ({caseRecord.entities.phones.length})</span>
                </h4>
                <div className="flex flex-wrap gap-2">
                  {caseRecord.entities.phones.map((ph, idx) => (
                    <div key={idx} className="px-3 py-1.5 rounded-xl bg-sky-300/10 border border-sky-300/25 text-xs text-sky-200 font-mono flex items-center gap-2 backdrop-blur-sm">
                      <span>📞 {ph}</span>
                      <button
                        onClick={() => onFindConnections(ph)}
                        className="text-[10px] text-sky-300 hover:underline cursor-pointer font-medium"
                      >
                        Trace ➔
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Extracted Vehicles */}
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-300 font-mono flex items-center gap-1.5 mb-2">
                  <Car className="w-3.5 h-3.5" />
                  <span>Vehicles & Registration Plates ({caseRecord.entities.vehicles.length})</span>
                </h4>
                <div className="flex flex-wrap gap-2">
                  {caseRecord.entities.vehicles.map((v, idx) => (
                    <div key={idx} className="px-3 py-1.5 rounded-xl bg-emerald-300/10 border border-emerald-300/25 text-xs text-emerald-200 font-mono flex items-center gap-2 backdrop-blur-sm">
                      <span>🚗 {v}</span>
                      <button
                        onClick={() => onFindConnections(v)}
                        className="text-[10px] text-sky-300 hover:underline cursor-pointer font-medium"
                      >
                        Trace ➔
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Financial Accounts */}
              {caseRecord.entities.financials.length > 0 && (
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-yellow-200 font-mono flex items-center gap-1.5 mb-2">
                    <CreditCard className="w-3.5 h-3.5" />
                    <span>Financial Accounts / UPI IDs ({caseRecord.entities.financials.length})</span>
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {caseRecord.entities.financials.map((f, idx) => (
                      <div key={idx} className="px-3 py-1.5 rounded-xl bg-yellow-200/10 border border-yellow-200/25 text-xs text-yellow-200 font-mono backdrop-blur-sm">
                        💳 {f}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Organizations */}
              {caseRecord.entities.organizations.length > 0 && (
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-indigo-300 font-mono flex items-center gap-1.5 mb-2">
                    <Building2 className="w-3.5 h-3.5" />
                    <span>Associated Organizations ({caseRecord.entities.organizations.length})</span>
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {caseRecord.entities.organizations.map((org, idx) => (
                      <div key={idx} className="px-3 py-1.5 rounded-xl bg-indigo-300/10 border border-indigo-300/25 text-xs text-indigo-200 backdrop-blur-sm">
                        🏢 {org}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'connections' && (
            <div className="space-y-4">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider font-mono">
                Explainable Multi-Case Connections ({connections.length})
              </h3>
              {connections.map((c, idx) => (
                <div key={idx} className="p-4 rounded-2xl bg-white/[0.03] backdrop-blur-xl border border-white/10 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-mono font-bold text-sky-300">
                      {c.source.name} ↔ {c.target.name}
                    </span>
                    <span className="text-xs font-mono font-medium px-2.5 py-1 rounded-md bg-sky-300/10 text-sky-200 border border-sky-300/25">
                      Relationship Score: {Math.round(c.relationshipScore * 100)}%
                    </span>
                  </div>

                  <div className="space-y-1.5 text-xs text-slate-300">
                    {c.reasons.map((r, rIdx) => (
                      <div key={rIdx} className="flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-emerald-300 shrink-0" />
                        <span>{r}</span>
                      </div>
                    ))}
                  </div>

                  <div className="pt-2 border-t border-white/10 text-xs text-slate-400 flex items-center justify-between">
                    <span>Shared: {c.sharedEntities.map(e => `${e.name} (${e.type})`).join(', ')}</span>
                    <button
                      onClick={() => onFindConnections(c.sharedEntities[0]?.name || caseRecord.firNumber)}
                      className="text-sky-300 hover:underline font-medium cursor-pointer"
                    >
                      Explore Shared Path ➔
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {activeTab === 'evidence' && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-xs font-mono text-slate-400 uppercase">
                <Clock className="w-4 h-4 text-sky-300" />
                <span>Chronological Case Events</span>
              </div>
              <div className="space-y-3 border-l-2 border-white/10 pl-4 ml-2">
                <div className="relative space-y-1">
                  <div className="w-2.5 h-2.5 rounded-full bg-sky-300 absolute -left-[21px] top-1"></div>
                  <span className="text-xs font-mono text-sky-300 font-bold">{caseRecord.date}</span>
                  <p className="text-xs text-white font-medium">Incident Occurrence & FIR Lodged at {caseRecord.location}</p>
                  <p className="text-xs text-slate-300">{caseRecord.description}</p>
                </div>
                {connections.map((c, idx) => (
                  <div key={idx} className="relative space-y-1 pt-3">
                    <div className="w-2.5 h-2.5 rounded-full bg-amber-200 absolute -left-[21px] top-4"></div>
                    <span className="text-xs font-mono text-amber-200 font-bold">Correlated Activity</span>
                    <p className="text-xs text-slate-200">
                      Shared entity linkage with {c.target.name === caseRecord.firNumber ? c.source.name : c.target.name}
                    </p>
                    <p className="text-xs text-slate-400">{c.reasons.join(' • ')}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'ai' && (
            <div className="space-y-4">
              <div className="p-5 rounded-2xl bg-white/[0.04] backdrop-blur-2xl border border-sky-300/25 space-y-3">
                <div className="flex items-center gap-2 text-sky-200 font-bold text-xs font-mono">
                  <Sparkles className="w-4 h-4 text-sky-300" />
                  <span>Trinetra AI Intelligence Synthesis</span>
                </div>
                <div className="text-xs text-slate-300 space-y-2 leading-relaxed">
                  <p>
                    • <strong>Syndicate Association Lead:</strong> High probability of cross-jurisdictional link between {caseRecord.city} and neighboring districts based on overlapping communications and vehicle movement.
                  </p>
                  <p>
                    • <strong>Modus Operandi:</strong> Use of secondary burner SIMs and altered registration plates indicates organized logistical preparation rather than opportunistic crime.
                  </p>
                  <p>
                    • <strong>Investigative Recommendation:</strong> Cross-reference cell tower dumps for phone numbers {caseRecord.entities.phones.join(', ') || 'N/A'} at corresponding times of connected cases.
                  </p>
                </div>
              </div>

              <div className="p-3.5 rounded-2xl bg-white/[0.02] border border-white/10 text-[11px] text-slate-400">
                <strong>Legal / Ethical Note:</strong> This output represents automated relationship inference. Law enforcement personnel must independently corroborate all leads through lawful evidentiary procedures.
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-white/[0.02] border-t border-white/10 flex items-center justify-between text-xs text-slate-400 backdrop-blur-md">
          <span>FIR ID: {caseRecord.firNumber} • Assigned to {caseRecord.assignedOfficer}</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] text-slate-200 border border-white/10 transition cursor-pointer"
          >
            Close Workspace
          </button>
        </div>
      </div>
    </div>
  );
};
