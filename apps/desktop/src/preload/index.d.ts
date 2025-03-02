import { ElectronAPI } from "@electron-toolkit/preload";

interface ServerConfig {
  name: string;
  keywords?: string[];
  command?: string;
  args?: string[];
  env?: Record<string, string>;
  cwd?: string;
  url?: string;
}

interface ServerInfo {
  name: string;
  status: string;
  error?: string;
  ip: string; // Derived from url or command location
  description?: string;
  config: ServerConfig;
}

interface LogEntry {
  timestamp: string;
  level: "INFO" | "DEBUG" | "WARN" | "ERROR";
  message: string;
}

interface AppSettings {}

interface API {
  // Server management
  getServers: () => Promise<ServerInfo[]>;
  addServer: (serverConfig: ServerConfig) => Promise<boolean>;
  updateServer: (name: string, serverConfig: ServerConfig) => Promise<boolean>;
  removeServer: (name: string) => Promise<boolean>;
  connectServer: (name: string) => Promise<boolean>;
  disconnectServer: (name: string) => Promise<boolean>;

  // MCP connection info
  getMCPConnectionURL: () => Promise<string>;

  // Logs
  getLogs: () => Promise<LogEntry[]>;
  clearLogs: () => Promise<boolean>;

  // Settings
  getSettings: () => Promise<AppSettings>;
  updateSettings: (settings: Partial<AppSettings>) => Promise<boolean>;

  // Events
  onServerStatusChange: (
    callback: (event: Electron.IpcRendererEvent, server: ServerInfo) => void
  ) => void;
  onServerError: (
    callback: (event: Electron.IpcRendererEvent, server: ServerInfo) => void
  ) => void;
  onLogEntry: (
    callback: (event: Electron.IpcRendererEvent, log: LogEntry) => void
  ) => void;

  // Remove event listeners
  removeAllListeners: () => void;
}

declare global {
  interface Window {
    electron: ElectronAPI;
    api: API;
  }
}
