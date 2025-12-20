import { app, BrowserWindow, Menu, ipcMain, dialog, shell, safeStorage } from 'electron';
import path from 'path';
import fs from 'fs';
import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

// Import SSH Service
import SSHService from './ssh-service.js';

// Import Handler Validation Middleware
import HandlerValidator from './validators/middleware.js';

// Import IPC Error Handler
import IPCErrorHandler from './ipc-error-handler.js';

// Import Structured Logger
import Logger from './logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Keep a global reference of the window object
let mainWindow;
let splashWindow;

// Check if we're in development
const isDev = process.env.NODE_ENV === 'development';

// Initialize SSH service
const sshService = new SSHService();

// Initialize Structured Logger
const logger = new Logger({
  level: isDev ? 'DEBUG' : 'INFO',
  enableConsole: isDev,
  enableFile: true,
  context: 'QuantumXfer-Main'
});

logger.info('QuantumXfer Application Started', {
  version: '1.0.0',
  environment: isDev ? 'development' : 'production',
  platform: process.platform,
  nodeVersion: process.version
});


function createSplashWindow() {
  splashWindow = new BrowserWindow({
    width: 400,
    height: 300,
    frame: false,
    alwaysOnTop: true,
    transparent: true,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true
    }
  });

  // Create splash screen HTML
  const splashHTML = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body {
          margin: 0;
          padding: 0;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          display: flex;
          justify-content: center;
          align-items: center;
          height: 100vh;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          color: white;
        }
        .splash-content {
          text-align: center;
          animation: fadeIn 0.5s ease-in;
        }
        .logo {
          font-size: 48px;
          margin-bottom: 16px;
        }
        .title {
          font-size: 24px;
          font-weight: bold;
          margin-bottom: 8px;
        }
        .subtitle {
          font-size: 14px;
          opacity: 0.8;
          margin-bottom: 24px;
        }
        .loading {
          width: 200px;
          height: 4px;
          background: rgba(255,255,255,0.2);
          border-radius: 2px;
          overflow: hidden;
          margin: 0 auto;
        }
        .loading-bar {
          width: 50%;
          height: 100%;
          background: white;
          border-radius: 2px;
          animation: loading 1.5s infinite;
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes loading {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(400%); }
        }
      </style>
    </head>
    <body>
      <div class="splash-content">
        <div class="logo">⚡</div>
        <div class="title">QuantumXfer</div>
        <div class="subtitle">Enterprise SSH/SFTP Client</div>
        <div class="loading">
          <div class="loading-bar"></div>
        </div>
      </div>
    </body>
    </html>
  `;

  splashWindow.loadURL('data:text/html;charset=UTF-8,' + encodeURIComponent(splashHTML));

  splashWindow.on('closed', () => {
    splashWindow = null;
  });
}

function createMainWindow() {
  // Create the browser window
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1000,
    minHeight: 700,
    show: false,
    title: 'QuantumXfer App',
    icon: path.join(__dirname, '../assets/icon.png'),
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      enableRemoteModule: false,
      preload: path.join(__dirname, 'preload.js')
    },
    titleBarStyle: 'default',
    backgroundColor: '#0f172a'
  });

  // Load the app
  if (isDev) {
    mainWindow.loadURL('http://localhost:5188');
    // Open DevTools in development
    mainWindow.webContents.openDevTools();
  } else {
    // In production, the dist folder is in the same directory as the electron folder
    const indexPath = path.join(__dirname, '../dist/index.html');
    mainWindow.loadFile(indexPath);
    // Don't open DevTools in production (uncomment next line for debugging)
    // mainWindow.webContents.openDevTools();
  }

  // Show window when ready
  mainWindow.once('ready-to-show', () => {
    if (splashWindow) {
      splashWindow.close();
    }
    mainWindow.show();
    
    // Focus on window
    if (isDev) {
      mainWindow.focus();
    }
  });

  // Handle window closed
  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  // DON'T handle external links here - let our global handler do it
  // This was causing Edge to open for internal URLs!
  
  // Create application menu
  createMenu();
}

function createMenu() {
  const template = [
    {
      label: 'File',
      submenu: [
        {
          label: 'New Connection',
          accelerator: 'CmdOrCtrl+N',
          click: () => {
            mainWindow.webContents.send('menu-new-connection');
          }
        },
        {
          label: 'Open Logs Directory',
          click: async () => {
            const result = await dialog.showOpenDialog(mainWindow, {
              properties: ['openDirectory']
            });
            if (!result.canceled) {
              mainWindow.webContents.send('menu-logs-directory', result.filePaths[0]);
            }
          }
        },
        { type: 'separator' },
        {
          label: 'Exit',
          accelerator: process.platform === 'darwin' ? 'Cmd+Q' : 'Ctrl+Q',
          click: () => {
            app.quit();
          }
        }
      ]
    },
    {
      label: 'Edit',
      submenu: [
        { role: 'undo' },
        { role: 'redo' },
        { type: 'separator' },
        { role: 'cut' },
        { role: 'copy' },
        { role: 'paste' },
        { role: 'selectall' }
      ]
    },
    {
      label: 'View',
      submenu: [
        { role: 'reload' },
        { role: 'forceReload' },
        { role: 'toggleDevTools' },
        { type: 'separator' },
        { role: 'resetZoom' },
        { role: 'zoomIn' },
        { role: 'zoomOut' },
        { type: 'separator' },
        { role: 'togglefullscreen' }
      ]
    },
    {
      label: 'Profiles',
      submenu: [
        {
          label: 'Manage Profiles',
          accelerator: 'CmdOrCtrl+P',
          click: () => {
            mainWindow.webContents.send('menu-manage-profiles');
          }
        },
        {
          label: 'Export Profiles',
          click: async () => {
            const result = await dialog.showSaveDialog(mainWindow, {
              filters: [
                { name: 'JSON Files', extensions: ['json'] }
              ],
              defaultPath: 'quantumxfer-profiles.json'
            });
            if (!result.canceled) {
              mainWindow.webContents.send('menu-export-profiles', result.filePath);
            }
          }
        },
        {
          label: 'Import Profiles',
          click: async () => {
            const result = await dialog.showOpenDialog(mainWindow, {
              filters: [
                { name: 'JSON Files', extensions: ['json'] }
              ],
              properties: ['openFile']
            });
            if (!result.canceled) {
              mainWindow.webContents.send('menu-import-profiles', result.filePaths[0]);
            }
          }
        }
      ]
    },
    {
      label: 'Help',
      submenu: [
        {
          label: 'About QuantumXfer',
          click: () => {
            dialog.showMessageBox(mainWindow, {
              type: 'info',
              title: 'About QuantumXfer',
              message: 'QuantumXfer Enterprise',
              detail: 'Professional SSH/SFTP Client\nVersion 1.0.0\n\nBuilt with Electron, React, and TypeScript\n\n© 2025 QuantumXfer Enterprise'
            });
          }
        },
        {
          label: 'Documentation',
          click: () => {
            shell.openExternal('https://github.com/quantumxfer/documentation');
          }
        },
        { type: 'separator' },
        {
          label: 'Report Issue',
          click: () => {
            shell.openExternal('https://github.com/quantumxfer/issues');
          }
        }
      ]
    }
  ];

  // macOS specific menu adjustments
  if (process.platform === 'darwin') {
    template.unshift({
      label: app.getName(),
      submenu: [
        { role: 'about' },
        { type: 'separator' },
        { role: 'services' },
        { type: 'separator' },
        { role: 'hide' },
        { role: 'hideOthers' },
        { role: 'unhide' },
        { type: 'separator' },
        { role: 'quit' }
      ]
    });
  }

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

// App event handlers
app.whenReady().then(() => {
  createSplashWindow();
  
  // Create main window after splash
  setTimeout(() => {
    createMainWindow();
  }, 2000);

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createMainWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// IPC handlers with standardized error handling
ipcMain.handle('app-version', IPCErrorHandler.wrapHandler(
  async () => {
    return app.getVersion();
  },
  { timeout: 5000, retries: 0 }
));

ipcMain.handle('show-save-dialog', IPCErrorHandler.wrapHandler(
  async (event, options) => {
    const result = await dialog.showSaveDialog(mainWindow, options);
    return result;
  },
  { timeout: 30000, retries: 0 }
));

ipcMain.handle('show-open-dialog', IPCErrorHandler.wrapHandler(
  async (event, options) => {
    const result = await dialog.showOpenDialog(mainWindow, options);
    return result;
  },
  { timeout: 30000, retries: 0 }
));

// SSH IPC Handlers - Validated with Error Handling
ipcMain.handle('ssh-connect', IPCErrorHandler.wrapHandler(
  HandlerValidator.createValidatedHandler(
    async (event, config) => {
      const startTime = Date.now();
      try {
        const result = await sshService.connect(config);
        const duration = Date.now() - startTime;
        
        // Audit log successful connection
        logger.logSSHConnect(result.connectionId, config, { success: true, duration });
        
        return result;
      } catch (error) {
        const duration = Date.now() - startTime;
        logger.logSSHConnect(null, config, { success: false, error: error.message, duration });
        throw error;
      }
    },
    (config) => HandlerValidator.validateConnection(config)
  ),
  { timeout: 60000, retries: 2, retryDelay: 1000 }
));

ipcMain.handle('ssh-execute-command', IPCErrorHandler.wrapHandler(
  HandlerValidator.createValidatedHandler(
    async (event, connectionId, command) => {
      const startTime = Date.now();
      try {
        const result = await sshService.executeCommand(connectionId, command);
        const duration = Date.now() - startTime;
        
        // Audit log command execution
        logger.logSSHCommand(connectionId, command, { 
          success: true, 
          exitCode: result.exitCode,
          duration 
        });
        
        return result;
      } catch (error) {
        const duration = Date.now() - startTime;
        logger.logSSHCommand(connectionId, command, { 
          success: false, 
          error: error.message,
          duration 
        });
        throw error;
      }
    },
    (connectionId, command) => HandlerValidator.validateCommandExecution(connectionId, command)
  ),
  { timeout: 30000, retries: 1, retryDelay: 500 }
));

ipcMain.handle('ssh-list-directory', IPCErrorHandler.wrapHandler(
  HandlerValidator.createValidatedHandler(
    async (event, connectionId, remotePath) => {
      const result = await sshService.listDirectory(connectionId, remotePath);
      return result;
    },
    (connectionId, remotePath) => HandlerValidator.validateDirectoryListing(connectionId, remotePath)
  ),
  { timeout: 15000, retries: 1, retryDelay: 500 }
));

ipcMain.handle('ssh-list-directory-recursive', IPCErrorHandler.wrapHandler(
  HandlerValidator.createValidatedHandler(
    async (event, connectionId, remotePath, options) => {
      const result = await sshService.listDirectoryRecursive(connectionId, remotePath, options);
      return result;
    },
    (connectionId, remotePath) => HandlerValidator.validateDirectoryListing(connectionId, remotePath)
  ),
  { timeout: 45000, retries: 1, retryDelay: 500 }
));

ipcMain.handle('ssh-download-file', IPCErrorHandler.wrapHandler(
  HandlerValidator.createValidatedHandler(
    async (event, connectionId, remotePath, localPath) => {
      const startTime = Date.now();
      try {
        const result = await sshService.downloadFile(connectionId, remotePath, localPath);
        const duration = Date.now() - startTime;
        
        // Audit log file download
        logger.logFileTransfer('download', connectionId, remotePath, localPath, result.fileSize, {
          success: true,
          duration,
          speed: result.transferSpeed
        });
        
        return result;
      } catch (error) {
        const duration = Date.now() - startTime;
        logger.logFileTransfer('download', connectionId, remotePath, localPath, 0, {
          success: false,
          error: error.message,
          duration
        });
        throw error;
      }
    },
    (connectionId, remotePath, localPath) => HandlerValidator.validateFileDownload(connectionId, remotePath, localPath)
  ),
  { timeout: 300000, retries: 2, retryDelay: 1000 }  // 5 min timeout for large files
));

ipcMain.handle('ssh-upload-file', IPCErrorHandler.wrapHandler(
  HandlerValidator.createValidatedHandler(
    async (event, connectionId, localPath, remotePath) => {
      const startTime = Date.now();
      try {
        const result = await sshService.uploadFile(connectionId, localPath, remotePath);
        const duration = Date.now() - startTime;
        
        // Audit log file upload
        logger.logFileTransfer('upload', connectionId, localPath, remotePath, result.fileSize, {
          success: true,
          duration,
          speed: result.transferSpeed
        });
        
        return result;
      } catch (error) {
        const duration = Date.now() - startTime;
        logger.logFileTransfer('upload', connectionId, localPath, remotePath, 0, {
          success: false,
          error: error.message,
          duration
        });
        throw error;
      }
    },
    (connectionId, localPath, remotePath) => HandlerValidator.validateFileUpload(connectionId, localPath, remotePath)
  ),
  { timeout: 300000, retries: 2, retryDelay: 1000 }  // 5 min timeout for large files
));

ipcMain.handle('ssh-disconnect', IPCErrorHandler.wrapHandler(
  HandlerValidator.createValidatedHandler(
    (event, connectionId) => {
      const result = sshService.disconnect(connectionId);
      return result;
    },
    (connectionId) => HandlerValidator.validateConnectionId(connectionId)
  ),
  { timeout: 10000, retries: 0 }
));

ipcMain.handle('ssh-get-connections', IPCErrorHandler.wrapHandler(
  async (event) => {
    return {
      success: true,
      connections: sshService.getActiveConnections()
    };
  },
  { timeout: 5000, retries: 0 }
));

// Add IPC handler for writing log files
ipcMain.handle('write-log-file', async (event, logData, logsDirectory) => {
  try {
    if (!logsDirectory) {
      return { success: false, error: 'No logs directory configured' };
    }

    // Ensure the logs directory exists
    if (!fs.existsSync(logsDirectory)) {
      fs.mkdirSync(logsDirectory, { recursive: true });
    }

    // Generate filename with timestamp
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `quantumxfer-session-${timestamp}.log`;
    const filePath = path.join(logsDirectory, filename);

    // Write log data to file
    fs.writeFileSync(filePath, logData, 'utf8');

    return {
      success: true,
      filePath: filePath,
      filename: filename
    };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// -----------------------------
// Bookmarks: persistence helpers
// -----------------------------
function getBookmarksPath() {
  const userDataPath = app.getPath('userData');
  const bookmarksDir = path.join(userDataPath, 'bookmarks');
  if (!fs.existsSync(bookmarksDir)) {
    fs.mkdirSync(bookmarksDir, { recursive: true });
  }
  return path.join(bookmarksDir, 'bookmarks.json');
}

function readBookmarks() {
  try {
    const filePath = getBookmarksPath();
    if (!fs.existsSync(filePath)) {
      return [];
    }
    const data = fs.readFileSync(filePath, 'utf8');
    const parsed = JSON.parse(data);
    return Array.isArray(parsed) ? parsed : (parsed.bookmarks || []);
  } catch (err) {
    console.error('Failed to read bookmarks:', err);
    return [];
  }
}

function writeBookmarks(bookmarks) {
  try {
    const filePath = getBookmarksPath();
    fs.writeFileSync(filePath, JSON.stringify({ bookmarks }, null, 2), 'utf8');
    return { success: true, filePath };
  } catch (err) {
    console.error('Failed to write bookmarks:', err);
    return { success: false, error: err.message };
  }
}

// -----------------------------
// Bookmarks: IPC handlers - Validated
// -----------------------------
ipcMain.handle('bookmarks-list', async () => {
  try {
    const bookmarks = readBookmarks();
    return { success: true, bookmarks };
  } catch (error) {
    return { success: false, error: error.message, bookmarks: [] };
  }
});

ipcMain.handle('bookmarks-add', HandlerValidator.createValidatedHandler(
  async (event, bookmark) => {
    const bookmarks = readBookmarks();
    // Prevent duplicates: same type + server + path/host
    const key = JSON.stringify({
      type: bookmark.type,
      server: bookmark.server || null,
      path: bookmark.path || null
    });
    const exists = bookmarks.some(b => JSON.stringify({ type: b.type, server: b.server || null, path: b.path || null }) === key);
    if (!exists) {
      const id = bookmark.id || `bm_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
      bookmarks.push({
        id,
        type: bookmark.type, // 'directory' | 'server'
        label: bookmark.label || (bookmark.type === 'directory' ? (bookmark.path || 'Directory') : (bookmark.server?.host || 'Server')),
        createdAt: new Date().toISOString(),
        server: bookmark.server || null,
        path: bookmark.path || null
      });
      const result = writeBookmarks(bookmarks);
      if (!result.success) {
        return { success: false, error: result.error };
      }
    }
    return { success: true, bookmarks: readBookmarks() };
  },
  (bookmark) => HandlerValidator.validateBookmarkObject(bookmark)
));

