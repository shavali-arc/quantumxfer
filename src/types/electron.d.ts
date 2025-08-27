// TypeScript declarations for Electron API
export interface ElectronAPI {
  // App info
  getVersion: () => Promise<string>;
  
  // File dialogs
  showSaveDialog: (options: any) => Promise<any>;
  showOpenDialog: (options: any) => Promise<any>;
  
  // Terminal window
  openTerminalWindow: (terminalData: any) => Promise<{ success: boolean }>;
  
  // SSH functionality
  ssh: {
    connect: (config: SSHConfig) => Promise<SSHConnectionResult>;
    executeCommand: (connectionId: number, command: string) => Promise<SSHCommandResult>;
    listDirectory: (connectionId: number, remotePath?: string) => Promise<SSHDirectoryResult>;
    downloadFile: (connectionId: number, remotePath: string, localPath: string) => Promise<SSHFileResult>;
    uploadFile: (connectionId: number, localPath: string, remotePath: string) => Promise<SSHFileResult>;
    disconnect: (connectionId: number) => Promise<SSHResult>;
    getConnections: () => Promise<SSHConnectionsResult>;
  };
  
  // Menu actions
  onMenuNewConnection: (callback: () => void) => void;
  onMenuLogsDirectory: (callback: () => void) => void;
  onMenuManageProfiles: (callback: () => void) => void;
  onMenuExportProfiles: (callback: () => void) => void;
  onMenuImportProfiles: (callback: () => void) => void;
  
  // Remove listeners
  removeAllListeners: (channel: string) => void;
  
  // Platform info
  platform: string;
  isElectron: boolean;
}

export interface SSHConfig {
  host: string;
  port: number;
  username: string;
  password?: string;
  privateKey?: string;
  profileName?: string;
}

export interface SSHResult {
  success: boolean;
  error?: string;
  code?: string;
  message?: string;
}

export interface SSHConnectionResult extends SSHResult {
  connectionId?: number;
  serverInfo?: {
    host: string;
    port: number;
    username: string;
  };
}

export interface SSHCommandResult extends SSHResult {
  command?: string;
  stdout?: string;
  stderr?: string;
  exitCode?: number;
  signal?: string;
}

export interface SSHDirectoryResult extends SSHResult {
  path?: string;
  files?: Array<{
    name: string;
    type: 'file' | 'directory';
    size: number;
    permissions: string;
    modified: Date;
    path: string;
  }>;
}

export interface SSHFileResult extends SSHResult {
  remotePath?: string;
  localPath?: string;
}

export interface SSHConnectionsResult extends SSHResult {
  connections?: Array<{
    id: number;
    config: Partial<SSHConfig>;
    connected: boolean;
    createdAt: Date;
  }>;
}

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}
