import OpenAI from "openai";
import type { Config } from "../config.ts";

interface StructuredRequest {
  description: string;
  name: string;
  schema: Record<string, unknown>;
  system: string;
  user: string;
}

/**
 * Requests one strict JSON object and parses it. Feature services still perform
 * their own runtime validation before using any returned fields.
 */
export async function requestStructuredObject(
  cfg: Config,
  request: StructuredRequest,
): Promise<unknown> {
  const client = new OpenAI({ apiKey: cfg.apiKey });
  const response = await client.chat.completions.create({
    model: cfg.model,
    response_format: {
      type: "json_schema",
      json_schema: {
        name: request.name,
        description: request.description,
        strict: true,
        schema: request.schema,
      },
    },
    messages: [
      { role: "system", content: request.system },
      { role: "user", content: request.user },
    ],
  });

  const message = response.choices[0]?.message;
  if (message?.refusal) {
    throw new Error("OpenAI couldn't complete that request.");
  }

  try {
    return JSON.parse(message?.content ?? "");
  } catch {
    throw new Error("The model returned an unreadable response.");
  }
}
