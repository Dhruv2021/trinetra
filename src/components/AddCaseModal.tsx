import React, { useState } from 'react';
import { 
  X, 
  Sparkles, 
  CheckCircle2, 
  AlertCircle, 
  Layers, 
  User, 
  Phone, 
  Car, 
  CreditCard, 
  Building2, 
  MapPin, 
  FileText,
  Loader2,
  Share2
} from 'lucide-react';
import { CaseRecord, ExtractedEntitiesResult } from '../types';

interface AddCaseModalProps {
  onClose: () => void;
  onSubmit: (newCase: Partial<CaseRecord>) => Promise<{ case: CaseRecord; detectedConnections: any[] }>;
  onViewNetwork: (caseRecord: CaseRecord) => void;
}

export const AddCaseModal: React.FC<AddCaseModalProps> = ({
  onClose,
  onSubmit,
  onViewNetwork
}) => {
  const [firNumber, setFirNumber] = useState(`FIR-2026/DL-${Math.floor(180 + Math.random() * 50)}`);
  const [title, setTitle] = useState('');
  const [crimeType, setCrimeType] = useState<CaseRecord['crimeType']>('Vehicle Theft');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [city, setCity] = useState('Gurgaon');
  const [location, setLocation] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<CaseRecord['priority']>('High');
  const [notes, setNotes] = useState('');

  // Extracted entities state
  const [extracted, setExtracted] = useState<ExtractedEntitiesResult | null>(null);
  const [isExtracting, setIsExtracting] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successResult, setSuccessResult] = useState<{ case: CaseRecord; detectedConnections: any[] } | null>(null);

  // Sample FIR Presets for Presentation Flow
  const sampleFirs = [
    {
      label: 'Demo Preset 1: Gurgaon Intercept (Overlaps DL01AB1234 & 9876543210)',
      data: {
        title: 'Interception of Stolen Fortuner with Altered Number Plate',
        crimeType: 'Vehicle Theft' as const,
        city: 'Gurgaon',
        location: 'Cyber Hub Exit, Sector 29, Gurgaon',
        description: 'Night surveillance team intercepted suspected luxury vehicle bearing forged plate DL01AB1234. Driver Rahul S. abandoned vehicle and fled in getaway car after receiving coordination call from burner mobile 9876543210. Recovered fake RC and UPI transaction slip addressed to rahul@upi. Linked to Apex Auto Logistics.',
        notes: 'High probability of nexus with Case 101 and Case 127 robbery grid.'
      }
    },
    {
      label: 'Demo Preset 2: Noida Cyber Phishing & SIM Farm',
      data: {
        title: 'Illegal SIM Multiplexer & UPI Laundering Cell',
        crimeType: 'Cyber Fraud / UPI' as const,
        city: 'Noida',
        location: 'Logix Technova, Sector 137, Noida',
        description: 'Joint raid uncovered 128 active burner SIMs including 9811223344 and 9876543210. Accused Vikram Singh and Suresh Yadav facilitated illegal call routing for crypto swaps. Escrow routed through amit.kumar@okhdfcbank and corporate front Apex Tech Logistics.',
        notes: 'Feeder hub for Delhi CP and Okhla phishing networks.'
      }
    }
  ];

  const handleApplyPreset = (preset: typeof sampleFirs[0]['data']) => {
    setTitle(preset.title);
    setCrimeType(preset.crimeType);
    setCity(preset.city);
    setLocation(preset.location);
    setDescription(preset.description);
    setNotes(preset.notes);
    // Auto-trigger extraction
    triggerExtraction(preset.description);
  };

  const triggerExtraction = async (text: string) => {
    if (!text || text.trim().length < 10) return;
    setIsExtracting(true);
    try {
      const res = await fetch('/api/extract-entities', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text })
      });
      const data: ExtractedEntitiesResult = await res.json();
      setExtracted(data);
    } catch (err) {
      console.error('Failed to extract entities:', err);
    } finally {
      setIsExtracting(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !description) return;

    setIsSubmitting(true);
    try {
      const payload: Partial<CaseRecord> = {
        firNumber,
        title,
        crimeType,
        date,
        city,
        location: location || `${city} NCR`,
        description,
        priority,
        notes,
        entities: extracted ? {
          persons: extracted.persons,
          phones: extracted.phones,
          vehicles: extracted.vehicles,
          locations: extracted.locations.length ? extracted.locations : [city],
          financials: extracted.financials,
          organizations: extracted.organizations
        } : undefined
      };

      const result = await onSubmit(payload);
      setSuccessResult(result);
    } catch (err) {
      console.error('Failed to create case:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
      <div className="w-full max-w-3xl max-h-[90vh] bg-[#0a0a0a] border border-slate-800 rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="p-6 border-b border-slate-800 bg-[#0d0d0d] flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-white font-mono flex items-center gap-2">
              <span>Register New Case & Run Entity Extraction</span>
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Submit FIR record. AI pipeline automatically parses entities and computes cross-case links.
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl bg-slate-900 text-slate-400 hover:text-white border border-slate-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          
          {/* Success Banner if Submitted */}
          {successResult ? (
            <div className="p-6 rounded-2xl bg-emerald-950/40 border border-emerald-500/40 space-y-4">
              <div className="flex items-center gap-2.5 text-emerald-400 font-bold text-base font-mono">
                <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                <span>Case {successResult.case.firNumber} Successfully Registered</span>
              </div>

              <div className="p-4 rounded-xl bg-[#0a0a0a] border border-slate-800 text-xs space-y-2">
                <div className="text-amber-300 font-mono font-bold flex items-center gap-2">
                  <span>⚠ {successResult.detectedConnections.length} Potential Cross-Case Connection(s) Detected!</span>
                </div>
                <div className="space-y-1 text-slate-300">
                  {successResult.detectedConnections.map((conn, idx) => (
                    <div key={idx} className="flex items-center justify-between border-b border-slate-800/60 pb-1">
                      <span>• Link with {conn.target.name === successResult.case.firNumber ? conn.source.name : conn.target.name}</span>
                      <span className="font-mono text-cyan-400 font-bold">{Math.round(conn.relationshipScore * 100)}% Match</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex items-center gap-3 pt-2">
                <button
                  onClick={() => {
                    onViewNetwork(successResult.case);
                    onClose();
                  }}
                  className="px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-semibold text-xs flex items-center gap-2 shadow-md transition cursor-pointer"
                >
                  <Share2 className="w-4 h-4" />
                  <span>Open in Network Intelligence Graph</span>
                </button>
                <button
                  onClick={onClose}
                  className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-800 text-xs font-medium transition cursor-pointer"
                >
                  Close
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              
              {/* Presets Bar */}
              <div className="p-3.5 rounded-2xl bg-slate-900/40 border border-slate-800 space-y-2">
                <span className="text-[10px] font-bold font-mono text-slate-500 uppercase tracking-widest block">
                  Demo FIR Presets (One-Click Populate):
                </span>
                <div className="flex flex-wrap gap-2">
                  {sampleFirs.map((preset, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => handleApplyPreset(preset.data)}
                      className="px-3 py-1.5 rounded-xl bg-slate-900/80 hover:bg-slate-800 hover:border-slate-700 text-slate-300 text-xs border border-slate-800 transition cursor-pointer font-mono"
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Form Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-mono text-slate-400 mb-1">Case / FIR ID</label>
                  <input
                    type="text"
                    value={firNumber}
                    onChange={(e) => setFirNumber(e.target.value)}
                    required
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white font-mono focus:border-cyan-600 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-mono text-slate-400 mb-1">Crime Type</label>
                  <select
                    value={crimeType}
                    onChange={(e) => setCrimeType(e.target.value as any)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:border-cyan-600 focus:outline-none cursor-pointer"
                  >
                    <option value="Vehicle Theft">Vehicle Theft</option>
                    <option value="Cyber Fraud / UPI">Cyber Fraud / UPI</option>
                    <option value="Extortion">Extortion</option>
                    <option value="Narcotics">Narcotics</option>
                    <option value="Armed Robbery">Armed Robbery</option>
                    <option value="Hawala / Money Laundering">Hawala / Money Laundering</option>
                    <option value="Burglary">Burglary</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-mono text-slate-400 mb-1">Incident Date</label>
                  <input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    required
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:border-cyan-600 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-mono text-slate-400 mb-1">City / Jurisdiction</label>
                  <select
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:border-cyan-600 focus:outline-none cursor-pointer"
                  >
                    <option value="Gurgaon">Gurgaon</option>
                    <option value="Delhi">Delhi</option>
                    <option value="Noida">Noida</option>
                    <option value="Faridabad">Faridabad</option>
                    <option value="Ghaziabad">Ghaziabad</option>
                    <option value="Jaipur">Jaipur</option>
                  </select>
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-mono text-slate-400 mb-1">Specific Location / Scene</label>
                  <input
                    type="text"
                    placeholder="e.g. Cyber Hub, Sector 29, Gurgaon"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:border-cyan-600 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-mono text-slate-400 mb-1">Case Title</label>
                <input
                  type="text"
                  placeholder="e.g. Armed Logistics Van Interception & Cash Transit Robbery"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:border-cyan-600 focus:outline-none"
                />
              </div>

              {/* Description + Live AI Extraction */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-mono text-slate-400">
                    Case Description & FIR Transcript
                  </label>
                  <button
                    type="button"
                    onClick={() => triggerExtraction(description)}
                    disabled={isExtracting || !description.trim()}
                    className="text-xs text-cyan-400 hover:text-cyan-300 flex items-center gap-1 font-semibold disabled:opacity-50 cursor-pointer"
                  >
                    {isExtracting ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>Extracting Entities...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>Run AI Entity Extraction</span>
                      </>
                    )}
                  </button>
                </div>

                <textarea
                  rows={4}
                  placeholder="Enter full case narrative with names, mobile numbers, vehicle registration numbers, UPI accounts, and locations..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  onBlur={() => {
                    if (!extracted && description.length > 20) {
                      triggerExtraction(description);
                    }
                  }}
                  required
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-xs text-white focus:border-cyan-500 focus:outline-none leading-relaxed"
                />
              </div>

              {/* SECTION 4 & 5: Extracted Entities Preview & Normalization Review */}
              {extracted && (
                <div className="p-4 rounded-xl bg-slate-950 border border-cyan-500/30 space-y-3 animate-in fade-in duration-150">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold font-mono text-cyan-400 flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                      Extracted Entities Preview
                    </span>
                    <span className="text-[10px] text-slate-400 font-mono">
                      Rule & AI Pipeline
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    {/* Persons */}
                    <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800 space-y-1">
                      <span className="text-[10px] font-bold font-mono uppercase text-amber-400">
                        PERSONS ({extracted.persons.length})
                      </span>
                      <div className="flex flex-wrap gap-1">
                        {extracted.persons.length > 0 ? (
                          extracted.persons.map((p, i) => (
                            <span key={i} className="px-2 py-0.5 rounded bg-amber-950/60 text-amber-300 text-[11px] border border-amber-800/60">
                              👤 {p}
                            </span>
                          ))
                        ) : (
                          <span className="text-slate-500 text-[11px]">None detected</span>
                        )}
                      </div>
                    </div>

                    {/* Phones */}
                    <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800 space-y-1">
                      <span className="text-[10px] font-bold font-mono uppercase text-sky-400">
                        PHONES ({extracted.phones.length})
                      </span>
                      <div className="flex flex-wrap gap-1">
                        {extracted.phones.length > 0 ? (
                          extracted.phones.map((ph, i) => (
                            <span key={i} className="px-2 py-0.5 rounded bg-sky-950/60 text-sky-300 text-[11px] font-mono border border-sky-800/60">
                              📞 {ph}
                            </span>
                          ))
                        ) : (
                          <span className="text-slate-500 text-[11px]">None detected</span>
                        )}
                      </div>
                    </div>

                    {/* Vehicles */}
                    <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800 space-y-1">
                      <span className="text-[10px] font-bold font-mono uppercase text-emerald-400">
                        VEHICLES ({extracted.vehicles.length})
                      </span>
                      <div className="flex flex-wrap gap-1">
                        {extracted.vehicles.length > 0 ? (
                          extracted.vehicles.map((v, i) => (
                            <span key={i} className="px-2 py-0.5 rounded bg-emerald-950/60 text-emerald-300 text-[11px] font-mono border border-emerald-800/60">
                              🚗 {v}
                            </span>
                          ))
                        ) : (
                          <span className="text-slate-500 text-[11px]">None detected</span>
                        )}
                      </div>
                    </div>

                    {/* Financials / Organizations */}
                    <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800 space-y-1">
                      <span className="text-[10px] font-bold font-mono uppercase text-purple-400">
                        FINANCIAL / ORG ({extracted.financials.length + extracted.organizations.length})
                      </span>
                      <div className="flex flex-wrap gap-1">
                        {extracted.financials.map((f, i) => (
                          <span key={i} className="px-2 py-0.5 rounded bg-yellow-950/60 text-yellow-300 text-[11px] font-mono border border-yellow-800/60">
                            💳 {f}
                          </span>
                        ))}
                        {extracted.organizations.map((o, i) => (
                          <span key={i} className="px-2 py-0.5 rounded bg-purple-950/60 text-purple-300 text-[11px] border border-purple-800/60">
                            🏢 {o}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* SECTION 5: Normalization Review "Possible duplicate / same entity detected" */}
                  {extracted.normalizationSuggestions.length > 0 && (
                    <div className="p-3 rounded-lg bg-amber-950/30 border border-amber-500/40 space-y-2">
                      <span className="text-[11px] font-bold font-mono text-amber-300 flex items-center gap-1.5">
                        <AlertCircle className="w-3.5 h-3.5 text-amber-400" />
                        Possible Duplicate / Same Entity Detected (Normalization Review):
                      </span>
                      <div className="space-y-1.5 text-xs">
                        {extracted.normalizationSuggestions.map((dup, dIdx) => (
                          <div key={dIdx} className="p-2 rounded bg-slate-950/80 border border-slate-800 flex items-center justify-between text-slate-300">
                            <div>
                              <span>"{dup.original}" matches existing entity <strong>"{dup.existingEntityName}"</strong></span>
                              <div className="text-[10px] text-slate-400 font-mono">Suggested canonical: {dup.canonical} ({Math.round(dup.confidence * 100)}% match)</div>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-[10px] px-2 py-0.5 rounded bg-amber-950 text-amber-300 border border-amber-800 font-mono">
                                Awaiting Confirmation
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                      <p className="text-[10px] text-slate-400 italic">
                        Per investigation ethics guidelines, uncertain identities are not automatically merged.
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Notes */}
              <div>
                <label className="block text-xs font-mono text-slate-400 mb-1">Officer Notes / MO Details</label>
                <input
                  type="text"
                  placeholder="e.g. Corroborated with surveillance camera footage"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:border-cyan-600 focus:outline-none"
                />
              </div>

              {/* Submit Buttons */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-800 text-xs font-medium transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || !title || !description}
                  className="px-5 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-semibold text-xs flex items-center gap-2 shadow-lg shadow-cyan-900/20 disabled:opacity-50 transition cursor-pointer"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Processing Graph & Connections...</span>
                    </>
                  ) : (
                    <span>Submit Case & Ingest Graph</span>
                  )}
                </button>
              </div>
            </form>
          )}

        </div>
      </div>
    </div>
  );
};
