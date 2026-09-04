import React, { useState } from 'react';
import { 
  FileText, 
  UploadCloud, 
  FileCheck, 
  Sparkles, 
  AlertCircle, 
  CheckCircle2, 
  Layers, 
  Share2, 
  Loader2,
  FileCode,
  FileSpreadsheet
} from 'lucide-react';
import { ExtractedEntitiesResult, CaseRecord } from '../types';

interface DocumentsViewProps {
  onIngestCase: (newCase: Partial<CaseRecord>) => Promise<{ case: CaseRecord; detectedConnections: any[] }>;
  onViewNetwork: (caseRecord: CaseRecord) => void;
}

export const DocumentsView: React.FC<DocumentsViewProps> = ({
  onIngestCase,
  onViewNetwork
}) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [firText, setFirText] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [extracted, setExtracted] = useState<ExtractedEntitiesResult | null>(null);
  const [ingestedResult, setIngestedResult] = useState<{ case: CaseRecord; detectedConnections: any[] } | null>(null);

  // Pre-loaded realistic sample document transcripts
  const sampleDocs = [
    {
      title: 'Sample FIR: Gurgaon Highway Intercept (PDF Transcript)',
      type: 'PDF',
      text: `FIRST INFORMATION REPORT (Under Section 154 Cr.P.C.)
Police Station: DLF Phase-2, Gurgaon
District: Gurugram, Haryana
FIR No: FIR-2026/DL-194
Date: 04/09/2026

Sub: Armed carjacking and extortion coordination via burner mobile.
Complainant states that on the night of 03/09/2026 near Golf Course Road, two unidentified males traveling in a white Fortuner DL01AB1234 intercepted complainant's vehicle. Accused named Rahul S. alias Rahul Sharma stepped out with weapon. A call was placed to mobile number 9876543210 instructing transfer of ₹2,50,000 to UPI handle rahul@upi. Co-accused Amit Kumar was heard communicating on another cellular device regarding safe passage towards Delhi border. Associated logistics vehicle marked Apex Auto Logistics was spotted escorting the convoy.`
    },
    {
      title: 'Sample FIR: Noida Cyber Swindle & Call Center Raid',
      type: 'TXT',
      text: `FIRST INFORMATION REPORT
Cyber Crime Police Station, Sector 108, Noida
FIR No: FIR-2026/DL-195
Date: 04/09/2026

On confidential intelligence, an illegal call center operating out of Logix Technova was raided. Multiple VoIP terminals and active mobile numbers were seized including 9811223344 and 9876543210. Prime conspirators Vikram Singh and Suresh Yadav facilitated international call-masking. Funds diverted to accounts managed under amit.kumar@okhdfcbank and corporate entity Apex Tech Logistics. Cash and fake vehicle documents recovered for luxury vehicle DL01AB1234.`
    }
  ];

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setSelectedFile(file);

    // Read text if txt/json/csv
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      setFirText(content || `Extracted text from document "${file.name}"...`);
    };
    reader.readAsText(file);
  };

  const handleExtract = async () => {
    if (!firText || firText.trim().length < 15) return;
    setIsProcessing(true);
    setIngestedResult(null);

    try {
      const res = await fetch('/api/extract-entities', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: firText })
      });
      const data: ExtractedEntitiesResult = await res.json();
      setExtracted(data);
    } catch (err) {
      console.error('Failed to extract document entities:', err);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCommitIngest = async () => {
    if (!extracted) return;
    setIsProcessing(true);
    try {
      const firMatch = firText.match(/FIR[\s\-#]*No[:\s]+([^\n\r]+)/i);
      const firNumber = firMatch ? firMatch[1].trim() : `FIR-2026/DL-${Math.floor(200 + Math.random() * 50)}`;

      const newCasePayload: Partial<CaseRecord> = {
        firNumber,
        title: `Document Ingest: Incident FIR ${firNumber}`,
        crimeType: extracted.vehicles.length ? 'Vehicle Theft' : 'Cyber Fraud / UPI',
        date: '2026-09-04',
        city: extracted.locations[0] || 'Delhi',
        location: extracted.locations.join(', ') || 'Delhi NCR',
        description: firText,
        priority: 'High',
        entities: {
          persons: extracted.persons,
          phones: extracted.phones,
          vehicles: extracted.vehicles,
          locations: extracted.locations,
          financials: extracted.financials,
          organizations: extracted.organizations
        }
      };

      const result = await onIngestCase(newCasePayload);
      setIngestedResult(result);
    } catch (err) {
      console.error('Failed to commit ingest:', err);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="p-8 space-y-8 max-w-5xl mx-auto">
      {/* Header */}
      <div className="border-b border-slate-800 pb-6">
        <div className="flex items-center gap-2.5">
          <FileText className="w-6 h-6 text-cyan-400" />
          <h2 className="text-2xl font-bold tracking-tight text-white font-mono">Document Ingestion & Text Parsing</h2>
          <span className="text-xs px-2.5 py-0.5 rounded-full bg-cyan-950 text-cyan-400 border border-cyan-800 font-mono">
            AI Ingestion Pipeline
          </span>
        </div>
        <p className="text-sm text-slate-400 mt-1">
          Upload unstructured FIR transcripts, police panchnama memos, or seized phone extraction sheets to automatically parse entities and update the intelligence network.
        </p>
      </div>

      {/* Upload Zone & Quick Transcripts */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Upload Box */}
        <div className="md:col-span-1 space-y-4">
          <div className="p-6 rounded-2xl bg-slate-900/40 border-2 border-dashed border-slate-800 hover:border-slate-700 transition text-center cursor-pointer relative group">
            <input
              type="file"
              accept=".pdf,.txt,.csv,.doc,.docx"
              onChange={handleFileUpload}
              className="absolute inset-0 opacity-0 cursor-pointer"
            />
            <UploadCloud className="w-10 h-10 text-cyan-400 mx-auto mb-3 group-hover:scale-105 transition" />
            <span className="text-xs font-semibold text-white block">Upload FIR or Evidence File</span>
            <span className="text-[11px] text-slate-400 mt-1 block">Supports PDF, TXT, CSV, Word</span>
            {selectedFile && (
              <div className="mt-3 px-2 py-1 rounded-lg bg-cyan-500/10 border border-cyan-500/20 text-[11px] text-cyan-300 font-mono truncate">
                {selectedFile.name}
              </div>
            )}
          </div>

          {/* Quick Presets */}
          <div className="p-4 rounded-2xl bg-slate-900/40 border border-slate-800 space-y-2">
            <span className="text-[10px] font-mono font-bold text-slate-500 uppercase tracking-widest block">
              Load Sample Police Documents:
            </span>
            {sampleDocs.map((doc, idx) => (
              <button
                key={idx}
                onClick={() => {
                  setFirText(doc.text);
                  setSelectedFile(null);
                  setExtracted(null);
                  setIngestedResult(null);
                }}
                className="w-full text-left p-2.5 rounded-xl bg-[#0a0a0a] hover:bg-slate-900 border border-slate-800 transition text-xs text-slate-300 space-y-0.5 cursor-pointer"
              >
                <div className="font-semibold text-white font-mono truncate">{doc.title}</div>
                <div className="text-[10px] text-cyan-400">Format: {doc.type} transcript</div>
              </button>
            ))}
          </div>
        </div>

        {/* Text Transcript & Action */}
        <div className="md:col-span-2 space-y-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-mono text-slate-400 uppercase tracking-wider">
                Document Transcript / Raw Case Text
              </label>
              <button
                onClick={handleExtract}
                disabled={isProcessing || !firText.trim()}
                className="px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold flex items-center gap-1.5 shadow-lg shadow-cyan-900/20 disabled:opacity-50 transition cursor-pointer"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Parsing Document...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Execute Entity Extraction</span>
                  </>
                )}
              </button>
            </div>

            <textarea
              rows={11}
              value={firText}
              onChange={(e) => setFirText(e.target.value)}
              placeholder="Paste FIR transcript, panchnama report, or OCR document text here..."
              className="w-full bg-slate-900 border border-slate-800 rounded-2xl p-4 text-xs text-slate-200 font-mono focus:border-cyan-600 focus:outline-none leading-relaxed"
            />
          </div>
        </div>
      </div>

      {/* Extracted Pipeline Results */}
      {extracted && (
        <div className="p-6 rounded-2xl bg-slate-900/40 border border-slate-800 shadow-xl space-y-6 animate-in fade-in duration-200">
          <div className="flex items-center justify-between border-b border-slate-800 pb-4">
            <div>
              <span className="text-xs font-mono font-bold text-cyan-400 px-2 py-0.5 rounded-lg bg-cyan-500/10 border border-cyan-500/20">
                PIPELINE SYNTHESIS COMPLETE
              </span>
              <h3 className="text-lg font-semibold text-white mt-1 font-mono">
                Identified Entities & Relationship Candidates
              </h3>
            </div>

            <button
              onClick={handleCommitIngest}
              disabled={isProcessing}
              className="px-5 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold flex items-center gap-2 shadow-lg shadow-cyan-900/20 transition cursor-pointer"
            >
              <FileCheck className="w-4 h-4" />
              <span>Commit & Ingest into Intelligence Graph</span>
            </button>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs font-mono">
            <div className="p-3 rounded-xl bg-[#0a0a0a] border border-slate-800 space-y-1">
              <span className="text-amber-400 font-bold block uppercase text-[10px]">Persons ({extracted.persons.length})</span>
              {extracted.persons.map((p, i) => (
                <div key={i} className="text-slate-200 truncate">👤 {p}</div>
              ))}
            </div>

            <div className="p-3 rounded-xl bg-[#0a0a0a] border border-slate-800 space-y-1">
              <span className="text-sky-400 font-bold block uppercase text-[10px]">Phones ({extracted.phones.length})</span>
              {extracted.phones.map((ph, i) => (
                <div key={i} className="text-slate-200 truncate">📞 {ph}</div>
              ))}
            </div>

            <div className="p-3 rounded-xl bg-[#0a0a0a] border border-slate-800 space-y-1">
              <span className="text-emerald-400 font-bold block uppercase text-[10px]">Vehicles ({extracted.vehicles.length})</span>
              {extracted.vehicles.map((v, i) => (
                <div key={i} className="text-slate-200 truncate">🚗 {v}</div>
              ))}
            </div>

            <div className="p-3 rounded-xl bg-[#0a0a0a] border border-slate-800 space-y-1">
              <span className="text-purple-400 font-bold block uppercase text-[10px]">Locations & Financial</span>
              {[...extracted.locations, ...extracted.financials, ...extracted.organizations].map((item, i) => (
                <div key={i} className="text-slate-200 truncate">• {item}</div>
              ))}
            </div>
          </div>

          {/* Ingest Result Flash Notification */}
          {ingestedResult && (
            <div className="p-4 rounded-xl bg-emerald-950/40 border border-emerald-500/40 space-y-3">
              <div className="flex items-center gap-2 text-emerald-400 font-bold text-xs font-mono">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>Document successfully ingested as {ingestedResult.case.firNumber}!</span>
              </div>
              <p className="text-xs text-slate-300">
                Found <strong>{ingestedResult.detectedConnections.length}</strong> instant cross-case connections with existing network incidents.
              </p>
              <button
                onClick={() => onViewNetwork(ingestedResult.case)}
                className="px-3.5 py-1.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-semibold text-xs flex items-center gap-1.5 transition cursor-pointer"
              >
                <Share2 className="w-3.5 h-3.5" />
                <span>View in Graph</span>
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
