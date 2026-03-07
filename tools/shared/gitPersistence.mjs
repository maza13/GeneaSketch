import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

function uniqueSorted(items) {
  return [...new Set(items)].sort();
}

function runGit(root, args) {
  return spawnSync("git", args, {
    cwd: root,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"]
  });
}

function isWithinRoot(root, targetPath) {
  const relative = path.relative(root, targetPath);
  return relative === "" || (!relative.startsWith("..") && !path.isAbsolute(relative));
}

function toRepoRelative(root, targetPath) {
  return path.relative(root, targetPath).replace(/\\/g, "/");
}

function ensureGitRepo(root) {
  const probe = runGit(root, ["rev-parse", "--is-inside-work-tree"]);
  if (probe.status !== 0 || probe.stdout.trim() !== "true") {
    throw new Error("git repository not available for automatic persistence");
  }
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
  return uniqueSorted(rels);
}

function preflightIgnored(root, repoPaths) {
  const ignored = [];
  for (const repoPath of repoPaths) {
    const result = runGit(root, ["check-ignore", "-q", "--", repoPath]);
    if (![0, 1].includes(result.status)) {
      throw new Error(`git check-ignore failed for '${repoPath}':\n${result.stderr || result.stdout}`);
    }
    if (result.status === 0) ignored.push(repoPath);
  }
  if (ignored.length > 0) {
    throw new Error(`ignored paths block automatic persistence: ${ignored.join(", ")}`);
  }
}

function snapshotPaths(root, repoPaths) {
  return repoPaths.map((repoPath) => {
    const abs = path.resolve(root, repoPath);
    if (fs.existsSync(abs)) {
      return {
        repoPath,
        abs,
        existed: true,
        content: fs.readFileSync(abs, "utf8")
      };
    }
    return {
      repoPath,
      abs,
      existed: false,
      content: null
    };
  });
}

function restoreSnapshots(snapshots) {
  for (const item of snapshots) {
    if (item.existed) {
      fs.mkdirSync(path.dirname(item.abs), { recursive: true });
      fs.writeFileSync(item.abs, item.content, "utf8");
    } else if (fs.existsSync(item.abs)) {
      fs.rmSync(item.abs, { recursive: true, force: true });
    }
  }
}

function unstagePaths(root, repoPaths) {
  if (repoPaths.length === 0) return;
  const reset = runGit(root, ["reset", "--quiet", "HEAD", "--", ...repoPaths]);
  if (reset.status !== 0) {
    console.warn(`WARN: could not unstage paths after rollback:\n${reset.stderr || reset.stdout}`);
  }
}

function maybeSimulateFailure(kind, prefix) {
  const envKey = `${prefix}_SIMULATE_${kind.toUpperCase()}_FAILURE`;
  if (process.env[envKey] === "1") {
    return { status: 1, stderr: `simulated ${kind} failure`, stdout: "" };
  }
  return null;
}

export function persistWithGit({
  root,
  targetPaths,
  commitMessage,
  mutate,
  dryRun = false,
  simulationPrefix = "GENEASKETCH_GIT_TX",
  successLabel = null
}) {
  ensureGitRepo(root);
  const repoPaths = normalizeTargetPaths(root, targetPaths);
  preflightIgnored(root, repoPaths);

  if (dryRun) {
    return {
      dryRun: true,
      repoPaths,
      commitMessage
    };
  }

  const snapshots = snapshotPaths(root, repoPaths);
  try {
    mutate();
  } catch (error) {
    restoreSnapshots(snapshots);
    throw error;
  }

  const stageFailure = maybeSimulateFailure("stage", simulationPrefix);
  const add = stageFailure ?? runGit(root, ["add", "-A", "--", ...repoPaths]);
  if (add.status !== 0) {
    restoreSnapshots(snapshots);
    unstagePaths(root, repoPaths);
    throw new Error(`stage_failed\npaths: ${repoPaths.join(", ")}\nraw git error:\n${add.stderr || add.stdout}`);
  }

  const commitFailure = maybeSimulateFailure("commit", simulationPrefix);
  const commit = commitFailure ?? runGit(root, ["commit", "-m", commitMessage]);
  if (commit.status !== 0) {
    restoreSnapshots(snapshots);
    unstagePaths(root, repoPaths);
    throw new Error(`commit_failed\npaths: ${repoPaths.join(", ")}\nraw git error:\n${commit.stderr || commit.stdout}`);
  }

  const hash = runGit(root, ["rev-parse", "--short", "HEAD"]);
  if (hash.status !== 0) {
    throw new Error(`commit created but could not read hash:\n${hash.stderr || hash.stdout}`);
  }

  return {
    dryRun: false,
    repoPaths,
    commitMessage,
    commitHash: hash.stdout.trim(),
    successLabel
  };
}
