import { app, BrowserWindow, Menu, ipcMain, dialog, shell } from 'electron';
import path from 'path';
import fs from 'fs';
import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

// Import SSH Service
import SSHService from './ssh-service.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Keep a global reference of the window object
let mainWindow;
let splashWindow;

// Check if we're in development
const isDev = process.env.NODE_ENV === 'development';

// Initialize SSH service
const sshService = new SSHService();

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
    mainWindow.loadURL('http://localhost:5189');
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

// IPC handlers
ipcMain.handle('app-version', () => {
  return app.getVersion();
});

ipcMain.handle('show-save-dialog', async (event, options) => {
  const result = await dialog.showSaveDialog(mainWindow, options);
  return result;
});

ipcMain.handle('show-open-dialog', async (event, options) => {
  const result = await dialog.showOpenDialog(mainWindow, options);
  return result;
});

// SSH IPC Handlers
ipcMain.handle('ssh-connect', async (event, config) => {
  try {
    const result = await sshService.connect(config);
    console.log('SSH Connection successful:', result);
    return result;
  } catch (error) {
    console.error('SSH Connection failed:', error);
    return error;
  }
});

ipcMain.handle('ssh-execute-command', async (event, connectionId, command) => {
  try {
    const result = await sshService.executeCommand(connectionId, command);
    return result;
  } catch (error) {
    console.error('SSH Command execution failed:', error);
    return error;
  }
});

ipcMain.handle('ssh-list-directory', async (event, connectionId, remotePath) => {
  try {
    const result = await sshService.listDirectory(connectionId, remotePath);
    return result;
  } catch (error) {
    console.error('SSH Directory listing failed:', error);
    return error;
  }
});

ipcMain.handle('ssh-download-file', async (event, connectionId, remotePath, localPath) => {
  try {
    const result = await sshService.downloadFile(connectionId, remotePath, localPath);
    return result;
  } catch (error) {
    console.error('SSH File download failed:', error);
    return error;
  }
});

ipcMain.handle('ssh-upload-file', async (event, connectionId, localPath, remotePath) => {
  try {
    const result = await sshService.uploadFile(connectionId, localPath, remotePath);
    return result;
  } catch (error) {
    console.error('SSH File upload failed:', error);
    return error;
  }
});

ipcMain.handle('ssh-disconnect', (event, connectionId) => {
  try {
    const result = sshService.disconnect(connectionId);
    return result;
  } catch (error) {
    console.error('SSH Disconnect failed:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('ssh-get-connections', () => {
  try {
    return {
      success: true,
      connections: sshService.getActiveConnections()
    };
  } catch (error) {
    console.error('Get SSH connections failed:', error);
    return { success: false, error: error.message };
  }
});

// Add IPC handler for writing log files
ipcMain.handle('write-log-file', async (event, logData, logsDirectory) => {
  console.log('IPC: write-log-file called with:', {
    logDataLength: logData ? logData.length : 0,
    logsDirectory
  });

  try {
    if (!logsDirectory) {
      console.log('IPC: No logs directory configured');
      return { success: false, error: 'No logs directory configured' };
    }

    // Ensure the logs directory exists
    if (!fs.existsSync(logsDirectory)) {
      console.log('IPC: Creating logs directory:', logsDirectory);
      fs.mkdirSync(logsDirectory, { recursive: true });
    }

    // Generate filename with timestamp
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `quantumxfer-session-${timestamp}.log`;
    const filePath = path.join(logsDirectory, filename);

    console.log('IPC: Writing log file to:', filePath);

    // Write log data to file
    fs.writeFileSync(filePath, logData, 'utf8');

    console.log(`IPC: Log file written successfully: ${filePath}`);
    return {
      success: true,
      filePath: filePath,
      filename: filename
    };
  } catch (error) {
    console.error('IPC: Write log file failed:', error);
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
      title: `QuantumXfer Terminal - ${terminalData.config.username}@${terminalData.config.host}`
    });
    
    console.log('Terminal window created successfully');
    
    // IMPORTANT: Load the same way as main window to avoid file associations
    if (isDev) {
      console.log('Development mode: loading from dev server');
      // In development, load from dev server with terminal hash
      await terminalWindow.loadURL('http://localhost:5189/#terminal');
    } else {
      console.log('Production mode: loading from file');
      // In production, load the built HTML file directly 
      // This should work the same as the main window
      const indexPath = path.join(__dirname, '../dist/index.html');
      console.log('Loading index.html from:', indexPath);
      await terminalWindow.loadFile(indexPath + '#terminal');
    }
    
    console.log('Terminal window content loaded successfully');
    
    // Set terminal mode immediately when DOM is ready
    terminalWindow.webContents.once('dom-ready', () => {
      console.log('Terminal window DOM ready, setting terminal mode...');
      terminalWindow.webContents.executeJavaScript(`
        console.log('=== TERMINAL WINDOW SETUP ===');
        console.log('Current hash:', window.location.hash);
        
        // Ensure hash is set to terminal
        if (window.location.hash !== '#terminal') {
          console.log('Setting hash to #terminal');
          window.location.hash = '#terminal';
        }
        
        // Set global terminal data
        const terminalData = ${JSON.stringify(terminalData)};
        window.terminalData = terminalData;
        console.log('Terminal data set:', window.terminalData);
        
        // Store in localStorage as well
        localStorage.setItem('quantumxfer-terminal-data', JSON.stringify(terminalData));
        console.log('Terminal data stored in localStorage');
        
        // Force React to re-render by dispatching a custom event
        window.dispatchEvent(new CustomEvent('terminal-mode-ready', { 
          detail: terminalData 
        }));
        
        console.log('=== TERMINAL WINDOW SETUP COMPLETE ===');
      `);
    });
    
    // Open DevTools in development for debugging
    if (isDev) {
      console.log('Opening DevTools for terminal window');
      terminalWindow.webContents.openDevTools();
    }
    
    console.log('=== Terminal window setup complete ===');
    return { success: true, message: 'Terminal window opened successfully' };
    
  } catch (error) {
    console.error('=== ERROR: Failed to create terminal window ===');
    console.error('Error details:', error);
    console.error('Error stack:', error.stack);
    return { success: false, error: error.message };
  }
});

// Security: Handle new window creation - Only block external URLs
app.on('web-contents-created', (event, contents) => {
  contents.setWindowOpenHandler(({ url }) => {
    console.log('setWindowOpenHandler called with URL:', url);
    
    // Allow internal app navigation (file:// URLs with our app path)
    if (url.startsWith('file://') && url.includes('index.html')) {
      console.log('ALLOWING internal app navigation');
      return { action: 'allow' };
    }
    
    // Block external URLs (http://, https://, etc.)
    if (url.startsWith('http://') || url.startsWith('https://')) {
      console.log('BLOCKING external URL, opening in system browser');
      shell.openExternal(url);
      return { action: 'deny' };
    }
    
    // Allow other internal URLs
    console.log('ALLOWING internal URL');
    return { action: 'allow' };
  });
});
