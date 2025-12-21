// TypeScript declarations for Electron API

/**
 * Standardized IPC Response Format
 * All IPC handlers should return this structure for consistency
 */
export interface IPCResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  code?: string;
  timestamp?: number;
}

export interface ElectronAPI {
  // App info
  getVersion: () => Promise<string>;
  
  // File dialogs
  showSaveDialog: (options: Electron.SaveDialogOptions) => Promise<Electron.SaveDialogReturnValue>;
  showOpenDialog: (options: Electron.OpenDialogOptions) => Promise<Electron.OpenDialogReturnValue>;
  
  // Terminal window
  openTerminalWindow: (terminalData: object) => Promise<{ success: boolean }>;
  
  // SSH functionality
  ssh: {
    connect: (config: SSHConfig) => Promise<SSHConnectionResult>;
    executeCommand: (connectionId: number, command: string) => Promise<SSHCommandResult>;
    listDirectory: (connectionId: number, remotePath?: string) => Promise<SSHDirectoryResult>;
    listDirectoryRecursive: (connectionId: number, remotePath?: string, options?: { maxDepth?: number; includeFiles?: boolean; includeDirs?: boolean }) => Promise<SSHDirectoryResult>;
    downloadFile: (connectionId: number, remotePath: string, localPath: string) => Promise<SSHFileResult>;
    uploadFile: (connectionId: number, localPath: string, remotePath: string) => Promise<SSHFileResult>;
    disconnect: (connectionId: number) => Promise<SSHResult>;
    getConnections: () => Promise<SSHConnectionsResult>;
  };
  
  // File system operations
  writeLogFile: (logData: string, logsDirectory: string) => Promise<{ success: boolean; filePath?: string; filename?: string; error?: string }>;
  
  // Profile management
  saveProfilesToFile: (profiles: ConnectionProfile[]) => Promise<{ success: boolean; filePath?: string; error?: string }>;
  loadProfilesFromFile: () => Promise<{ success: boolean; profiles: ConnectionProfile[]; error?: string }>;
  
  // Command history management
  saveCommandHistory: (data: { commands: string[] }) => Promise<{ success: boolean; filePath?: string; error?: string }>;
  loadCommandHistory: () => Promise<{ success: boolean; commands: string[]; error?: string }>;
  appendCommandHistory: (data: { command: string }) => Promise<{ success: boolean; commands: string[]; error?: string }>;
  
  // Bookmarks management
  bookmarks: {
    list: () => Promise<{ success: boolean; bookmarks: Bookmark[]; error?: string }>;
    add: (bookmark: NewBookmark) => Promise<{ success: boolean; bookmarks?: Bookmark[]; error?: string }>;
    remove: (bookmarkId: string) => Promise<{ success: boolean; bookmarks?: Bookmark[]; error?: string }>;
  };

  // SSH Key Management
  sshKeys: {
    generate: (options: SSHKeyGenerationOptions) => Promise<IPCResponse<SSHKeyPair>>;
    list: () => Promise<IPCResponse<SSHKeyPair[]>>;
    get: (name: string) => Promise<IPCResponse<SSHKeyPair>>;
    import: (options: { name: string; privateKeyPath: string; publicKeyPath?: string; passphrase?: string }) => Promise<IPCResponse<SSHKeyPair>>;
    export: (name: string, outputPath: string) => Promise<IPCResponse<{ privateKeyPath: string; publicKeyPath?: string; metadataPath: string }>>;
    delete: (name: string) => Promise<IPCResponse<{ success: boolean; message: string }>>;
    test: (name: string, passphrase?: string) => Promise<IPCResponse<SSHKeyValidationResult>>;
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
  totalFiles?: number;
  truncated?: boolean;
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

export interface ConnectionProfile {
  id: string;
  name: string;
  host: string;
  port: number;
  username: string;
  password?: string; // Encrypted password for secure storage
  lastUsed: Date;
  logsDirectory?: string;
  commandHistory?: string[];
  connectionCount?: number;
  totalSessionTime?: number;
  favorited?: boolean;
  tags?: string[];
  sshKeyPath?: string;
  jumpHost?: string;
}

// SSH Key Management Types
export interface SSHKeyPair {
  name: string;
  type: 'rsa' | 'ed25519' | 'ecdsa' | 'unknown';
  bits?: number;
  privateKey?: string;
  publicKey?: string;
  fingerprint?: string;
  comment?: string;
  createdAt?: string;
  privateKeyPath?: string;
  publicKeyPath?: string;
  imported?: boolean;
}

export interface SSHKeyGenerationOptions {
  name?: string;
  type: 'rsa' | 'ed25519' | 'ecdsa';
  bits?: number;
  comment?: string;
  passphrase?: string;
}

export interface SSHKeyValidationResult {
  valid: boolean;
  message?: string;
  error?: string;
  requiresPassphrase?: boolean;
}

export type BookmarkType = 'directory' | 'server';

export interface ServerRef {
  host: string;
  port: number;
  username?: string;
}

export interface Bookmark {
  id: string;
  type: BookmarkType;
  label: string;
  createdAt: string;
  // For server bookmarks
  server?: ServerRef | null;
  // For directory bookmarks (SFTP remote path)
  path?: string | null;
}

export interface NewBookmark {
  type: BookmarkType;
  label?: string;
  server?: ServerRef | null;
  path?: string | null;
  id?: string;
}

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}
