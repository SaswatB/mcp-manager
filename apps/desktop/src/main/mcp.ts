import { FastMCP } from "./FastMCPProxy";
import { v4 as uuidv4 } from "uuid";
import { version } from "../../package.json";
import { initializeConfig } from "./config";
import { ServerMap, updateServerMap } from "./connections";
import { createDispatchActionsTool, createRequestActionsTool } from "./actions";

/**
 * Start the MCP server and connect to all configured servers
 * @returns Function to clean up and close all connections
 */
export const startMCP = async () => {
  // Initialize config and get references to the configs stream and cleanup function
  const { configs$, cleanup: stopConfigWatcher } = await initializeConfig();

  // Track server connections by name for easier reference
  const serverMap: ServerMap = {};

  // Initial connection to servers
  const initialConfigs = configs$.getValue();
  await updateServerMap(serverMap, initialConfigs);

  // Subscribe to config changes and update server connections
  const configSubscription = configs$.subscribe(async (newConfigs) => {
    // Skip the initial value since we've already connected to those servers
    if (newConfigs !== initialConfigs) {
      console.log("Config changed, updating server connections");
      await updateServerMap(serverMap, newConfigs);
    }
  });

  // Initialize and start the MCP server
  const mcpServer = new FastMCP(
    {
      name: "MCP Manager",
      version: version as `${number}.${number}.${number}`,
      authenticate: async () => ({ sessionId: uuidv4() }),
    },
    () => [
      createRequestActionsTool(serverMap),
      createDispatchActionsTool(serverMap),
    ]
  );

  await mcpServer.start({
    transportType: "sse",
    sse: { endpoint: "/mcp", port: 8371 },
  });

  // Return a cleanup function
  return async () => {
    // Unsubscribe from config changes
    configSubscription.unsubscribe();

    // Stop watching the config file
    await stopConfigWatcher();

    // Close all server connections
    for (const serverData of Object.values(serverMap)) {
      await serverData.connection.close();
    }

    // Stop the MCP server
    await mcpServer.stop();
  };
};
