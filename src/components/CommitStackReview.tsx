import React from "react";
import { Box, Text } from "ink";
import type { CommitStackPlan } from "../types/commit-stack.ts";
import { border, colors } from "../theme.ts";
import { Hint } from "./shared.tsx";

interface CommitStackReviewProps {
  editingFiles: boolean;
  excludedPaths: Set<string>;
  plan: CommitStackPlan;
  selectedCommit: number;
  selectedFile: number;
}

/** Displays the proposed stack and the focused whole-file editor. */
export function CommitStackReview({
  editingFiles,
  excludedPaths,
  plan,
  selectedCommit,
  selectedFile,
}: CommitStackReviewProps) {
  const commit = plan.commits[selectedCommit];
  if (!commit) return null;

  return (
    <Box flexDirection="column">
      <Text color={colors.dim}>
        Proposed stack · {plan.commits.length} commits
      </Text>
      {plan.commits.map((item, index) => {
        const activeFiles = item.files.filter((path) => !excludedPaths.has(path));
        return (
          <Text
            key={`${item.subject}-${index}`}
            color={index === selectedCommit ? colors.cyan : colors.text}
            bold={index === selectedCommit}
          >
            {index === selectedCommit ? "› " : "  "}
            {String(index + 1).padStart(2, "0")} {item.subject}{" "}
            <Text color={colors.faint}>({activeFiles.length} files)</Text>
          </Text>
        );
      })}

      <Box
        flexDirection="column"
        borderStyle={border}
        borderColor={editingFiles ? colors.yellow : colors.violet}
        paddingX={1}
        marginTop={1}
      >
        <Text color={colors.violet}>{commit.rationale}</Text>
        {editingFiles ? (
          <FileEditor
            commit={commit}
            excludedPaths={excludedPaths}
            selectedFile={selectedFile}
          />
        ) : (
          <>
            {commit.files.slice(0, 8).map((path) => (
              <Text
                key={path}
                color={excludedPaths.has(path) ? colors.faint : colors.text}
                strikethrough={excludedPaths.has(path)}
              >
                • {path}
              </Text>
            ))}
            {commit.files.length > 8 ? (
              <Text color={colors.faint}>… {commit.files.length - 8} more files</Text>
            ) : null}
          </>
        )}
        {commit.mixedFiles.map((warning) => (
          <Text key={warning.path} color={colors.yellow}>
            ⚠ {warning.path}: {warning.reason}
          </Text>
        ))}
      </Box>

      {plan.warnings.map((warning, index) => (
        <Text key={index} color={colors.yellow}>
          ⚠ {warning}
        </Text>
      ))}
      <Hint>
        {editingFiles
          ? "↑↓ file · x exclude/include · m move to next commit · b back"
          : "↑↓ commit · Enter edit files · e start confirmed commit sequence"}
      </Hint>
      <Hint>Whole files only · excluded files remain uncommitted.</Hint>
    </Box>
  );
}

function FileEditor({
  commit,
  excludedPaths,
  selectedFile,
}: {
  commit: CommitStackPlan["commits"][number];
  excludedPaths: Set<string>;
  selectedFile: number;
}) {
  const windowStart = Math.max(
    0,
    Math.min(selectedFile - 4, Math.max(0, commit.files.length - 10)),
  );
  return (
    <Box flexDirection="column" marginTop={1}>
      {commit.files.slice(windowStart, windowStart + 10).map((path, offset) => {
        const index = windowStart + offset;
        const excluded = excludedPaths.has(path);
        return (
          <Text
            key={path}
            color={index === selectedFile ? colors.cyan : excluded ? colors.faint : colors.text}
            bold={index === selectedFile}
            strikethrough={excluded}
          >
            {index === selectedFile ? "› " : "  "}
            {excluded ? "○" : "●"} {path}
          </Text>
        );
      })}
    </Box>
  );
}
