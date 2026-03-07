import { calculateDetailedStatistics } from "@/core/graph/statistics";
import { extractSubTree } from "@/core/edit/generators";
import { buildTimeline } from "@/core/timeline/buildTimeline";
import type { GraphDocument } from "@/core/read-model/types";
import type { SearchFilterState, SearchSortDirection, SearchSortField } from "@/ui/search/searchEngine";
import { buildSearchResults } from "@/ui/search/searchEngine";
import type { Event, Person, ViewConfig, VisualConfig } from "@/types/domain";
import type {
  BranchExportViewModel,
  LeftPanelViewModel,
  PersonPickerViewModel,
  PersonStatsViewModel,
  RelatedPersonListItem,
  SearchPanelViewModel,
  SelectedPersonPanelViewModel,
  TimelinePanelViewModel,
} from "./types";

function toRelatedPerson(person: Person): RelatedPersonListItem {
  return {
    id: person.id,
    name: person.name,
    surname: person.surname,
    sex: person.sex,
    birthDate: person.birthDate || person.events.find((event: Event) => event.type === "BIRT")?.date,
  };
}

export function buildSelectedPersonPanelViewModel(
  document: GraphDocument | null,
  selectedPersonId: string | null,
): SelectedPersonPanelViewModel {
  if (!document || !selectedPersonId) return { kind: "empty" };

  const person = document.persons[selectedPersonId];
  if (!person) return { kind: "empty" };

  const parents = Object.values(document.families)
    .filter((family) => family.childrenIds.includes(person.id))
    .flatMap((family) => [family.husbandId, family.wifeId])
    .filter((id): id is string => Boolean(id && id !== person.id))
    .map((id) => document.persons[id])
    .filter((candidate): candidate is Person => Boolean(candidate))
    .map(toRelatedPerson);

  const spouses = person.fams
    .map((familyId) => document.families[familyId])
    .filter(Boolean)
    .map((family) => (family.husbandId === person.id ? family.wifeId : family.husbandId))
    .filter((id): id is string => Boolean(id))
    .map((id) => document.persons[id])
    .filter((candidate): candidate is Person => Boolean(candidate))
    .map(toRelatedPerson);

  const children = person.fams
    .map((familyId) => document.families[familyId])
    .filter(Boolean)
    .flatMap((family) => family.childrenIds)
    .map((id) => document.persons[id])
    .filter((candidate): candidate is Person => Boolean(candidate))
    .map(toRelatedPerson);

  return {
    kind: "selected",
    person: {
      id: person.id,
      name: person.name,
      sex: person.sex,
      birthDate: person.birthDate || person.events.find((event) => event.type === "BIRT")?.date,
      birthPlace: person.birthPlace || person.events.find((event) => event.type === "BIRT")?.place,
      deathDate: person.deathDate || person.events.find((event) => event.type === "DEAT")?.date,
      deathPlace: person.deathPlace || person.events.find((event) => event.type === "DEAT")?.place,
      lifeStatus: person.lifeStatus,
    },
    parents,
    spouses,
    children,
  };
}

export function buildLeftPanelViewModel(
  document: GraphDocument | null,
  viewConfig: ViewConfig | null,
  visualConfig: VisualConfig,
): LeftPanelViewModel {
  return {
    hasDocument: Boolean(document),
    documentView: document,
    sections: {
      layersOpen: viewConfig?.leftSections?.layersOpen ?? true,
      treeConfigOpen: viewConfig?.leftSections?.treeConfigOpen ?? true,
      canvasToolsOpen: viewConfig?.leftSections?.canvasToolsOpen ?? false,
    },
    treeConfig: viewConfig
      ? {
          isVertical: viewConfig.dtree?.isVertical ?? false,
          preset: viewConfig.preset,
          depth: viewConfig.depth,
          showSpouses: viewConfig.showSpouses,
        }
      : null,
    canvasTools: {
      gridEnabled: visualConfig.gridEnabled,
      positionCount: Object.keys(visualConfig.nodePositions).length,
    },
  };
}

export function buildVisiblePersonIds(document: GraphDocument | null, expandedGraph: { nodes: Array<{ type: string; canonicalId?: string; id: string }> }): string[] {
  if (!document) return [];
  const ids = new Set<string>();
  for (const node of expandedGraph.nodes) {
    if (node.type !== "person" && node.type !== "personAlias") continue;
    const canonicalId = node.canonicalId || node.id;
    if (document.persons[canonicalId]) ids.add(canonicalId);
  }
  return Array.from(ids);
}

