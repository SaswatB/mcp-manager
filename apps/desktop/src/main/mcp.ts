import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import {
  StdioClientTransport,
  StdioServerParameters,
} from "@modelcontextprotocol/sdk/client/stdio.js";
import { SSEClientTransport } from "@modelcontextprotocol/sdk/client/sse.js";
import { ContentResult, FastMCP, ImageContent, TextContent } from "fastmcp";
import { BehaviorSubject } from "rxjs";
import { v4 as uuidv4 } from "uuid";
import { z } from "zod";

import { version } from "../../package.json";
import zodToJsonSchema from "zod-to-json-schema";

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
  const server = new FastMCP({
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
  const servers = await Promise.all(
    serverConfigs.map(async (config) => {
      const server = await connectToServer(config);
      server.tools.subscribe((tools) => {
        console.log("tools from server", config.name, tools);
        for (const tool of tools) {
          registerAction({
            name: tool.name,
            description: tool.description || "",
            keywords: config.keywords,
            parameters: tool.inputSchema,
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

  server.addTool({
    name: "request-actions",
    description: getKeywordsDescription(),
    parameters: z.object({
      why: z.string({
        description:
          "Please give context on what you need actions for, this will help provide the relevant actions. Actions returned must be called with dispatch-actions tool.",
      }),
    }),
    execute: async (args, context) => {
      console.log("request-actions tool called", args, context);
      // Return all available actions metadata (without execute functions)
      const actions = JSON.stringify(Object.values(actionsRegistry));
      console.log("request-actions actions", actions);
      return actions;
    },
  });

  server.addTool({
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

  await server.start({
    transportType: "sse",
    sse: { endpoint: "/mcp", port: 8371 },
  });

  return async () => {
    for (const server of servers) {
      await server.close();
    }
    await server.stop();
  };
};
