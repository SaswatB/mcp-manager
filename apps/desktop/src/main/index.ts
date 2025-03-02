import { app, shell, BrowserWindow, ipcMain } from "electron";
import { join } from "path";
import { electronApp, optimizer, is } from "@electron-toolkit/utils";
import icon from "../../resources/icon.png?asset";
import { MCP, startMCP } from "./mcp";
import { logger } from "./logger";
import { URL } from "url";
import { updateConfig } from "./config";

// Global references
let mainWindow: BrowserWindow | null = null;
let mcp: MCP;

function createWindow(): void {
  // Create the browser window.
  mainWindow = new BrowserWindow({
    width: 900,
    height: 670,
    show: false,
    autoHideMenuBar: true,
    ...(process.platform === "linux" ? { icon } : {}),
    webPreferences: {
      preload: join(__dirname, "../preload/index.mjs"),
      sandbox: false,
    },
  });

  mainWindow.on("ready-to-show", () => {
    mainWindow?.show();
  });

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url);
    return { action: "deny" };
  });

  // HMR for renderer base on electron-vite cli.
  // Load the remote URL for development or the local html file for production.
  if (is.dev && process.env["ELECTRON_RENDERER_URL"]) {
    mainWindow.loadURL(process.env["ELECTRON_RENDERER_URL"]);
  } else {
    mainWindow.loadFile(join(__dirname, "../renderer/index.html"));
  }
}

// Setup IPC event handlers for renderer communication
function setupIPC(mcpPromise: Promise<MCP>) {
  // Server management
  ipcMain.handle("getServers", async () => {
    const mcp = await mcpPromise;
    const servers = Object.values(mcp.serverMap$.getValue()).map((server) => {
      const connection = server.connection;
      const status = connection.status.getValue();
      const error = connection.error.getValue();

      // Extract IP address from URL or command
      let ip = "unknown";
      if ("url" in server.config) {
        try {
          const url = new URL(server.config.url);
          ip = url.hostname;
        } catch {
          // Log the warning but ignore the error object
          logger.warn(`Invalid URL format: ${server.config.url}`);
        }
      } else if ("command" in server.config) {
        ip = "local";
      }

      return {
        name: server.config.name,
        status,
        error,
        ip,
        description: `MCP Server ${server.config.name}`,
        config: server.config,
      };
    });

    return servers;
  });

  ipcMain.handle("addServer", async (_, serverConfig) => {
    const mcp = await mcpPromise;
    try {
      // Check if server with this name already exists
      if (
        Object.values(mcp.serverMap$.getValue()).some(
          (server) => server.config.name === serverConfig.name
        )
      ) {
        return false;
      }

      // Add new server config
      updateConfig((config) => {
        (config.mcpServers ||= {})[serverConfig.name] = serverConfig;
      });
      return true;
    } catch (error) {
      logger.error(`Error adding server: ${error}`);
      return false;
    }
  });

  ipcMain.handle("updateServer", async (_, name, serverConfig) => {
    try {
      updateConfig((config) => {
        (config.mcpServers ||= {})[name] = serverConfig;
      });
      return true;
    } catch (error) {
      logger.error(`Error updating server: ${error}`);
      return false;
    }
  });

  ipcMain.handle("removeServer", async (_, name) => {
    try {
      updateConfig((config) => {
        if (config.mcpServers) delete config.mcpServers[name];
      });
      return true;
    } catch (error) {
      logger.error(`Error removing server: ${error}`);
      return false;
    }
  });

  // Connection management
  ipcMain.handle("connectServer", async (_, name) => {
    const mcp = await mcpPromise;
    // This is handled automatically by updateServerMap when configs change
    // Just return the current status
    const server = mcp.serverMap$.getValue()[name];
    return server ? server.connection.status.getValue() === "connected" : false;
  });

  ipcMain.handle("disconnectServer", async (_, name) => {
    const mcp = await mcpPromise;
    const server = mcp.serverMap$.getValue()[name];
    if (server) {
      await server.connection.close();
      return true;
    }
    return false;
  });

  // MCP connection info
  ipcMain.handle("getMCPConnectionURL", async () => {
    const mcp = await mcpPromise;
    return mcp.endpoint;
  });

  // Logs
  ipcMain.handle("getLogs", async () => {
    return logger.getLogs();
  });

  ipcMain.handle("clearLogs", async () => {
    logger.clearLogs();
    return true;
  });

  // Settings
  ipcMain.handle("getSettings", async () => {
    return {};
  });

  ipcMain.handle("updateSettings", async () => {
    try {
      return true;
    } catch (error) {
      logger.error(`Error updating settings: ${error}`);
      return false;
    }
  });
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(async () => {
  // Set app user model id for windows
  electronApp.setAppUserModelId("com.electron");

  // Default open or close DevTools by F12 in development
  // and ignore CommandOrControl + R in production.
  // see https://github.com/alex8088/electron-toolkit/tree/master/packages/utils
  app.on("browser-window-created", (_, window) => {
    optimizer.watchWindowShortcuts(window);
  });

  // Set up IPC handlers
  const mcpPromise = startMCP();
  setupIPC(mcpPromise);

  // Create the main window
  createWindow();

  app.on("activate", function () {
    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });

  // Start MCP server
  mcp = await mcpPromise;

  // Subscribe to server status changes
  for (const serverObj of Object.values(mcp.serverMap$.getValue())) {
    const server = serverObj.connection;

    // Status change
    server.status.subscribe((status) => {
      if (mainWindow) {
        const serverInfo = {
          name: server.name,
          status,
          error: server.error.getValue(),
          ip:
            "url" in serverObj.config
              ? new URL(serverObj.config.url).hostname
              : "local",
          config: serverObj.config,
        };

        mainWindow.webContents.send("serverStatusChange", serverInfo);
      }
    });

    // Error change
    server.error.subscribe((error) => {
      if (mainWindow && error) {
        const serverInfo = {
          name: server.name,
          status: server.status.getValue(),
          error,
          ip:
            "url" in serverObj.config
              ? new URL(serverObj.config.url).hostname
              : "local",
          config: serverObj.config,
        };

        mainWindow.webContents.send("serverError", serverInfo);
      }
    });
  }

  // Add log listener
  logger.addLogListener((entry) => {
    if (mainWindow) {
      mainWindow.webContents.send("logEntry", entry);
    }
  });
});

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

// Clean up and quit the app
app.on("will-quit", async (event) => {
  // Prevent the app from quitting immediately
  event.preventDefault();

  try {
    // Stop the MCP server
    if (mcp.cleanup) {
      await mcp.cleanup();
    }

    // Now allow the app to quit
    app.exit();
  } catch {
    app.exit(1);
  }
});

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and require them here.
