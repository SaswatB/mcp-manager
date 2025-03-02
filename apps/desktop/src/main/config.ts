import fs from "fs";
import path from "path";
import os from "os";
import { z } from "zod";
import * as chokidar from "chokidar";
import { BehaviorSubject } from "rxjs";
import { Draft, produce } from "immer";

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
  mcpServers: z.record(z.string(), ServerParametersSchema).optional(),
});

export type Config = z.infer<typeof ConfigSchema>;

/**
 * Load server configurations from a JSON file in the user's home directory
 * Creates a default configuration if the file doesn't exist
 */
function loadConfigs(): Config {
  // Create default config if it doesn't exist
  if (!fs.existsSync(CONFIG_PATH)) {
    const defaultConfig: Config = { mcpServers: {} };
    fs.writeFileSync(CONFIG_PATH, JSON.stringify(defaultConfig, null, 2));
    console.log(`Created default server config at ${CONFIG_PATH}`);
    return defaultConfig;
  }

  // Read existing config
  try {
    const configData = fs.readFileSync(CONFIG_PATH, "utf-8");
    const configs = ConfigSchema.parse(JSON.parse(configData));
    console.log(`Loaded server configurations from ${CONFIG_PATH}`);
    return configs;
  } catch (error) {
    console.error(`Error loading server configurations: ${error}`);
    throw error;
  }
}

export function updateConfig(apply: (existingConfig: Draft<Config>) => void) {
  const existingConfig = loadConfigs();
  const newConfig = produce(existingConfig, apply);
  fs.writeFileSync(CONFIG_PATH, JSON.stringify(newConfig, null, 2));
}

// Function to initialize config and watcher
export async function initializeConfig(): Promise<{
  config$: BehaviorSubject<Config>;
  cleanup: () => Promise<void>;
}> {
  // Create a BehaviorSubject to track server configurations
  const config$ = new BehaviorSubject<Config>(loadConfigs());

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
      const newConfigs = loadConfigs();

      // Only update if configs are different
      if (JSON.stringify(config$.getValue()) !== JSON.stringify(newConfigs)) {
        // Update the BehaviorSubject with new configs
        config$.next(newConfigs);
        console.log("Successfully updated server configurations");
      } else {
        console.log(
          "Configuration file changed but content is identical - no action needed"
        );
      }
    } catch (error) {
      console.error("Error updating server configurations:", error);
    }
  });

  // Return the BehaviorSubject and cleanup function
  return {
    config$,
    cleanup: async () => {
      await watcher.close();
      config$.complete();
    },
  };
}
