const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
  // App info
  getVersion: () => ipcRenderer.invoke('app-version'),
  
  // File dialogs
  showSaveDialog: (options) => ipcRenderer.invoke('show-save-dialog', options),
  showOpenDialog: (options) => ipcRenderer.invoke('show-open-dialog', options),
  
  // File system operations
  writeLogFile: (logData, logsDirectory) => ipcRenderer.invoke('write-log-file', logData, logsDirectory),
  
  // Profile management
  saveProfilesToFile: (profiles) => ipcRenderer.invoke('save-profiles-to-file', profiles),
  loadProfilesFromFile: () => ipcRenderer.invoke('load-profiles-from-file'),
  
  // Command history management
  saveCommandHistory: (data) => ipcRenderer.invoke('save-command-history', data),
  loadCommandHistory: (profileId) => ipcRenderer.invoke('load-command-history', profileId),
  appendCommandHistory: (data) => ipcRenderer.invoke('append-command-history', data),
  
  // Terminal window
  openTerminalWindow: (terminalData) => ipcRenderer.invoke('open-terminal-window', terminalData),
  
  // SSH functionality
  ssh: {
    connect: (config) => ipcRenderer.invoke('ssh-connect', config),
    executeCommand: (connectionId, command) => ipcRenderer.invoke('ssh-execute-command', connectionId, command),
    listDirectory: (connectionId, remotePath) => ipcRenderer.invoke('ssh-list-directory', connectionId, remotePath),
    listDirectoryRecursive: (connectionId, remotePath, options) => ipcRenderer.invoke('ssh-list-directory-recursive', connectionId, remotePath, options),
    downloadFile: (connectionId, remotePath, localPath) => ipcRenderer.invoke('ssh-download-file', connectionId, remotePath, localPath),
    uploadFile: (connectionId, localPath, remotePath) => ipcRenderer.invoke('ssh-upload-file', connectionId, localPath, remotePath),
    disconnect: (connectionId) => ipcRenderer.invoke('ssh-disconnect', connectionId),
    getConnections: () => ipcRenderer.invoke('ssh-get-connections')
  },
  
  // Menu actions
  onMenuNewConnection: (callback) => ipcRenderer.on('menu-new-connection', callback),
  onMenuLogsDirectory: (callback) => ipcRenderer.on('menu-logs-directory', callback),
  onMenuManageProfiles: (callback) => ipcRenderer.on('menu-manage-profiles', callback),
  onMenuExportProfiles: (callback) => ipcRenderer.on('menu-export-profiles', callback),
  onMenuImportProfiles: (callback) => ipcRenderer.on('menu-import-profiles', callback),
  
  // Remove listeners
  removeAllListeners: (channel) => ipcRenderer.removeAllListeners(channel),
  
  // Platform info
  platform: process.platform,
  
  // Security: Only allow specific channels
  isElectron: true
});

// Secure window opening
window.addEventListener('DOMContentLoaded', () => {
  // Override window.open to prevent unauthorized new windows and debug calls
  const originalWindowOpen = window.open;
  window.open = function(url, target, features) {
    console.log('=== WINDOW.OPEN CALLED ===');
    console.log('URL:', url);
    console.log('Target:', target);
    console.log('Features:', features);
    console.log('Stack trace:', new Error().stack);
    
    // Block all window.open calls for debugging
    console.warn('BLOCKING window.open call');
    return null;
  };
});
