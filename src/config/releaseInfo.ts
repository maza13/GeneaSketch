export type ReleaseChannel = "beta" | "stable";

export type ReleaseInfo = {
  technicalVersion: string;
  channel: ReleaseChannel;
  codename: string;
  displayLabel: string;
  releaseTag: string;
};

export const RELEASE_INFO: ReleaseInfo = {
  technicalVersion: "0.4.0",
  channel: "beta",
  codename: "gschema",
  displayLabel: "Beta GSchema",
  releaseTag: "v0.4.0-beta-gschema"
};
