import React, { useState, useMemo } from 'react';
import { 
  Search, 
  Filter, 
  Calendar, 
  MapPin, 
  GitFork, 
  ArrowUpRight, 
  Plus,
  Shield,
  Layers
} from 'lucide-react';
import { CaseRecord, ConnectionExplanation } from '../types';

interface CasesViewProps {
  cases: CaseRecord[];
  explanations?: ConnectionExplanation[];
  onOpenCase: (caseRecord: CaseRecord) => void;
  onOpenAddCase: () => void;
  onViewGraph?: (caseRecord: CaseRecord) => void;
}

export const CasesView: React.FC<CasesViewProps> = ({
  cases,
  explanations = [],
  onOpenCase,
  onOpenAddCase,
  onViewGraph
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [crimeTypeFilter, setCrimeTypeFilter] = useState('All');
  const [locationFilter, setLocationFilter] = useState('All');
  const [priorityFilter, setPriorityFilter] = useState('All');

  const crimeTypes = ['All', 'Vehicle Theft', 'Cyber Fraud / UPI', 'Extortion', 'Narcotics', 'Armed Robbery', 'Hawala / Money Laundering'];
  const locations = ['All', 'Delhi', 'Gurgaon', 'Noida', 'Faridabad', 'Ghaziabad', 'Jaipur'];
  const priorities = ['All', 'Critical', 'High', 'Medium'];

  const filteredCases = useMemo(() => {
    return cases.filter(c => {
      // Search
      if (searchTerm) {
        const s = searchTerm.toLowerCase();
        const matches = 
          c.firNumber.toLowerCase().includes(s) ||
          c.title.toLowerCase().includes(s) ||
          c.location.toLowerCase().includes(s) ||
          c.city.toLowerCase().includes(s) ||
          c.entities.persons.some(p => p.toLowerCase().includes(s)) ||
          c.entities.phones.some(p => p.includes(s)) ||
          c.entities.vehicles.some(v => v.toLowerCase().includes(s));
        if (!matches) return false;
      }

      // Crime Type
      if (crimeTypeFilter !== 'All' && c.crimeType !== crimeTypeFilter) {
        return false;
      }

      // Location
      if (locationFilter !== 'All' && !c.city.toLowerCase().includes(locationFilter.toLowerCase())) {
        return false;
      }

      // Priority
      if (priorityFilter !== 'All' && c.priority !== priorityFilter) {
        return false;
      }

      return true;
    });
  }, [cases, searchTerm, crimeTypeFilter, locationFilter, priorityFilter]);

  return (
    <div className="p-8 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-6">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-white font-mono">Incident & Case Repository</h2>
          <p className="text-sm text-slate-400 mt-1">
            Centralized index of all registered crime cases, extracted entities, and cross-jurisdiction intelligence leads.
          </p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-5 space-y-4 shadow-sm">
        <div className="flex flex-col md:flex-row gap-3">
          {/* Search Box */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by FIR number, suspect name, vehicle plate, phone number, location..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-9 pr-4 py-2.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-600 transition-colors"
            />
          </div>

          {/* Crime Type Dropdown */}
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-slate-500 shrink-0" />
            <select
              value={crimeTypeFilter}
              onChange={(e) => setCrimeTypeFilter(e.target.value)}
              className="bg-slate-900 border border-slate-800 text-xs text-slate-300 rounded-xl px-3 py-2.5 focus:outline-none focus:border-cyan-600 cursor-pointer"
            >
              {crimeTypes.map(ct => (
                <option key={ct} value={ct}>Crime: {ct}</option>
              ))}
            </select>
          </div>

          {/* Location Dropdown */}
          <select
            value={locationFilter}
            onChange={(e) => setLocationFilter(e.target.value)}
            className="bg-slate-900 border border-slate-800 text-xs text-slate-300 rounded-xl px-3 py-2.5 focus:outline-none focus:border-cyan-600 cursor-pointer"
          >
            {locations.map(loc => (
              <option key={loc} value={loc}>Location: {loc}</option>
            ))}
          </select>

          {/* Priority Dropdown */}
          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            className="bg-slate-900 border border-slate-800 text-xs text-slate-300 rounded-xl px-3 py-2.5 focus:outline-none focus:border-cyan-600 cursor-pointer"
          >
            {priorities.map(p => (
              <option key={p} value={p}>Priority: {p}</option>
            ))}
          </select>
        </div>

        <div className="flex items-center justify-between text-xs text-slate-400 font-mono pt-1">
          <span>Showing {filteredCases.length} of {cases.length} cases</span>
          {(searchTerm || crimeTypeFilter !== 'All' || locationFilter !== 'All' || priorityFilter !== 'All') && (
            <button
              onClick={() => {
                setSearchTerm('');
                setCrimeTypeFilter('All');
                setLocationFilter('All');
                setPriorityFilter('All');
              }}
              className="text-cyan-400 hover:underline cursor-pointer"
            >
              Reset Filters
            </button>
          )}
        </div>
      </div>

      {/* Cases Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredCases.map(c => {
          const caseExps = explanations.filter(exp => exp.caseIds.includes(c.id) || exp.source.name === c.firNumber || exp.target.name === c.firNumber);
          const maxMatch = caseExps.length > 0 ? Math.max(...caseExps.map(e => e.relationshipScore)) * 100 : 0;

          return (
          <div
            key={c.id}
            onClick={() => onOpenCase(c)}
            className="bg-slate-900/40 border border-slate-800 hover:border-slate-700 rounded-2xl p-5 shadow-sm transition cursor-pointer flex flex-col justify-between group"
          >
            <div className="space-y-3">
              {/* Top Row: FIR and Priority */}
              <div className="flex items-start justify-between gap-2">
                <div>
                  <span className="text-xs font-mono font-semibold text-white group-hover:text-cyan-400 transition">
                    {c.firNumber}
                  </span>
                  <div className="text-[11px] text-slate-400 font-medium mt-0.5">
                    {c.crimeType}
                  </div>
                </div>

                <span className={`text-[10px] px-2 py-0.5 rounded font-mono font-semibold border ${
                  c.priority === 'Critical' 
                    ? 'bg-rose-950/80 text-rose-300 border-rose-800/80' 
                    : 'bg-amber-950/80 text-amber-300 border-amber-800/80'
                }`}>
                  {c.priority}
                </span>
              </div>

              {/* Title */}
              <h3 className="text-sm font-semibold text-white group-hover:text-cyan-200 transition line-clamp-2">
                {c.title}
              </h3>

              {/* Description snippet */}
              <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed">
                {c.description}
              </p>

              {/* Meta Info */}
              <div className="space-y-1 text-xs text-slate-400 pt-1 border-t border-slate-800/60 font-mono">
                <div className="flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                  <span>{c.date}</span>
                </div>
                <div className="flex items-center gap-1.5 truncate">
                  <MapPin className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                  <span className="truncate">{c.location}</span>
                </div>
              </div>

              {/* Extracted Entity Badges */}
              <div className="flex flex-wrap gap-1.5 pt-2">
                {c.entities.persons.slice(0, 2).map((p, idx) => (
                  <span key={idx} className="text-[10px] px-2 py-0.5 rounded-lg bg-[#0a0a0a] text-amber-300/90 border border-slate-800">
                    👤 {p}
                  </span>
                ))}
                {c.entities.vehicles.slice(0, 2).map((v, idx) => (
                  <span key={idx} className="text-[10px] px-2 py-0.5 rounded-lg bg-[#0a0a0a] text-emerald-300/90 border border-slate-800">
                    🚗 {v}
                  </span>
                ))}
                {c.entities.phones.slice(0, 1).map((ph, idx) => (
                  <span key={idx} className="text-[10px] px-2 py-0.5 rounded-lg bg-[#0a0a0a] text-sky-300/90 border border-slate-800">
                    📞 {ph}
                  </span>
                ))}
              </div>

              {maxMatch > 0 && (
                <div className="mt-2 pt-2 border-t border-slate-800/60 flex items-center justify-between text-[11px] font-mono">
                  <span className="text-cyan-400 font-bold flex items-center gap-1">
                    <span>🔗</span>
                    <span>{Math.round(maxMatch)}% Cross-Case Match</span>
                  </span>
                  <span className="text-slate-500">{caseExps.length} link(s)</span>
                </div>
              )}
            </div>

            {/* Bottom Row */}
            <div className="flex items-center justify-between pt-4 mt-4 border-t border-slate-800/80 text-xs text-slate-400">
              <span className="text-cyan-400 font-mono flex items-center gap-1">
                <GitFork className="w-3.5 h-3.5" />
                <span>{c.detectedConnectionsCount} cross-case links</span>
              </span>
              <div className="flex items-center gap-2">
                {onViewGraph && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onViewGraph(c);
                    }}
                    className="px-2.5 py-1 rounded-lg bg-rose-400/10 hover:bg-rose-400/20 text-rose-300 border border-rose-400/25 text-[11px] font-medium transition cursor-pointer"
                  >
                    Syndicate Graph ➔
                  </button>
                )}
                <span className="text-slate-300 group-hover:text-cyan-400 flex items-center gap-0.5 font-medium transition">
                  Open Workspace ➔
                </span>
              </div>
            </div>
          </div>
          );
        })}
      </div>
    </div>
  );
};
