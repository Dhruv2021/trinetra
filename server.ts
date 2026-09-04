import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';
import dotenv from 'dotenv';
import { INITIAL_CASES, INITIAL_EMERGING_NETWORKS, INITIAL_USERS } from './server/data';
import { buildGraphFromCases, findShortestPath, calculateCaseSimilarity, buildCaseCentricGraph } from './server/graphEngine';
import { extractEntitiesWithAI } from './server/extraction';
import { processCopilotQuery } from './server/copilot';
import { CaseRecord, EmergingNetwork, InvestigationReport } from './src/types';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;

app.use(express.json({ limit: '10mb' }));

// In-Memory Database Store (Initialized with demo dataset)
let casesStore: CaseRecord[] = JSON.parse(JSON.stringify(INITIAL_CASES));
let networksStore: EmergingNetwork[] = JSON.parse(JSON.stringify(INITIAL_EMERGING_NETWORKS));

// Helper to rebuild graph from current cases
function getGraph(dateStart?: string, dateEnd?: string) {
  return buildGraphFromCases(casesStore, { start: dateStart, end: dateEnd });
}

// ---------------- API ROUTES ----------------

// 1. Health Check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString(), totalCases: casesStore.length });
});

// 2. Users / Investigator Profiles
app.get('/api/users', (req, res) => {
  res.json({ users: INITIAL_USERS, currentUser: INITIAL_USERS[0] });
});

// 3. Cases - List with Filtering & Search
app.get('/api/cases', (req, res) => {
  const { search, crimeType, location, dateFrom, dateTo } = req.query;

  let filtered = [...casesStore];

  if (search) {
    const s = String(search).toLowerCase();
    filtered = filtered.filter(c =>
      c.firNumber.toLowerCase().includes(s) ||
      c.title.toLowerCase().includes(s) ||
      c.description.toLowerCase().includes(s) ||
      c.entities.persons.some(p => p.toLowerCase().includes(s)) ||
      c.entities.phones.some(p => p.includes(s)) ||
      c.entities.vehicles.some(v => v.toLowerCase().includes(s))
    );
  }

  if (crimeType && crimeType !== 'All') {
    filtered = filtered.filter(c => c.crimeType === crimeType);
  }

  if (location && location !== 'All') {
    filtered = filtered.filter(c => c.city.toLowerCase().includes(String(location).toLowerCase()) || c.location.toLowerCase().includes(String(location).toLowerCase()));
  }

  if (dateFrom) {
    filtered = filtered.filter(c => c.date >= String(dateFrom));
  }
  if (dateTo) {
    filtered = filtered.filter(c => c.date <= String(dateTo));
  }

  res.json({
    cases: filtered,
    total: filtered.length
  });
});

// 4. Case Details by ID
app.get('/api/cases/:id', (req, res) => {
  const c = casesStore.find(item => item.id === req.params.id || item.firNumber === req.params.id);
  if (!c) {
    return res.status(404).json({ error: 'Case not found' });
  }

  const { caseToCaseExplanations } = getGraph();
  const relatedConnections = caseToCaseExplanations.filter(exp => exp.caseIds.includes(c.id));

  res.json({
    case: c,
    connections: relatedConnections
  });
});

