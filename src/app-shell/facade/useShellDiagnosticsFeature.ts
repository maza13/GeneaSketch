import { applyDiagnosticFixes } from "@/core/diagnostics/fixExecutor";
import type { AppShellFacade } from "./types";
import type { GraphDocument } from "@/core/read-model/types";

type Params = {
  open: boolean;
  viewModel: AppShellFacade["features"]["diagnostics"]["viewModel"];
  document: GraphDocument | null;
  setShowDiagnostics: (open: boolean) => void;
  setSelectedPerson: (personId: string | null) => void;
  applyProjectedDocument: (document: GraphDocument, source: "merge") => void;
};

export function useShellDiagnosticsFeature(params: Params): AppShellFacade["features"]["diagnostics"] {
  return {
    open: params.open,
    viewModel: params.viewModel,
    commands: {
      onClose: () => params.setShowDiagnostics(false),
      onSelectPerson: (personId) => {
        params.setSelectedPerson(personId);
        params.setShowDiagnostics(false);
      },
      onSelectFamily: (familyId) => {
        const family = params.document?.families[familyId];
        const candidate = family?.husbandId || family?.wifeId || family?.childrenIds[0];
        if (candidate) params.setSelectedPerson(candidate);
        params.setShowDiagnostics(false);
      },
      onApplyActions: (diagnosticActions) => {
        if (!params.document) return null;
        const { nextDoc, result } = applyDiagnosticFixes(params.document, diagnosticActions);
        params.applyProjectedDocument(nextDoc, "merge");
        return result;
      },
      resolveEntityLabel: (entityId) => {
        if (!params.document) return undefined;
        if (entityId.startsWith("@I")) return params.document.persons[entityId]?.name;
        if (entityId.startsWith("@F")) return entityId;
        return undefined;
      },
    },
  };
}
