import { useMemo, useState } from "react";
import type { PersonPickerViewModel } from "@/app-shell/facade/types";
import { StandardModal } from "@/ui/common/StandardModal";

type Props = {
  viewModel: PersonPickerViewModel | null;
  onLink: (existingPersonId: string) => void;
  onClose: () => void;
};

export function ShellPersonPickerModal({ viewModel, onLink, onClose }: Props) {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    if (!viewModel) return [];
    const normalized = query.toLowerCase().trim();
    if (!normalized) return viewModel.options;
    return viewModel.options.filter((person) =>
      person.name.toLowerCase().includes(normalized) || (person.surname?.toLowerCase() ?? "").includes(normalized),
    );
  }, [query, viewModel]);

  if (!viewModel) return null;

  return (
    <StandardModal open={viewModel.open} title={viewModel.relationType === "kinship" ? "Calcular parentesco con" : `Vincular: ${viewModel.relationType}`} onClose={onClose} size="md">
      <div style={{ padding: "0 4px", display: "flex", flexDirection: "column", gap: 16, height: "100%" }}>
        <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar por nombre o apellido..." />
        <div className="gs-custom-scrollbar" style={{ flex: 1, maxHeight: "400px", overflowY: "auto", display: "flex", flexDirection: "column", gap: 2, paddingRight: 4 }}>
          {filtered.length === 0 ? (
            <div className="gs-alert gs-alert--info" style={{ textAlign: "center", padding: "30px 20px" }}>
              No se han encontrado coincidencias
            </div>
          ) : (
            filtered.map((person) => (
              <button
                key={person.id}
                className="secondary-ghost"
                onClick={() => {
                  onLink(person.id);
                  onClose();
                }}
                style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", padding: "12px 16px", textAlign: "left", width: "100%", borderRadius: 12, height: "auto", gap: 4 }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", width: "100%", alignItems: "center" }}>
                  <span style={{ fontWeight: 600, fontSize: "15px" }}>{person.name} {person.surname || ""}</span>
                  <span style={{ fontSize: "11px", opacity: 0.5, fontFamily: "monospace" }}>{person.id}</span>
                </div>
                {person.birthDate ? <div style={{ fontSize: "12px", opacity: 0.6 }}>Nac: {person.birthDate}</div> : null}
              </button>
            ))
          )}
        </div>
      </div>
    </StandardModal>
  );
}
