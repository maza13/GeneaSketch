export type BirthEstimatorVersion = "v2";

export type BirthEstimatorConfig = {
  domainMinYear: number;
  domainMaxYear: number;
  credibleMass: number;
  minRangeWidthYears: number;
  parentAge: {
    mother: { min: number; max: number };
    father: { min: number; max: number };
    unknown: { min: number; max: number };
  };
  posthumousYearsFather: number;
  posthumousYearsMother: number;
  maxHumanLifespanYears: number;
  softWindowYears: {
    marriage: number;
    sibling: number;
    child: number;
    spouse: number;
    aboutDate: number;
    collateral: number;
  };
  layerMaxPathLen: 3;
  layerWeights: {
    1: number;
    2: number;
    3: number;
  };
  weights: {
    selfBirth: number;
    parentBirth: number;
    parentDeath: number;
    childBirth: number;
    marriage: number;
    siblingCluster: number;
    spouseCohort: number;
    selfDeath: number;
    census: number;
    note: number;
  };
  qualityMultiplier: Record<"0" | "1" | "2" | "3", number>;
  pediPolicy: "birth_probable" | "strict_birth_only";
};

export const DEFAULT_BIRTH_ESTIMATOR_CONFIG: BirthEstimatorConfig = {
  domainMinYear: 1500,
  domainMaxYear: new Date().getFullYear(),
  credibleMass: 0.7,
  minRangeWidthYears: 6,
  parentAge: {
    mother: { min: 14, max: 50 },
    father: { min: 15, max: 80 },
    unknown: { min: 14, max: 80 }
  },
  posthumousYearsFather: 1,
  posthumousYearsMother: 0,
  maxHumanLifespanYears: 110,
  softWindowYears: {
    marriage: 9,
    sibling: 15,
    child: 8,
    spouse: 18,
    aboutDate: 4,
    collateral: 20
  },
  layerMaxPathLen: 3,
  layerWeights: {
    1: 1,
    2: 0.65,
    3: 0.4
  },
  weights: {
    selfBirth: 120,
    parentBirth: 80,
    parentDeath: 70,
    childBirth: 75,
    marriage: 45,
    siblingCluster: 40,
    spouseCohort: 30,
    selfDeath: 65,
    census: 55,
    note: 15
  },
  qualityMultiplier: {
    "0": 0.7,
    "1": 0.85,
    "2": 1,
    "3": 1.1
  },
  pediPolicy: "birth_probable"
};
