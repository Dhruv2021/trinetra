import { CaseRecord, CaseSimilarityMatch, EntityType, GraphEdge, GraphNode, CaseCentricGraphResult } from '../types';

/**
 * Calculates multi-dimensional similarity between two cases.
 * Attributes compared:
 * - Shared persons / suspects
 * - Shared vehicle registration / plates
 * - Shared mobile / burner phones
 * - Shared financial / UPI accounts
 * - Shared commercial / shell organizations
 * - Crime classification & Modus Operandi patterns
 * - Geographic proximity & corridor
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
      reasons: ['Identical case file'],
      sharedEntities: []
    };
  }

  const reasons: string[] = [];
  const sharedEntities: { name: string; type: EntityType }[] = [];
  let rawScore = 0;

  // 1. Shared Suspects / Persons (Primary link)
  const normPersonsB = (caseB.entities?.persons || []).map(p => p.trim().toLowerCase());
  const matchedPersons: string[] = [];
  for (const pA of (caseA.entities?.persons || [])) {
    const pALow = pA.trim().toLowerCase();
    const hasMatch = normPersonsB.some(pBLow => {
      if (pALow === pBLow) return true;
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
    reasons.push(`Shared suspect/person: ${matchedPersons.join(', ')}`);
  }

  // 2. Shared Vehicles / Cloned Plates
  const matchedVehicles: string[] = [];
  for (const vA of (caseA.entities?.vehicles || [])) {
    const vAClean = vA.replace(/\s+/g, '').toLowerCase();
    const hasMatch = (caseB.entities?.vehicles || []).some(vB => vB.replace(/\s+/g, '').toLowerCase() === vAClean);
    if (hasMatch && !matchedVehicles.includes(vA)) {
      matchedVehicles.push(vA);
      sharedEntities.push({ name: vA, type: 'VEHICLE' });
    }
  }

  if (matchedVehicles.length > 0) {
    rawScore += matchedVehicles.length > 1 ? 0.32 : 0.25;
    reasons.push(`Identical vehicle registration: ${matchedVehicles.join(', ')}`);
  }

  // 3. Shared Burner Phones / CDR Contacts
  const matchedPhones: string[] = [];
  for (const phA of (caseA.entities?.phones || [])) {
    const digitsA = phA.replace(/\D/g, '').slice(-10);
    const hasMatch = (caseB.entities?.phones || []).some(phB => phB.replace(/\D/g, '').slice(-10) === digitsA);
    if (hasMatch && !matchedPhones.includes(phA)) {
      matchedPhones.push(phA);
      sharedEntities.push({ name: phA, type: 'PHONE' });
    }
  }

  if (matchedPhones.length > 0) {
    rawScore += matchedPhones.length > 1 ? 0.32 : 0.25;
    reasons.push(`Shared mobile/burner contact: ${matchedPhones.join(', ')}`);
  }

  // 4. Shared Financial Accounts / UPI Escrows
  const matchedFinancials: string[] = [];
  for (const finA of (caseA.entities?.financials || [])) {
    const fAClean = finA.trim().toLowerCase();
    const hasMatch = (caseB.entities?.financials || []).some(finB => finB.trim().toLowerCase() === fAClean);
    if (hasMatch && !matchedFinancials.includes(finA)) {
      matchedFinancials.push(finA);
      sharedEntities.push({ name: finA, type: 'FINANCIAL' });
    }
  }

  if (matchedFinancials.length > 0) {
    rawScore += 0.20;
    reasons.push(`Shared transaction/escrow account: ${matchedFinancials.join(', ')}`);
  }

  // 5. Shared Organizations / Shell Fronts
  const matchedOrgs: string[] = [];
  for (const orgA of (caseA.entities?.organizations || [])) {
    const oAClean = orgA.trim().toLowerCase();
    const hasMatch = (caseB.entities?.organizations || []).some(orgB => orgB.trim().toLowerCase() === oAClean);
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
    reasons.push(`Matching crime category: ${caseA.crimeType}`);
  }

  // 7. Modus Operandi Keyword Overlaps
  const moKeywords = [
    'fake plate', 'burner', 'extortion', 'escrow', 'chassis', 'luxury', 
    'fortuner', 'creta', 'cash van', 'scorpio', 'unaccounted', 'tampering', 
    'chopping', 'voip', 'crypto', 'interception', 'robbery'
  ];
  const descA = (caseA.description || '').toLowerCase();
  const descB = (caseB.description || '').toLowerCase();
  const matchedKeywords = moKeywords.filter(kw => descA.includes(kw) && descB.includes(kw));
  if (matchedKeywords.length >= 2) {
    rawScore += 0.08;
    reasons.push(`Common Modus Operandi pattern: ${matchedKeywords.slice(0, 3).join(', ')}`);
  }

  // 8. Shared Locations & Corridor
  const matchedLocations: string[] = [];
  for (const locA of (caseA.entities?.locations || [])) {
    const locALow = locA.trim().toLowerCase();
    const hasMatch = (caseB.entities?.locations || []).some(locB => 
      locB.trim().toLowerCase().includes(locALow) || locALow.includes(locB.trim().toLowerCase())
    );
    if (hasMatch && !matchedLocations.includes(locA)) {
      matchedLocations.push(locA);
    }
  }
  if (matchedLocations.length > 0 || (caseA.city && caseB.city && caseA.city.toLowerCase() === caseB.city.toLowerCase())) {
    rawScore += 0.10;
    reasons.push(`Overlapping operational corridor: ${caseA.city || 'NCR'} / ${matchedLocations[0] || caseA.location || ''}`);
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

  // If no concrete entities are shared, cap score to prevent false positives
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
 * Returns similar cases filtered by minimum similarity score (default 90%).
 */
