import fs from "fs";
import path from "path";
import os from "os";
import { z } from "zod";
import * as chokidar from "chokidar";

export const CONFIG_PATH = path.join(os.homedir(), ".mcp_manager_config.json");

// Server parameters schema definitions
export const ServerParametersSchema = z.union([
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

export type ServerParameters = z.infer<typeof ServerParametersSchema> & {
  name: string;
};

const ConfigSchema = z.object({
  mcpServers: z.record(z.string(), ServerParametersSchema),
});

export type Config = z.infer<typeof ConfigSchema>;

/**
 * Load server configurations from a JSON file in the user's home directory
 * Creates a default configuration if the file doesn't exist
 */
export async function loadServerConfigs(): Promise<ServerParameters[]> {
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
 * Setup a watcher for config file changes
 * @param onConfigChange Callback function to handle config changes
 * @returns Function to close the watcher
 */
export function setupConfigWatcher(
  onConfigChange: (configs: ServerParameters[]) => Promise<void>
): () => Promise<void> {
  let currentConfigs: ServerParameters[] = [];

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
      if (JSON.stringify(currentConfigs) !== JSON.stringify(newServerConfigs)) {
        // Update servers using callback
        await onConfigChange(newServerConfigs);
        // Update the current config reference
        currentConfigs = newServerConfigs;
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

  // Initialize current configs
  loadServerConfigs()
    .then((configs) => {
      currentConfigs = configs;
    })
    .catch((error) => {
      console.error("Error loading initial configurations:", error);
    });

  // Return function to close the watcher
  return async () => {
    await watcher.close();
  };
}
