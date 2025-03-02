import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import {
  StdioClientTransport,
  StdioServerParameters,
} from "@modelcontextprotocol/sdk/client/stdio.js";
import { SSEClientTransport } from "@modelcontextprotocol/sdk/client/sse.js";
import {
  ContentResult,
  FastMCP,
  ImageContent,
  TextContent,
} from "./FastMCPProxy";
import { BehaviorSubject } from "rxjs";
import { v4 as uuidv4 } from "uuid";
import { z } from "zod";
import { generateObject } from "ai";
import { createAnthropic } from "@ai-sdk/anthropic";

import { version } from "../../package.json";
import zodToJsonSchema from "zod-to-json-schema";

const OVERRIDE_PREFIX = "__mcp_manager__";
const REQUEST_ACTIONS_OVERRIDE_TOOL = `${OVERRIDE_PREFIX}request_actions_filter_override`;
const OVERRIDE_TOOLS = [REQUEST_ACTIONS_OVERRIDE_TOOL] as const;

type JsonSchemaParameters = {
  type: "object";
  properties?: Record<string, unknown>;
};

type ServerParameters =
  | {
      type: "stdio";
      name: string;
      config: Omit<StdioServerParameters, "stderr">;
    }
  | { type: "sse"; name: string; url: URL };

/**
 * Connect to an MCP server using either stdio or SSE transport
 */
export async function connectToServer(params: ServerParameters) {
  // Create a new client
  const client = new Client(
    { name: "MCP Manager Client", version },
    { capabilities: {} }
  );

  // Handle different transport types
  const transport =
    params.type === "stdio"
      ? new StdioClientTransport({
          ...params.config,
          env: {
            PATH: process.env.PATH || "",
            ...params.config.env,
          },
          stderr: "pipe",
        })
      : new SSEClientTransport(params.url);

  // Set up error handler
  const errorSubject = new BehaviorSubject<string | undefined>(undefined);
  transport.onerror = async (error) => {
    console.error(`Transport error for "${params.name}":`, error);
    errorSubject.next(error.message);
  };

  // Set up close handler
  const statusSubject = new BehaviorSubject("connecting");
  transport.onclose = async () => {
    console.log(`Transport closed for "${params.name}"`);
    statusSubject.next("disconnected");
  };

  // Start the transport
  await transport.start();

  // copied from cline
  // transport.stderr is only available after the process has been started. However we can't start it separately from the .connect() call because it also starts the transport.
  // And we can't place this after the connect call since we need to capture the stderr stream before the connection is established, in order to capture errors during the connection process.
  // As a workaround, we start the transport ourselves, and then monkey-patch the start method to no-op so that .connect() doesn't try to start it again.
  const stderrStream = "stderr" in transport ? transport.stderr : undefined;
  if (stderrStream) {
    stderrStream.on("data", async (data: Buffer) => {
      const errorOutput = data.toString();
      console.error(`Server "${params.name}" stderr:`, errorOutput);
    });
  } else {
    console.error(`No stderr stream for ${params.name}`);
  }
  transport.start = async () => {}; // No-op now, .connect() won't fail

  // Connect
  await client.connect(transport);
  statusSubject.next("connected");
  errorSubject.next(undefined);

  // Fetch initial data
  const toolsSubject = new BehaviorSubject<
    { name: string; description?: string; inputSchema: JsonSchemaParameters }[]
  >([]);
  toolsSubject.next((await client.listTools()).tools);

  // Create a connection object that can be used to interact with the server
  return {
    name: params.name,
    config: JSON.stringify(params),
    status: statusSubject,
    error: errorSubject,
    tools: toolsSubject,
    callTool: async (name: string, parameters: Record<string, unknown>) => {
      return await client.callTool({ name, arguments: parameters });
    },
    client,
    transport,
    close: () => transport.close(),
  };
}
type ServerConnection = Awaited<ReturnType<typeof connectToServer>>;

type Awaitable<T> = T | Promise<T>;

// Define types for our actions system
interface ActionDefinition<
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

