import { contextBridge, ipcRenderer } from 'electron';

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
  // App info
  getVersion: () => ipcRenderer.invoke('app-version'),
  
  // File dialogs
  showSaveDialog: (options) => ipcRenderer.invoke('show-save-dialog', options),
  showOpenDialog: (options) => ipcRenderer.invoke('show-open-dialog', options),
  
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
  // Override window.open to prevent unauthorized new windows
  const originalWindowOpen = window.open;
  window.open = function(url, target, features) {
    // Only allow opening in same window or specific targets
    if (target === '_self' || target === '_blank') {
      return originalWindowOpen.call(this, url, target, features);
    }
    return null;
  };
});
