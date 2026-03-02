export type SourceFormat = "GED" | "GDZ" | "GSZ";
export type ViewMode = "fan" | "tree" | "network";
export type Preset =
  | "custom"
  | "all_direct_ancestors"
  | "hourglass"
  | "family_origin"
  | "nuclear_family"
  | "extended_family"
  | "direct_ancestors"
  | "direct_descendants";

export type Event = {
  type: "BIRT" | "DEAT" | "MARR" | "DIV" | "CHR" | "BAPM" | "BURI" | "CENS" | "RESI" | "NOTE" | "OTHER";
  id?: string;
  subType?: string;
  date?: string;
  place?: string;
  addr?: string;
  datePhrase?: string;
  quality?: "0" | "1" | "2" | "3";
  sourceRefs?: SourceRef[];
  mediaRefs?: string[];
  notesInline?: string[];
  noteRefs?: string[];
  rawTags?: Record<string, string[]>;
};

export type SourceRef = {
  id: string;
  title?: string;
  page?: string;
  text?: string;
  note?: string;
  quality?: "0" | "1" | "2" | "3";
};

export type ChangeMeta = {
  date?: string;
  time?: string;
  actor?: string;
  raw?: string[];
};

export type SourceRecord = {
  id: string;
  title?: string;
  text?: string;
  rawTags?: Record<string, string[]>;
  change?: ChangeMeta;
};

export type NoteRecord = {
  id: string;
  text: string;
  rawTags?: Record<string, string[]>;
  change?: ChangeMeta;
};

export type PersonNameVariant = {
  value: string;
  given?: string;
  surname?: string;
  nickname?: string;
  type?: "primary" | "aka" | "nick" | "other";
  primary?: boolean;
};

export type Media = {
  id: string;
  fileName?: string;
  title?: string;
  mimeType?: string;
  bytes?: Uint8Array;
  dataUrl?: string;
};

export type Person = {
  id: string;
  name: string;
  surname?: string;
  names?: PersonNameVariant[];
  sex: "M" | "F" | "U";
  lifeStatus: "alive" | "deceased";
  isPlaceholder?: boolean;
  pendingEnrichment?: {
    reason: string;
    confidence: number;
    createdAt: string;
    notes?: string;
  };
  birthDate?: string;
  birthPlace?: string;
  deathDate?: string;
  deathPlace?: string;
  residence?: string;
  events: Event[];
  famc: string[];
  famcLinks?: Array<{
    familyId: string;
    pedi?: "BIRTH" | "ADOPTED" | "FOSTER" | "SEALING" | "UNKNOWN";
    quality?: "0" | "1" | "2" | "3";
    reference?: string;
  }>;
  fams: string[];
  mediaRefs: string[];
  sourceRefs: SourceRef[];
  noteRefs?: string[];
  change?: ChangeMeta;
  rawTags?: Record<string, string[]>;
};

export type Family = {
  id: string;
  husbandId?: string;
  wifeId?: string;
  childrenIds: string[];
  events: Event[];
  name?: string;
  relationNotes?: string[];
  noteRefs?: string[];
  change?: ChangeMeta;
  rawTags?: Record<string, string[]>;
};

export type Union = {
  id: string;
  familyId: string;
  partnerIds: string[];
};

export type EvidenceRef = {
  sourceId?: string;
  note?: string;
  confidence?: number; // 0..1
};

export type UnionV2 = {
  id: string;
  partnerIds: string[];
  legacyFamilyId?: string;
  unionType: "married" | "partner" | "divorced" | "unknown";
  dateRange?: {
    from?: string;
    to?: string;
  };
  place?: string;
  evidenceRefs?: EvidenceRef[];
  confidence?: number; // 0..1
};

export type ParentChildLink = {
  id: string;
  parentId: string;
  childId: string;
  role: "father" | "mother" | "unknown";
  certainty: "high" | "medium" | "low";
  evidenceRefs?: EvidenceRef[];
  notes?: string;
};

export type SiblingLink = {
  id: string;
  personAId: string;
  personBId: string;
  certainty: "high" | "medium" | "low";
  evidenceRefs?: EvidenceRef[];
};

export type MergeRiskLevel = "low" | "medium" | "high";

