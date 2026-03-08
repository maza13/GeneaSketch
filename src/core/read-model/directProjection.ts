import type {
  Event as GeneaEvent,
  Media,
  NoteRecord,
  Person,
  SourceRecord,
  SourceRef,
} from "@/types/domain";
import { inferCanonicalSurnameFields, normalizePersonSurnames } from "@/core/naming/surname";
import { ensureParentChildUnionLinks } from "@/core/genraph/FamilyNormalization";
import { GenraphGraph } from "@/core/genraph/GenraphGraph";
import { PersonPredicates, UnionPredicates } from "@/core/genraph/predicates";
import { createXrefResolver, type XrefPrefix } from "@/core/genraph/xref";
import type {
  GClaim,
  GeoRef,
  MemberEdge,
  MediaNode,
  NoteNode,
  ParentChildEdge,
  ParsedDate,
  PersonNode,
  SourceNode,
  UnionNode,
} from "@/core/genraph/types";
import type {
  GraphFamily,
  GraphPerson,
  GraphProjectionDocument,
  GraphTimelineInput,
} from "./types";

function normalizeDisplayName(raw: string | undefined): string {
  if (!raw) return "";
  return raw.replaceAll("/", " ").replace(/\s+/g, " ").trim();
}

function safeJsonParse<T>(raw: string | undefined): T | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

function extractPlaceRaw(value: unknown): string | undefined {
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : undefined;
  }
  if (value && typeof value === "object" && "placeRaw" in (value as Record<string, unknown>)) {
    const raw = (value as { placeRaw?: unknown }).placeRaw;
    if (typeof raw === "string") {
      const trimmed = raw.trim();
      return trimmed.length > 0 ? trimmed : undefined;
    }
  }
  return undefined;
}

function confidenceToQuay(confidence?: number): SourceRef["quality"] | undefined {
  if (confidence === undefined || Number.isNaN(confidence)) return undefined;
  if (confidence >= 0.9) return "3";
  if (confidence >= 0.7) return "2";
  if (confidence >= 0.4) return "1";
  return "0";
}

function buildInformalMirrorNotes(dateValue: ParsedDate | null | undefined): string[] {
  const raw = dateValue?.raw?.trim();
  if (!raw || !dateValue?.isInformal) return [];
  if (/\b\d{4}\b/.test(raw)) return [];
  return [`GSK_RAW_DATE ${raw}`];
}

function natureToPedi(nature: ParentChildEdge["nature"]): "BIRTH" | "ADOPTED" | "FOSTER" | "SEALING" | "UNKNOWN" {
  if (nature === "BIO") return "BIRTH";
  if (nature === "ADO") return "ADOPTED";
  if (nature === "FOS") return "FOSTER";
  if (nature === "SEAL") return "SEALING";
  return "UNKNOWN";
}

function certaintyToQuay(certainty: ParentChildEdge["certainty"]): "0" | "1" | "2" | "3" {
  if (certainty === "high") return "3";
  if (certainty === "medium") return "2";
  if (certainty === "low") return "1";
  return "0";
}

function sourceRefsFromClaim(
  graph: GenraphGraph,
  claim: GClaim | null | undefined,
  xrefOf: (nodeUid: string, prefix: "I" | "F" | "S" | "N" | "M") => string
): SourceRef[] {
  if (!claim?.citations || claim.citations.length === 0) return [];
  const refs: SourceRef[] = [];
  const seen = new Set<string>();
  for (const citation of claim.citations) {
    const sourceNode = graph.node(citation.sourceUid);
    if (!sourceNode || sourceNode.type !== "Source") continue;
    const id = xrefOf(citation.sourceUid, "S");
    const key = `${id}:${citation.page ?? ""}:${citation.transcription ?? ""}`;
    if (seen.has(key)) continue;
    seen.add(key);
    refs.push({
      id,
      page: citation.page,
      text: citation.transcription,
      quality: confidenceToQuay(citation.confidence),
    });
  }
  return refs;
}

