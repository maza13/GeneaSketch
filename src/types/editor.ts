import type { PendingRelationType, Person } from "@/types/domain";

export type PersonEditorPatch = {
  name: string;
  surname?: string;
  birthDate?: string;
  deathDate?: string;
  sex?: "M" | "F" | "U";
  lifeStatus?: "alive" | "deceased";
  photoDataUrl?: string | null;
};

export type PersonRelationInput = PersonEditorPatch;

export type TimelineEventType = "BIRT" | "MARR" | "DIV" | "DEAT";
export type TimelineDateCertainty = "exact" | "estimated_manual" | "inferred_auto" | "undated";

export type TimelineItem = {
  id: string;
  eventType: TimelineEventType;
  label: string;
  detail: string;
  displayDate: string;
  sortDate: Date | null;
  sortTimestamp: number | null;
  certainty: TimelineDateCertainty;
  undated: boolean;
  personIds: string[];
  primaryPersonId: string | null;
  secondaryPersonIds: string[];
  familyId?: string;
};

export type TimelineHighlightPayload = {
  sourceItemId: string;
  primaryPersonId: string | null;
  secondaryPersonIds: string[];
};

export type GraphNodeKind = "person" | "family" | "junction";
export type GraphViewKind = "tree" | "network" | "fan";

export type NodeInteraction = {
  nodeId: string;
  nodeKind: GraphNodeKind;
  view: GraphViewKind;
  clientX: number;
  clientY: number;
};

export type ColorThemeConfig = {
  background: string;
  personNode: string;
  text: string;
  edges: string;
  nodeFontSize: number;
  edgeThickness: number;
  nodeWidth: number;
  nodeHeight: number;
};

export type PersonEditorState =
  | { type: "edit"; personId: string; person: Person }
  | {
    type: "add_relation";
    anchorId: string;
    anchorPerson: Person;
    relationType: PendingRelationType;
  }
  | { type: "create_standalone" }
  | null;