export type MergeAction =
  | { kind: "merge_person"; incomingId: string; baseId: string }
  | { kind: "create_person"; incomingId: string; preferredId?: string }
  | { kind: "create_union"; union: UnionV2 }
  | { kind: "link_parent_child"; link: ParentChildLink }
  | { kind: "flag_pending_enrichment"; personId: string; reason: string; confidence: number }
  | { kind: "project_legacy" };

export type MergeExplain = {
  categoryPoints: {
    identity: number;
    temporal: number;
    geography: number;
    familyNetwork: number;
    documentStructure: number;
  };
  subCategoryPoints: {
    familyParents: number;
    familyUnions: number;
    familyChildren: number;
    familySiblings: number;
    familyGrandparents: number;
  };
  penalties: Array<{ code: string; points: number; detail: string }>;
  coverage: {
    comparableSignals: number;
    availableSignals: number;
    coverageRatio: number;
    coveragePenalty: number;
  };
  capsApplied: string[];
  blockers: Array<{ code: string; severity: "criticalHardConflict" | "nonCriticalHardConflict" | "soft"; detail: string }>;
  decisionReason: string;
  requiredActions: MergeAction[];
  networkEvidence?: {
    layerScores: {
      l1Identity: number;
      l2Nuclear: number;
      l3Extended: number;
      l4Global: number;
    };
    anchorHits: number;
    anchorKinds: string[];
    propagationSupport: number;
    iterationChosen: number;
    criticalOverride: boolean;
  };
};

export type MergeHypothesisType =
  | "SamePerson"
  | "SamePersonAdditionalUnion"
  | "SamePersonNetworkConfirmed"
  | "SamePersonCriticalOverride"
  | "Homonym"
  | "Misattribution"
  | "CreateNewPerson"
  | "AnchorInsertion";

export type MergeHypothesis = {
  hypothesisType: MergeHypothesisType;
  baseId?: string;
  scoreFinal: number;
  riskLevel: MergeRiskLevel;
  explain: MergeExplain;
};

export type MergeAuditDecision = {
  incomingId: string;
  chosenHypothesis: MergeHypothesis;
  topHypotheses: MergeHypothesis[];
  decidedAt: string;
  decidedBy: "system" | "user";
};

export type MergeAuditReport = {
  version?: "v2" | "v3" | "v4";
  preset: "strict" | "balanced" | "fast";
  thresholds: {
    autoScoreMin: number;
    minDeltaVsSecond: number;
    minCoverage: number;
    mediumAutoScoreMin?: number;
    mediumAutoCoverageMin?: number;
    mediumAutoDeltaMin?: number;
    globalScoreMin?: number;
    globalSupportMin?: number;
    criticalOverrideScoreMin?: number;
    criticalOverrideSupportMin?: number;
    criticalOverrideAnchorMin?: number;
  };
  decisions: MergeAuditDecision[];
  summary: {
    totalIncoming: number;
    autoDecided: number;
    manualDecided: number;
    blocked: number;
    autoAppliedMedium?: number;
    revertedActions?: number;
    networkConfirmed?: number;
    criticalOverrides?: number;
    globalIterations?: number;
  };
  createdAt: string;
};

export type RelationEdge = {
  id: string;
  from: string;
  to: string;
  type:
  | "spouse"
  | "child"
  | "identity";
  familyId?: string;
};

export type GeneaDocument = {
  persons: Record<string, Person>;
  families: Record<string, Family>;
  sources?: Record<string, SourceRecord>;
  notes?: Record<string, NoteRecord>;
  // V2 graph entities kept in sync with legacy family projection during migration.
  unions?: Record<string, UnionV2>;
  parentChildLinks?: Record<string, ParentChildLink>;
  siblingLinks?: Record<string, SiblingLink>;
  media: Record<string, Media>;
  metadata: {
    sourceFormat: SourceFormat;
    gedVersion: string;
    schemaUris?: string[];
    importProvenance?: Array<{
      fileName?: string;
      sourceFormat: SourceFormat;
      sourceGedVersion: SourceGedVersion;
      importedAt: string;
    }>;
    mergeAudit?: MergeAuditReport;
    aiAuditTrail?: import("@/types/ai").AiAuditTrailEntry[];
    recycleBin?: import("@/types/ai").RecycleBinEntry[];
  };
};

export type RightPanelView = "details" | "timeline";
export type TimelineScope = "visible" | "all";
export type TimelineViewMode = "list" | "scale";

