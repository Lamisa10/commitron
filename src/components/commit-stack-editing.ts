import type { Dispatch, SetStateAction } from "react";
import type {
  ChangeInventory,
  CommitStackItem,
  CommitStackPlan,
} from "../types/commit-stack.ts";

export function buildExecutableGroups(
  plan: CommitStackPlan,
  inventory: ChangeInventory,
  excludedPaths: Set<string>,
): CommitStackItem[] {
  const changes = new Map(inventory.files.map((file) => [file.path, file]));
  return plan.commits.flatMap((item) => {
    const files = item.files.filter((path) => !excludedPaths.has(path));
    if (!files.length) return [];
    return [{
      ...item,
      files,
      mixedFiles: item.mixedFiles.filter((warning) => files.includes(warning.path)),
      stagePaths: [...new Set(files.flatMap((path) => {
        const sourcePath = changes.get(path)?.sourcePath;
        return sourcePath ? [path, sourcePath] : [path];
      }))],
    }];
  });
}

export function toggleExcludedPath(
  path: string,
  update: Dispatch<SetStateAction<Set<string>>>,
) {
  update((current) => {
    const next = new Set(current);
    next.has(path) ? next.delete(path) : next.add(path);
    return next;
  });
}

export function moveFileToNextCommit(
  plan: CommitStackPlan,
  commitIndex: number,
  fileIndex: number,
  update: Dispatch<SetStateAction<CommitStackPlan | null>>,
) {
  if (plan.commits.length < 2) return;
  const path = plan.commits[commitIndex]?.files[fileIndex];
  if (!path) return;
  const targetIndex = (commitIndex + 1) % plan.commits.length;

  update((current) => {
    if (!current) return current;
    const commits = current.commits.map((item) => ({
      ...item,
      files: [...item.files],
      mixedFiles: [...item.mixedFiles],
    }));
    const warning = commits[commitIndex].mixedFiles.find(
      (item) => item.path === path,
    );
    commits[commitIndex].files = commits[commitIndex].files.filter(
      (item) => item !== path,
    );
    commits[commitIndex].mixedFiles = commits[commitIndex].mixedFiles.filter(
      (item) => item.path !== path,
    );
    commits[targetIndex].files.push(path);
    if (warning) commits[targetIndex].mixedFiles.push(warning);
    return { ...current, commits };
  });
}
