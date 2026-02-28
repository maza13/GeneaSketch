import type { ExpandedGraph, ExpandedNode, GeneaDocument } from "@/types/domain";

export type LayoutEngine = "legacy" | "vnext" | "v2";

export type LayoutPoint = {
  x: number;
  y: number;
};

export type LayoutNodeType = ExpandedNode["type"] | "fake";

export type LayoutInput = {
  graph: ExpandedGraph;
  document: GeneaDocument | null;
  focusPersonId: string | null;
  focusFamilyId?: string | null;
  collapsedNodeIds?: string[];
  isVertical: boolean;
  generationStep: number;
  personNodeWidth: number;
  personNodeHeightWithPhoto: number;
  personNodeHeightNoPhoto: number;
  layoutEngine?: LayoutEngine;
  previousPositions?: Map<string, LayoutPoint>;
};

export type LayoutOutput = {
  positions: Map<string, LayoutPoint>;
  diagnostics: LayoutDiagnostics;
};

export type LayoutDiagnostics = {
  engine: LayoutEngine;
  warnings: string[];
  fallbackFrom?: LayoutEngine;
};

export type VirtualLayoutNode = {
  id: string;
  kind: "entity" | "row";
  entityId?: string;
  nodeType: LayoutNodeType;
  children: VirtualLayoutNode[];
  relationHint?:
  | "union-chain"
  | "siblings"
  | "collateral-exterior"
  | "parents"
  | "generic";
  sidePreferenceContext?:
  | "centerFam"
  | "sibling"
  | "paternal"
  | "maternal"
  | "paternal-exterior"
  | "maternal-exterior"
  | "neutral";
  isPlaceholder?: boolean;
};

export type FamilyOrderKey = {
  isPrimaryBranch: 0 | 1;
  childrenRank: 0 | 1;
  marriageOrder: number;
  familyId: string;
};
