export type ReleaseChannel = "beta" | "stable";

export type ReleaseInfo = {
  technicalVersion: string;
  channel: ReleaseChannel;
  codename: string;
  displayLabel: string;
  releaseTag: string;
};

export const RELEASE_INFO: ReleaseInfo = {
  technicalVersion: "0.4.5",
  channel: "beta",
  codename: "genraph",
  displayLabel: "Beta Genraph",
  releaseTag: "v0.4.5-beta-genraph"
};
