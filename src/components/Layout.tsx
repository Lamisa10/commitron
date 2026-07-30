import React from "react";
import { Box, Text } from "ink";
import { homedir } from "node:os";
import { basename, sep } from "node:path";
import { Banner } from "./Banner.tsx";
import type { Mode } from "../config.ts";
import { colors, border, menu, type ScreenId } from "../theme.ts";

interface LayoutProps {
  active: ScreenId;
  mode: Mode;
  footer?: React.ReactNode;
  children: React.ReactNode;
}

interface WorkingDirectoryBreadcrumb {
  parentPath: string;
  directoryName: string;
}

const maxBreadcrumbLength = 64;

/** Builds a compact path while keeping the current directory visually prominent. */
function getWorkingDirectoryBreadcrumb(): WorkingDirectoryBreadcrumb {
  const workingDirectory = process.cwd();
  const homeDirectory = homedir();
  let displayPath = workingDirectory;

  if (workingDirectory === homeDirectory) {
    displayPath = "~";
  } else if (workingDirectory.startsWith(`${homeDirectory}${sep}`)) {
    displayPath = `~${workingDirectory.slice(homeDirectory.length)}`;
  }

  if (displayPath.length > maxBreadcrumbLength) {
    const trailingPath = displayPath
      .split(sep)
      .filter((segment) => segment && segment !== "~")
      .slice(-3)
      .join(sep);
    const prefix = displayPath.startsWith(`~${sep}`)
      ? `~${sep}`
      : displayPath.startsWith(sep)
        ? sep
        : `${displayPath.split(sep)[0]}${sep}`;

    displayPath = `${prefix}…${sep}${trailingPath}`;
  }

  const directoryName = basename(workingDirectory);
  if (!directoryName || !displayPath.endsWith(directoryName)) {
    return { parentPath: "", directoryName: displayPath };
  }

  return {
    parentPath: displayPath.slice(0, -directoryName.length),
    directoryName,
  };
}

/**
 * The persistent chrome: compact header, left sidebar menu highlighting the
 * active screen, a framed content area, and a footer hint bar.
 */
export function Layout({ active, mode, footer, children }: LayoutProps) {
  const workingDirectory = getWorkingDirectoryBreadcrumb();

  return (
    <Box flexDirection="column" paddingX={1}>
      {/* Header */}
      <Box justifyContent="space-between">
        <Banner compact />
        <Text color={colors.faint}>{new Date().toLocaleDateString()}</Text>
      </Box>
      <Box marginBottom={1}>
        <Text color={colors.violet}>⌂  </Text>
        <Text color={colors.faint}>{workingDirectory.parentPath}</Text>
        <Text color={colors.cyan} bold>
          {workingDirectory.directoryName}
        </Text>
      </Box>

      <Box>
        {/* Sidebar */}
        <Box
          flexDirection="column"
          borderStyle={border}
          borderColor={colors.faint}
          paddingX={1}
          marginRight={1}
          width={22}
        >
          <Text color={colors.dim} bold>
            {" MENU"}
          </Text>
          {menu.map((item) => {
            const isActive = item.id === active;
            const isAvailable = mode === "demo" || item.availableInLive;
            return (
              <Text
                key={item.id}
                color={isActive ? colors.cyan : isAvailable ? colors.text : colors.faint}
                bold={isActive && isAvailable}
              >
                {isActive ? "› " : "  "}
                {item.icon} {item.label}
              </Text>
            );
          })}
          <Box marginTop={1}>
            <Text color={colors.faint}>{" Esc · home"}</Text>
          </Box>
          <Text color={colors.faint}>{"  q   · quit"}</Text>
        </Box>

        {/* Content */}
        <Box
          flexGrow={1}
          flexDirection="column"
          borderStyle={border}
          borderColor={colors.violet}
          paddingX={2}
          paddingY={1}
          minHeight={16}
        >
          {children}
        </Box>
      </Box>

      {/* Footer */}
      <Box marginTop={1} paddingX={1}>
        <Text color={colors.faint}>{footer ?? "↑↓ navigate · Enter select · Esc back"}</Text>
      </Box>
    </Box>
  );
}

/** Small reusable section heading used inside screens. */
export function ScreenTitle({ icon, title, subtitle }: { icon: string; title: string; subtitle: string }) {
  return (
    <Box flexDirection="column" marginBottom={1}>
      <Text bold color={colors.magenta}>
        {icon} {title}
      </Text>
      <Text color={colors.dim}>{subtitle}</Text>
    </Box>
  );
}
