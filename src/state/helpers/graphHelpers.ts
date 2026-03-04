import { ViewConfig, ExpandedGraph } from "@/types/domain";
import type { GraphDocument } from "@/core/read-model/types";
import { expandGraph } from "@/core/graph/expand";

/**
 * Ensures the expanded graph is up to date based on the current document and view configuration.
 */
export function ensureExpanded(doc: GraphDocument | null, config: ViewConfig | null): ExpandedGraph {
    if (!doc || !config) return { nodes: [], edges: [] };
    return expandGraph(doc, config);
}
