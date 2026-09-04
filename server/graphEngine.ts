import { 
  CaseRecord, 
  EntityRecord, 
  RelationshipRecord, 
  GraphData, 
  GraphNode, 
  GraphEdge, 
  ShortestPathResult, 
  ConnectionExplanation,
  EntityType,
  CaseSimilarityMatch,
  CaseCentricGraphResult
} from '../src/types';

// Builds comprehensive graph and relationships from cases and entities
export function buildGraphFromCases(
  cases: CaseRecord[],
  dateRange?: { start?: string; end?: string }
): {
  entities: EntityRecord[];
  relationships: RelationshipRecord[];
  graphData: GraphData;
  caseToCaseExplanations: ConnectionExplanation[];
} {
  // Filter cases by date range if provided
  let filteredCases = cases;
  if (dateRange?.start || dateRange?.end) {
    filteredCases = cases.filter(c => {
      if (dateRange.start && c.date < dateRange.start) return false;
      if (dateRange.end && c.date > dateRange.end) return false;
      return true;
    });
  }

  const entityMap = new Map<string, EntityRecord>();
  const relationships: RelationshipRecord[] = [];
  const edgeSet = new Set<string>();

  function getOrCreateEntity(name: string, type: EntityType, caseId: string): EntityRecord {
    const key = `${type}:${name}`;
    if (!entityMap.has(key)) {
      entityMap.set(key, {
        id: `ENT-${type.substring(0, 3)}-${Buffer.from(name).toString('hex').slice(0, 8)}`,
        name,
        canonicalValue: name,
        type,
        rawRepresentations: [name],
        cases: [caseId],
        connectionsCount: 0
      });
    } else {
      const ent = entityMap.get(key)!;
      if (!ent.cases.includes(caseId)) {
        ent.cases.push(caseId);
      }
    }
    return entityMap.get(key)!;
  }

  function addRel(
    sourceId: string,
    sourceName: string,
    sourceType: EntityType,
    targetId: string,
    targetName: string,
    targetType: EntityType,
    relType: string,
    caseId: string,
    timestamp: string,
    confidence: number,
    evidenceItem: string
  ) {
    // Unique key to prevent duplicates
    const key = [sourceId, targetId, relType].sort().join('::');
    if (edgeSet.has(key)) {
      // Find and update existing relationship
      const existing = relationships.find(r => 
        (r.sourceId === sourceId && r.targetId === targetId && r.relationshipType === relType) ||
        (r.sourceId === targetId && r.targetId === sourceId && r.relationshipType === relType)
      );
      if (existing) {
        if (!existing.sourceCaseIds.includes(caseId)) existing.sourceCaseIds.push(caseId);
        if (!existing.evidence.includes(evidenceItem)) existing.evidence.push(evidenceItem);
      }
      return;
    }

    edgeSet.add(key);
    relationships.push({
      id: `REL-${relationships.length + 1}`,
      sourceId,
      sourceName,
      sourceType,
      targetId,
      targetName,
      targetType,
      relationshipType: relType,
      sourceCaseIds: [caseId],
      timestamp,
      confidence,
      evidence: [evidenceItem]
    });
  }

  // 1. Process each case and create direct Case -> Entity & Person -> Attributes links
  for (const c of filteredCases) {
    const caseEntityId = `CASE-NODE-${c.id}`;
    if (!entityMap.has(`CASE:${c.firNumber}`)) {
      entityMap.set(`CASE:${c.firNumber}`, {
        id: caseEntityId,
        name: c.firNumber,
        canonicalValue: c.firNumber,
        type: 'CASE',
        rawRepresentations: [c.firNumber, c.title],
        cases: [c.id],
        connectionsCount: 0,
        metadata: { title: c.title, crimeType: c.crimeType, date: c.date, location: c.location }
      });
    }

    // Connect Case to Persons
    for (const p of c.entities.persons) {
      const personEnt = getOrCreateEntity(p, 'PERSON', c.id);
      addRel(
        caseEntityId,
        c.firNumber,
        'CASE',
        personEnt.id,
        p,
        'PERSON',
        'INVOLVED_IN_CASE',
        c.id,
        c.date,
        0.95,
        `Named in FIR ${c.firNumber} as suspect or key associate`
      );

      // Person to Phones
      for (const phone of c.entities.phones) {
        const phoneEnt = getOrCreateEntity(phone, 'PHONE', c.id);
        addRel(
          personEnt.id,
          p,
          'PERSON',
          phoneEnt.id,
          phone,
          'PHONE',
          'COMMUNICATED_VIA',
          c.id,
          c.date,
          0.85,
          `Active communication trace using ${phone} recorded in Case ${c.firNumber}`
        );
      }

      // Person to Vehicles
      for (const veh of c.entities.vehicles) {
        const vehEnt = getOrCreateEntity(veh, 'VEHICLE', c.id);
        addRel(
          personEnt.id,
          p,
          'PERSON',
          vehEnt.id,
          veh,
          'VEHICLE',
          'ASSOCIATED_VEHICLE',
          c.id,
          c.date,
          0.90,
          `Observed operating vehicle ${veh} in FIR ${c.firNumber}`
        );
      }

      // Person to Financials
      for (const fin of c.entities.financials) {
        const finEnt = getOrCreateEntity(fin, 'FINANCIAL', c.id);
        addRel(
          personEnt.id,
          p,
          'PERSON',
          finEnt.id,
          fin,
          'FINANCIAL',
          'TRANSACTED_VIA',
          c.id,
          c.date,
          0.92,
          `Financial proceeds linked to account ${fin} in FIR ${c.firNumber}`
        );
      }
    }

    // Case to Vehicles
    for (const veh of c.entities.vehicles) {
      const vehEnt = getOrCreateEntity(veh, 'VEHICLE', c.id);
      addRel(
        caseEntityId,
        c.firNumber,
        'CASE',
        vehEnt.id,
        veh,
        'VEHICLE',
        'GETAWAY_VEHICLE',
        c.id,
        c.date,
        0.95,
        `Vehicle ${veh} impounded or tracked at crime scene in ${c.firNumber}`
      );
    }

    // Case to Phones
    for (const ph of c.entities.phones) {
      const phEnt = getOrCreateEntity(ph, 'PHONE', c.id);
      addRel(
        caseEntityId,
        c.firNumber,
        'CASE',
        phEnt.id,
        ph,
        'PHONE',
        'CDR_PING',
        c.id,
        c.date,
        0.90,
        `Tower dump ping and call records for ${ph} during incident in ${c.firNumber}`
      );
    }

    // Case to Locations
    for (const loc of c.entities.locations) {
      const locEnt = getOrCreateEntity(loc, 'LOCATION', c.id);
      addRel(
        caseEntityId,
        c.firNumber,
        'CASE',
        locEnt.id,
        loc,
        'LOCATION',
        'CRIME_SCENE',
        c.id,
        c.date,
        0.98,
        `Jurisdiction and physical scene recorded at ${loc}`
      );
    }

    // Case to Organizations
    for (const org of c.entities.organizations) {
      const orgEnt = getOrCreateEntity(org, 'ORGANIZATION', c.id);
      addRel(
        caseEntityId,
        c.firNumber,
        'CASE',
        orgEnt.id,
        org,
        'ORGANIZATION',
        'CORPORATE_FRONT',
        c.id,
        c.date,
        0.80,
        `Entity used for commercial masking: ${org}`
      );
    }
  }

  // 2. Identify Inter-Case Connections & Explainable Links
  const caseToCaseExplanations: ConnectionExplanation[] = [];
  for (let i = 0; i < filteredCases.length; i++) {
    for (let j = i + 1; j < filteredCases.length; j++) {
      const caseA = filteredCases[i];
      const caseB = filteredCases[j];

      // Find shared entities
      const sharedPhones = caseA.entities.phones.filter(p => caseB.entities.phones.includes(p));
      const sharedVehicles = caseA.entities.vehicles.filter(v => caseB.entities.vehicles.includes(v));
      const sharedPersons = caseA.entities.persons.filter(p => caseB.entities.persons.includes(p));
      const sharedLocations = caseA.entities.locations.filter(l => caseB.entities.locations.includes(l));
      const sharedFinancials = caseA.entities.financials.filter(f => caseB.entities.financials.includes(f));

      const sharedEntities: { name: string; type: EntityType }[] = [
        ...sharedPhones.map(n => ({ name: n, type: 'PHONE' as EntityType })),
        ...sharedVehicles.map(n => ({ name: n, type: 'VEHICLE' as EntityType })),
        ...sharedPersons.map(n => ({ name: n, type: 'PERSON' as EntityType })),
        ...sharedLocations.map(n => ({ name: n, type: 'LOCATION' as EntityType })),
        ...sharedFinancials.map(n => ({ name: n, type: 'FINANCIAL' as EntityType }))
      ];

      if (sharedEntities.length > 0) {
        // Calculate temporal distance
        const dateA = new Date(caseA.date).getTime();
        const dateB = new Date(caseB.date).getTime();
        const diffDays = Math.round(Math.abs(dateA - dateB) / (1000 * 60 * 60 * 24));

        let score = 0.35; // base connection
        const reasons: string[] = [];

        if (sharedPhones.length > 0) {
          score += 0.25;
          reasons.push(`Shared mobile/burner phone number (${sharedPhones.join(', ')})`);
        }
        if (sharedVehicles.length > 0) {
          score += 0.20;
          reasons.push(`Identical vehicle registration plate (${sharedVehicles.join(', ')})`);
        }
        if (sharedPersons.length > 0) {
          score += 0.20;
          reasons.push(`Common person of investigative interest (${sharedPersons.join(', ')})`);
        }
        if (sharedFinancials.length > 0) {
          score += 0.15;
          reasons.push(`Shared UPI / bank escrow account (${sharedFinancials.join(', ')})`);
        }
        if (sharedLocations.length > 0) {
          score += 0.10;
          reasons.push(`Overlapping operational corridor (${sharedLocations.join(', ')})`);
        }
        if (diffDays <= 14) {
          score += 0.10;
          reasons.push(`High temporal proximity: cases occurred within ${diffDays} days`);
        } else if (diffDays <= 30) {
          score += 0.05;
          reasons.push(`Temporal sequence: cases occurred within ${diffDays} days`);
        }

        const normalizedScore = Math.min(0.96, Math.round(score * 100) / 100);

        caseToCaseExplanations.push({
          source: { id: caseA.id, name: caseA.firNumber, type: 'CASE' },
          target: { id: caseB.id, name: caseB.firNumber, type: 'CASE' },
          relationshipScore: normalizedScore,
          reasons,
          sharedEntities,
          timelineProximityDays: diffDays,
          caseIds: [caseA.id, caseB.id]
        });

        // Add direct cross-case edge to graph
        const caseAEnt = entityMap.get(`CASE:${caseA.firNumber}`);
        const caseBEnt = entityMap.get(`CASE:${caseB.firNumber}`);
        if (caseAEnt && caseBEnt) {
          addRel(
            caseAEnt.id,
            caseA.firNumber,
            'CASE',
            caseBEnt.id,
            caseB.firNumber,
            'CASE',
            'CROSS_CASE_LINK',
            caseA.id,
            caseB.date,
            normalizedScore,
            reasons.join('; ')
          );
        }
      }
    }
  }

  // Update entity connection counts
  for (const rel of relationships) {
    const src = [...entityMap.values()].find(e => e.id === rel.sourceId);
    if (src) src.connectionsCount++;
    const tgt = [...entityMap.values()].find(e => e.id === rel.targetId);
    if (tgt) tgt.connectionsCount++;
  }

  const allEntities = Array.from(entityMap.values());

  // Build GraphNode and GraphEdge collections
  const nodes: GraphNode[] = allEntities.map(ent => ({
    id: ent.id,
    name: ent.name,
    type: ent.type,
    label: ent.name,
    connectionsCount: ent.connectionsCount,
    cases: ent.cases
  }));

  const edges: GraphEdge[] = relationships.map(rel => ({
    id: rel.id,
    source: rel.sourceId,
    target: rel.targetId,
    type: rel.relationshipType,
    confidence: rel.confidence,
    evidence: rel.evidence,
    cases: rel.sourceCaseIds
  }));

  return {
    entities: allEntities,
    relationships,
    graphData: { nodes, edges },
    caseToCaseExplanations
  };
}