ipcMain.handle('bookmarks-remove', HandlerValidator.createValidatedHandler(
  async (event, bookmarkId) => {
    const bookmarks = readBookmarks();
    const filtered = bookmarks.filter(b => b.id !== bookmarkId);
    const result = writeBookmarks(filtered);
    if (!result.success) {
      return { success: false, error: result.error };
    }
    return { success: true, bookmarks: filtered };
  },
  (bookmarkId) => HandlerValidator.validateBookmarkId(bookmarkId)
));

// Helper function to encrypt passwords in profiles
function encryptProfiles(profiles) {
  if (!safeStorage.isEncryptionAvailable()) {
    console.warn('safeStorage encryption not available, passwords will be stored in plain text');
    console.warn('This may pose a security risk. Consider using a system with encryption support.');
    return profiles;
  }

  return profiles.map(profile => {
    if (profile.password) {
      try {
        const encrypted = safeStorage.encryptString(profile.password);
        return {
          ...profile,
          password: encrypted.toString('base64') // Store as base64 string
        };
      } catch (error) {
        console.error(`Failed to encrypt password for profile ${profile.name}:`, error);
        return profile;
      }
    }
    return profile;
  });
}

// Helper function to decrypt passwords in profiles
function decryptProfiles(profiles) {
  if (!safeStorage.isEncryptionAvailable()) {
    console.warn('safeStorage encryption not available, passwords may be stored in plain text');
    console.warn('This may pose a security risk. Consider using a system with encryption support.');
    return profiles;
  }

  return profiles.map(profile => {
    if (profile.password) {
      try {
        const encryptedBuffer = Buffer.from(profile.password, 'base64');
        const decrypted = safeStorage.decryptString(encryptedBuffer);
        return {
          ...profile,
          password: decrypted
        };
      } catch (error) {
        console.error(`Failed to decrypt password for profile ${profile.name}:`, error);
        return profile;
      }
    }
    return profile;
  });
}
ipcMain.handle('save-profiles-to-file', HandlerValidator.createValidatedHandler(
  async (event, profiles) => {
    console.log('=== IPC: save-profiles-to-file called ===');
    const userDataPath = app.getPath('userData');
    const profilesDir = path.join(userDataPath, 'profiles');
    
    // Ensure profiles directory exists
    if (!fs.existsSync(profilesDir)) {
      fs.mkdirSync(profilesDir, { recursive: true });
    }
    
    // Encrypt passwords before saving
    const encryptedProfiles = encryptProfiles(profiles);
    
    const profilesPath = path.join(profilesDir, 'connection-profiles.json');
    fs.writeFileSync(profilesPath, JSON.stringify(encryptedProfiles, null, 2), 'utf8');
    
    return { success: true, filePath: profilesPath };
  },
  (profiles) => HandlerValidator.validateProfilesArray(profiles)
));

