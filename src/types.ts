export type EntityType = 
  | 'CASE' 
  | 'PERSON' 
  | 'PHONE' 
  | 'VEHICLE' 
  | 'LOCATION' 
  | 'FINANCIAL' 
  | 'ORGANIZATION' 
  | 'DATE';

export interface User {
  id: string;
  name: string;
  badgeId: string;
  rank: string;
  department: string;
  role: 'Investigator' | 'Senior Analyst' | 'Admin';
  avatar?: string;
}

export interface CaseRecord {
  id: string;
  firNumber: string;
  title: string;
  crimeType: 'Vehicle Theft' | 'Cyber Fraud / UPI' | 'Extortion' | 'Narcotics' | 'Armed Robbery' | 'Hawala / Money Laundering' | 'Burglary';
  date: string; // ISO YYYY-MM-DD
  location: string;
  city: string;
  coordinates: [number, number]; // [lat, lng]
  description: string;
  status: 'Active' | 'Under Review' | 'Closed';
  priority: 'Critical' | 'High' | 'Medium' | 'Low';
  assignedOfficer: string;
  entities: {
    persons: string[];
    phones: string[];
    vehicles: string[];
    locations: string[];
    financials: string[];
    organizations: string[];
  };
  detectedConnectionsCount: number;
  notes?: string;
}

export interface EntityRecord {
  id: string;
  name: string;
  canonicalValue: string;
  type: EntityType;
  rawRepresentations: string[];
  cases: string[]; // Case IDs
  connectionsCount: number;
  metadata?: Record<string, any>;
  possibleDuplicates?: {
    entityId: string;
    name: string;
    similarity: number;
    reason: string;
  }[];
}

export interface RelationshipRecord {
  id: string;
  sourceId: string;
  sourceName: string;
  sourceType: EntityType;
  targetId: string;
  targetName: string;
  targetType: EntityType;
  relationshipType: string;
  sourceCaseIds: string[];
  timestamp: string;
  confidence: number; // 0.0 to 1.0 (e.g. 0.84 = 84%)
  evidence: string[];
}

export interface GraphNode {
  id: string;
  name: string;
  type: EntityType;
  label: string;
  connectionsCount: number;
  cases: string[];
  x?: number;
  y?: number;
  vx?: number;
  vy?: number;
  color?: string;
  isRoot?: boolean;
  isSimilarCase?: boolean;
  similarityScore?: number;
  similarityReasons?: string[];
  metadata?: Record<string, any>;
}

export interface GraphEdge {
  id: string;
  source: string;
  target: string;
  type: string;
  confidence: number;
  evidence: string[];
  cases: string[];
}

export interface GraphData {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

export interface CaseSimilarityMatch {
  case: CaseRecord;
  similarityScore: number; // 0 to 100
  reasons: string[];
  sharedEntities: { name: string; type: EntityType }[];
}

export interface CaseCentricGraphResult {
  rootCase: CaseRecord;
  nodes: GraphNode[];
  edges: GraphEdge[];
  similarCases: CaseSimilarityMatch[];
  totalEntities: number;
}

export interface ShortestPathResult {
  found: boolean;
  startEntity: { id: string; name: string; type: EntityType };
  targetEntity: { id: string; name: string; type: EntityType };
  hops: number;
  pathNodes: GraphNode[];
  pathEdges: GraphEdge[];
  connectedCases: CaseRecord[];
  evidenceSummary: string[];
}

export interface ConnectionExplanation {
  source: { id: string; name: string; type: EntityType };
  target: { id: string; name: string; type: EntityType };
  relationshipScore: number;
  reasons: string[];
  sharedEntities: { name: string; type: EntityType }[];
  timelineProximityDays?: number;
  caseIds: string[];
}

export interface EmergingNetwork {
  id: string;
  name: string;
  casesCount: number;
  personsCount: number;
  phonesCount: number;
  vehiclesCount: number;
  locationsCount: number;
  alertLevel: 'CRITICAL' | 'HIGH' | 'EMERGING';
  growthVelocity30Days: string;
  description: string;
  lastActivity: string;
  keyEntities: string[];
  suspectedNexus: string;
}

export interface ExtractedEntitiesResult {
  persons: string[];
  phones: string[];
  vehicles: string[];
  locations: string[];
  financials: string[];
  organizations: string[];
  dates: string[];
  normalizationSuggestions: {
    original: string;
    canonical: string;
    type: EntityType;
    existingEntityName?: string;
    confidence: number;
  }[];
}

export interface InvestigationReport {
  id: string;
  caseId: string;
  generatedAt: string;
  officer: string;
  badgeId: string;
  summary: string;
  caseDetails: CaseRecord;
  keyEntities: EntityRecord[];
  detectedConnections: ConnectionExplanation[];
  timeline: { date: string; event: string; type: string }[];
  aiInsights: string[];
  recommendations: string[];
  disclaimer: string;
}

export interface CopilotMessage {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  timestamp: string;
  groundedEntities?: { id: string; name: string; type: EntityType }[];
  groundedCases?: string[];
  evidencePoints?: string[];
}
