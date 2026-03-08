import path from "node:path";

function isWithinRoot(root, targetPath) {
  const relative = path.relative(root, targetPath);
  return relative === "" || (!relative.startsWith("..") && !path.isAbsolute(relative));
}

function toRepoRelative(root, targetPath) {
  return path.relative(root, targetPath).replace(/\\/g, "/");
}

function normalizeTargetPaths(root, targetPaths) {
  const rels = [];
  for (const target of targetPaths) {
    const abs = path.isAbsolute(target) ? target : path.resolve(root, target);
    if (!isWithinRoot(root, abs)) {
      throw new Error(`path outside repo root: ${target}`);
    }
    rels.push(toRepoRelative(root, abs));
  }
  return [...new Set(rels)].sort();
}

export function persistMutation({
  root,
  targetPaths,
  suggestedCommitMessage,
  mutate,
  dryRun = false
}) {
  const repoPaths = normalizeTargetPaths(root, targetPaths);

  if (dryRun) {
    return {
      dryRun: true,
      repoPaths,
      suggestedCommitMessage
    };
  }

  mutate();

  return {
    dryRun: false,
    repoPaths,
    suggestedCommitMessage
  };
}