export const startMCP = async () => {
  const mcpServer = new FastMCP({
    name: "MCP Manager",
    version: version as `${number}.${number}.${number}`,
    authenticate: async () => ({ sessionId: uuidv4() }),
  });
  // Central registry of all available actions
  const actionsRegistry: Record<string, ActionDefinition> = {};

  // Helper functions to add actions to the registry
  const registerAction = (action: ActionDefinition) => {
    const id = uuidv4();
    actionsRegistry[id] = action;

    // Handler to unregister the action
    return () => {
      delete actionsRegistry[id];
    };
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const registerActionWithZod = <T extends z.ZodObject<any>>(
    parameters: T,
    action: Omit<ActionDefinition<z.infer<T>>, "parameters">
  ) => {
    return registerAction({
      ...action,
      parameters: zodToJsonSchema(parameters, "S").definitions
        ?.S as JsonSchemaParameters,
    });
  };

  // Register available actions
  registerActionWithZod(
    z.object({
      min: z.number(),
      max: z.number(),
    }),
    {
      name: "random",
      description: "Generate a random number",
      keywords: ["random", "number", "generate"],
      execute: (parameters) => {
        const { min, max } = parameters;
        return String(Math.floor(Math.random() * (max - min + 1)) + min);
      },
    }
  );

  registerActionWithZod(
    z.object({
      a: z.coerce.number(),
      b: z.coerce.number(),
    }),
    {
      name: "add",
      description: "Add two numbers",
      keywords: ["math", "addition", "sum"],
      execute: (parameters) => {
        const { a, b } = parameters;
        return String(a + b);
      },
    }
  );

  const serverConfigs: (ServerParameters & { keywords: string[] })[] = [
    {
      type: "stdio",
      name: "weather",
      keywords: ["weather", "location"],
      config: {
        command: "uvx",
        args: [
          "--from",
          "git+https://github.com/adhikasp/mcp-weather.git",
          "mcp-weather",
        ],
        env: {
          ACCUWEATHER_API_KEY: import.meta.env.VITE_ACCUWEATHER_API_KEY || "",
        },
      },
    },
  ];

  // Track servers that provide the overrides
  const overrideToolServers: Partial<
    Record<(typeof OVERRIDE_TOOLS)[number], ServerConnection>
  > = {};

  // Connect to all servers
  const servers = await Promise.all(
    serverConfigs.map(async (config) => {
      const server = await connectToServer(config);
      server.tools.subscribe((tools) => {
        console.log("tools from server", config.name, tools);

        for (const tool of tools) {
          // Skip registering the override tool as a regular action
          if (tool.name.startsWith(OVERRIDE_PREFIX)) {
            if (
              OVERRIDE_TOOLS.includes(
                tool.name as (typeof OVERRIDE_TOOLS)[number]
              )
            ) {
              console.log(
                `Server ${config.name} provides ${tool.name} override tool`
              );
              if (overrideToolServers[tool.name]) {
                console.error(
                  `Server ${config.name} already has an ${tool.name} tool, overwriting`
                );
              }
              overrideToolServers[tool.name] = server;
            } else {
              console.error(
                `Server ${config.name} has an unknown override tool: ${tool.name}`
              );
            }
            continue;
          }

          registerAction({
            name: tool.name,
            description: tool.description || "",
            keywords: config.keywords,
            parameters: tool.inputSchema,
            execute: (parameters) =>
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              server.callTool(tool.name, parameters) as any,
          });

          // Direct passthrough in case the mcp server doesn't go through dispatch-actions
          mcpServer.addTool({
            name: tool.name,
            description: tool.description || "",
            rawParameters: tool.inputSchema,
            hidden: true,
            execute: (parameters) =>
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              server.callTool(tool.name, parameters) as any,
          });
        }
      });

      return server;
    })
  );

  // Helper function to get action by name
  const getAction = (name: string): ActionDefinition | undefined => {
    return Object.values(actionsRegistry).find(
      (action) => action.name === name
    );
  };

  // Get all unique keywords from the registry
  const getAllKeywords = (): string[] => {
    const keywordSet = new Set<string>();
    Object.values(actionsRegistry).forEach((action) => {
      action.keywords.forEach((keyword) => keywordSet.add(keyword));
    });
    return Array.from(keywordSet);
  };

  // Generate dynamic description for request-actions
  const getKeywordsDescription = (): string => {
    const keywords = getAllKeywords();
    return `Request the actions that can be performed. Current available actions are related to these keywords: '${keywords.join("', '")}'`;
  };

  mcpServer.addTool({
    name: "request-actions",
    description: getKeywordsDescription(),
    parameters: z.object({
      why: z.string({
        description:
          "Please give context on what you need actions for, this will help provide the relevant actions. Actions returned MUST be called with dispatch-actions tool.",
      }),
    }),
    execute: async (args, context) => {
      console.log("request-actions tool called", args, context);

      // Get all available actions
      const allActions = Object.values(actionsRegistry);

      const logAndFormatResult = (result: unknown) => {
        const resultString = JSON.stringify(result);
        console.log("request-actions result", resultString);
        return resultString;
      };

      // Check if any server provides an override tool
      const override = overrideToolServers[REQUEST_ACTIONS_OVERRIDE_TOOL];
      if (override) {
        try {
          // Get the first server name that provides an override
          console.log(
            `Using request-actions override from server: ${override.name}`
          );

          // Call the override tool with the user's context and all available actions
          const result = await override.callTool(
            REQUEST_ACTIONS_OVERRIDE_TOOL,
            {
              why: args.why,
              availableActions: allActions.map((action) => ({
                name: action.name,
                description: action.description,
                keywords: action.keywords,
              })),
            }
          );

          // The override tool should return either:
          // 1. An array of action names to include
          // 2. An array of complete action objects
          // 3. A string that can be parsed as JSON for either of the above

          let filteredActions;
          let parsedResult = result;

          // Handle string results by parsing them
          if (typeof result === "string") {
            try {
              parsedResult = JSON.parse(result);
            } catch (e) {
              console.error("Error parsing override tool result:", e);
              return logAndFormatResult(allActions);
            }
          }

          // Handle array of strings (action names)
          if (
            Array.isArray(parsedResult) &&
            parsedResult.length > 0 &&
            typeof parsedResult[0] === "string"
          ) {
            filteredActions = allActions.filter((action) =>
              parsedResult.includes(action.name)
            );
          }
          // Handle array of action objects
          else if (
            Array.isArray(parsedResult) &&
            parsedResult.length > 0 &&
            typeof parsedResult[0] === "object"
          ) {
            filteredActions = parsedResult;
          }
          // Fall back to all actions
          else {
            filteredActions = allActions;
          }

          console.log(
            "request-actions filtered by override tool:",
            filteredActions
          );
          return logAndFormatResult(filteredActions);
        } catch (error) {
          console.error("Error using override tool:", error);
          // Fall back to regular filtering if the override fails
          return logAndFormatResult(allActions);
        }
      }

      // If no override tool is available or it failed, use the Claude filtering
      // If no API key is available, return all actions without filtering
      const anthropicApiKey = import.meta.env.VITE_ANTHROPIC_API_KEY;
      if (!anthropicApiKey) {
        console.log("No Anthropic API key found, returning all actions");
        return logAndFormatResult(allActions);
      }

      // Use Claude to filter and rank actions based on the user's context
      try {
        const userContext = args.why;

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
            .describe(
              "Names of actions that are relevant to the user's request"
            ),
        });

        // Generate the object using Vercel AI SDK's generateObject
        const {
          object: { relevantActions },
        } = await generateObject({
          model: createAnthropic({
            apiKey: anthropicApiKey,
          })("claude-3-sonnet-20240229"),
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
            ? allActions.filter((action) =>
                relevantActions.includes(action.name)
              )
            : allActions;

        console.log("request-actions filtered actions", filteredActions);
        return logAndFormatResult(filteredActions);
      } catch (error) {
        // If there's any error in the AI filtering process, fall back to returning all actions
        console.error("Error using Claude for filtering:", error);
        return logAndFormatResult(allActions);
      }
    },
  });

  mcpServer.addTool({
    name: "dispatch-actions",
    description: "Dispatch the actions available in the system",
    parameters: z.object({
      name: z.string({ description: "The name of the action to dispatch" }),
      parameters: z.record(z.string(), z.any()),
    }),
    execute: async (args, context) => {
      console.log("dispatch-actions tool called", args, context);
      const action = getAction(args.name);
      if (!action) return "Unknown action";
      try {
        const result = await action.execute(args.parameters);
        console.log("dispatch-actions result", result);
        return result;
      } catch (error) {
        return `Error: ${String(error)}`;
      }
    },
  });

  await mcpServer.start({
    transportType: "sse",
    sse: { endpoint: "/mcp", port: 8371 },
  });

  return async () => {
    for (const server of servers) {
      await server.close();
    }
    await mcpServer.stop();
  };
};