// Shortest Path Finder via Breadth-First Search (BFS)
export function findShortestPath(
  startIdentifier: string,
  targetIdentifier: string,
  graphData: GraphData,
  allCases: CaseRecord[]
): ShortestPathResult {
  const normStart = startIdentifier.trim().toLowerCase();
  const normTarget = targetIdentifier.trim().toLowerCase();

  // Find start and target nodes by ID or Name
  const startNode = graphData.nodes.find(n => 
    n.id.toLowerCase() === normStart || 
    n.name.toLowerCase() === normStart || 
    n.label.toLowerCase() === normStart
  );

  const targetNode = graphData.nodes.find(n => 
    n.id.toLowerCase() === normTarget || 
    n.name.toLowerCase() === normTarget || 
    n.label.toLowerCase() === normTarget
  );

  if (!startNode || !targetNode) {
    return {
      found: false,
      startEntity: { id: '', name: startIdentifier, type: 'PERSON' },
      targetEntity: { id: '', name: targetIdentifier, type: 'PERSON' },
      hops: 0,
      pathNodes: [],
      pathEdges: [],
      connectedCases: [],
      evidenceSummary: ['One or both entities not found in the intelligence graph.']
    };
  }

  if (startNode.id === targetNode.id) {
    return {
      found: true,
      startEntity: { id: startNode.id, name: startNode.name, type: startNode.type },
      targetEntity: { id: targetNode.id, name: targetNode.name, type: targetNode.type },
      hops: 0,
      pathNodes: [startNode],
      pathEdges: [],
      connectedCases: allCases.filter(c => startNode.cases.includes(c.id)),
      evidenceSummary: ['Identical entity selected.']
    };
  }

  // Build Adjacency List
  const adj = new Map<string, { neighborId: string; edge: GraphEdge }[]>();
  for (const n of graphData.nodes) {
    adj.set(n.id, []);
  }

  for (const e of graphData.edges) {
    adj.get(e.source)?.push({ neighborId: e.target, edge: e });
    adj.get(e.target)?.push({ neighborId: e.source, edge: e });
  }

  // Standard BFS queue
  const queue: string[] = [startNode.id];
  const visited = new Set<string>([startNode.id]);
  const parentMap = new Map<string, { parentId: string; edge: GraphEdge }>();

  let found = false;
  while (queue.length > 0) {
    const currentId = queue.shift()!;
    if (currentId === targetNode.id) {
      found = true;
      break;
    }

    const neighbors = adj.get(currentId) || [];
    for (const { neighborId, edge } of neighbors) {
      if (!visited.has(neighborId)) {
        visited.add(neighborId);
        parentMap.set(neighborId, { parentId: currentId, edge });
        queue.push(neighborId);
      }
    }
  }

  if (!found) {
    return {
      found: false,
      startEntity: { id: startNode.id, name: startNode.name, type: startNode.type },
      targetEntity: { id: targetNode.id, name: targetNode.name, type: targetNode.type },
      hops: 0,
      pathNodes: [],
      pathEdges: [],
      connectedCases: [],
      evidenceSummary: [`No direct or indirect connection found between ${startNode.name} and ${targetNode.name}.`]
    };
  }

  // Reconstruct path
  const pathNodes: GraphNode[] = [];
  const pathEdges: GraphEdge[] = [];
  let curr = targetNode.id;

  while (curr !== startNode.id) {
    const step = parentMap.get(curr)!;
    const nodeObj = graphData.nodes.find(n => n.id === curr)!;
    pathNodes.unshift(nodeObj);
    pathEdges.unshift(step.edge);
    curr = step.parentId;
  }
  pathNodes.unshift(startNode);

  const involvedCaseIds = new Set<string>();
  for (const node of pathNodes) {
    for (const c of node.cases) involvedCaseIds.add(c);
  }
  for (const edge of pathEdges) {
    for (const c of edge.cases) involvedCaseIds.add(c);
  }

  const connectedCases = allCases.filter(c => involvedCaseIds.has(c.id));

  // Build natural language evidence steps
  const evidenceSummary: string[] = [];
  for (let i = 0; i < pathEdges.length; i++) {
    const fromNode = pathNodes[i];
    const toNode = pathNodes[i + 1];
    const edge = pathEdges[i];
    const evidenceText = edge.evidence.length > 0 ? edge.evidence[0] : `${edge.type} association`;
    evidenceSummary.push(
      `Step ${i + 1}: [${fromNode.type}] ${fromNode.name} ➔ [${toNode.type}] ${toNode.name} (${evidenceText})`
    );
  }

  return {
    found: true,
    startEntity: { id: startNode.id, name: startNode.name, type: startNode.type },
    targetEntity: { id: targetNode.id, name: targetNode.name, type: targetNode.type },
    hops: pathEdges.length,
    pathNodes,
    pathEdges,
    connectedCases,
    evidenceSummary
  };
}

