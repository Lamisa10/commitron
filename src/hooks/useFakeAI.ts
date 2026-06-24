import { useEffect, useRef, useState } from "react";

export type AIPhase = "idle" | "thinking" | "done";

/**
 * Simulates an AI request: a brief "thinking" delay before a result appears.
 * Purely cosmetic — gives the prototype the feel of a real LLM round-trip.
 */
export function useFakeAI(delayMs = 1400) {
  const [phase, setPhase] = useState<AIPhase>("idle");
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const run = () => {
    setPhase("thinking");
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setPhase("done"), delayMs);
  };

  const reset = () => {
    if (timer.current) clearTimeout(timer.current);
    setPhase("idle");
  };

  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  return { phase, run, reset };
}