// 5. Add New Case (Supports AI Entity Extraction Pipeline & Auto Connection Detection)
app.post('/api/cases', async (req, res) => {
  try {
    const body = req.body;
    const caseId = body.id || `CASE-${Date.now().toString().slice(-4)}`;
    const firNumber = body.firNumber || `FIR-2026/DL-${Date.now().toString().slice(-3)}`;

    // If description provided and entities missing, auto extract
    let entities = body.entities;
    if (!entities || (!entities.persons?.length && !entities.phones?.length)) {
      const allExistingPersons = casesStore.flatMap(c => c.entities.persons);
      const extracted = await extractEntitiesWithAI(body.description || '', allExistingPersons);
      entities = {
        persons: extracted.persons,
        phones: extracted.phones,
        vehicles: extracted.vehicles,
        locations: extracted.locations.length ? extracted.locations : [body.city || 'Delhi'],
        financials: extracted.financials,
        organizations: extracted.organizations
      };
    }

    const newCase: CaseRecord = {
      id: caseId,
      firNumber,
      title: body.title || 'Investigative FIR Record',
      crimeType: body.crimeType || 'Vehicle Theft',
      date: body.date || new Date().toISOString().split('T')[0],
      location: body.location || `${body.city || 'Delhi NCR'}`,
      city: body.city || 'Delhi',
      coordinates: body.coordinates || [28.6139, 77.2090],
      description: body.description || '',
      status: body.status || 'Active',
      priority: body.priority || 'High',
      assignedOfficer: body.assignedOfficer || 'Inspector Kabir Rathore',
      entities: {
        persons: entities.persons || [],
        phones: entities.phones || [],
        vehicles: entities.vehicles || [],
        locations: entities.locations || [],
        financials: entities.financials || [],
        organizations: entities.organizations || []
      },
      detectedConnectionsCount: 0,
      notes: body.notes || ''
    };

    // Pre-insert into store
    casesStore.unshift(newCase);

    // Recalculate graph and connections
    const { caseToCaseExplanations } = getGraph();
    const newConnections = caseToCaseExplanations.filter(exp => exp.caseIds.includes(newCase.id));
    newCase.detectedConnectionsCount = newConnections.length;

    res.status(201).json({
      success: true,
      case: newCase,
      detectedConnections: newConnections,
      connectionMessage: newConnections.length > 0 
        ? `${newConnections.length} potential connection(s) detected with existing cases.` 
        : 'Case registered. No immediate overlaps detected.'
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// 6. Entity Extraction Endpoint
app.post('/api/extract-entities', async (req, res) => {
  try {
    const { text } = req.body;
    if (!text) {
      return res.status(400).json({ error: 'Text is required for entity extraction' });
    }

    const allExistingPersons = casesStore.flatMap(c => c.entities.persons);
    const extracted = await extractEntitiesWithAI(text, allExistingPersons);

    res.json(extracted);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// 7. Graph Data (Supports Root-Case Centered Local Graph or Full Global Graph)
app.get('/api/graph', (req, res) => {
  const { rootCaseId, caseId, dateStart, dateEnd, entityType } = req.query;

  // If a specific case is requested as root, generate the focused local graph
  const targetRootId = rootCaseId || caseId;
  if (targetRootId && typeof targetRootId === 'string') {
    try {
      const localGraph = buildCaseCentricGraph(targetRootId, casesStore);
      return res.json({
        rootCase: localGraph.rootCase,
        nodes: localGraph.nodes,
        edges: localGraph.edges,
        similarCases: localGraph.similarCases,
        totalNodes: localGraph.nodes.length,
        totalEdges: localGraph.edges.length,
        totalEntities: localGraph.totalEntities,
        caseToCaseExplanations: []
      });
    } catch (err: any) {
      return res.status(404).json({ error: err.message || 'Root case not found' });
    }
  }

  // Global Graph Fallback
  const graph = getGraph(
    dateStart ? String(dateStart) : undefined,
    dateEnd ? String(dateEnd) : undefined
  );

  let nodes = graph.graphData.nodes;
  let edges = graph.graphData.edges;

  if (entityType && entityType !== 'ALL') {
    const allowedType = String(entityType);
    const allowedNodeIds = new Set(nodes.filter(n => n.type === allowedType || n.type === 'CASE').map(n => n.id));
    nodes = nodes.filter(n => allowedNodeIds.has(n.id));
    edges = edges.filter(e => allowedNodeIds.has(e.source) && allowedNodeIds.has(e.target));
  }

  res.json({
    nodes,
    edges,
    totalNodes: nodes.length,
    totalEdges: edges.length,
    caseToCaseExplanations: graph.caseToCaseExplanations
  });
});

// 7b. Case Similarity Endpoint (Threshold >= 90%)
app.get('/api/cases/:id/similar', (req, res) => {
  const c = casesStore.find(item => item.id === req.params.id || item.firNumber === req.params.id);
  if (!c) {
    return res.status(404).json({ error: 'Case not found' });
  }

  const minScore = req.query.minScore ? Number(req.query.minScore) : 90;
  const matches = casesStore
    .filter(other => other.id !== c.id)
    .map(other => {
      const sim = calculateCaseSimilarity(c, other);
      return {
        case: other,
        similarityScore: sim.percentage,
        reasons: sim.reasons,
        sharedEntities: sim.sharedEntities
      };
    })
    .filter(m => m.similarityScore >= minScore)
    .sort((a, b) => b.similarityScore - a.similarityScore);

  res.json({
    targetCase: c,
    minScoreThreshold: minScore,
    totalMatches: matches.length,
    similarCases: matches
  });
});

// 8. Find Shortest Path ("Find Connection")
app.post('/api/find-connection', (req, res) => {
  const { startEntity, targetEntity } = req.body;
  if (!startEntity || !targetEntity) {
    return res.status(400).json({ error: 'Both startEntity and targetEntity are required' });
  }

  const { graphData } = getGraph();
  const pathResult = findShortestPath(startEntity, targetEntity, graphData, casesStore);
  res.json(pathResult);
});

// 9. Explain Connection between two cases or entities
app.get('/api/connection-explanation', (req, res) => {
  const { case1, case2 } = req.query;
  const { caseToCaseExplanations } = getGraph();

  if (case1 && case2) {
    const exp = caseToCaseExplanations.find(e =>
      (e.caseIds.includes(String(case1)) && e.caseIds.includes(String(case2))) ||
      (e.source.name.includes(String(case1)) && e.target.name.includes(String(case2))) ||
      (e.source.name.includes(String(case2)) && e.target.name.includes(String(case1)))
    );

    if (exp) return res.json(exp);
  }

  // Return highest score connection as lead
  const topLead = caseToCaseExplanations[0] || null;
  res.json(topLead);
});

// 10. Emerging Networks
app.get('/api/emerging-networks', (req, res) => {
  res.json({
    networks: networksStore,
    total: networksStore.length
  });
});

// 11. Network Intelligence / Ranking (Entities sorted by degree of connections)
app.get('/api/network-ranking', (req, res) => {
  const { graphData } = getGraph();
  const rankedEntities = graphData.nodes
    .filter(n => n.type !== 'CASE')
    .sort((a, b) => b.connectionsCount - a.connectionsCount)
    .map(n => ({
      id: n.id,
      name: n.name,
      type: n.type,
      connectionsCount: n.connectionsCount,
      casesCount: n.cases.length,
      cases: n.cases
    }));

  res.json({
    ranking: rankedEntities,
    total: rankedEntities.length
  });
});

// 12. AI Copilot Chat Endpoint
app.post('/api/ai/copilot', async (req, res) => {
  try {
    const { query } = req.body;
    if (!query) {
      return res.status(400).json({ error: 'Query is required' });
    }

    const { graphData, caseToCaseExplanations } = getGraph();
    const result = await processCopilotQuery(query, casesStore, graphData, caseToCaseExplanations);
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// 13. Generate Formal Investigation Report
app.post('/api/reports/generate', (req, res) => {
  const { caseId, officerName } = req.body;
  const targetCase = casesStore.find(c => c.id === caseId || c.firNumber === caseId) || casesStore[0];

  const { graphData, caseToCaseExplanations } = getGraph();
  const caseConnections = caseToCaseExplanations.filter(exp => exp.caseIds.includes(targetCase.id));

  const relevantEntities = graphData.nodes
    .filter(n => targetCase.entities.persons.includes(n.name) || targetCase.entities.vehicles.includes(n.name) || targetCase.entities.phones.includes(n.name))
    .map(n => ({
      id: n.id,
      name: n.name,
      canonicalValue: n.name,
      type: n.type,
      rawRepresentations: [n.name],
      cases: n.cases,
      connectionsCount: n.connectionsCount
    }));

  const report: InvestigationReport = {
    id: `REP-${targetCase.id}-${Date.now().toString().slice(-4)}`,
    caseId: targetCase.id,
    generatedAt: new Date().toISOString(),
    officer: officerName || 'Inspector Kabir Rathore',
    badgeId: 'DL-CR-4409',
    summary: `Trinetra Automated Investigative Dossier for ${targetCase.firNumber} (${targetCase.crimeType}). Case recorded on ${targetCase.date} at ${targetCase.location}. Intelligence network cross-correlation discovered ${caseConnections.length} correlated cross-case links.`,
    caseDetails: targetCase,
    keyEntities: relevantEntities,
    detectedConnections: caseConnections,
    timeline: [
      { date: targetCase.date, event: `FIR ${targetCase.firNumber} filed at ${targetCase.location}`, type: 'CASE_FILED' },
      ...caseConnections.map(c => ({
        date: targetCase.date,
        event: `Overlapping entity connection detected with ${c.target.name === targetCase.firNumber ? c.source.name : c.target.name} (Score: ${Math.round(c.relationshipScore * 100)}%)`,
        type: 'NETWORK_LINK'
      }))
    ],
    aiInsights: [
      `Potential syndicate convergence: Case demonstrates high entity overlap (${caseConnections.map(c => c.sharedEntities.map(e => e.name).join(', ')).filter(Boolean).join('; ')}) with active investigations in Delhi-NCR.`,
      `Geographic routing patterns indicate movement across Gurgaon-Delhi Expressway and Noida Sector 62 corridor.`,
      `Financial trail indicates immediate fund diversion through UPI proxies.`
    ],
    recommendations: [
      'Issue coordination alert between Delhi Police Special Cell and Haryana STF.',
      'Apply for CDR and tower dump correlation for phone number(s): ' + (targetCase.entities.phones.join(', ') || 'N/A'),
      'Interstate alert on registered vehicle plate: ' + (targetCase.entities.vehicles.join(', ') || 'N/A'),
      'Freeze flagged beneficiary UPI/escrow accounts pending KYC verification.'
    ],
    disclaimer: 'DISCLAIMER: This document is an investigative decision-support artifact generated by Trinetra AI. All connections, scores, and relationship paths indicate potential investigative leads for further manual corroboration by sworn law enforcement officers and do not represent judicial determination of criminal liability.'
  };

  res.json({ report });
});

// 14. Reset to Initial Seed Data
app.post('/api/seed', (req, res) => {
  casesStore = JSON.parse(JSON.stringify(INITIAL_CASES));
  networksStore = JSON.parse(JSON.stringify(INITIAL_EMERGING_NETWORKS));
  res.json({ success: true, message: 'Database reset to default fictional intelligence dataset.', totalCases: casesStore.length });
});

// 15. PDF User Guide Download
app.get('/api/guide/pdf', (req, res) => {
  const guidePath = path.join(process.cwd(), 'public', 'Trinetra_User_Guide.pdf');
  res.download(guidePath, 'Trinetra_User_Guide.pdf');
});

// ---------------- SERVER INITIALIZATION & VITE MIDDLEWARE ----------------

async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Trinetra Crime Intelligence Engine running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
