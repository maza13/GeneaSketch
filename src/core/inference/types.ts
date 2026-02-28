export type InferenceEvidence = {
    type: "strict_limit" | "contextual" | "info"; // info: menciones explícitas de lo que se evaluó y falló
    sourceId: string; // pId o fId
    message: string;
    suggestedRange?: [number, number]; // [minYear, maxYear] - Puede ser undefined si solo acota un lado
    minLimit?: number;
    maxLimit?: number;
};

export type InferenceResult = {
    minYear?: number;
    maxYear?: number;
    suggestedYear?: number;
    suggestedRange?: [number, number]; // Rango estadístico más probable (ej. entre 1880 y 1895)
    evidences: InferenceEvidence[];
    isImpossible?: boolean;
};

export type InferenceEventTypes = "BIRT" | "DEAT";