function buildPersonEventsFromClaims(
  nodeUid: string,
  graph: GenraphGraph,
  xrefOf: (nodeUid: string, prefix: "I" | "F" | "S" | "N" | "M") => string
): GeneaEvent[] {
  const events: GeneaEvent[] = [];

  const eventMap: Array<{ type: GeneaEvent["type"]; datePred: string; placePred: string }> = [
    { type: "BIRT", datePred: PersonPredicates.EVENT_BIRTH_DATE, placePred: PersonPredicates.EVENT_BIRTH_PLACE },
    { type: "DEAT", datePred: PersonPredicates.EVENT_DEATH_DATE, placePred: PersonPredicates.EVENT_DEATH_PLACE },
    { type: "BURI", datePred: PersonPredicates.EVENT_BURIAL_DATE, placePred: PersonPredicates.EVENT_BURIAL_PLACE },
    { type: "CHR", datePred: PersonPredicates.EVENT_CHRISTENING_DATE, placePred: PersonPredicates.EVENT_CHRISTENING_PLACE },
    { type: "BAPM", datePred: PersonPredicates.EVENT_BAPTISM_DATE, placePred: PersonPredicates.EVENT_BAPTISM_PLACE },
    { type: "CENS", datePred: PersonPredicates.EVENT_CENSUS_DATE, placePred: PersonPredicates.EVENT_CENSUS_PLACE },
  ];

  for (const { type, datePred, placePred } of eventMap) {
    const dateClaim = graph.getPreferred(nodeUid, datePred);
    const placeClaim = graph.getPreferred(nodeUid, placePred);
    if (!dateClaim && !placeClaim) continue;

    const mergedRefs = [
      ...sourceRefsFromClaim(graph, dateClaim, xrefOf),
      ...sourceRefsFromClaim(graph, placeClaim, xrefOf),
    ];
    const dateValue = (dateClaim?.value as ParsedDate | null) ?? null;
    events.push({
      id: `${nodeUid}:${type}`,
      type,
      date: dateValue?.raw,
      place: extractPlaceRaw(placeClaim?.value),
      sourceRefs: mergedRefs,
      mediaRefs: [],
      notesInline: buildInformalMirrorNotes(dateValue),
      noteRefs: [],
    });
  }

  return events;
}

function buildUnionEventsFromClaims(
  nodeUid: string,
  graph: GenraphGraph,
  xrefOf: (nodeUid: string, prefix: "I" | "F" | "S" | "N" | "M") => string
): GeneaEvent[] {
  const events: GeneaEvent[] = [];

  const marriageDateClaim = graph.getPreferred(nodeUid, UnionPredicates.EVENT_MARRIAGE_DATE);
  const marriagePlaceClaim = graph.getPreferred(nodeUid, UnionPredicates.EVENT_MARRIAGE_PLACE);
  if (marriageDateClaim || marriagePlaceClaim) {
    const mergedRefs = [
      ...sourceRefsFromClaim(graph, marriageDateClaim, xrefOf),
      ...sourceRefsFromClaim(graph, marriagePlaceClaim, xrefOf),
    ];
    const marriageDateValue = (marriageDateClaim?.value as ParsedDate | null) ?? null;
    events.push({
      id: `${nodeUid}:MARR`,
      type: "MARR",
      date: marriageDateValue?.raw,
      place: extractPlaceRaw(marriagePlaceClaim?.value),
      sourceRefs: mergedRefs,
      mediaRefs: [],
      notesInline: buildInformalMirrorNotes(marriageDateValue),
      noteRefs: [],
    });
  }

  const divorceDateClaim = graph.getPreferred(nodeUid, UnionPredicates.EVENT_DIVORCE_DATE);
  const divorcePlaceClaim = graph.getPreferred(nodeUid, UnionPredicates.EVENT_DIVORCE_PLACE);
  if (divorceDateClaim || divorcePlaceClaim) {
    const mergedRefs = [
      ...sourceRefsFromClaim(graph, divorceDateClaim, xrefOf),
      ...sourceRefsFromClaim(graph, divorcePlaceClaim, xrefOf),
    ];
    const divorceDateValue = (divorceDateClaim?.value as ParsedDate | null) ?? null;
    events.push({
      id: `${nodeUid}:DIV`,
      type: "DIV",
      date: divorceDateValue?.raw,
      place: extractPlaceRaw(divorcePlaceClaim?.value),
      sourceRefs: mergedRefs,
      mediaRefs: [],
      notesInline: buildInformalMirrorNotes(divorceDateValue),
      noteRefs: [],
    });
  }

  return events;
}