export function getSimilarCases(
  rootCase: CaseRecord,
  allCases: CaseRecord[],
  minScore: number = 90
): CaseSimilarityMatch[] {
  const matches: CaseSimilarityMatch[] = [];

  for (const other of allCases) {
    if (other.id === rootCase.id) continue;
    const sim = calculateCaseSimilarity(rootCase, other);
    // Strict threshold >= 90%
    if (sim.percentage >= minScore) {
      matches.push({
        case: other,
        similarityScore: sim.percentage,
        reasons: sim.reasons,
        sharedEntities: sim.sharedEntities
      });
    }
  }

  matches.sort((a, b) => b.similarityScore - a.similarityScore);
  return matches;
}

/**
 * Builds a clean, focused, case-centric local graph:
 * - Selected case is the central Root Node
 * - Direct entities connected to this case
 * - Highly similar cases ONLY (similarity >= 90%)
 * - Unrelated database nodes are strictly excluded
 */
export function buildClientCaseCentricGraph(
  rootCase: CaseRecord,
  allCases: CaseRecord[],
  minScore: number = 90
): CaseCentricGraphResult {
  const nodes: GraphNode[] = [];
  const edges: GraphEdge[] = [];
  const nodeMap = new Map<string, GraphNode>();

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
    const slug = name.replace(/[^a-zA-Z0-9]/g, '').toLowerCase().slice(0, 12);
    const entId = `ENT-${type.substring(0, 3)}-${slug}`;
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

  // 1. Direct Entities
  const personNodes: GraphNode[] = [];
  for (const person of (rootCase.entities?.persons || [])) {
    const pNode = addEntityNode(person, 'PERSON', 'INVOLVED_IN_CASE', `Suspect named in ${rootCase.firNumber}`);
    personNodes.push(pNode);
  }

  const phoneNodes: GraphNode[] = [];
  for (const phone of (rootCase.entities?.phones || [])) {
    const phNode = addEntityNode(phone, 'PHONE', 'CDR_PING', `Tower ping in ${rootCase.firNumber}`);
    phoneNodes.push(phNode);
  }

  const vehicleNodes: GraphNode[] = [];
  for (const veh of (rootCase.entities?.vehicles || [])) {
    const vNode = addEntityNode(veh, 'VEHICLE', 'GETAWAY_VEHICLE', `Vehicle tracked in ${rootCase.firNumber}`);
    vehicleNodes.push(vNode);
  }

  for (const loc of (rootCase.entities?.locations || [])) {
    addEntityNode(loc, 'LOCATION', 'CRIME_SCENE', `Scene in ${rootCase.firNumber}`);
  }

  for (const fin of (rootCase.entities?.financials || [])) {
    addEntityNode(fin, 'FINANCIAL', 'TRANSACTED_VIA', `Escrow in ${rootCase.firNumber}`);
  }

  for (const org of (rootCase.entities?.organizations || [])) {
    addEntityNode(org, 'ORGANIZATION', 'CORPORATE_FRONT', `Front in ${rootCase.firNumber}`);
  }

  // Intra-case links (Suspect -> Phone/Vehicle)
  for (const pNode of personNodes) {
    for (const phNode of phoneNodes) {
      edges.push({
        id: `REL-${pNode.id}-${phNode.id}-COMM`,
        source: pNode.id,
        target: phNode.id,
        type: 'COMMUNICATED_VIA',
        confidence: 0.90,
        evidence: [`Phone ${phNode.name} utilized by ${pNode.name}`],
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
        evidence: [`Vehicle ${vNode.name} operated by ${pNode.name}`],
        cases: [rootCase.id]
      });
    }
  }

  // 2. Similar Cases (Only >= minScore, default 90%)
  const similarCases = getSimilarCases(rootCase, allCases, minScore);

  for (const match of similarCases) {
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

    // Also connect similar case to shared entities
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
          evidence: [`Shared evidence link in ${simCase.firNumber}`],
          cases: [simCase.id]
        });
      }
    }
  }

  return {
    rootCase,
    nodes,
    edges,
    similarCases,
    totalEntities: nodes.filter(n => n.type !== 'CASE').length
  };
}
