import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
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
import fs from "fs";
import path from "path";
import os from "os";
import * as chokidar from "chokidar";
import { deepEqual } from "fast-equals";

const OVERRIDE_PREFIX = "__mcp_manager__";
const REQUEST_ACTIONS_OVERRIDE_TOOL = `${OVERRIDE_PREFIX}request_actions_filter_override`;
const CONFIG_PATH = path.join(os.homedir(), ".mcp_manager_config.json");

type JsonSchemaParameters = {
  type: "object";
  properties?: Record<string, unknown>;
};
const ServerParametersSchema = z.union([
  // stdio
  z.object({
    keywords: z.array(z.string()),
    command: z.string(),
    args: z.array(z.string()).optional(),
    env: z.record(z.string(), z.string()).optional(),
    cwd: z.string().optional(),
  }),
  // sse
  z.object({
    keywords: z.array(z.string()),
    url: z.string().url(),
  }),
]);

type ServerParameters = z.infer<typeof ServerParametersSchema> & {
  name: string;
};

const ConfigSchema = z.object({
  mcpServers: z.record(z.string(), ServerParametersSchema),
});

type Config = z.infer<typeof ConfigSchema>;

/**
 * Load server configurations from a JSON file in the user's home directory
 * Creates a default configuration if the file doesn't exist
 */
async function loadServerConfigs(): Promise<
  (ServerParameters & { keywords: string[] })[]