function collectChildrenForUnionStrict(
  unionUid: string,
  members: Array<{ person: PersonNode; edge: MemberEdge }>,
  parentChildEdgesByUnion: Map<string, ParentChildEdge[]>,
  parentChildEdgesByChild: Map<string, ParentChildEdge[]>,
  parentChildEdgesByParent: Map<string, ParentChildEdge[]>,
  xrefOf: (uid: string, prefix: XrefPrefix) => string
): string[] {
  if (members.length === 0) return [];

  const parentUidSet = new Set(members.map((member) => member.person.uid));
  const husbandUid = members.find((member) => member.edge.role === "HUSB")?.person.uid;
  const wifeUid = members.find((member) => member.edge.role === "WIFE")?.person.uid;
  const explicitChildren = new Set<string>();
  for (const edge of parentChildEdgesByUnion.get(unionUid) ?? []) {
    explicitChildren.add(edge.toUid);
  }
  if (explicitChildren.size > 0) {
    return [...explicitChildren].map((uid) => xrefOf(uid, "I"));
  }

  const candidateChildren = new Set<string>();
  for (const parentUid of parentUidSet) {
    for (const edge of parentChildEdgesByParent.get(parentUid) ?? []) {
      if (!parentUidSet.has(edge.fromUid)) continue;
      if (!(parentChildEdgesByChild.get(edge.toUid)?.length)) continue;
      candidateChildren.add(edge.toUid);
    }
  }

  const accepted = new Set<string>();
  for (const childUid of candidateChildren) {
    const edgesToChild = parentChildEdgesByChild.get(childUid) ?? [];
    const memberEdgesToChild = edgesToChild.filter((edge) => parentUidSet.has(edge.fromUid));
    if (memberEdgesToChild.length === 0) continue;

    const externalFather = edgesToChild.some((edge) => edge.parentRole === "father" && !parentUidSet.has(edge.fromUid));
    if (externalFather) continue;

    const externalMother = edgesToChild.some((edge) => edge.parentRole === "mother" && !parentUidSet.has(edge.fromUid));
    if (externalMother) continue;

    if (husbandUid) {
      const conflictingFather = edgesToChild.some((edge) => edge.parentRole === "father" && edge.fromUid !== husbandUid);
      if (conflictingFather) continue;
    }
    if (wifeUid) {
      const conflictingMother = edgesToChild.some((edge) => edge.parentRole === "mother" && edge.fromUid !== wifeUid);
      if (conflictingMother) continue;
    }

    accepted.add(childUid);
  }

  return [...accepted].map((uid) => xrefOf(uid, "I"));
}

function collectFamcLinksForUnion(
  unionUid: string,
  parentChildEdgesByUnion: Map<string, ParentChildEdge[]>,
  xrefOf: (uid: string, prefix: XrefPrefix) => string
): Array<{ personId: string; familyId: string; pedi: "BIRTH" | "ADOPTED" | "FOSTER" | "SEALING" | "UNKNOWN"; quality: "0" | "1" | "2" | "3"; reference?: string }> {
  const familyId = xrefOf(unionUid, "F");
  const byChild = new Map<string, ParentChildEdge[]>();

  for (const edge of parentChildEdgesByUnion.get(unionUid) ?? []) {
    if (!byChild.has(edge.toUid)) byChild.set(edge.toUid, []);
    byChild.get(edge.toUid)!.push(edge);
  }

  const links: Array<{ personId: string; familyId: string; pedi: "BIRTH" | "ADOPTED" | "FOSTER" | "SEALING" | "UNKNOWN"; quality: "0" | "1" | "2" | "3"; reference?: string }> = [];
  for (const [childUid, edges] of byChild.entries()) {
    const sorted = [...edges].sort((left, right) => {
      const roleRank = (role: ParentChildEdge["parentRole"]) => (role === "father" ? 0 : role === "mother" ? 1 : 2);
      const roleDiff = roleRank(left.parentRole) - roleRank(right.parentRole);
      if (roleDiff !== 0) return roleDiff;
      return left.uid.localeCompare(right.uid);
    });

    const selected = sorted[0];
    links.push({
      personId: xrefOf(childUid, "I"),
      familyId,
      pedi: natureToPedi(selected.nature),
      quality: certaintyToQuay(selected.certainty),
      reference: selected.nature === "STE" ? "gsk:nature:STE" : undefined,
    });
  }

  return links;
}