export function buildTimelinePanelViewModel(
  document: GraphDocument | null,
  expandedGraph: { nodes: any[]; edges: any[] },
  viewConfig: ViewConfig | null,
): TimelinePanelViewModel {
  const items = document && viewConfig ? buildTimeline(document, expandedGraph, viewConfig) : [];
  const years = items
    .filter((item) => item.sortDate)
    .map((item) => (item.sortDate as Date).getUTCFullYear());
  const currentYear = new Date().getFullYear();
  const bounds = years.length === 0
    ? { min: currentYear - 120, max: currentYear + 20 }
    : { min: Math.min(...years) - 5, max: Math.max(...years) + 5 };
  const timelineOverlay = viewConfig?.dtree?.overlays.find((overlay) => overlay.type === "timeline");
  const scope = viewConfig?.timeline.scope ?? "visible";

  return {
    isOpen: viewConfig?.timelinePanelOpen ?? false,
    isExpanded: (viewConfig?.rightStack?.timelineMode ?? "compact") === "expanded",
    items,
    activeItemId: timelineOverlay?.config.sourceItemId ?? null,
    scopeLabel: scope === "all" ? "Todo el archivo" : "Solo visibles",
    timelineView: viewConfig?.timeline.view ?? "list",
    scaleZoom: viewConfig?.timeline.scaleZoom ?? 1,
    scaleOffset: viewConfig?.timeline.scaleOffset ?? 0,
    bounds,
  };
}

export function buildSearchViewModel(
  open: boolean,
  document: GraphDocument | null,
  query: string,
  sortField: SearchSortField,
  sortDirection: SearchSortDirection,
  filters: SearchFilterState,
): SearchPanelViewModel {
  const results = document ? buildSearchResults(document, query, sortField, sortDirection, filters) : [];
  return {
    open,
    query,
    sortField,
    sortDirection,
    filters,
    results,
    hasSearchData: Boolean(document),
  };
}

export function buildPersonPickerViewModel(
  document: GraphDocument | null,
  picker: { anchorId: string; type: import("@/types/domain").PendingRelationType | "kinship" } | null,
): PersonPickerViewModel | null {
  if (!document || !picker) return null;
  const options = Object.values(document.persons)
    .filter((person) => person.id !== picker.anchorId)
    .map((person) => ({
      id: person.id,
      name: person.name,
      surname: person.surname,
      birthDate: person.birthDate || person.events.find((event) => event.type === "BIRT")?.date,
    }))
    .sort((left, right) => `${left.name} ${left.surname || ""}`.localeCompare(`${right.name} ${right.surname || ""}`));

  return {
    open: true,
    anchorId: picker.anchorId,
    relationType: picker.type,
    options,
  };
}

export function buildBranchExportViewModel(document: GraphDocument | null, branchAnchorId: string | null): BranchExportViewModel | null {
  if (!document || !branchAnchorId) return null;
  const person = document.persons[branchAnchorId];
  if (!person) return null;

  return {
    open: true,
    personId: person.id,
    personName: `${person.name} ${person.surname || ""}`.trim(),
    previews: {
      all_ancestors: (() => {
        const sub = extractSubTree(document, person.id, "all_ancestors");
        return { persons: Object.keys(sub.persons).length, families: Object.keys(sub.families).length };
      })(),
      paternal_ancestors: (() => {
        const sub = extractSubTree(document, person.id, "paternal_ancestors");
        return { persons: Object.keys(sub.persons).length, families: Object.keys(sub.families).length };
      })(),
      maternal_ancestors: (() => {
        const sub = extractSubTree(document, person.id, "maternal_ancestors");
        return { persons: Object.keys(sub.persons).length, families: Object.keys(sub.families).length };
      })(),
      all_descendants: (() => {
        const sub = extractSubTree(document, person.id, "all_descendants");
        return { persons: Object.keys(sub.persons).length, families: Object.keys(sub.families).length };
      })(),
    },
  };
}

export function buildPersonStatsViewModel(document: GraphDocument | null, personId: string | null): PersonStatsViewModel {
  if (!document || !personId) return { kind: "empty" };
  const person = document.persons[personId];
  if (!person) return { kind: "empty" };
  return {
    kind: "ready",
    personId,
    personName: person.name,
    personSex: person.sex,
    stats: calculateDetailedStatistics(document, personId),
  };
}

export function hasMeaningfulDocument(document: GraphDocument | null): boolean {
  if (!document) return false;
  const personIds = Object.keys(document.persons);
  if (personIds.length > 1 || Object.keys(document.families).length > 0) return true;
  if (personIds.length === 0) return false;
  const root = document.persons[personIds[0]];
  return Boolean(root && (root.name !== "(Sin nombre)" || root.isPlaceholder === false));
}
