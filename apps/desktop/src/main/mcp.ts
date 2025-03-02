import { FastMCP } from "./FastMCPProxy";
import { v4 as uuidv4 } from "uuid";
import { version } from "../../package.json";
import { initializeConfig } from "./config";
import { createServerMap } from "./connections";
import { createDispatchActionsTool, createRequestActionsTool } from "./actions";

/**
 * Start the MCP server and connect to all configured servers
 * @returns Function to clean up and close all connections
 */
export const startMCP = async () => {
  // Initialize config and get references to the configs stream and cleanup function
  const { config$, cleanup: stopConfigWatcher } = await initializeConfig();

  // Initial connection to servers
  const { serverMap$, cleanup: stopServerMapWatcher } =
    await createServerMap(config$);

  // Initialize and start the MCP server
  const mcpServer = new FastMCP(
    {
      name: "MCP Manager",
      version: version as `${number}.${number}.${number}`,
      authenticate: async () => ({ sessionId: uuidv4() }),
    },
    () => [
      createRequestActionsTool(serverMap$.getValue()),
      createDispatchActionsTool(serverMap$.getValue()),
    ]
  );

  const path = "/mcp";
  const port = 8371;
  await mcpServer.start({
    transportType: "sse",
    sse: { endpoint: path, port },
  });
  const endpoint = `http://localhost:${port}${path}`;

  // Return a cleanup function
  const cleanup = async () => {
    // Stop watching the server map
    await stopServerMapWatcher();

    // Stop watching the config file
    await stopConfigWatcher();

    // Stop the MCP server
    await mcpServer.stop();
  };

  return { config$, serverMap$, cleanup, endpoint, port };
};

export type MCP = Awaited<ReturnType<typeof startMCP>>;
