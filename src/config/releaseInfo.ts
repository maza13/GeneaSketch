export type ReleaseChannel = "beta" | "stable";

export type ReleaseInfo = {
  technicalVersion: string;
  channel: ReleaseChannel;
  codename: string;
  displayLabel: string;
  releaseTag: string;
};

export const RELEASE_INFO: ReleaseInfo = {
  technicalVersion: "0.3.5",
  channel: "beta",
  codename: "ia-assistant",
  displayLabel: "Beta IA Assistant",
  releaseTag: "v0.3.5-beta-ia-assistant"
};
