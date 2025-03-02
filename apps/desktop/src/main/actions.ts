import { z } from "zod";
import { generateObject } from "ai";
import { createAnthropic } from "@ai-sdk/anthropic";
import { ContentResult, ImageContent, TextContent } from "./FastMCPProxy";
import { ServerMap } from "./connections";

// Constants
export const OVERRIDE_PREFIX = "__mcp_manager__";
export const REQUEST_ACTIONS_OVERRIDE_TOOL = `${OVERRIDE_PREFIX}request_actions_filter_override`;

// Types
type JsonSchemaParameters = {
  type: "object";
  properties?: Record<string, unknown>;
};

type Awaitable<T> = T | Promise<T>;

export interface ActionDefinition<
  T extends Record<string, unknown> = Record<string, unknown>,
> {
  name: string;
  description: string;
  keywords: string[];
  parameters: JsonSchemaParameters;
  execute: (
    parameters: T
  ) => Awaitable<string | ContentResult | TextContent | ImageContent>;
}

/**
 * Extract actions from all server connections
 */
export function getActionsFromServers(
  serverMap: ServerMap
): ActionDefinition<Record<string, unknown>>[] {
  return Object.values(serverMap).flatMap(({ connection, config }) =>
    connection.tools.getValue().map((tool) => ({
      name: tool.name,
      keywords: config.keywords,
      description: tool.description || "",
      parameters: tool.inputSchema,
      execute: (parameters) =>
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        connection.callTool(tool.name, parameters) as any,
    }))
  );
}

/**
 * Generate dynamic description for request-actions tool
 */
function getKeywordsDescription(serverMap: ServerMap): string {
  const keywordSet = new Set<string>();
  Object.values(serverMap).forEach(({ config }) => {
    config.keywords.forEach((keyword) => keywordSet.add(keyword));
  });
  const keywords = Array.from(keywordSet);
  return `Request the actions that can be performed. Actions remain available throughout the conversation unless otherwise specified. Current available actions are related to these keywords: '${keywords.join("', '")}'`;
}

/**
 * Format and log the result of request-actions
 */
function logAndFormatResult(
  result: ActionDefinition<Record<string, unknown>>[]
): string {
  const resultString = JSON.stringify(result);
  console.log("request-actions result", resultString);
  return resultString;
}

/**
 * Process the result from an override tool
 */
function processOverrideResult(
  result: unknown,
  allActions: ActionDefinition<Record<string, unknown>>[]
): ActionDefinition<Record<string, unknown>>[] {
  let parsedResult = result;

  // Handle string results by parsing them
  if (typeof result === "string") {
    try {
      parsedResult = JSON.parse(result);
    } catch (e) {
      console.error("Error parsing override tool result:", e);
      return allActions;
    }
  }

  // Handle array of strings (action names)
  if (
    Array.isArray(parsedResult) &&
    parsedResult.length > 0 &&
    typeof parsedResult[0] === "string"
  ) {
    return allActions.filter((action) => parsedResult.includes(action.name));
  }
  // Handle array of action objects
  else if (
    Array.isArray(parsedResult) &&
    parsedResult.length > 0 &&
    typeof parsedResult[0] === "object"
  ) {
    return parsedResult as ActionDefinition<Record<string, unknown>>[];
  }
  // Fall back to all actions
  else {
    return allActions;
  }
}

/**
 * Use the override tool to filter actions
 */
async function filterWithOverrideTool(
  override: ActionDefinition<Record<string, unknown>>,
  userContext: string,
  allActions: ActionDefinition<Record<string, unknown>>[]
): Promise<ActionDefinition<Record<string, unknown>>[]> {
  try {
    // Get the first server name that provides an override
    console.log(`Using request-actions override from server: ${override.name}`);

    // Call the override tool with the user's context and all available actions
    const result = await override.execute({
      why: userContext,
      availableActions: allActions.map((action) => ({
        name: action.name,
        description: action.description,
        keywords: action.keywords,
      })),
    });

    const filteredActions = processOverrideResult(result, allActions);
    console.log("request-actions filtered by override tool:", filteredActions);
    return filteredActions;
  } catch (error) {
    console.error("Error using override tool:", error);
    // Fall back to regular filtering if the override fails
    return allActions;
  }
}

