import React, { useState } from 'react';
import { 
  FileSpreadsheet, 
  Printer, 
  Download, 
  Shield, 
  CheckCircle2, 
  Calendar, 
  MapPin, 
  User, 
  AlertTriangle,
  FileText
} from 'lucide-react';
import { CaseRecord, InvestigationReport } from '../types';

interface ReportsViewProps {
  cases: CaseRecord[];
  officerName: string;
}

export const ReportsView: React.FC<ReportsViewProps> = ({
  cases,
  officerName
}) => {
  const [selectedCaseId, setSelectedCaseId] = useState(cases[0]?.id || 'CASE-101');
  const [report, setReport] = useState<InvestigationReport | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  const handleGenerate = async (caseIdToGen?: string) => {
    const cid = caseIdToGen || selectedCaseId;
    setIsGenerating(true);
    try {
      const res = await fetch('/api/reports/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ caseId: cid, officerName })
      });
      const data = await res.json();
      setReport(data.report);
    } catch (err) {
      console.error('Failed to generate report:', err);
    } finally {
      setIsGenerating(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-8">
      {/* Header */}
      <div className="border-b border-white/10 pb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <FileSpreadsheet className="w-6 h-6 text-purple-300" />
            <h2 className="text-2xl font-bold tracking-tight text-white font-mono">Formal Investigation Summary</h2>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-purple-300/10 text-purple-200 border border-purple-300/25 font-mono backdrop-blur-sm">
              Official Law Enforcement Artifact
            </span>
          </div>
          <p className="text-sm text-slate-300 mt-1">
            Generate evidentiary intelligence summaries with entity matrix, cross-case relationship proofs, and AI investigative recommendations.
          </p>
        </div>

        <div className="flex items-center gap-2.5 self-start sm:self-auto">
          <a
            href="/api/guide/pdf"
            download="Trinetra_User_Guide.pdf"
            target="_blank"
            rel="noopener noreferrer"
            title="Download PDF User Guide"
            className="px-3 py-2 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] text-slate-200 border border-white/10 text-xs font-medium flex items-center gap-2 transition cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 text-purple-300" />
            <span>User Guide (PDF)</span>
          </a>

          {report && (
            <button
              onClick={handlePrint}
              className="px-4 py-2 rounded-xl bg-purple-300 hover:bg-purple-200 text-slate-950 font-semibold text-xs flex items-center gap-2 transition cursor-pointer shadow-sm"
            >
              <Printer className="w-4 h-4" />
              <span>Print / Export PDF</span>
            </button>
          )}
        </div>
      </div>

      {/* Case Selector Bar */}
      <div className="p-4 rounded-2xl glass-panel flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm">
        <div className="flex items-center gap-3 flex-1">
          <span className="text-xs font-mono text-slate-300">Select Subject Case:</span>
          <select
            value={selectedCaseId}
            onChange={(e) => setSelectedCaseId(e.target.value)}
            className="glass-input text-xs text-white rounded-xl px-3 py-2.5 focus:border-sky-300/40 cursor-pointer flex-1 max-w-md"
          >
            {cases.map(c => (
              <option key={c.id} value={c.id} className="bg-slate-900 text-slate-200">
                {c.firNumber} — {c.title} ({c.city})
              </option>
            ))}
          </select>
        </div>

        <button
          onClick={() => handleGenerate()}
          disabled={isGenerating}
          className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-sky-300/90 to-indigo-300/90 hover:from-sky-200 hover:to-indigo-200 text-slate-950 font-semibold text-xs flex items-center gap-2 shadow-lg shadow-sky-500/15 transition cursor-pointer backdrop-blur-md"
        >
          <FileText className="w-4 h-4" />
          <span>{isGenerating ? 'Compiling Summary...' : 'Generate Official Summary'}</span>
        </button>
      </div>

      {/* Rendered Printable Formal Summary */}
      {report && (
        <div className="glass-panel rounded-3xl p-8 shadow-2xl space-y-8 print:bg-white print:text-black print:border-none print:p-0">
          
          {/* Government / Law Enforcement Header */}
          <div className="border-b-2 border-white/10 pb-6 text-center space-y-1">
            <div className="text-xs font-mono tracking-widest text-sky-200 uppercase font-bold">
              CRIME INTELLIGENCE & INVESTIGATION BRANCH • NCR COORDINATION CELL
            </div>
            <h1 className="text-2xl font-bold text-white font-mono tracking-wide">
              CONFIDENTIAL INVESTIGATION SUMMARY
            </h1>
            <div className="flex justify-center items-center gap-6 text-xs text-slate-400 font-mono pt-2">
              <span>Summary ID: {report.id}</span>
              <span>•</span>
              <span>Generated: {new Date(report.generatedAt).toLocaleString()}</span>
              <span>•</span>
              <span>Investigator: {report.officer} ({report.badgeId})</span>
            </div>
          </div>

          {/* Section 1: Case Overview */}
          <div className="space-y-3">
            <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-sky-300 border-b border-white/10 pb-1">
              1. Primary Incident Details
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 rounded-2xl bg-white/[0.03] backdrop-blur-xl border border-white/10 text-xs font-mono">
              <div>
                <span className="text-slate-400 block">FIR Number</span>
                <span className="text-white font-bold text-sm">{report.caseDetails.firNumber}</span>
              </div>
              <div>
                <span className="text-slate-400 block">Crime Classification</span>
                <span className="text-white font-bold">{report.caseDetails.crimeType}</span>
              </div>
              <div>
                <span className="text-slate-400 block">Date & Jurisdiction</span>
                <span className="text-white font-bold">{report.caseDetails.date} ({report.caseDetails.city})</span>
              </div>
              <div>
                <span className="text-slate-400 block">Case Priority</span>
                <span className="text-amber-200 font-bold">{report.caseDetails.priority}</span>
              </div>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed p-4 rounded-2xl bg-white/[0.03] backdrop-blur-xl border border-white/10">
              {report.caseDetails.description}
            </p>
          </div>

          {/* Section 2: Key Identified Entities */}
          <div className="space-y-3">
            <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-amber-200 border-b border-white/10 pb-1">
              2. Identified Key Entities & Identifiers
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {report.keyEntities.map((ent, idx) => (
                <div key={idx} className="p-3 rounded-2xl bg-white/[0.03] backdrop-blur-xl border border-white/10 text-xs space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-white font-mono">{ent.name}</span>
                    <span className="text-[10px] px-1.5 py-0.2 rounded-lg bg-white/[0.06] text-slate-300 border border-white/10 font-mono">
                      {ent.type}
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-400">
                    Linked to {ent.cases.length} indexed case(s) ({ent.connectionsCount} graph edges)
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Section 3: Cross-Case Detected Connections Matrix */}
          <div className="space-y-3">
            <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-rose-300 border-b border-white/10 pb-1">
              3. Cross-Case Relationship Matrix ({report.detectedConnections.length} Links)
            </h3>
            {report.detectedConnections.length === 0 ? (
              <p className="text-xs text-slate-500">No overlapping entities discovered in current repository.</p>
            ) : (
              <div className="space-y-3">
                {report.detectedConnections.map((c, idx) => (
                  <div key={idx} className="p-4 rounded-2xl bg-white/[0.03] backdrop-blur-xl border border-white/10 text-xs space-y-2">
                    <div className="flex items-center justify-between font-mono font-bold">
                      <span className="text-sky-300">{c.source.name} ↔ {c.target.name}</span>
                      <span className="text-emerald-300">Correlation Score: {Math.round(c.relationshipScore * 100)}%</span>
                    </div>
                    <div className="space-y-1">
                      {c.reasons.map((r, rIdx) => (
                        <div key={rIdx} className="flex items-center gap-2 text-slate-300">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-300 shrink-0" />
                          <span>{r}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Section 4: AI Insights & Investigative Recommendations */}
          <div className="space-y-3">
            <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-emerald-300 border-b border-white/10 pb-1">
              4. Investigative Recommendations & Strategy
            </h3>
            <div className="p-4 rounded-2xl bg-white/[0.03] backdrop-blur-xl border border-white/10 text-xs space-y-2">
              {report.recommendations.map((rec, i) => (
                <div key={i} className="flex items-start gap-2 text-slate-200">
                  <span className="text-sky-300 font-bold font-mono">[{i + 1}]</span>
                  <span>{rec}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Section 5: Mandatory Legal Disclaimer */}
          <div className="p-4 rounded-2xl bg-white/[0.02] border border-amber-200/25 text-[11px] text-slate-400 leading-relaxed space-y-1 font-mono">
            <span className="text-amber-200 font-bold block uppercase flex items-center gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-200" />
              STATUTORY INVESTIGATIVE DISCLAIMER
            </span>
            <p>{report.disclaimer}</p>
          </div>

          {/* Sign-Off Block */}
          <div className="pt-8 border-t border-white/10 flex justify-between items-end text-xs font-mono text-slate-400">
            <div>
              <div>Reporting Officer: {report.officer}</div>
              <div>Investigative Badge: {report.badgeId}</div>
              <div>System: Trinetra Crime Intelligence Platform (SIH-26189)</div>
            </div>
            <div className="text-right border-t border-white/20 pt-2 w-48">
              <span>Authorized Signature</span>
            </div>
          </div>

        </div>
      )}
    </div>
  );
};
