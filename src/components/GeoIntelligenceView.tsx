import React, { useEffect, useRef, useState, useMemo } from 'react';
import { 
  MapPin, 
  Layers, 
  Filter, 
  Navigation, 
  Compass, 
  FolderGit2, 
  Share2, 
  ChevronRight,
  Car
} from 'lucide-react';
import L from 'leaflet';
import { CaseRecord, ConnectionExplanation } from '../types';

interface GeoIntelligenceViewProps {
  cases: CaseRecord[];
  explanations: ConnectionExplanation[];
  onOpenCase: (caseRecord: CaseRecord) => void;
}

export const GeoIntelligenceView: React.FC<GeoIntelligenceViewProps> = ({
  cases,
  explanations,
  onOpenCase
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const layerGroupRef = useRef<L.LayerGroup | null>(null);

  const [selectedCrimeType, setSelectedCrimeType] = useState('All');
  const [selectedCity, setSelectedCity] = useState('All');
  const [showRoutes, setShowRoutes] = useState(false);
  const [isConduitsOpen, setIsConduitsOpen] = useState(false);
  const [isLegendOpen, setIsLegendOpen] = useState(true);

  // Crime type marker colors
  const crimeColors: Record<string, string> = {
    'Vehicle Theft': '#10b981', // emerald
    'Cyber Fraud / UPI': '#0ea5e9', // sky
    'Extortion': '#f59e0b', // amber
    'Narcotics': '#a855f7', // purple
    'Armed Robbery': '#f43f5e', // rose
    'Hawala / Money Laundering': '#eab308' // yellow
  };

  // Case counts by crime type
  const crimeTypeCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    cases.forEach(c => {
      counts[c.crimeType] = (counts[c.crimeType] || 0) + 1;
    });
    return counts;
  }, [cases]);

  // Available crime types (deduplicated)
  const availableCrimeTypes = useMemo(() => {
    const keys = Object.keys(crimeColors);
    const caseTypes = Array.from(new Set(cases.map(c => c.crimeType)));
    return Array.from(new Set([...keys, ...caseTypes]));
  }, [cases]);

  const filteredCases = useMemo(() => {
    return cases.filter(c => {
      if (selectedCrimeType !== 'All' && c.crimeType !== selectedCrimeType) return false;
      if (selectedCity !== 'All' && !c.city.toLowerCase().includes(selectedCity.toLowerCase())) return false;
      return true;
    });
  }, [cases, selectedCrimeType, selectedCity]);

  // Initialize Map
  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return;

    // Centered at Delhi NCR
    const map = L.map(mapContainerRef.current, {
      center: [28.5355, 77.2410],
      zoom: 11,
      zoomControl: false
    });

    L.control.zoom({ position: 'topright' }).addTo(map);

    // CartoDB Dark Matter / Dark tiles for law enforcement intelligence visual
    L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/dark_all/{z}/{x}/{y}{r}.png', {
      attribution: '&copy; OpenStreetMap contributors &copy; CARTO',
      subdomains: 'abcd',
      maxZoom: 19
    }).addTo(map);

    const layerGroup = L.layerGroup().addTo(map);
    layerGroupRef.current = layerGroup;
    mapInstanceRef.current = map;

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  // Update Markers & Routes
  useEffect(() => {
    const map = mapInstanceRef.current;
    const layerGroup = layerGroupRef.current;
    if (!map || !layerGroup) return;

    layerGroup.clearLayers();

    // 1. Draw Incident Markers
    filteredCases.forEach(c => {
      const color = crimeColors[c.crimeType] || '#06b6d4';
      
      const customIcon = L.divIcon({
        className: 'custom-crime-marker',
        html: `
          <div style="
            background: ${color};
            width: 22px;
            height: 22px;
            border-radius: 50%;
            border: 2px solid #ffffff;
            box-shadow: 0 0 12px ${color};
            display: flex;
            align-items: center;
            justify-content: center;
            color: #000;
            font-size: 9px;
            font-weight: bold;
            cursor: pointer;
          ">
            •
          </div>
        `,
        iconSize: [22, 22],
        iconAnchor: [11, 11]
      });

      const marker = L.marker(c.coordinates, { icon: customIcon });

      const popupContent = `
        <div style="font-family: monospace; padding: 4px; color: #1e293b;">
          <div style="font-weight: bold; color: #0284c7; font-size: 13px;">${c.firNumber}</div>
          <div style="font-size: 11px; font-weight: 600; color: #475569;">${c.crimeType} • ${c.city}</div>
          <div style="font-size: 12px; margin: 4px 0;">${c.title}</div>
          <div style="font-size: 10px; color: #64748b;">${c.date} | ${c.location}</div>
          <div style="margin-top: 6px; font-size: 10px; color: #d97706;">
            Suspects: ${c.entities.persons.join(', ') || 'Unidentified'}
          </div>
        </div>
      `;

      marker.bindPopup(popupContent);
      marker.on('click', () => {
        // Popups open automatically
      });

      marker.addTo(layerGroup);
    });

    // 2. Draw Cross-City Conduit Lines between connected cases
    if (showRoutes) {
      const caseMap = new Map<string, CaseRecord>(cases.map(c => [c.id, c]));
      const caseFirMap = new Map<string, CaseRecord>(cases.map(c => [c.firNumber, c]));

      explanations.forEach(exp => {
        const caseA = caseMap.get(exp.caseIds[0]) || caseFirMap.get(exp.source.name);
        const caseB = caseMap.get(exp.caseIds[1]) || caseFirMap.get(exp.target.name);

        if (caseA && caseB && caseA.id !== caseB.id) {
          if (selectedCrimeType !== 'All' && caseA.crimeType !== selectedCrimeType && caseB.crimeType !== selectedCrimeType) {
            return;
          }

          const polyline = L.polyline([caseA.coordinates, caseB.coordinates], {
            color: '#ffffff',
            weight: 1,
            opacity: 0.35
          });

          polyline.bindTooltip(`Conduit: ${caseA.firNumber} ↔ ${caseB.firNumber} (${Math.round(exp.relationshipScore * 100)}% match)`, {
            sticky: true,
            className: 'bg-slate-900 text-white text-xs border border-slate-700'
          });

          polyline.addTo(layerGroup);
        }
      });
    }

  }, [filteredCases, showRoutes, explanations, cases, selectedCrimeType]);

  // Major Corridors detected
  const crossCityCorridors = [
    { from: 'Gurgaon (Cyber Hub)', to: 'South Delhi (Vasant Kunj)', cases: 'Case 101 ↔ Case 127', factor: 'Shared Fortuner (DL01AB1234) & Burner SIM' },
    { from: 'Noida (Sector 62)', to: 'New Delhi (Connaught Place)', cases: 'Case 111 ↔ Case 117', factor: 'Laundering conduit through UPI escrow' },
    { from: 'Faridabad (NH-19)', to: 'Gurgaon Expressway', cases: 'Case 114 ↔ Case 101', factor: 'Weapon procurement & safehouse trail' }
  ];

  return (
    <div className="h-[calc(100vh-4rem)] flex flex-col bg-slate-950 select-none overflow-hidden relative">
      
      {/* Top Filter Bar */}
      <div className="h-14 bg-[#0a0a0a] border-b border-slate-800 px-6 flex items-center justify-between z-10 shrink-0">
        <div className="flex items-center gap-2">
          <MapPin className="w-4 h-4 text-cyan-400" />
          <h3 className="text-xs font-semibold text-white font-mono uppercase tracking-wider">
            NCR Geospatial Crime Grid
          </h3>
          <span className="text-[10px] px-2 py-0.5 rounded-lg bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 font-mono">
            {filteredCases.length} Incidents Mapped
          </span>
          <span className="text-[10px] px-2 py-0.5 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-mono hidden sm:inline-block">
            ✓ No API Key Required
          </span>
          {selectedCrimeType !== 'All' && (
            <span className="text-[10px] px-2 py-0.5 rounded-lg bg-cyan-500/15 text-cyan-300 border border-cyan-500/30 font-mono flex items-center gap-1.5">
              <span>Filter: {selectedCrimeType}</span>
              <button 
                onClick={() => setSelectedCrimeType('All')}
                className="hover:text-white cursor-pointer font-bold ml-0.5 text-xs"
                title="Reset to all crime types"
              >
                ×
              </button>
            </span>
          )}
        </div>

        {/* Filters */}
        <div className="flex items-center gap-3">
          <select
            value={selectedCity}
            onChange={(e) => setSelectedCity(e.target.value)}
            className="bg-slate-900 border border-slate-800 text-xs text-slate-300 rounded-xl px-2.5 py-1.5 focus:border-cyan-600 focus:outline-none cursor-pointer"
          >
            <option value="All">All Cities (NCR)</option>
            <option value="Gurgaon">Gurgaon</option>
            <option value="Delhi">Delhi</option>
            <option value="Noida">Noida</option>
            <option value="Faridabad">Faridabad</option>
          </select>

          <label className="flex items-center gap-1.5 text-xs text-slate-300 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={showRoutes}
              onChange={(e) => setShowRoutes(e.target.checked)}
              className="rounded bg-slate-900 border-slate-800 text-cyan-500 focus:ring-0"
            />
            <span className="font-mono text-[11px]">Syndicate Conduits</span>
          </label>
        </div>
      </div>

      {/* Main Map Container */}
      <div className="flex-1 relative">
        <div ref={mapContainerRef} className="w-full h-full z-0" />

        {/* Interactive Crime Type Legend Box (Click legend item to filter) */}
        <div className="absolute bottom-5 left-5 z-20 pointer-events-auto select-none">
          <div className="bg-slate-950/85 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl overflow-hidden transition-all duration-200">
            {/* Legend Header */}
            <div className="px-3.5 py-2.5 bg-white/[0.03] border-b border-white/10 flex items-center justify-between gap-3 min-w-[240px]">
              <div className="flex items-center gap-2">
                <Layers className="w-3.5 h-3.5 text-cyan-400" />
                <span className="text-xs font-mono font-semibold text-white uppercase tracking-wider">
                  Crime Legend
                </span>
              </div>
              <div className="flex items-center gap-2">
                {selectedCrimeType !== 'All' && (
                  <button
                    onClick={() => setSelectedCrimeType('All')}
                    className="text-[10px] font-mono text-cyan-400 hover:text-cyan-300 underline cursor-pointer"
                  >
                    Reset (All)
                  </button>
                )}
                <button
                  onClick={() => setIsLegendOpen(prev => !prev)}
                  className="p-1 rounded-md text-slate-400 hover:text-white hover:bg-white/10 transition cursor-pointer"
                  title={isLegendOpen ? 'Collapse Legend' : 'Expand Legend'}
                >
                  <ChevronRight className={`w-3.5 h-3.5 transition-transform duration-200 ${isLegendOpen ? 'rotate-90' : ''}`} />
                </button>
              </div>
            </div>

            {/* Legend Body */}
            {isLegendOpen && (
              <div className="p-3 space-y-1.5 font-mono text-xs max-w-[270px]">
                {/* All Crime Types */}
                <button
                  onClick={() => setSelectedCrimeType('All')}
                  className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-xl border transition cursor-pointer text-left ${
                    selectedCrimeType === 'All'
                      ? 'bg-cyan-500/15 border-cyan-400/40 text-cyan-200 font-semibold shadow-sm'
                      : 'bg-white/[0.02] hover:bg-white/[0.06] border-white/5 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-slate-200 border border-white/40 shadow-sm" />
                    <span className="text-[11px]">All Crime Types</span>
                  </div>
                  <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-white/10 text-slate-300">
                    {cases.length}
                  </span>
                </button>

                {/* Individual Crime Type Legend Items */}
                <div className="space-y-1 pt-0.5">
                  {availableCrimeTypes.map((type) => {
                    const isSelected = selectedCrimeType === type;
                    const count = crimeTypeCounts[type] || 0;
                    const color = crimeColors[type] || '#06b6d4';

                    return (
                      <button
                        key={type}
                        onClick={() => {
                          if (selectedCrimeType === type) {
                            setSelectedCrimeType('All');
                          } else {
                            setSelectedCrimeType(type);
                          }
                        }}
                        className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-xl border transition cursor-pointer text-left ${
                          isSelected
                            ? 'bg-white/15 border-white/30 text-white font-semibold ring-1 shadow-sm'
                            : selectedCrimeType !== 'All'
                            ? 'bg-white/[0.01] hover:bg-white/[0.05] border-transparent text-slate-400 opacity-50 hover:opacity-80'
                            : 'bg-white/[0.02] hover:bg-white/[0.06] border-white/5 text-slate-300'
                        }`}
                        style={isSelected ? { borderColor: color, boxShadow: `0 0 12px ${color}30` } : {}}
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <span
                            className="w-2.5 h-2.5 rounded-full shrink-0 shadow-sm"
                            style={{ backgroundColor: color }}
                          />
                          <span className="text-[11px] truncate">{type}</span>
                        </div>
                        <span
                          className="text-[10px] px-1.5 py-0.5 rounded-md font-mono shrink-0 ml-2"
                          style={
                            isSelected
                              ? { backgroundColor: `${color}25`, color }
                              : { backgroundColor: 'rgba(255,255,255,0.06)', color: '#94a3b8' }
                          }
                        >
                          {count}
                        </span>
                      </button>
                    );
                  })}
                </div>

                <div className="pt-2 border-t border-white/10 text-[9.5px] text-slate-400 leading-tight">
                  {selectedCrimeType === 'All'
                    ? 'Click any crime type to view only those incidents.'
                    : `Isolating: ${selectedCrimeType}. Click again to reset.`}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Overlay: Cross-City Conduits Trigger & Hover Panel (Strictly opens on hover) */}
        <div 
          className="absolute top-4 right-4 z-20 pointer-events-auto flex flex-col items-end"
          onMouseEnter={() => setIsConduitsOpen(true)}
          onMouseLeave={() => setIsConduitsOpen(false)}
        >
          {/* Conduit Icon Button */}
          <div
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl backdrop-blur-xl border transition-all cursor-pointer shadow-xl text-xs font-mono select-none ${
              isConduitsOpen 
                ? 'bg-slate-900/90 border-sky-300/50 text-white' 
                : 'bg-slate-900/70 hover:bg-slate-900/90 border-white/10 text-slate-300 hover:text-white'
            }`}
            title="Hover to view Cross-City Syndicate Conduits"
          >
            <Navigation className={`w-3.5 h-3.5 text-sky-300 transition-transform duration-200 ${isConduitsOpen ? 'rotate-45' : ''}`} />
            <span className="font-semibold uppercase tracking-wider text-[11px]">Conduits</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded-md bg-sky-300/15 text-sky-200 border border-sky-300/30 font-bold">
              {crossCityCorridors.length}
            </span>
          </div>

          {/* Hover Panel */}
          {isConduitsOpen && (
            <div 
              className="mt-2 w-80 bg-slate-900/90 backdrop-blur-2xl border border-white/15 rounded-2xl p-4 text-xs font-mono space-y-3 shadow-2xl animate-in fade-in zoom-in-95 duration-150"
              onMouseEnter={() => setIsConduitsOpen(true)}
              onMouseLeave={() => setIsConduitsOpen(false)}
            >
              <div className="flex items-center justify-between border-b border-white/10 pb-2">
                <span className="font-semibold text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
                  <Navigation className="w-3.5 h-3.5 text-sky-300" />
                  <span>Cross-City Conduits</span>
                </span>
                <span className="text-[10px] text-sky-300">{crossCityCorridors.length} corridors</span>
              </div>

              <div className="space-y-2">
                {crossCityCorridors.map((c, idx) => (
                  <div key={idx} className="p-2.5 rounded-xl bg-white/[0.03] border border-white/5 space-y-1">
                    <div className="text-slate-200 font-bold flex items-center justify-between text-xs">
                      <span>{c.from}</span>
                      <span className="text-sky-300">↔</span>
                      <span>{c.to}</span>
                    </div>
                    <div className="text-[11px] text-amber-200/90">{c.cases}</div>
                    <div className="text-[10px] text-slate-400">{c.factor}</div>
                  </div>
                ))}
              </div>

              <div className="pt-2 border-t border-white/10 text-[10px] text-slate-400">
                Hovering reveals active corridors. Leaves automatically on mouse out.
              </div>
            </div>
          )}
        </div>

      </div>
    </div>
  );
};
