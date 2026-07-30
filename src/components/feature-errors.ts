import type { FeatureError } from "./FeatureErrorView.tsx";

/** Maps common OpenAI/network failures to concise user-facing content. */
export function friendlyModelError(
  error: unknown,
  fallbackTitle: string,
): FeatureError {
  const message = error instanceof Error ? error.message : String(error);
  if (/401|api key|incorrect api/i.test(message)) {
    return {
      kind: "error",
      title: "OpenAI rejected the request",
      message: "Check the API key saved in Setup.",
    };
  }
  if (/ENOTFOUND|ETIMEDOUT|fetch failed|network/i.test(message)) {
    return {
      kind: "error",
      title: "Couldn't reach OpenAI",
      message: "Check your network connection and try again.",
    };
  }
  return {
    kind: "error",
    title: fallbackTitle,
    message:
      message.split("\n").find((line) => line.trim())?.trim().slice(0, 200) ||
      "An unknown error occurred.",
  };
}
