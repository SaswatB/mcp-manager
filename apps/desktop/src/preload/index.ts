import { contextBridge, ipcRenderer } from "electron";
import { electronAPI } from "@electron-toolkit/preload";

// Custom APIs for renderer
const api = {
  // Server management
  getServers: () => ipcRenderer.invoke("getServers"),
  addServer: (serverConfig) => ipcRenderer.invoke("addServer", serverConfig),
  updateServer: (name, serverConfig) =>
    ipcRenderer.invoke("updateServer", name, serverConfig),
  removeServer: (name) => ipcRenderer.invoke("removeServer", name),
  connectServer: (name) => ipcRenderer.invoke("connectServer", name),
  disconnectServer: (name) => ipcRenderer.invoke("disconnectServer", name),

  // MCP connection info
  getMCPConnectionURL: () => ipcRenderer.invoke("getMCPConnectionURL"),

  // Logs
  getLogs: () => ipcRenderer.invoke("getLogs"),
  clearLogs: () => ipcRenderer.invoke("clearLogs"),

  // Settings
  getSettings: () => ipcRenderer.invoke("getSettings"),
  updateSettings: (settings) => ipcRenderer.invoke("updateSettings", settings),

  // Events
  onServerStatusChange: (callback) =>
    ipcRenderer.on("serverStatusChange", callback),
  onServerError: (callback) => ipcRenderer.on("serverError", callback),
  onLogEntry: (callback) => ipcRenderer.on("logEntry", callback),

  // Remove event listeners
  removeAllListeners: () => {
    ipcRenderer.removeAllListeners("serverStatusChange");
    ipcRenderer.removeAllListeners("serverError");
    ipcRenderer.removeAllListeners("logEntry");
  },
};

// Use `contextBridge` APIs to expose Electron APIs to
// renderer only if context isolation is enabled, otherwise
// just add to the DOM global.
if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld("electron", electronAPI);
    contextBridge.exposeInMainWorld("api", api);
  } catch (error) {
    console.error(error);
  }
} else {
  // @ts-ignore (define in dts)
  window.electron = electronAPI;
  // @ts-ignore (define in dts)
  window.api = api;
}
