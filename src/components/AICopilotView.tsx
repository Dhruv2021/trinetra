import React, { useState } from 'react';
import { 
  Bot, 
  Send, 
  Sparkles, 
  User, 
  CheckCircle2, 
  FolderGit2, 
  GitFork, 
  ArrowRight,
  Shield,
  Loader2
} from 'lucide-react';
import { CaseRecord, GraphData } from '../types';

interface AICopilotViewProps {
  cases: CaseRecord[];
  graphData: GraphData;
  onOpenCase: (caseRecord: CaseRecord) => void;
  onViewEntityInGraph: (entityName: string) => void;
  initialQuery?: string | null;
}

interface Message {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  groundedEntities?: { id: string; name: string; type: any }[];
  groundedCases?: string[];
  evidencePoints?: string[];
  shortestPath?: any;
  timestamp: string;
}

export const AICopilotView: React.FC<AICopilotViewProps> = ({
  cases,
  graphData,
  onOpenCase,
  onViewEntityInGraph,
  initialQuery
}) => {
  const defaultMessages: Message[] = [
    {
      id: 'msg-1',
      sender: 'assistant',
      text: `Greetings, Inspector. I am the Trinetra Crime Intelligence Copilot.\n\nI can cross-correlate graph topologies, calculate shortest paths between suspects, extract common vehicle or phone overlaps, and analyze syndicate evolution. Ask me anything or select a query below.`,
      timestamp: 'Just now'
    }
  ];

  const [messages, setMessages] = useState<Message[]>(defaultMessages);
  const [inputValue, setInputValue] = useState(initialQuery || '');
  const [isLoading, setIsLoading] = useState(false);

  const sampleQuestions = [
    'Show all cases connected to Rahul Sharma',
    'Why are Case 101 and Case 127 connected?',
    'Find people connected to phone number 9876543210',
    'Show the shortest connection between Rahul and Amit',
    'Which entities have the highest number of connections?',
    'Show cases related to Gurgaon during the last 3 months'
  ];

  const handleSendMessage = async (textToSend?: string) => {
    const query = textToSend || inputValue;
    if (!query.trim()) return;

    const userMsg: Message = {
      id: `usr-${Date.now()}`,
      sender: 'user',
      text: query,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages(prev => [...prev, userMsg]);
    if (!textToSend) setInputValue('');
    setIsLoading(true);

    try {
      const res = await fetch('/api/ai/copilot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query })
      });
      const data = await res.json();

      const aiMsg: Message = {
        id: `ai-${Date.now()}`,
        sender: 'assistant',
        text: data.answer,
        groundedEntities: data.groundedEntities,
        groundedCases: data.groundedCases,
        evidencePoints: data.evidencePoints,
        shortestPath: data.shortestPath,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };

      setMessages(prev => [...prev, aiMsg]);
    } catch (err) {
      console.error('Failed to get copilot response:', err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="p-8 max-w-5xl mx-auto h-[calc(100vh-4rem)] flex flex-col justify-between space-y-6">
      
      {/* Header */}
      <div className="border-b border-slate-800 pb-4 shrink-0">
        <div className="flex items-center gap-2.5">
          <Bot className="w-6 h-6 text-emerald-400" />
          <h2 className="text-2xl font-bold tracking-tight text-white font-mono">Trinetra AI Investigation Copilot</h2>
          <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-950 text-emerald-300 border border-emerald-800 font-mono">
            Grounding Active
          </span>
        </div>
        <p className="text-sm text-slate-400 mt-1">
          Evidence-grounded conversational assistant powered by graph traversal heuristics and Gemini decision-support.
        </p>
      </div>

      {/* Messages Stream */}
      <div className="flex-1 overflow-y-auto space-y-4 pr-2">
        {messages.map((m) => (
          <div
            key={m.id}
            className={`flex items-start gap-3 ${m.sender === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            {m.sender === 'assistant' && (
              <div className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 shrink-0">
                <Bot className="w-4 h-4" />
              </div>
            )}

            <div className={`max-w-2xl rounded-2xl p-4 text-xs leading-relaxed space-y-3 shadow-sm ${
              m.sender === 'user'
                ? 'bg-cyan-600 text-white rounded-tr-none'
                : 'bg-slate-900/40 border border-slate-800 text-slate-200 rounded-tl-none'
            }`}>
              {/* Message text formatted */}
              <div className="whitespace-pre-wrap font-sans text-xs sm:text-sm">
                {m.text}
              </div>

              {/* Grounded Entities Tags */}
              {m.groundedEntities && m.groundedEntities.length > 0 && (
                <div className="pt-2 border-t border-slate-800/80 space-y-1">
                  <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider block">
                    Grounded Entities of Interest:
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {m.groundedEntities.map((e, idx) => (
                      <button
                        key={idx}
                        onClick={() => onViewEntityInGraph(e.name)}
                        className="px-2 py-0.5 rounded-lg bg-[#0a0a0a] hover:bg-slate-900 border border-slate-800 text-cyan-400 text-[11px] font-mono flex items-center gap-1 transition cursor-pointer"
                      >
                        <span>{e.name}</span>
                        <span className="text-[9px] text-slate-500">({e.type})</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Grounded Cases */}
              {m.groundedCases && m.groundedCases.length > 0 && (
                <div className="pt-2 border-t border-slate-800/80 space-y-1">
                  <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider block">
                    Connected FIR Cases:
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {m.groundedCases.map((cId, idx) => {
                      const caseObj = cases.find(c => c.id === cId || c.firNumber.includes(cId));
                      return (
                        <button
                          key={idx}
                          onClick={() => caseObj && onOpenCase(caseObj)}
                          className="px-2 py-0.5 rounded-lg bg-[#0a0a0a] hover:bg-slate-900 border border-slate-800 text-rose-300 text-[11px] font-mono flex items-center gap-1 transition cursor-pointer"
                        >
                          <FolderGit2 className="w-3 h-3 text-rose-400" />
                          <span>{caseObj ? caseObj.firNumber : cId}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Timestamp */}
              <div className={`text-[10px] ${m.sender === 'user' ? 'text-cyan-200' : 'text-slate-500'} font-mono text-right`}>
                {m.timestamp}
              </div>
            </div>

            {m.sender === 'user' && (
              <div className="w-8 h-8 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400 shrink-0">
                <User className="w-4 h-4" />
              </div>
            )}
          </div>
        ))}

        {isLoading && (
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 shrink-0">
              <Loader2 className="w-4 h-4 animate-spin" />
            </div>
            <div className="p-3 rounded-2xl bg-slate-900/40 border border-slate-800 text-xs text-slate-400 font-mono flex items-center gap-2">
              <Sparkles className="w-3.5 h-3.5 text-cyan-400 animate-pulse" />
              <span>Synthesizing database records and graph topology...</span>
            </div>
          </div>
        )}
      </div>

      {/* Suggested Questions Pills & Input Bar */}
      <div className="space-y-3 shrink-0">
        
        {/* Quick Question Chips */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs">
          {sampleQuestions.map((q, idx) => (
            <button
              key={idx}
              onClick={() => handleSendMessage(q)}
              className="whitespace-nowrap px-3 py-1.5 rounded-xl bg-slate-900/60 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-white transition cursor-pointer text-xs font-mono"
            >
              {q}
            </button>
          ))}
        </div>

        {/* Input Bar */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSendMessage();
          }}
          className="flex items-center gap-2 bg-[#0a0a0a] border border-slate-800 rounded-2xl p-2 shadow-xl focus-within:border-cyan-600 transition-colors"
        >
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder="Ask Copilot (e.g. 'Why are Case 101 and Case 127 connected?' or 'Show shortest connection between Rahul and Amit')..."
            className="flex-1 bg-transparent px-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-none"
          />
          <button
            type="submit"
            disabled={isLoading || !inputValue.trim()}
            className="px-4 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-medium text-xs flex items-center gap-1.5 shadow-lg shadow-cyan-900/20 disabled:opacity-50 transition cursor-pointer"
          >
            <span>Ask</span>
            <Send className="w-3.5 h-3.5" />
          </button>
        </form>

        <div className="text-[11px] text-slate-400 text-center font-mono">
          Decision Support System • Outputs provide investigative leads, not legal proof of guilt.
        </div>
      </div>

    </div>
  );
};
