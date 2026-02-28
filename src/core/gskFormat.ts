import type { ViewConfig, VisualConfig } from "@/types/domain";
import type { ColorThemeConfig } from "@/types/editor";

export type GskMetadata = {
    schemaVersion: 0.1 | 1; // Support both for now during transition
    viewConfig?: ViewConfig;
    visualConfig?: VisualConfig;
    colorTheme?: ColorThemeConfig;
};

export function serializeGsk(meta: GskMetadata): string {
    return JSON.stringify(meta, null, 2);
}

export function parseGsk(raw: string): GskMetadata | null {
    try {
        const data = JSON.parse(raw);
        if (!data || typeof data !== "object") return null;
        if (data.schemaVersion !== 0.1 && data.schemaVersion !== 1) return null;
        return data as GskMetadata;
    } catch {
        return null;
    }
}
