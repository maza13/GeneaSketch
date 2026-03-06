export type XrefPrefix = "I" | "F" | "S" | "N" | "M";

export type XrefResolver = {
  xrefOf(nodeUid: string, prefix: XrefPrefix): string;
  snapshot(): Map<string, string>;
};

function synthesizeXref(nodeUid: string, prefix: XrefPrefix): string {
  const short = nodeUid.slice(0, 8).toUpperCase().replace(/-/g, "");
  return `${prefix}${short}`;
}

export function createXrefResolver(initial?: Iterable<[string, string]>): XrefResolver {
  const uidToXref = new Map(initial);

  return {
    xrefOf(nodeUid: string, prefix: XrefPrefix): string {
      const existing = uidToXref.get(nodeUid);
      if (existing) return existing;
      const next = synthesizeXref(nodeUid, prefix);
      uidToXref.set(nodeUid, next);
      return next;
    },
    snapshot(): Map<string, string> {
      return new Map(uidToXref);
    },
  };
}
