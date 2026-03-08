export type ReleaseChannel = "beta" | "stable";

export type ReleaseInfo = {
  technicalVersion: string;
  channel: ReleaseChannel;
  codename: string;
  displayLabel: string;
  releaseTag: string;
};

export const RELEASE_INFO: ReleaseInfo = {
  technicalVersion: "0.4.6",
  channel: "beta",
  codename: "rebrand",
  displayLabel: "Beta Rebrand",
  releaseTag: "v0.4.6-beta-rebrand"
};
