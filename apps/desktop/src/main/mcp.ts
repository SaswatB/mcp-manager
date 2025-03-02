import { FastMCP } from "./FastMCPProxy";
import { v4 as uuidv4 } from "uuid";
import { version } from "../../package.json";
import { loadServerConfigs, setupConfigWatcher } from "./config";
import { ServerMap, connectToServers } from "./connections";
import { createDispatchActionsTool, createRequestActionsTool } from "./actions";

/**
 * Start the MCP server and connect to all configured servers
 * @returns Function to clean up and close all connections
 */
export const startMCP = async () => {
  // Load server configs from the user's home directory
  let serverConfigs = await loadServerConfigs();

  // Track server connections by name for easier reference
  const serverMap: ServerMap = {};

  // Connect to initial servers
  await connectToServers(serverMap, serverConfigs);

  // Set up config watcher to handle configuration changes
  const stopWatcher = setupConfigWatcher(async (newConfigs) => {
    await connectToServers(serverMap, newConfigs);
    serverConfigs = newConfigs;
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
    // Stop watching the config file
    await stopWatcher();

    // Close all server connections
    for (const serverData of Object.values(serverMap)) {
      await serverData.connection.close();
    }

    // Stop the MCP server
    await mcpServer.stop();
  };
};
