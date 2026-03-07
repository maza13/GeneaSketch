import { gschemaToDocument as projectLegacyDocument } from "@/core/gschema/GedcomBridge";
import type { GSchemaGraph } from "@/core/gschema/GSchemaGraph";
import type { GraphProjectionDocument } from "./types";

export function projectLegacyGraphDocument(graph: GSchemaGraph | null): GraphProjectionDocument | null {
  if (!graph) return null;
  return projectLegacyDocument(graph) as GraphProjectionDocument;
}