export type TimelinePanelConfig = {
  scope: TimelineScope;
  view: TimelineViewMode;
  scaleZoom: number;
  scaleOffset: number;
};

export type TimelineHighlightState = {
  sourceItemId: string;
  primaryPersonId: string | null;
  secondaryPersonIds: string[];
};

export type ViewConfig = {
  mode: ViewMode;
  preset: Preset;
  focusPersonId: string | null;
  focusFamilyId: string | null;
  homePersonId: string;
  rightPanelView: RightPanelView;
  timelinePanelOpen?: boolean;
  rightStack?: {
    detailsMode: "expanded" | "compact";
    timelineMode: "expanded" | "compact";
    detailsAutoCompactedByTimeline?: boolean;
  };
  shellPanels?: {
    leftCollapsed: boolean;
    rightCollapsed: boolean;
  };
  leftSections?: {
    layersOpen: boolean;
    treeConfigOpen: boolean;
    canvasToolsOpen: boolean;
  };
  timeline: TimelinePanelConfig;
  depth: {
    ancestors: number;
    descendants: number;
    unclesGreatUncles: number;
    siblingsNephews: number;
    unclesCousins: number;
  };
  showSpouses: boolean;
  dtree?: {
    isVertical: boolean;
    layoutEngine?: "legacy" | "vnext" | "v2";
    collapsedNodeIds: string[];
    // Highlight & Overlay Systems
    overlays: ActiveOverlay[];
  };
};

export type OverlayType =
  | 'timeline'    // Status: Living/Deceased rendering
  | 'heatmap'     // Genetic DNA percentages
  | 'lineage'     // Patrilineal/Matrilineal
  | 'lineage_couple' // Dual Y/mt lineage for a family
  | 'kinship'     // P1 to P2 relationship
  | 'origin'      // Family origin highlight
  | 'deepest'     // Deepest ancestor paths
  | 'merge_focus' // Merge review contextual focus
  | 'layer';      // Thematic analysis layers (symmetry, places, etc.)

export type ActiveOverlay = {
  id: string;
  type: OverlayType;
  priority: number;
  config: any;
};

export type VisualConfig = {
  nodePositions: Record<string, { x: number; y: number }>;
  gridEnabled: boolean;
  gridSize: number;
  canonicalOverrides: Record<string, string>;
};

export type SidePreference = "paternal" | "maternal" | "neutral";

export type ExpandedNode = {
  id: string;
  label: string;
  canonicalId?: string;
  isAlias: boolean;
  generation: number;
  generationDepth: number;
  sidePreference: SidePreference;
  type: "person" | "family" | "personAlias" | "familyAlias" | "junction";
};

export type ExpandedEdge = {
  id: string;
  from: string;
  to: string;
  type: "spouse" | "child" | "identity" | "junction-link";
  layoutAffects: boolean;
  familyId?: string;
  spouseRole?: "husband" | "wife";
};

export type ExpandedGraph = {
  nodes: ExpandedNode[];
  edges: ExpandedEdge[];
};

export type SessionSnapshot = {
  schemaVersion: number;
  document: GeneaDocument | null;
  viewConfig: ViewConfig | null;
  visualConfig?: VisualConfig;
  focusHistory: string[];
  focusIndex: number;
  recentFiles?: RecentFileEntry[];
  recentPayloads?: Record<string, GeneaDocument>;
  mergeDraft?: import("@/types/merge-draft").MergeDraftSnapshot | null;
  aiSettings?: import("@/types/ai").AiSettings;
};

export type GedParseError = {
  line: number;
  entity?: string;
  message: string;
};

export type EditorMode = "view" | "edit";
export type PendingRelationType = "father" | "mother" | "child" | "spouse" | "sibling";

export type ImportWarning = {
  code: string;
  line?: number;
  entity?: string;
  message: string;
};

export type SourceGedVersion = "5.5" | "5.5.1" | "7.0.x" | "unknown";

export type GedExportVersion = "7.0.3" | "5.5.1";

export type GedExportWarning = {
  code: string;
  entity?: string;
  message: string;
  level: "info" | "warn";
};

export type RecentFileEntry = {
  id: string;
  name: string;
  kind: "open" | "import";
  lastUsedAt: string;
};
