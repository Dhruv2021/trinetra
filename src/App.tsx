import React, { useState, useEffect, useCallback } from 'react';
import { Navbar } from './components/Navbar';
import { Sidebar, NavTab } from './components/Sidebar';
import { DashboardView } from './components/DashboardView';
import { CasesView } from './components/CasesView';
import { NetworkGraphView } from './components/NetworkGraphView';
import { HiddenConnectionView } from './components/HiddenConnectionView';
import { GeoIntelligenceView } from './components/GeoIntelligenceView';
import { DocumentsView } from './components/DocumentsView';
import { AICopilotView } from './components/AICopilotView';
import { ReportsView } from './components/ReportsView';
import { CaseWorkspaceModal } from './components/CaseWorkspaceModal';
import { AddCaseModal } from './components/AddCaseModal';
import { 
  CaseRecord, 
  GraphData, 
  ConnectionExplanation, 
  EmergingNetwork, 
  User 
} from './types';

export function App() {
  const [currentTab, setCurrentTab] = useState<NavTab>('dashboard');
  const [currentUser, setCurrentUser] = useState<User>({
    id: 'usr-1',
    name: 'Inspector Kabir Rathore',
    badgeId: 'DL-CR-4409',
    role: 'Lead Investigator',
    department: 'Delhi Police Special Cell / Crime Branch',
    rank: 'Inspector'
  });
  const [allUsers, setAllUsers] = useState<User[]>([]);

  // Core Data Stores
  const [cases, setCases] = useState<CaseRecord[]>([]);
  const [graphData, setGraphData] = useState<GraphData>({ nodes: [], edges: [] });
  const [explanations, setExplanations] = useState<ConnectionExplanation[]>([]);
  const [emergingNetworks, setEmergingNetworks] = useState<EmergingNetwork[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Modals & Navigation Contexts
  const [selectedCaseWorkspace, setSelectedCaseWorkspace] = useState<CaseRecord | null>(null);
  const [isAddCaseOpen, setIsAddCaseOpen] = useState(false);
  const [prefillEntityForConnection, setPrefillEntityForConnection] = useState<string | null>(null);
  const [prefillCopilotQuery, setPrefillCopilotQuery] = useState<string | null>(null);
  const [selectedCaseIdForGraph, setSelectedCaseIdForGraph] = useState<string | null>(null);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  // Fetch all initial data
  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [casesRes, graphRes, networksRes, usersRes] = await Promise.all([
        fetch('/api/cases'),
        fetch('/api/graph'),
        fetch('/api/emerging-networks'),
        fetch('/api/users')
      ]);

      const casesJson = await casesRes.json();
      const graphJson = await graphRes.json();
      const networksJson = await networksRes.json();
      const usersJson = await usersRes.json();

      setCases(casesJson.cases || []);
      setGraphData({ nodes: graphJson.nodes || [], edges: graphJson.edges || [] });
      setExplanations(graphJson.caseToCaseExplanations || []);
      setEmergingNetworks(networksJson.networks || []);
      if (usersJson.users) setAllUsers(usersJson.users);
      if (usersJson.currentUser) setCurrentUser(usersJson.currentUser);
    } catch (err) {
      console.error('Failed to fetch data:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Reset database handler
  const handleResetData = async () => {
    try {
      await fetch('/api/seed', { method: 'POST' });
      await fetchData();
    } catch (err) {
      console.error('Failed to reset dataset:', err);
    }
  };

  // Add new case handler
  const handleCreateCase = async (newCasePayload: Partial<CaseRecord>) => {
    const res = await fetch('/api/cases', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newCasePayload)
    });
    const data = await res.json();
    await fetchData();
    return data;
  };

  // Navigation helpers
  const handleOpenCaseWorkspace = (c: CaseRecord) => {
    setSelectedCaseWorkspace(c);
  };

  const handleViewNetworkFromCase = (c: CaseRecord) => {
    setSelectedCaseWorkspace(null);
    setSelectedCaseIdForGraph(c.id);
    setCurrentTab('network');
  };

  const handleFindConnectionsFromEntity = (entityName: string) => {
    setSelectedCaseWorkspace(null);
    setPrefillEntityForConnection(entityName);
    setCurrentTab('connections');
  };

  const handleAskAI = (query: string) => {
    setSelectedCaseWorkspace(null);
    setPrefillCopilotQuery(query);
    setCurrentTab('copilot');
  };

  const handleGenerateReport = (c: CaseRecord) => {
    setSelectedCaseWorkspace(null);
    setCurrentTab('reports');
  };

  return (
    <div className="h-screen h-[100dvh] max-h-screen bg-[#090d16] text-slate-200 flex flex-col font-sans antialiased selection:bg-sky-400/20 selection:text-sky-200 relative overflow-hidden">
      {/* Ambient Pastel Background Orbs for Glassmorphism Refraction */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute -top-40 -left-40 w-[500px] h-[500px] bg-indigo-500/10 rounded-full blur-[140px]" />
        <div className="absolute top-1/4 right-0 w-[450px] h-[450px] bg-sky-400/10 rounded-full blur-[140px]" />
        <div className="absolute -bottom-20 left-1/3 w-[550px] h-[550px] bg-rose-400/8 rounded-full blur-[160px]" />
        <div className="absolute bottom-1/3 right-1/4 w-[400px] h-[400px] bg-teal-400/8 rounded-full blur-[140px]" />
      </div>

      {/* Top Navigation Bar */}
      <div className="shrink-0 relative z-20">
        <Navbar
          currentUser={currentUser}
          onSwitchUser={setCurrentUser}
          allUsers={allUsers}
          onResetData={handleResetData}
          onOpenAddCase={() => setIsAddCaseOpen(true)}
          onToggleMobileMenu={() => setIsMobileSidebarOpen(!isMobileSidebarOpen)}
          onSearch={(q) => {
            if (q) {
              setCurrentTab('cases');
            }
          }}
        />
      </div>

      {/* Main Layout Body */}
      <div className="flex-1 flex overflow-hidden relative z-10 min-h-0 min-w-0">
        {/* Mobile Backdrop */}
        {isMobileSidebarOpen && (
          <div 
            onClick={() => setIsMobileSidebarOpen(false)}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-20 md:hidden"
          />
        )}

        {/* Persistent/Drawer Left Sidebar */}
        <Sidebar
          currentTab={currentTab}
          onSelectTab={(tab) => {
            setCurrentTab(tab);
            setIsMobileSidebarOpen(false);
          }}
          connectionsCount={explanations.length}
          emergingAlertsCount={emergingNetworks.length}
          isOpen={isMobileSidebarOpen}
        />

        {/* Dynamic View Area */}
        <main className="flex-1 overflow-y-auto min-h-0 min-w-0 bg-transparent">
          {isLoading && cases.length === 0 ? (
            <div className="h-full flex items-center justify-center">
              <div className="text-center space-y-3 glass-panel p-8 rounded-2xl">
                <div className="w-10 h-10 border-2 border-sky-300 border-t-transparent rounded-full animate-spin mx-auto"></div>
                <p className="text-xs text-slate-300 font-mono">Connecting to Trinetra Crime Intelligence Database...</p>
              </div>
            </div>
          ) : (
            <>
              {currentTab === 'dashboard' && (
                <DashboardView
                  cases={cases}
                  graphData={graphData}
                  explanations={explanations}
                  emergingNetworks={emergingNetworks}
                  onOpenCase={handleOpenCaseWorkspace}
                  onNavigateTab={setCurrentTab}
                  onSelectLead={(lead) => {
                    setPrefillEntityForConnection(lead.source.name);
                    setCurrentTab('connections');
                  }}
                />
              )}

              {currentTab === 'cases' && (
                <CasesView
                  cases={cases}
                  explanations={explanations}
                  onOpenCase={handleOpenCaseWorkspace}
                  onOpenAddCase={() => setIsAddCaseOpen(true)}
                  onViewGraph={(caseRecord) => {
                    setSelectedCaseIdForGraph(caseRecord.id);
                    setCurrentTab('network');
                  }}
                />
              )}

              {currentTab === 'network' && (
                <NetworkGraphView
                  graphData={graphData}
                  cases={cases}
                  explanations={explanations}
                  onOpenCase={handleOpenCaseWorkspace}
                  onFindConnections={handleFindConnectionsFromEntity}
                  selectedCaseId={selectedCaseIdForGraph}
                  onSelectCaseId={(id) => setSelectedCaseIdForGraph(id)}
                />
              )}

              {currentTab === 'connections' && (
                <HiddenConnectionView
                  graphData={graphData}
                  cases={cases}
                  explanations={explanations}
                  onOpenCase={handleOpenCaseWorkspace}
                  onViewNetwork={(ent) => {
                    setSelectedCaseIdForGraph(ent);
                    setCurrentTab('network');
                  }}
                  prefillEntity={prefillEntityForConnection}
                />
              )}

              {currentTab === 'geo' && (
                <GeoIntelligenceView
                  cases={cases}
                  explanations={explanations}
                  onOpenCase={handleOpenCaseWorkspace}
                />
              )}

              {currentTab === 'documents' && (
                <DocumentsView
                  onIngestCase={handleCreateCase}
                  onViewNetwork={(c) => {
                    setSelectedCaseIdForGraph(c.id);
                    setCurrentTab('network');
                  }}
                />
              )}

              {currentTab === 'copilot' && (
                <AICopilotView
                  cases={cases}
                  graphData={graphData}
                  onOpenCase={handleOpenCaseWorkspace}
                  onViewEntityInGraph={(ent) => {
                    setSelectedCaseIdForGraph(ent);
                    setCurrentTab('network');
                  }}
                  initialQuery={prefillCopilotQuery}
                />
              )}

              {currentTab === 'reports' && (
                <ReportsView
                  cases={cases}
                  officerName={currentUser.name}
                />
              )}
            </>
          )}
        </main>
      </div>

      {/* Case Workspace Modal (CASE #101 dedicated investigation workspace) */}
      {selectedCaseWorkspace && (
        <CaseWorkspaceModal
          caseRecord={selectedCaseWorkspace}
          connections={explanations.filter(e => e.caseIds.includes(selectedCaseWorkspace.id))}
          onClose={() => setSelectedCaseWorkspace(null)}
          onViewNetwork={handleViewNetworkFromCase}
          onFindConnections={handleFindConnectionsFromEntity}
          onAskAI={handleAskAI}
          onGenerateReport={handleGenerateReport}
        />
      )}

      {/* Add New Case / FIR Ingestion Modal */}
      {isAddCaseOpen && (
        <AddCaseModal
          onClose={() => setIsAddCaseOpen(false)}
          onSubmit={handleCreateCase}
          onViewNetwork={handleViewNetworkFromCase}
        />
      )}
    </div>
  );
}

export default App;
