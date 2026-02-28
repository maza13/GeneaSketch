import { useMemo, useState } from "react";
import type { GeneaDocument } from "@/types/domain";
import { LayerPanel } from "./LayerPanel";

type Props = {
  document: GeneaDocument | null;
  selectedPersonId: string | null;
  onSelectPerson: (id: string) => void;
  onCreatePerson: () => void;
};

type SortField = "id" | "name" | "surname" | "birth";

export function LeftPanel({ document, selectedPersonId, onSelectPerson, onCreatePerson }: Props) {
  const [query, setQuery] = useState("");
  const [sortBy, setSortBy] = useState<SortField>("id");
  const [sortDesc, setSortDesc] = useState(false);

  const people = useMemo(() => {
    if (!document) return [];
    const q = query.toLowerCase().trim();
    let list = Object.values(document.persons).filter(
      (p) => !q || p.name.toLowerCase().includes(q) || (p.surname?.toLowerCase() ?? "").includes(q)
    );
    list.sort((a, b) => {
      let cmp = 0;
      if (sortBy === "id") {
        const numA = parseInt(a.id.replace(/\D/g, ""), 10) || 0;
        const numB = parseInt(b.id.replace(/\D/g, ""), 10) || 0;
        cmp = numA - numB;
      } else if (sortBy === "name") {
        cmp = a.name.localeCompare(b.name);
      } else if (sortBy === "surname") {
        cmp = (a.surname || "").localeCompare(b.surname || "");
      } else if (sortBy === "birth") {
        const dateA = a.events.find(e => e.type === "BIRT")?.date || "";
        const dateB = b.events.find(e => e.type === "BIRT")?.date || "";
        cmp = dateA.localeCompare(dateB);
      }
      return sortDesc ? -cmp : cmp;
    });
    return list;
  }, [document, query, sortBy, sortDesc]);

  return (
    <aside className="panel panel-left" style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <LayerPanel document={document} />

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
        <h2 style={{ margin: 0 }}>Personas</h2>
        <button onClick={onCreatePerson} title="Crear nueva persona" style={{ padding: "4px 8px", fontSize: "1.2em", lineHeight: 1 }}>➕</button>
      </div>

      <input id="person-search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Buscar (Ctrl+K)" />

      <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
        <select value={sortBy} onChange={(e) => setSortBy(e.target.value as SortField)} style={{ flex: 1 }}>
          <option value="id">Orden ID (Creacion)</option>
          <option value="name">Nombres</option>
          <option value="surname">Apellidos</option>
          <option value="birth">Fecha de nacimiento</option>
        </select>
        <button onClick={() => setSortDesc(p => !p)} title="Invertir orden" style={{ padding: "8px 10px" }}>
          {sortDesc ? "⬇️ Desc" : "⬆️ Asc"}
        </button>
      </div>

      <div className="list">
        {people.map((p) => (
          <button key={p.id} className={selectedPersonId === p.id ? "list-item active" : "list-item"} onClick={() => onSelectPerson(p.id)}>
            <strong>{p.name} {p.surname ? p.surname : ""}</strong>
            <span>{p.id}</span>
          </button>
        ))}
      </div>
    </aside>
  );
}
