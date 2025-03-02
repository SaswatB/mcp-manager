import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { SSEClientTransport } from "@modelcontextprotocol/sdk/client/sse.js";
import { BehaviorSubject } from "rxjs";
import { deepEqual } from "fast-equals";
import { version } from "../../package.json";
import { Config, ServerParameters } from "./config";

type JsonSchemaParameters = {
  type: "object";
  properties?: Record<string, unknown>;
};

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

  // Create a connection object
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

export type ServerConnection = Awaited<ReturnType<typeof connectToServer>>;

export type ServerMap = Record<
  string,
  { config: ServerParameters; connection: ServerConnection }
>;

/**
 * Manages connections to configured servers with smart diffing
 */
export async function createServerMap(newConfigs: BehaviorSubject<Config>) {
  const serverMap$ = new BehaviorSubject<ServerMap>({});

  const subscription = newConfigs.subscribe(async (newConfigs) => {
    const newServerConfigs = Object.entries(newConfigs.mcpServers || {}).map(
      ([name, params]) => ({
        ...params,
        name,
      })
    );

    // Identify servers to add, update, or keep
    const serversToAdd: ServerParameters[] = [];
    const serversToUpdate: ServerParameters[] = [];
    const serversToKeep: string[] = [];
    const serversToRemove: string[] = [];
    const serverMap = { ...serverMap$.getValue() };

    // Categorize new/updated servers
    for (const newConfig of newServerConfigs) {
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
    const newServerNames = newServerConfigs.map((config) => config.name);
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

    serverMap$.next(serverMap);
  });

  // Return all current server connections
  return {
    serverMap$,
    cleanup: async () => {
      subscription.unsubscribe();
      await Promise.all(
        Object.values(serverMap$.getValue()).map((server) =>
          server.connection.close()
        )
      );
      serverMap$.complete();
    },
  };
}
