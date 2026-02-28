export type KinshipDisplayStyle = "standard" | "standard+technical" | "technical";

export type KinshipAtlasEntry = {
  s: string;
  t?: string;
};

export type KinshipAtlasSexMap = {
  M?: KinshipAtlasEntry;
  F?: KinshipAtlasEntry;
};

export type KinshipAtlasDegreeMap = Record<string, KinshipAtlasSexMap>;

export type KinshipAtlas = {
  metadata: {
    name: string;
    version: string;
    description?: string;
    limits?: {
      ancestor_standard_cap?: number;
      descendant_standard_cap?: number;
    };
  };
  vocabulary: {
    direct?: {
      ancestors?: KinshipAtlasDegreeMap;
      descendants?: KinshipAtlasDegreeMap;
    };
    collateral?: {
      uncles?: {
        map?: KinshipAtlasDegreeMap;
      };
      cousins?: {
        map?: KinshipAtlasDegreeMap;
      };
      nephews?: {
        map?: KinshipAtlasDegreeMap;
      };
    };
    special?: {
      sibling?: Record<string, string>;
    };
  };
};

export type ResolvedKinshipRelationship = {
  primary: string;
  secondary?: string;
  canonicalKey: string;
  d1: number;
  d2: number;
  degree?: number;
  removal?: number;
  isHalf: boolean;
  style: KinshipDisplayStyle;
};
