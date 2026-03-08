import { genraphToDocument as projectLegacyDocument } from "@/core/genraph/GedcomBridge";
import type { GenraphGraph } from "@/core/genraph";
import type { GraphProjectionDocument } from "./types";

export function projectLegacyGraphDocument(graph: GenraphGraph | null): GraphProjectionDocument | null {
  if (!graph) return null;
  return projectLegacyDocument(graph) as GraphProjectionDocument;
}
