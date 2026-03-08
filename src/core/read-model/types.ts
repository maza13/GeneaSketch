import type {
  Family,
  GeneaDocument,
  Person,
  RecentPayloadV2,
} from "@/types/domain";

export type ReadModelMode = "direct" | "legacy";

export type GraphDocument = GeneaDocument;
export type GraphProjectionDocument = GraphDocument & {
  xrefToUid?: Record<string, string>;
  uidToXref?: Record<string, string>;
};
export type GraphPerson = Person & {
  genraphMeta?: { uid: string; source: "direct" };
};
export type GraphFamily = Family & {
  genraphMeta?: { uid: string; source: "direct" };
};

export type GraphStatsSummary = {
  persons: number;
  families: number;
  living: number;
  deceased: number;
};

export type GraphSearchEntry = {
  id: string;
  name: string;
  surname?: string;
  lifeStatus: Person["lifeStatus"];
  birthDate?: string;
  deathDate?: string;
};

export type GraphTimelineInput = {
  persons: GraphPerson[];
  families: GraphFamily[];
};

export type GraphSource = "ai" | "ged" | "gsk" | "session" | "merge" | "mock";

export type GraphPayload = {
  graph: import("@/core/genraph").GenraphGraph | null;
  source: GraphSource;
};

export type { RecentPayloadV2 };