> {
  // Create default config if it doesn't exist
  if (!fs.existsSync(CONFIG_PATH)) {
    const defaultConfig: Config = { mcpServers: {} };
    fs.writeFileSync(CONFIG_PATH, JSON.stringify(defaultConfig, null, 2));
    console.log(`Created default server config at ${CONFIG_PATH}`);
    return [];
  }

  // Read existing config
  try {
    const configData = fs.readFileSync(CONFIG_PATH, "utf-8");
    const configs = ConfigSchema.parse(JSON.parse(configData));
    console.log(`Loaded server configurations from ${CONFIG_PATH}`);
    return Object.entries(configs.mcpServers).map(([name, params]) => ({
      ...params,
      name,
    }));
  } catch (error) {
    console.error(`Error loading server configurations: ${error}`);
    throw error;
  }
}

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
    "command" in params
      ? new StdioClientTransport({
          ...params,
          env: {
            PATH: process.env.PATH || "",
            ...params.env,
          },
          stderr: "pipe",
        })
      : new SSEClientTransport(new URL(params.url));

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
    close: async () => {
      statusSubject.next("closing");
      console.log(`Closing connection to ${params.name}`);
      await transport.close();
      statusSubject.next("closed");
      statusSubject.complete();
      errorSubject.complete();
      toolsSubject.complete();
    },
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
  // Load server configs from the user's home directory
  let serverConfigs = await loadServerConfigs();

  // Track server connections by name for easier reference
  const serverMap: Record<
    string,
    { config: ServerParameters; connection: ServerConnection }
  > = {};

  // Function to connect to all configured servers with smart diffing
  const connectToServers = async (newConfigs: ServerParameters[]) => {
    // Identify servers to add, update, or keep
    const serversToAdd: ServerParameters[] = [];
    const serversToUpdate: ServerParameters[] = [];
    const serversToKeep: string[] = [];
    const serversToRemove: string[] = [];

    // Categorize new/updated servers
    for (const newConfig of newConfigs) {
      const existing = serverMap[newConfig.name];

      if (!existing) {
        // New server
        serversToAdd.push(newConfig);
      } else if (!deepEqual(existing.config, newConfig)) {
        // Config changed, update needed
        serversToUpdate.push(newConfig);
      } else {
        // Config unchanged, keep existing connection
        serversToKeep.push(newConfig.name);
      }
    }

    // Find servers to remove (in current but not in new)
    const currentServerNames = Object.keys(serverMap);
    const newServerNames = newConfigs.map((config) => config.name);
    for (const name of currentServerNames) {
      if (!newServerNames.includes(name)) {
        serversToRemove.push(name);
      }
    }

    console.log(
      `Server changes: ${serversToAdd.length} to add, ${serversToUpdate.length} to update, ${serversToKeep.length} to keep, ${serversToRemove.length} to remove`
    );

    // Remove servers that are no longer in config
    for (const name of serversToRemove) {
      const server = serverMap[name];
      if (server) {
        console.log(`Closing connection to removed server: ${name}`);
        await server.connection.close();
        delete serverMap[name];
      }
    }

    // Update servers with changed configs
    for (const config of serversToUpdate) {
      const server = serverMap[config.name];
      if (server) {
        console.log(`Updating server connection: ${config.name}`);
        await server.connection.close();
        // Create new connection
        const newConnection = await connectToServer(config);
        serverMap[config.name] = {
          config,
          connection: newConnection,
        };
      }
    }

    // Add new servers
    for (const config of serversToAdd) {
      console.log(`Adding new server connection: ${config.name}`);
      const newConnection = await connectToServer(config);
      serverMap[config.name] = {
        config,
        connection: newConnection,
      };
    }

    // Return all current server connections
    return Object.values(serverMap).map((s) => s.connection);
  };

  const getActions = () =>
    Object.values(serverMap).flatMap(({ connection, config }) =>
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

  // Connect to initial servers
  await connectToServers(serverConfigs);

  // Set up file watcher to monitor configuration changes
  const watcher = chokidar.watch(CONFIG_PATH, {
    persistent: true,
    awaitWriteFinish: {
      stabilityThreshold: 2000,
      pollInterval: 100,
    },
  });
  watcher.on("change", async () => {
    try {
      console.log(`Server configuration file changed: ${CONFIG_PATH}`);

      // Load the updated configuration
      const newServerConfigs = await loadServerConfigs();

      // Only update if configs are different
      if (JSON.stringify(serverConfigs) !== JSON.stringify(newServerConfigs)) {
        // Update servers using smart diffing
        await connectToServers(newServerConfigs);
        // Update the current config reference
        serverConfigs = newServerConfigs;
        console.log("Successfully updated server connections");
      } else {
        console.log(
          "Configuration file changed but content is identical - no action needed"
        );
      }
    } catch (error) {
      console.error("Error updating server connections:", error);
    }
  });

  // Generate dynamic description for request-actions
  const getKeywordsDescription = (): string => {
    const keywordSet = new Set<string>();
    Object.values(serverMap).forEach(({ config }) => {
      config.keywords.forEach((keyword) => keywordSet.add(keyword));
    });
    const keywords = Array.from(keywordSet);
    return `Request the actions that can be performed. Actions remain available throughout the conversation unless otherwise specified. Current available actions are related to these keywords: '${keywords.join("', '")}'`;
  };

  const getRequestActionsTool = () => ({
    name: "request-actions",
    description: getKeywordsDescription(),
    parameters: z.object({
      why: z.string({
        description:
          "Please give context on what you need actions for, this will help provide the relevant actions. Remember these are actions, not tools, actions returned MUST be called with dispatch-actions tool.",
      }),
    }),
    execute: async (args, context) => {
      console.log("request-actions tool called", args, context);

      // Get all available actions
      const rawActions = getActions();
      const allActions = rawActions.filter(
        (a) => !a.name.startsWith(OVERRIDE_PREFIX)
      );

      const logAndFormatResult = (
        result: ActionDefinition<Record<string, unknown>>[]
      ) => {
        const resultString = JSON.stringify(result);
        console.log("request-actions result", resultString);
        return resultString;
      };

      // Check if any server provides an override tool
      const override = rawActions.find(
        (a) => a.name === REQUEST_ACTIONS_OVERRIDE_TOOL
      );
      if (override) {
        try {
          // Get the first server name that provides an override
          console.log(
            `Using request-actions override from server: ${override.name}`
          );

          // Call the override tool with the user's context and all available actions
          const result = await override.execute({
            why: args.why,
            availableActions: allActions.map((action) => ({
              name: action.name,
              description: action.description,
              keywords: action.keywords,
            })),
          });

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

  const dispatchActionsTool = {
    name: "dispatch-actions",
    description: "Dispatch the actions available in the system",
    parameters: z.object({
      name: z.string({ description: "The name of the action to dispatch" }),
      parameters: z.record(z.string(), z.any()),
    }),
    execute: async (args, context) => {
      console.log("dispatch-actions tool called", args, context);
      const action = getActions()
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

  const mcpServer = new FastMCP(
    {
      name: "MCP Manager",
      version: version as `${number}.${number}.${number}`,
      authenticate: async () => ({ sessionId: uuidv4() }),
    },
    () => [getRequestActionsTool(), dispatchActionsTool]
  );

  await mcpServer.start({
    transportType: "sse",
    sse: { endpoint: "/mcp", port: 8371 },
  });

  return async () => {
    // Stop watching the config file
    await watcher.close();

    // Close all server connections
    for (const serverData of Object.values(serverMap)) {
      await serverData.connection.close();
    }
    await mcpServer.stop();
  };
};