export function buildDirectDocument(
  graphInput: GenraphGraph,
  targetVersion: "5.5.1" | "7.0.x" = "7.0.x"
): GraphProjectionDocument {
  const inputEdges = graphInput.allEdges();
  const needsRepair = inputEdges.some((edge) => edge.type === "ParentChild" && !edge.unionUid);
  let graph = graphInput;
  if (needsRepair) {
    const exportData = graphInput.toData();
    const repair = ensureParentChildUnionLinks(exportData);
    if (repair.repairedEdges > 0) {
      graph = GenraphGraph.fromData(exportData, graphInput.getJournal());
    }
  }

  const persons: Record<string, GraphPerson> = {};
  const families: Record<string, GraphFamily> = {};
  const sources: Record<string, SourceRecord> = {};
  const notes: Record<string, NoteRecord> = {};
  const media: Record<string, Media> = {};
  const allNodes = graph.allNodes();
  const allEdges = graph.allEdges();
  const nodeByUid = new Map(allNodes.map((node) => [node.uid, node] as const));

  const xrefResolver = createXrefResolver(
    allNodes
      .filter((node) => !!node.xref)
      .map((node) => [node.uid, node.xref!] as [string, string])
  );

  function xrefOf(nodeUid: string, prefix: XrefPrefix): string {
    return xrefResolver.xrefOf(nodeUid, prefix);
  }

  const sourceNodes: SourceNode[] = [];
  const noteNodes: NoteNode[] = [];
  const mediaNodes: MediaNode[] = [];
  const personNodes: PersonNode[] = [];
  const unionNodes: UnionNode[] = [];
  const parentChildEdges: ParentChildEdge[] = [];
  const parentChildEdgesByUnion = new Map<string, ParentChildEdge[]>();
  const parentChildEdgesByChild = new Map<string, ParentChildEdge[]>();
  const parentChildEdgesByParent = new Map<string, ParentChildEdge[]>();
  const membersByUnion = new Map<string, Array<{ person: PersonNode; edge: MemberEdge }>>();

  for (const node of allNodes) {
    if (node.type === "Source") sourceNodes.push(node as SourceNode);
    else if (node.type === "Note") noteNodes.push(node as NoteNode);
    else if (node.type === "Media") mediaNodes.push(node as MediaNode);
    else if (node.type === "Person") personNodes.push(node as PersonNode);
    else if (node.type === "Union") unionNodes.push(node as UnionNode);
  }

  for (const edge of allEdges) {
    if (edge.type === "ParentChild") {
      parentChildEdges.push(edge);

      if (edge.unionUid) {
        if (!parentChildEdgesByUnion.has(edge.unionUid)) parentChildEdgesByUnion.set(edge.unionUid, []);
        parentChildEdgesByUnion.get(edge.unionUid)!.push(edge);
      }

      if (!parentChildEdgesByChild.has(edge.toUid)) parentChildEdgesByChild.set(edge.toUid, []);
      parentChildEdgesByChild.get(edge.toUid)!.push(edge);

      if (!parentChildEdgesByParent.has(edge.fromUid)) parentChildEdgesByParent.set(edge.fromUid, []);
      parentChildEdgesByParent.get(edge.fromUid)!.push(edge);
      continue;
    }

    if (edge.type !== "Member") continue;
    const person = nodeByUid.get(edge.fromUid);
    if (!person || person.type !== "Person") continue;
    if (!membersByUnion.has(edge.toUid)) membersByUnion.set(edge.toUid, []);
    membersByUnion.get(edge.toUid)!.push({ person: person as PersonNode, edge });
  }

  function getValue<T>(nodeUid: string, predicate: string): T | null {
    return graph.getValue<T>(nodeUid, predicate);
  }

  function getStringValue(nodeUid: string, predicate: string): string | undefined {
    const value = getValue<string>(nodeUid, predicate);
    return typeof value === "string" ? value : undefined;
  }

  function getDateString(nodeUid: string, predicate: string): string | undefined {
    const value = getValue<ParsedDate>(nodeUid, predicate);
    return value?.raw;
  }

  function getPlaceString(nodeUid: string, predicate: string): string | undefined {
    const value = getValue<GeoRef | string>(nodeUid, predicate);
    return extractPlaceRaw(value);
  }

  for (const source of sourceNodes) {
    const xref = xrefOf(source.uid, "S");
    sources[xref] = { id: xref, title: source.title };
  }

  for (const note of noteNodes) {
    const xref = xrefOf(note.uid, "N");
    notes[xref] = { id: xref, text: note.text };
  }

  for (const item of mediaNodes) {
    const xref = xrefOf(item.uid, "M");
    media[xref] = {
      id: xref,
      fileName: item.fileName,
      title: item.title,
      mimeType: item.mimeType,
      dataUrl: item.dataUrl,
    };
  }

  for (const personNode of personNodes) {
    const xref = xrefOf(personNode.uid, "I");

    const given = getStringValue(personNode.uid, PersonPredicates.NAME_GIVEN)?.trim();
    const surnameFromClaim = getStringValue(personNode.uid, PersonPredicates.NAME_SURNAME)?.trim();
    const full = getStringValue(personNode.uid, PersonPredicates.NAME_FULL)?.trim();
    const extPaternal = getStringValue(personNode.uid, PersonPredicates.EXT_SURNAME_PATERNAL)?.trim();
    const extMaternal = getStringValue(personNode.uid, PersonPredicates.EXT_SURNAME_MATERNAL)?.trim();
    const extOrder = getStringValue(personNode.uid, PersonPredicates.EXT_SURNAME_ORDER)?.trim() as Person["surnameOrder"] | undefined;
    const parsedNames = safeJsonParse<Person["names"]>(getStringValue(personNode.uid, PersonPredicates.EXT_NAMES_FULL));
    const eventProjection = safeJsonParse<GeneaEvent[]>(getStringValue(personNode.uid, PersonPredicates.EXT_EVENTS_FULL));
    const noteRefsProjection = safeJsonParse<string[]>(getStringValue(personNode.uid, PersonPredicates.EXT_NOTES_REFS));
    const inlineNotesProjection = safeJsonParse<string[]>(getStringValue(personNode.uid, PersonPredicates.EXT_NOTES_RAWTAGS));

    const inferred = inferCanonicalSurnameFields({ rawSurname: surnameFromClaim, preferredOrder: "paternal_first" });
    const canonical = normalizePersonSurnames({
      surname: surnameFromClaim,
      surnamePaternal: extPaternal || inferred.surnamePaternal,
      surnameMaternal: extMaternal || inferred.surnameMaternal,
      surnameOrder: extOrder || inferred.surnameOrder,
    });

    const synthesized = given ? [given, canonical.surname].filter(Boolean).join(" ").trim() : undefined;
    const fullDisplay = normalizeDisplayName(full);
    const name = normalizeDisplayName(given) || fullDisplay || "(Sin nombre)";

    const events = eventProjection || buildPersonEventsFromClaims(personNode.uid, graph, xrefOf);
    const names = parsedNames && parsedNames.length > 0
      ? parsedNames
      : [{
          value: synthesized || fullDisplay || name,
          given: given || undefined,
          surname: canonical.surname || undefined,
          type: "primary" as const,
          primary: true,
        }];

    persons[xref] = {
      id: xref,
      name,
      surname: canonical.surname,
      surnamePaternal: canonical.surnamePaternal,
      surnameMaternal: canonical.surnameMaternal,
      surnameOrder: canonical.surnameOrder,
      names,
      sex: (personNode.sex as Person["sex"]) ?? "U",
      lifeStatus: personNode.isLiving ? "alive" : "deceased",
      isPlaceholder: personNode.isPlaceholder,
      birthDate: getDateString(personNode.uid, PersonPredicates.EVENT_BIRTH_DATE),
      birthPlace: getPlaceString(personNode.uid, PersonPredicates.EVENT_BIRTH_PLACE),
      deathDate: getDateString(personNode.uid, PersonPredicates.EVENT_DEATH_DATE),
      deathPlace: getPlaceString(personNode.uid, PersonPredicates.EVENT_DEATH_PLACE),
      residence: getPlaceString(personNode.uid, PersonPredicates.ATTR_RESIDENCE_PLACE),
      events,
      famc: [],
      fams: [],
      mediaRefs: [],
      sourceRefs: [],
      noteRefs: noteRefsProjection || [],
      rawTags: inlineNotesProjection && inlineNotesProjection.length > 0 ? { NOTE: inlineNotesProjection } : undefined,
      genraphMeta: { uid: personNode.uid, source: "direct" },
    };

    if (targetVersion === "5.5.1") {
      const claimsByPredicate = new Map(
        graph
          .getPredicates(personNode.uid)
          .map((predicate) => [predicate, graph.getClaims(personNode.uid, predicate)] as const)
      );
      const conflictMarkers: string[] = [];
      for (const [predicate, claims] of claimsByPredicate.entries()) {
        for (const claim of claims) {
          if (claim.lifecycle === "retracted" || claim.isPreferred) continue;
          conflictMarkers.push(`_GSK_CONFLICT: GSK_CONFLICT|v1|${predicate}|${JSON.stringify(claim)}`);
        }
      }
      if (conflictMarkers.length > 0) {
        const rawTags = persons[xref].rawTags ?? {};
        rawTags.NOTE = [...(rawTags.NOTE ?? []), ...conflictMarkers];
        persons[xref].rawTags = rawTags;
      }
    }
  }

  for (const unionNode of unionNodes) {
    const xref = xrefOf(unionNode.uid, "F");
    const members = membersByUnion.get(unionNode.uid) ?? [];

    const husband = members.find((member) => member.edge.role === "HUSB")
      || members.find((member) => member.edge.role === "PART" && (member.person as PersonNode).sex === "M")
      || (members.some((member) => member.edge.role === "WIFE") ? undefined : members.find((member) => member.edge.role === "PART"));

    const wife = members.find((member) => member.edge.role === "WIFE")
      || members.find((member) => member.edge.role === "PART" && (member.person as PersonNode).sex === "F" && member !== husband)
      || (husband && members.length > 1 ? members.find((member) => member !== husband) : undefined);

    const husbandXref = husband ? xrefOf(husband.person.uid, "I") : undefined;
    const wifeXref = wife ? xrefOf(wife.person.uid, "I") : undefined;

    const childrenXrefs = collectChildrenForUnionStrict(
      unionNode.uid,
      members,
      parentChildEdgesByUnion,
      parentChildEdgesByChild,
      parentChildEdgesByParent,
      xrefOf
    );
    const familyChildLinks = collectFamcLinksForUnion(unionNode.uid, parentChildEdgesByUnion, xrefOf);
    const projectedEvents = safeJsonParse<GeneaEvent[]>(getStringValue(unionNode.uid, UnionPredicates.EXT_EVENTS_FULL));
    const projectedNoteRefs = safeJsonParse<string[]>(getStringValue(unionNode.uid, UnionPredicates.EXT_NOTES_REFS));
    const projectedInlineNotes = safeJsonParse<string[]>(getStringValue(unionNode.uid, UnionPredicates.EXT_NOTES_RAWTAGS));
    const events = projectedEvents || buildUnionEventsFromClaims(unionNode.uid, graph, xrefOf);

    families[xref] = {
      id: xref,
      husbandId: husbandXref,
      wifeId: wifeXref,
      childrenIds: childrenXrefs,
      events,
      noteRefs: projectedNoteRefs || [],
      rawTags: projectedInlineNotes && projectedInlineNotes.length > 0 ? { NOTE: projectedInlineNotes } : undefined,
      genraphMeta: { uid: unionNode.uid, source: "direct" },
    };

    if (husbandXref && persons[husbandXref] && !persons[husbandXref].fams.includes(xref)) {
      persons[husbandXref].fams.push(xref);
    }
    if (wifeXref && persons[wifeXref] && !persons[wifeXref].fams.includes(xref)) {
      persons[wifeXref].fams.push(xref);
    }

    for (const childXref of childrenXrefs) {
      if (persons[childXref] && !persons[childXref].famc.includes(xref)) {
        persons[childXref].famc.push(xref);
      }
    }

    for (const link of familyChildLinks) {
      const person = persons[link.personId];
      if (!person) continue;
      if (!person.famc.includes(link.familyId)) {
        person.famc.push(link.familyId);
      }
      if (!person.famcLinks) person.famcLinks = [];
      const existing = person.famcLinks.find((entry) => entry.familyId === link.familyId);
      if (existing) {
        existing.pedi = link.pedi;
        existing.quality = link.quality;
        existing.reference = link.reference;
      } else {
        person.famcLinks.push({
          familyId: link.familyId,
          pedi: link.pedi,
          quality: link.quality,
          reference: link.reference,
        });
      }
    }
  }

  for (const person of Object.values(persons)) {
    if (person.surnamePaternal || person.surnameMaternal) continue;
    const firstFamc = person.famc[0];
    const family = firstFamc ? families[firstFamc] : undefined;
    const fatherSurname = family?.husbandId ? persons[family.husbandId]?.surname : undefined;
    const motherSurname = family?.wifeId ? persons[family.wifeId]?.surname : undefined;

    const inferred = inferCanonicalSurnameFields({
      rawSurname: person.surname,
      fatherSurname,
      motherSurname,
      preferredOrder: "paternal_first",
    });

    person.surnamePaternal = inferred.surnamePaternal;
    person.surnameMaternal = inferred.surnameMaternal;
    person.surnameOrder = inferred.surnameOrder || person.surnameOrder;
    person.surname = inferred.surname || person.surname;
    if (person.names && person.names.length > 0) {
      const primary = person.names.find((entry) => entry.primary) || person.names[0];
      if (primary) {
        primary.given = primary.given || person.name;
        primary.surname = primary.surname || person.surname;
        primary.value = primary.value || (person.surname ? `${person.name} /${person.surname}/` : person.name);
      }
    }
  }

  const finalXrefToUid: Record<string, string> = {};
  const finalUidToXref: Record<string, string> = {};
  for (const [uid, xref] of xrefResolver.snapshot().entries()) {
    finalXrefToUid[xref] = uid;
    finalUidToXref[uid] = xref;
  }

  return {
    persons,
    families,
    sources: Object.keys(sources).length > 0 ? sources : undefined,
    notes: Object.keys(notes).length > 0 ? notes : undefined,
    media,
    metadata: {
      sourceFormat: "GSK",
      gedVersion: targetVersion,
    },
    xrefToUid: finalXrefToUid,
    uidToXref: finalUidToXref,
  } as GraphProjectionDocument;
}

export function buildDirectPersons(graph: GenraphGraph): GraphPerson[] {
  return Object.values(buildDirectDocument(graph).persons as Record<string, GraphPerson>);
}

export function buildDirectFamilies(graph: GenraphGraph): GraphFamily[] {
  return Object.values(buildDirectDocument(graph).families as Record<string, GraphFamily>);
}

export function buildDirectTimeline(graph: GenraphGraph): GraphTimelineInput {
  return {
    persons: buildDirectPersons(graph),
    families: buildDirectFamilies(graph),
  };
}
