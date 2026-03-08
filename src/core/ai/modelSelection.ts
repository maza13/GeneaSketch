import type { AiModelCatalogEntry } from "@/types/ai";

export function chooseProviderModel(catalog: AiModelCatalogEntry[], currentModel: string): string {
  if (catalog.some((entry) => entry.id === currentModel)) return currentModel;
  const recommended = catalog.find((entry) => entry.recommended)?.id;
  if (recommended) return recommended;
  return catalog[0]?.id ?? currentModel;
}
