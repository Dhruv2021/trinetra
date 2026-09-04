import { GoogleGenAI } from '@google/genai';
import { CaseRecord, GraphData, ShortestPathResult, ConnectionExplanation } from '../src/types';
import { findShortestPath } from './graphEngine';

export async function processCopilotQuery(
  query: string,
  cases: CaseRecord[],
  graphData: GraphData,
  explanations: ConnectionExplanation[]
): Promise<{
  answer: string;
  groundedEntities?: { id: string; name: string; type: any }[];
  groundedCases?: string[];
  evidencePoints?: string[];
  shortestPath?: ShortestPathResult;
}> {
  const lowerQuery = query.toLowerCase().trim();

  // 1. Specific Query Handling: "Why are Case 101 and Case 127 connected?" / "Why are X and Y connected?"
  const casePairMatch = lowerQuery.match(/(?:case|fir)[\s\-#]*(\d+)[^\d]+(?:case|fir)[\s\-#]*(\d+)/i);
  if (casePairMatch || lowerQuery.includes('connected') && (lowerQuery.includes('why') || lowerQuery.includes('reason'))) {
    const num1 = casePairMatch ? casePairMatch[1] : '101';
    const num2 = casePairMatch ? casePairMatch[2] : '127';
    
    const explanation = explanations.find(exp => 
      (exp.source.name.includes(num1) && exp.target.name.includes(num2)) ||
      (exp.source.name.includes(num2) && exp.target.name.includes(num1))
    );

    if (explanation) {
      return {
        answer: `Potential Connection Analysis between Case ${num1} and Case ${num2}:\n\n` +
          `• Relationship Score: ${Math.round(explanation.relationshipScore * 100)}%\n` +
          `• Key Findings:\n` +
          explanation.reasons.map(r => `  ✓ ${r}`).join('\n') +
          `\n\n• Shared Identifiers: ${explanation.sharedEntities.map(e => `${e.name} (${e.type})`).join(', ')}\n` +
          `\nNote: This analysis serves as an investigative lead and decision-support metric; it does not constitute proof of criminal guilt.`,
        groundedEntities: explanation.sharedEntities.map(e => ({ id: e.name, name: e.name, type: e.type })),
        groundedCases: explanation.caseIds,
        evidencePoints: explanation.reasons
      };
    }
  }

  // 2. Shortest Connection Query: "Show the shortest connection between Rahul and Amit"
  if (lowerQuery.includes('shortest') || (lowerQuery.includes('connection between') && lowerQuery.includes('and'))) {
    const names = extractNamesFromQuery(query, graphData);
    if (names.length >= 2) {
      const pathResult = findShortestPath(names[0], names[1], graphData, cases);
      if (pathResult.found) {
        return {
          answer: `Potential indirect connection found between ${pathResult.startEntity.name} and ${pathResult.targetEntity.name} in ${pathResult.hops} hop(s):\n\n` +
            pathResult.evidenceSummary.join('\n') +
            `\n\nConnected Cases of Interest: ${pathResult.connectedCases.map(c => c.firNumber).join(', ')}`,
          groundedEntities: pathResult.pathNodes.map(n => ({ id: n.id, name: n.name, type: n.type })),
          groundedCases: pathResult.connectedCases.map(c => c.id),
          evidencePoints: pathResult.evidenceSummary,
          shortestPath: pathResult
        };
      }
    }
  }

  // 3. Highest Number of Connections Query: "Which entities have the highest number of connections?"
  if (lowerQuery.includes('highest') || lowerQuery.includes('most connected') || lowerQuery.includes('ranking')) {
    const sortedNodes = [...graphData.nodes]
      .filter(n => n.type !== 'CASE')
      .sort((a, b) => b.connectionsCount - a.connectionsCount)
      .slice(0, 5);

    const topList = sortedNodes.map((n, i) => `${i + 1}. [${n.type}] ${n.name} — ${n.connectionsCount} links across ${n.cases.length} case(s)`).join('\n');

    return {
      answer: `Top 5 entities by graph centrality & network degree:\n\n${topList}\n\nInvestigative Recommendation: These key hub entities represent pivotal links in cross-jurisdictional syndicate activities.`,
      groundedEntities: sortedNodes.map(n => ({ id: n.id, name: n.name, type: n.type })),
      evidencePoints: sortedNodes.map(n => `${n.name} is involved in ${n.cases.length} distinct cases`)
    };
  }

  // 4. Entity Specific: "Show all cases connected to Rahul Sharma" or "Find people connected to phone number 9876543210"
  const targetNode = graphData.nodes.find(n => 
    lowerQuery.includes(n.name.toLowerCase()) || 
    (n.type === 'PHONE' && lowerQuery.includes(n.name.replace(/\D/g, '')))
  );

  if (targetNode) {
    const relatedCaseObjs = cases.filter(c => targetNode.cases.includes(c.id));
    const connectedEdges = graphData.edges.filter(e => e.source === targetNode.id || e.target === targetNode.id);
    const connectedNodeIds = new Set<string>();
    connectedEdges.forEach(e => {
      if (e.source !== targetNode.id) connectedNodeIds.add(e.source);
      if (e.target !== targetNode.id) connectedNodeIds.add(e.target);
    });
    const connectedNodes = graphData.nodes.filter(n => connectedNodeIds.has(n.id) && n.type !== 'CASE');

    return {
      answer: `Intelligence summary for [${targetNode.type}] ${targetNode.name}:\n\n` +
        `• Direct Linked Cases (${relatedCaseObjs.length}):\n` +
        relatedCaseObjs.map(c => `  - ${c.firNumber} (${c.crimeType} in ${c.city}): "${c.title}"`).join('\n') +
        `\n\n• Directly Linked Entities (${connectedNodes.length}):\n` +
        connectedNodes.slice(0, 8).map(n => `  - [${n.type}] ${n.name}`).join('\n') +
        (connectedNodes.length > 8 ? `\n  ... and ${connectedNodes.length - 8} additional entities` : ''),
      groundedEntities: [targetNode, ...connectedNodes.slice(0, 8)].map(n => ({ id: n.id, name: n.name, type: n.type })),
      groundedCases: relatedCaseObjs.map(c => c.id),
      evidencePoints: connectedEdges.slice(0, 5).flatMap(e => e.evidence)
    };
  }

  // 5. If GEMINI_API_KEY is configured, run through Gemini API for sophisticated natural language reasoning
  const apiKey = process.env.GEMINI_API_KEY;
  if (apiKey && apiKey !== 'MY_GEMINI_API_KEY') {
    try {
      const ai = new GoogleGenAI({
        apiKey,
        httpOptions: { headers: { 'User-Agent': 'aistudio-build' } }
      });

      const contextSummary = `
Cases in database (${cases.length}):
${cases.slice(0, 10).map(c => `${c.firNumber} | ${c.crimeType} | ${c.city} | Entities: ${c.entities.persons.join(', ')} | Phones: ${c.entities.phones.join(', ')} | Vehicles: ${c.entities.vehicles.join(', ')} | Financial: ${c.entities.financials.join(', ')}`).join('\n')}

Top connected entities:
${graphData.nodes.filter(n => n.type !== 'CASE').sort((a, b) => b.connectionsCount - a.connectionsCount).slice(0, 8).map(n => `[${n.type}] ${n.name} (${n.connectionsCount} links)`).join(', ')}
`;

      const response = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: `You are Trinetra Copilot, an investigative crime intelligence AI decision-support assistant for police officers.
Answer the investigator's inquiry accurately based strictly on the provided case data context. Use professional law-enforcement tone. Always treat connections as potential investigative leads, never declare guilt or convictions.

Context:
${contextSummary}

Question:
"${query}"`,
        config: {
          systemInstruction: "You are Trinetra Crime Intelligence AI Copilot. Provide concise, bulleted, evidence-backed answers for police investigators. Clearly distinguish verified evidence from investigative leads."
        }
      });

      if (response.text) {
        return {
          answer: response.text.trim(),
          evidencePoints: ['AI synthesis grounded in Trinetra graph & case repository']
        };
      }
    } catch (err) {
      console.warn('Gemini Copilot fallback:', err);
    }
  }

  // 6. Generic intelligent fallback for location or crime queries
  const matchingCases = cases.filter(c => 
    lowerQuery.includes(c.city.toLowerCase()) || 
    lowerQuery.includes(c.crimeType.toLowerCase()) ||
    c.description.toLowerCase().includes(lowerQuery)
  );

  if (matchingCases.length > 0) {
    return {
      answer: `Found ${matchingCases.length} case(s) matching your query parameters:\n\n` +
        matchingCases.slice(0, 5).map(c => 
          `• ${c.firNumber} (${c.crimeType}, ${c.city} on ${c.date})\n` +
          `  Entities: ${[...c.entities.persons, ...c.entities.vehicles, ...c.entities.phones].join(', ')}\n` +
          `  Summary: ${c.description.slice(0, 120)}...`
        ).join('\n\n'),
      groundedCases: matchingCases.map(c => c.id)
    };
  }

  return {
    answer: `Trinetra Copilot analyzed your inquiry ("${query}").\n\n` +
      `Try asking:\n` +
      `• "Show all cases connected to Rahul Sharma"\n` +
      `• "Why are Case 101 and Case 127 connected?"\n` +
      `• "Find people connected to phone number 9876543210"\n` +
      `• "Show the shortest connection between Rahul and Amit"\n` +
      `• "Which entities have the highest number of connections?"\n` +
      `• "Show cases related to Gurgaon during the last 3 months"`
  };
}

function extractNamesFromQuery(query: string, graphData: GraphData): string[] {
  const words = query.split(/\s+/);
  const found: string[] = [];

  for (const node of graphData.nodes) {
    if (node.type === 'PERSON') {
      const lowerNodeName = node.name.toLowerCase();
      if (query.toLowerCase().includes(lowerNodeName)) {
        if (!found.includes(node.name)) found.push(node.name);
      } else {
        // Check partial first name
        const firstName = lowerNodeName.split(' ')[0];
        if (firstName.length > 3 && words.some(w => w.toLowerCase() === firstName)) {
          if (!found.includes(node.name)) found.push(node.name);
        }
      }
    }
  }

  return found;
}
