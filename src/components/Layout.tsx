import React from "react";
import { Box, Text } from "ink";
import { Banner } from "./Banner.tsx";
import { colors, border, menu, type ScreenId } from "../theme.ts";

interface LayoutProps {
  active: ScreenId;
  footer?: React.ReactNode;
  children: React.ReactNode;
}

/**
 * The persistent chrome: compact header, left sidebar menu highlighting the
 * active screen, a framed content area, and a footer hint bar.
 */
export function Layout({ active, footer, children }: LayoutProps) {
  return (
    <Box flexDirection="column" paddingX={1}>
      {/* Header */}
      <Box justifyContent="space-between" marginBottom={1}>
        <Banner compact />
        <Text color={colors.faint}>{new Date().toLocaleDateString()}</Text>
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
            return (
              <Text
                key={item.id}
                color={isActive ? colors.cyan : colors.text}
                bold={isActive}
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