// ---------------- CASE SIMILARITY ENGINE ----------------

/**
 * Calculates multi-dimensional similarity between two cases.
 * Compares meaningful attributes:
 * - Shared suspects & known aliases
 * - Shared vehicles & cloned license plates
 * - Shared phone numbers & CDR traces
 * - Shared financial / UPI accounts
 * - Shared organizations & shell fronts
 * - Common crime type & MO keywords
 * - Geographic proximity & operational corridor
 * - Temporal proximity
 */
export function calculateCaseSimilarity(
  caseA: CaseRecord,
  caseB: CaseRecord
): {
  similarityScore: number; // 0.00 to 1.00
  percentage: number; // 0 to 100
  reasons: string[];
  sharedEntities: { name: string; type: EntityType }[];
} {
  if (caseA.id === caseB.id) {
    return {
      similarityScore: 1.0,
      percentage: 100,
      reasons: ['Identical case record'],
      sharedEntities: []
    };
  }

  const reasons: string[] = [];
  const sharedEntities: { name: string; type: EntityType }[] = [];
  let rawScore = 0;

  // 1. Shared Suspects / Persons (strongest signal)
  const normPersonsB = caseB.entities.persons.map(p => p.trim().toLowerCase());
  const matchedPersons: string[] = [];
  for (const pA of caseA.entities.persons) {
    const pALow = pA.trim().toLowerCase();
    const hasMatch = normPersonsB.some(pBLow => {
      if (pALow === pBLow) return true;
      // Correlate names like "Rahul Sharma" vs "Rahul S." or "Rahul Kumar Sharma"
      const wordsA = pALow.split(/\s+/);
      const wordsB = pBLow.split(/\s+/);
      if (wordsA.length >= 2 && wordsB.length >= 2) {
        if (wordsA[0] === wordsB[0] && wordsA[wordsA.length - 1] === wordsB[wordsB.length - 1]) return true;
      }
      return false;
    });
    if (hasMatch && !matchedPersons.includes(pA)) {
      matchedPersons.push(pA);
      sharedEntities.push({ name: pA, type: 'PERSON' });
    }
  }

  if (matchedPersons.length > 0) {
    rawScore += matchedPersons.length > 1 ? 0.35 : 0.28;
    reasons.push(`Shared person/suspect of interest: ${matchedPersons.join(', ')}`);
  }

  // 2. Shared Vehicles / Plates
  const matchedVehicles: string[] = [];
  for (const vA of caseA.entities.vehicles) {
    const vAClean = vA.replace(/\s+/g, '').toLowerCase();
    const hasMatch = caseB.entities.vehicles.some(vB => vB.replace(/\s+/g, '').toLowerCase() === vAClean);
    if (hasMatch && !matchedVehicles.includes(vA)) {
      matchedVehicles.push(vA);
      sharedEntities.push({ name: vA, type: 'VEHICLE' });
    }
  }

  if (matchedVehicles.length > 0) {
    rawScore += matchedVehicles.length > 1 ? 0.32 : 0.25;
    reasons.push(`Identical vehicle registration: ${matchedVehicles.join(', ')}`);
  }

  // 3. Shared Burner Phones / Telecoms
  const matchedPhones: string[] = [];
  for (const phA of caseA.entities.phones) {
    const digitsA = phA.replace(/\D/g, '').slice(-10);
    const hasMatch = caseB.entities.phones.some(phB => phB.replace(/\D/g, '').slice(-10) === digitsA);
    if (hasMatch && !matchedPhones.includes(phA)) {
      matchedPhones.push(phA);
      sharedEntities.push({ name: phA, type: 'PHONE' });
    }
  }

  if (matchedPhones.length > 0) {
    rawScore += matchedPhones.length > 1 ? 0.32 : 0.25;
    reasons.push(`Shared mobile/burner contact: ${matchedPhones.join(', ')}`);
  }

  // 4. Shared Financial Escrow / UPI Accounts
  const matchedFinancials: string[] = [];
  for (const finA of caseA.entities.financials) {
    const fAClean = finA.trim().toLowerCase();
    const hasMatch = caseB.entities.financials.some(finB => finB.trim().toLowerCase() === fAClean);
    if (hasMatch && !matchedFinancials.includes(finA)) {
      matchedFinancials.push(finA);
      sharedEntities.push({ name: finA, type: 'FINANCIAL' });
    }
  }

  if (matchedFinancials.length > 0) {
    rawScore += 0.20;
    reasons.push(`Shared transaction/escrow account: ${matchedFinancials.join(', ')}`);
  }

  // 5. Shared Corporate Fronts / Organizations
  const matchedOrgs: string[] = [];
  for (const orgA of caseA.entities.organizations) {
    const oAClean = orgA.trim().toLowerCase();
    const hasMatch = caseB.entities.organizations.some(orgB => orgB.trim().toLowerCase() === oAClean);
    if (hasMatch && !matchedOrgs.includes(orgA)) {
      matchedOrgs.push(orgA);
      sharedEntities.push({ name: orgA, type: 'ORGANIZATION' });
    }
  }

  if (matchedOrgs.length > 0) {
    rawScore += 0.15;
    reasons.push(`Shared commercial/front entity: ${matchedOrgs.join(', ')}`);
  }

  // 6. Matching Crime Type
  if (caseA.crimeType === caseB.crimeType) {
    rawScore += 0.12;
    reasons.push(`Matching crime classification: ${caseA.crimeType}`);
  }

  // 7. Modus Operandi Keyword Overlaps in Case Narrative
  const moKeywords = [
    'fake plate', 'burner', 'extortion', 'escrow', 'chassis', 'luxury', 
    'fortuner', 'creta', 'cash van', 'scorpio', 'unaccounted', 'tampering', 
    'chopping', 'voip', 'crypto', 'interception', 'robbery'
  ];
  const descA = caseA.description.toLowerCase();
  const descB = caseB.description.toLowerCase();
  const matchedKeywords = moKeywords.filter(kw => descA.includes(kw) && descB.includes(kw));
  if (matchedKeywords.length >= 2) {
    rawScore += 0.08;
    reasons.push(`Common Modus Operandi pattern: ${matchedKeywords.slice(0, 3).join(', ')}`);
  }

  // 8. Shared Locations & Jurisdictional Corridor
  const matchedLocations: string[] = [];
  for (const locA of caseA.entities.locations) {
    const locALow = locA.trim().toLowerCase();
    const hasMatch = caseB.entities.locations.some(locB => 
      locB.trim().toLowerCase().includes(locALow) || locALow.includes(locB.trim().toLowerCase())
    );
    if (hasMatch && !matchedLocations.includes(locA)) {
      matchedLocations.push(locA);
    }
  }
  if (matchedLocations.length > 0 || caseA.city.toLowerCase() === caseB.city.toLowerCase()) {
    rawScore += 0.10;
    reasons.push(`Overlapping operational corridor: ${caseA.city} / ${matchedLocations[0] || caseA.location}`);
  }

  // 9. Temporal Proximity
  const dateA = new Date(caseA.date).getTime();
  const dateB = new Date(caseB.date).getTime();
  if (!isNaN(dateA) && !isNaN(dateB)) {
    const diffDays = Math.round(Math.abs(dateA - dateB) / (1000 * 60 * 60 * 24));
    if (diffDays <= 14) {
      rawScore += 0.12;
      reasons.push(`High temporal proximity: within ${diffDays} days`);
    } else if (diffDays <= 30) {
      rawScore += 0.06;
      reasons.push(`Close temporal sequence: within ${diffDays} days`);
    }
  }

  // If there are zero concrete shared entities, score should not reach high thresholds
  if (sharedEntities.length === 0) {
    rawScore = Math.min(rawScore, 0.40);
  }

  const normalizedScore = Math.min(0.98, Math.round(rawScore * 100) / 100);
  const percentage = Math.round(normalizedScore * 100);

  return {
    similarityScore: normalizedScore,
    percentage,
    reasons,
    sharedEntities
  };
}