ipcMain.handle('load-profiles-from-file', async () => {
  console.log('=== IPC: load-profiles-from-file called ===');
  try {
    const userDataPath = app.getPath('userData');
    const profilesPath = path.join(userDataPath, 'profiles', 'connection-profiles.json');
    
    if (!fs.existsSync(profilesPath)) {
      return { success: true, profiles: [] };
    }
    
    const profilesData = fs.readFileSync(profilesPath, 'utf8');
    const encryptedProfiles = JSON.parse(profilesData);
    
    // Decrypt passwords before returning
    const decryptedProfiles = decryptProfiles(encryptedProfiles);
    
    return { success: true, profiles: decryptedProfiles };
  } catch (error) {
    return { success: false, error: error.message, profiles: [] };
  }
});


// Global Command History Feature:
// - Single shared command history across all profiles and terminal windows
// - Stored in: %APPDATA%\quantumxfer\command-history\global-command-history.json
// - Maximum 500 commands to prevent excessive storage
// - All commands from all connections are stored in one global history
// Add IPC handlers for centralized command history
ipcMain.handle('save-command-history', async (event, data) => {
  console.log('=== IPC: save-command-history called ===');
  try {
    const { commands } = data;
    const userDataPath = app.getPath('userData');
    const historyDir = path.join(userDataPath, 'command-history');

    // Ensure command history directory exists
    if (!fs.existsSync(historyDir)) {
      fs.mkdirSync(historyDir, { recursive: true });
    }

    const historyPath = path.join(historyDir, 'global-command-history.json');
    const historyData = {
      commands: commands.slice(-500), // Keep only last 500 commands globally
      lastUpdated: new Date().toISOString()
    };

    fs.writeFileSync(historyPath, JSON.stringify(historyData, null, 2), 'utf8');
    console.log(`Global command history saved: ${commands.length} commands`);

    return { success: true, filePath: historyPath };
  } catch (error) {
    console.error('Error saving global command history:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('load-command-history', async () => {
  console.log('=== IPC: load-command-history called ===');
  try {
    const userDataPath = app.getPath('userData');
    const historyPath = path.join(userDataPath, 'command-history', 'global-command-history.json');

    if (!fs.existsSync(historyPath)) {
      console.log('No global command history found');
      return { success: true, commands: [] };
    }

    const historyData = fs.readFileSync(historyPath, 'utf8');
    const parsed = JSON.parse(historyData);

    console.log(`Loaded global command history: ${parsed.commands.length} commands`);
    return { success: true, commands: parsed.commands };
  } catch (error) {
    console.error('Error loading global command history:', error);
    return { success: false, error: error.message, commands: [] };
  }
});

ipcMain.handle('append-command-history', async (event, data) => {
  console.log('=== IPC: append-command-history called ===');
  try {
    const { command } = data;
    const userDataPath = app.getPath('userData');
    const historyPath = path.join(userDataPath, 'command-history', 'global-command-history.json');

    let commands = [];
    if (fs.existsSync(historyPath)) {
      const historyData = fs.readFileSync(historyPath, 'utf8');
      const parsed = JSON.parse(historyData);
      commands = parsed.commands || [];
    }

    // Add new command and keep only last 500
    commands = [...commands, command].slice(-500);

    const historyData = {
      commands,
      lastUpdated: new Date().toISOString()
    };

    fs.writeFileSync(historyPath, JSON.stringify(historyData, null, 2), 'utf8');
    console.log(`Command appended to global history: "${command}"`);

    return { success: true, commands };
  } catch (error) {
    console.error('Error appending command to global history:', error);
    return { success: false, error: error.message };
  }
});

// Add IPC handler for opening terminal window
ipcMain.handle('open-terminal-window', async (event, terminalData) => {
  console.log('=== IPC: open-terminal-window called ===');
  console.log('Terminal data received:', JSON.stringify(terminalData, null, 2));

  try {
    const terminalWindow = new BrowserWindow({
      width: 1200,
      height: 800,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        preload: path.join(__dirname, 'preload.js')
      },
      icon: path.join(__dirname, '../assets/icon.ico'),
      title: `QuantumXfer Terminal - ${terminalData.config.username}@${terminalData.config.host}`,
      show: true // Ensure window is shown
    });

    console.log('Terminal window created successfully');

    // IMPORTANT: Load the same way as main window to avoid file associations
    if (isDev) {
      console.log('Development mode: loading from dev server');
      // In development, load from dev server with terminal hash
      const terminalUrl = 'http://localhost:5188/#terminal';
      console.log('Loading terminal URL:', terminalUrl);
      await terminalWindow.loadURL(terminalUrl);
      console.log('Terminal URL loaded successfully');
    } else {
      console.log('Production mode: loading from file');
      // In production, load the built HTML file directly
      // This should work the same as the main window
      const indexPath = path.join(__dirname, '../dist/index.html');
      console.log('Loading index.html from:', indexPath);
      await terminalWindow.loadFile(indexPath + '#terminal');
      console.log('Terminal file loaded successfully');
    }    console.log('Terminal window content loaded successfully');

    // Set terminal mode immediately when DOM is ready
    terminalWindow.webContents.once('dom-ready', () => {
      console.log('Terminal window DOM ready, setting terminal mode...');
      terminalWindow.webContents.executeJavaScript(`
        // Ensure hash is set to terminal
        if (window.location.hash !== '#terminal') {
          window.location.hash = '#terminal';
        }

        // Set global terminal data
        const terminalData = ${JSON.stringify(terminalData)};
        window.terminalData = terminalData;

        // Store in localStorage as well
        localStorage.setItem('quantumxfer-terminal-data', JSON.stringify(terminalData));

        // Force React to re-render by dispatching a custom event
        window.dispatchEvent(new CustomEvent('terminal-mode-ready', {
          detail: terminalData
        }));

        console.log('=== TERMINAL WINDOW SETUP COMPLETE ===');
      `);
    });

    // Handle window close
    terminalWindow.on('closed', () => {
      console.log('Terminal window closed');
      // Note: Command history is saved automatically by the React component
      // when commands are executed and when the app disconnects
    });

    // Handle loading failures
    terminalWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription) => {
      console.error('Terminal window failed to load:', errorCode, errorDescription);
    });

    // Handle navigation
    terminalWindow.webContents.on('will-navigate', (event, url) => {
      console.log('Terminal window will navigate to:', url);
    });

    // Make sure window is shown and focused
    terminalWindow.show();
    terminalWindow.focus();
    console.log('Terminal window shown and focused');

    console.log('=== Terminal window setup complete ===');
    return { success: true, message: 'Terminal window opened successfully' };  } catch (error) {
    console.error('=== ERROR: Failed to create terminal window ===');
    console.error('Error details:', error);
    console.error('Error stack:', error.stack);
    return { success: false, error: error.message };
  }
});

// Security: Handle new window creation - Only block external URLs
app.on('web-contents-created', (event, contents) => {
  contents.setWindowOpenHandler(({ url }) => {
    // Allow internal app navigation (file:// URLs with our app path)
    if (url.startsWith('file://') && url.includes('index.html')) {
      return { action: 'allow' };
    }
    
    // Block external URLs (http://, https://, etc.)
    if (url.startsWith('http://') || url.startsWith('https://')) {
      shell.openExternal(url);
      return { action: 'deny' };
    }
    
    // Allow other internal URLs
    return { action: 'allow' };
  });
});