/**
 * Use Claude to filter actions based on user context
 */
async function filterWithClaude(
  userContext: string,
  allActions: ActionDefinition<Record<string, unknown>>[]
): Promise<ActionDefinition<Record<string, unknown>>[]> {
  const anthropicApiKey = import.meta.env.VITE_ANTHROPIC_API_KEY;

  // If no API key is available, return all actions without filtering
  if (!anthropicApiKey) {
    console.log("No Anthropic API key found, returning all actions");
    return allActions;
  }

  try {
    // Prepare action data for the prompt
    const actionsData = allActions.map((action) => ({
      name: action.name,
      description: action.description,
      keywords: action.keywords.join(", "),
    }));

    // Define the schema for the expected response
    const responseSchema = z.object({
      relevantActions: z
        .array(z.string())
        .describe("Names of actions that are relevant to the user's request"),
    });

    // Generate the object using Vercel AI SDK's generateObject
    const {
      object: { relevantActions },
    } = await generateObject({
      model: createAnthropic({
        apiKey: anthropicApiKey,
      })("claude-3-7-sonnet-20250219"),
      schema: responseSchema,
      prompt: `
      The user needs help with: "${userContext}"
      
      Available actions:
      ${JSON.stringify(actionsData, null, 2)}
      
      Based on the user's request, please identify the action names that would be most relevant and helpful.
      Only include actions that are truly relevant to what the user is asking for.
      `,
      maxTokens: 1000,
    });

    // Filter actions based on the names returned by Claude
    const filteredActions =
      relevantActions.length > 0
        ? allActions.filter((action) => relevantActions.includes(action.name))
        : allActions;

    console.log("request-actions filtered actions", filteredActions);
    return filteredActions;
  } catch (error) {
    // If there's any error in the AI filtering process, fall back to returning all actions
    console.error("Error using Claude for filtering:", error);
    return allActions;
  }
}

/**
 * Create request-actions tool with dynamic description
 */
export function createRequestActionsTool(serverMap: ServerMap) {
  return {
    name: "request-actions",
    description: getKeywordsDescription(serverMap),
    parameters: z.object({
      why: z.string({
        description:
          "Please give context on what you need actions for, this will help provide the relevant actions. Remember these are actions, not tools, actions returned MUST be called with dispatch-actions tool.",
      }),
    }),
    execute: async (args: { why: string }, context: unknown) => {
      console.log("request-actions tool called", args, context);

      // Get all available actions
      const rawActions = getActionsFromServers(serverMap);
      const allActions = rawActions.filter(
        (a) => !a.name.startsWith(OVERRIDE_PREFIX)
      );

      // Check if any server provides an override tool
      const override = rawActions.find(
        (a) => a.name === REQUEST_ACTIONS_OVERRIDE_TOOL
      );

      let filteredActions: ActionDefinition<Record<string, unknown>>[];

      if (override) {
        // Use the override tool for filtering
        filteredActions = await filterWithOverrideTool(
          override,
          args.why,
          allActions
        );
      } else {
        // Use Claude for filtering
        filteredActions = await filterWithClaude(args.why, allActions);
      }

      return logAndFormatResult(filteredActions);
    },
  };
}

/**
 * Create dispatch-actions tool
 */
export function createDispatchActionsTool(serverMap: ServerMap) {
  return {
    name: "dispatch-actions",
    description: "Dispatch the actions available in the system",
    parameters: z.object({
      name: z.string({ description: "The name of the action to dispatch" }),
      parameters: z.record(z.string(), z.any()),
    }),
    execute: async (
      args: { name: string; parameters: Record<string, unknown> },
      context: unknown
    ) => {
      console.log("dispatch-actions tool called", args, context);
      const action = getActionsFromServers(serverMap)
        .filter((a) => !a.name.startsWith(OVERRIDE_PREFIX))
        .find((a) => a.name === args.name);
      if (!action) return "Unknown action";
      try {
        const result = await action.execute(args.parameters);
        console.log("dispatch-actions result", result);
        return result;
      } catch (error) {
        return `Error: ${String(error)}`;
      }
    },
  };
}