/**
 * Builds a clean, focused, case-centric local graph:
 * - Selected case is the Root Node
 * - Direct entities connected to this case
 * - Highly similar cases ONLY (similarity >= 90%)
 * - Unrelated database nodes are strictly excluded
 */
export function buildCaseCentricGraph(
  rootCaseId: string,
  allCases: CaseRecord[]
): CaseCentricGraphResult {
  const rootCase = allCases.find(
    c => c.id === rootCaseId || c.firNumber.toLowerCase() === rootCaseId.toLowerCase()
  ) || allCases[0];

  if (!rootCase) {
    throw new Error('Case not found');
  }

  const nodes: GraphNode[] = [];
  const edges: GraphEdge[] = [];
  const nodeMap = new Map<string, GraphNode>();

  // 1. Root Node (Centrally placed, prominent styling)
  const rootNodeId = `CASE-NODE-${rootCase.id}`;
  const rootNode: GraphNode = {
    id: rootNodeId,
    name: rootCase.firNumber,
    label: rootCase.firNumber,
    type: 'CASE',
    connectionsCount: 0,
    cases: [rootCase.id],
    isRoot: true,
    metadata: {
      caseId: rootCase.id,
      title: rootCase.title,
      crimeType: rootCase.crimeType,
      date: rootCase.date,
      location: rootCase.location,
      city: rootCase.city,
      priority: rootCase.priority,
      status: rootCase.status,
      assignedOfficer: rootCase.assignedOfficer,
      description: rootCase.description
    }
  };
  nodes.push(rootNode);
  nodeMap.set(rootNodeId, rootNode);

  // Helper to add entity node
  function addEntityNode(name: string, type: EntityType, edgeType: string, evidence: string) {
    const entId = `ENT-${type.substring(0, 3)}-${Buffer.from(name).toString('hex').slice(0, 8)}`;
    let entNode = nodeMap.get(entId);
    if (!entNode) {
      entNode = {
        id: entId,
        name,
        label: name,
        type,
        connectionsCount: 0,
        cases: [rootCase.id],
        isRoot: false
      };
      nodes.push(entNode);
      nodeMap.set(entId, entNode);
    } else if (!entNode.cases.includes(rootCase.id)) {
      entNode.cases.push(rootCase.id);
    }

    entNode.connectionsCount++;
    rootNode.connectionsCount++;

    edges.push({
      id: `REL-${rootNodeId}-${entId}-${edgeType}`,
      source: rootNodeId,
      target: entId,
      type: edgeType,
      confidence: 0.95,
      evidence: [evidence],
      cases: [rootCase.id]
    });

    return entNode;
  }

  // 2. Direct Entities of Root Case
  const personNodes: GraphNode[] = [];
  for (const person of rootCase.entities.persons) {
    const pNode = addEntityNode(person, 'PERSON', 'INVOLVED_IN_CASE', `Suspect named in FIR ${rootCase.firNumber}`);
    personNodes.push(pNode);
  }

  const phoneNodes: GraphNode[] = [];
  for (const phone of rootCase.entities.phones) {
    const phNode = addEntityNode(phone, 'PHONE', 'CDR_PING', `Tower ping / burner record in ${rootCase.firNumber}`);
    phoneNodes.push(phNode);
  }

  const vehicleNodes: GraphNode[] = [];
  for (const veh of rootCase.entities.vehicles) {
    const vNode = addEntityNode(veh, 'VEHICLE', 'GETAWAY_VEHICLE', `Vehicle tracked or impounded in ${rootCase.firNumber}`);
    vehicleNodes.push(vNode);
  }

  for (const loc of rootCase.entities.locations) {
    addEntityNode(loc, 'LOCATION', 'CRIME_SCENE', `Scene of incident in ${rootCase.firNumber}`);
  }

  for (const fin of rootCase.entities.financials) {
    addEntityNode(fin, 'FINANCIAL', 'TRANSACTED_VIA', `Escrow account noted in ${rootCase.firNumber}`);
  }

  for (const org of rootCase.entities.organizations) {
    addEntityNode(org, 'ORGANIZATION', 'CORPORATE_FRONT', `Front company associated with ${rootCase.firNumber}`);
  }

  // Intra-case entity relationships (Suspect -> Phone/Vehicle)
  for (const pNode of personNodes) {
    for (const phNode of phoneNodes) {
      edges.push({
        id: `REL-${pNode.id}-${phNode.id}-COMM`,
        source: pNode.id,
        target: phNode.id,
        type: 'COMMUNICATED_VIA',
        confidence: 0.90,
        evidence: [`Phone ${phNode.name} utilized by ${pNode.name} in Case ${rootCase.firNumber}`],
        cases: [rootCase.id]
      });
    }
    for (const vNode of vehicleNodes) {
      edges.push({
        id: `REL-${pNode.id}-${vNode.id}-OPERATED`,
        source: pNode.id,
        target: vNode.id,
        type: 'OPERATED_VEHICLE',
        confidence: 0.92,
        evidence: [`Vehicle ${vNode.name} associated with ${pNode.name} in Case ${rootCase.firNumber}`],
        cases: [rootCase.id]
      });
    }
  }

  // 3. Identify Highly Similar Cases (≥90% Similarity Threshold)
  const similarMatches: CaseSimilarityMatch[] = [];
  for (const otherCase of allCases) {
    if (otherCase.id === rootCase.id) continue;
    const sim = calculateCaseSimilarity(rootCase, otherCase);

    // CRITICAL USER DIRECTIVE: Show ONLY cases with similarity >= 90%
    if (sim.percentage >= 90) {
      similarMatches.push({
        case: otherCase,
        similarityScore: sim.percentage,
        reasons: sim.reasons,
        sharedEntities: sim.sharedEntities
      });
    }
  }

  // Sort descending by similarity score
  similarMatches.sort((a, b) => b.similarityScore - a.similarityScore);

  // 4. Add Highly Similar Cases to the Graph
  for (const match of similarMatches) {
    const simCase = match.case;
    const simNodeId = `CASE-NODE-${simCase.id}`;

    const simNode: GraphNode = {
      id: simNodeId,
      name: simCase.firNumber,
      label: simCase.firNumber,
      type: 'CASE',
      connectionsCount: 1,
      cases: [simCase.id],
      isRoot: false,
      isSimilarCase: true,
      similarityScore: match.similarityScore,
      similarityReasons: match.reasons,
      metadata: {
        caseId: simCase.id,
        title: simCase.title,
        crimeType: simCase.crimeType,
        date: simCase.date,
        location: simCase.location,
        priority: simCase.priority,
        status: simCase.status,
        similarityScore: match.similarityScore
      }
    };
    nodes.push(simNode);
    nodeMap.set(simNodeId, simNode);
    rootNode.connectionsCount++;

    // Edge between Root Case and Similar Case
    edges.push({
      id: `REL-SIM-${rootCase.id}-${simCase.id}`,
      source: rootNodeId,
      target: simNodeId,
      type: 'SIMILAR_CASE',
      confidence: match.similarityScore / 100,
      evidence: [`${match.similarityScore}% Similarity: ${match.reasons.join('; ')}`],
      cases: [rootCase.id, simCase.id]
    });

    // Also connect the similar case to any shared entities that exist in this graph
    for (const shared of match.sharedEntities) {
      const existingEntityNode = nodes.find(n => n.name.toLowerCase() === shared.name.toLowerCase() && n.type === shared.type);
      if (existingEntityNode) {
        existingEntityNode.connectionsCount++;
        simNode.connectionsCount++;
        edges.push({
          id: `REL-SHARED-${simCase.id}-${existingEntityNode.id}`,
          source: simNodeId,
          target: existingEntityNode.id,
          type: 'SHARED_EVIDENCE',
          confidence: 0.95,
          evidence: [`Corroborated link in ${simCase.firNumber}`],
          cases: [simCase.id]
        });
      }
    }
  }

  return {
    rootCase,
    nodes,
    edges,
    similarCases: similarMatches,
    totalEntities: nodes.filter(n => n.type !== 'CASE').length
  };
}
