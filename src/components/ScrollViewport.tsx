import React, {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import {
  Box,
  Text,
  measureElement,
  useInput,
  useStdout,
  type DOMElement,
} from "ink";
import { colors } from "../theme.ts";

interface ScrollViewportProps {
  children: React.ReactNode;
  isActive?: boolean;
  reservedRows?: number;
}

const fallbackTerminalRows = 24;
const minimumViewportHeight = 6;

/**
 * Keeps long Ink content inside a measured terminal-height viewport and moves
 * the full child tree behind a clipped window.
 */
export function ScrollViewport({
  children,
  isActive = true,
  reservedRows = 14,
}: ScrollViewportProps) {
  const { stdout } = useStdout();
  const [terminalRows, setTerminalRows] = useState(
    stdout.rows || fallbackTerminalRows,
  );
  const [contentHeight, setContentHeight] = useState(0);
  const [offset, setOffset] = useState(0);
  const contentRef = useRef<DOMElement>(null);
  const viewportHeight = Math.max(
    minimumViewportHeight,
    terminalRows - reservedRows,
  );
  const maxOffset = Math.max(0, contentHeight - viewportHeight);

  useEffect(() => {
    const updateRows = () => {
      setTerminalRows(stdout.rows || fallbackTerminalRows);
    };
    stdout.on("resize", updateRows);
    return () => {
      stdout.off("resize", updateRows);
    };
  }, [stdout]);

  useLayoutEffect(() => {
    if (!contentRef.current) return;
    setContentHeight(measureElement(contentRef.current).height);
  });

  useEffect(() => {
    setOffset((current) => Math.min(current, maxOffset));
  }, [maxOffset]);

  useInput(
    (input, key) => {
      const pageSize = Math.max(1, viewportHeight - 2);
      if (key.upArrow) {
        setOffset((current) => Math.max(0, current - 1));
      } else if (key.downArrow) {
        setOffset((current) => Math.min(maxOffset, current + 1));
      } else if (key.pageUp) {
        setOffset((current) => Math.max(0, current - pageSize));
      } else if (key.pageDown) {
        setOffset((current) => Math.min(maxOffset, current + pageSize));
      } else if (input === "g") {
        setOffset(0);
      } else if (input === "G") {
        setOffset(maxOffset);
      }
    },
    { isActive: isActive && maxOffset > 0 },
  );

  const firstVisibleLine = Math.min(contentHeight, offset + 1);
  const lastVisibleLine = Math.min(contentHeight, offset + viewportHeight);

  return (
    <Box flexDirection="column" width="100%" minWidth={0}>
      <Box
        flexDirection="column"
        height={viewportHeight}
        width="100%"
        minWidth={0}
        overflow="hidden"
      >
        <Box
          ref={contentRef}
          flexDirection="column"
          flexShrink={0}
          marginTop={-offset}
          width="100%"
          minWidth={0}
        >
          {children}
        </Box>
      </Box>
      {maxOffset > 0 ? (
        <Text color={colors.faint}>
          ↑↓ scroll · PgUp/PgDn page · g/G top/bottom · lines{" "}
          {firstVisibleLine}–{lastVisibleLine} of {contentHeight}
        </Text>
      ) : null}
    </Box>
  );
}
