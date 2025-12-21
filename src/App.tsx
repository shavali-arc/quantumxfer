import { useState, useEffect } from 'react';
import type { ConnectionProfile, SSHKeyPair } from './types/electron.d.ts';

const isDebugMode = import.meta.env.DEV;

// Silence verbose console logging in production while keeping errors intact
if (!isDebugMode && typeof console !== 'undefined') {
  console.log = () => {};
  console.warn = () => {};
}

// Global Command History Feature:
// - Single shared command history across all profiles and terminal windows
// - Stored in: %APPDATA%\quantumxfer\command-history\global-command-history.json
// - Maximum 500 commands to prevent excessive storage
// - Persistent across app restarts and available in both main and terminal windows

interface SSHConfig {
  host: string;
  port: number;
  username: string;
  password?: string;
  privateKey?: string;
  profileName?: string;
}

interface TerminalLog {
  id: string;
  timestamp: Date;
  command: string;
  output: string;
  directory: string;
}

interface SFTPFile {
  name: string;
  type: 'file' | 'directory';
  size: number;
  modified: Date;
  permissions: string;
  path: string;
}

interface TransferItem {
  id: string;
  name: string;
  type: 'upload' | 'download';
  status: 'pending' | 'transferring' | 'completed' | 'error';
  progress: number;
  size: number;
  localPath?: string;
  remotePath: string;
  error?: string;
}

function App() {
  const [isConnected, setIsConnected] = useState(false);
  const [config, setConfig] = useState<SSHConfig>({
    host: '',
    port: 22,
    username: '',
    password: '',
    privateKey: '',
    profileName: ''
  });
  
  // Check if this is a terminal tab
  const [isTerminalTab, setIsTerminalTab] = useState(false);
  
  // Notification state
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'info' | 'warning' | 'error' } | null>(null);

  // Terminal state
  const [terminalLogs, setTerminalLogs] = useState<TerminalLog[]>([]);
  const [currentCommand, setCurrentCommand] = useState('');
  const [currentDirectory, setCurrentDirectory] = useState('/home');
  const [commandHistory, setCommandHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [autoSave, setAutoSave] = useState(true);
  const [sessionId, setSessionId] = useState(`session-${Date.now()}`);

  // Connection profiles state
  const [profiles, setProfiles] = useState<ConnectionProfile[]>([]);
  const [showProfiles, setShowProfiles] = useState(false);
  const [selectedLogsDirectory, setSelectedLogsDirectory] = useState<string>('');
  // SSH Key auth state
  const [useSSHKey, setUseSSHKey] = useState<boolean>(false);
  const [sshKeys, setSshKeys] = useState<SSHKeyPair[]>([]);
  const [selectedKeyName, setSelectedKeyName] = useState<string>('');

  // Load SSH keys when opting into key auth
  useEffect(() => {
    const loadKeys = async () => {
      try {
        if (window.electronAPI?.sshKeys?.list) {
          const res = await window.electronAPI.sshKeys.list();
          if (res.success && Array.isArray(res.data)) {
            setSshKeys(res.data);
          }
        }
      } catch {
        // Ignore; keys optional
      }
    };
    if (useSSHKey) loadKeys();
  }, [useSSHKey]);

  // Enterprise features state
  const [searchQuery, setSearchQuery] = useState('');
  // const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);
  const [sortBy, setSortBy] = useState<'lastUsed' | 'name' | 'frequency'>('lastUsed');
  // const [connectionStartTime, setConnectionStartTime] = useState<Date | null>(null);
  // const [showAdvancedConnection, setShowAdvancedConnection] = useState(false);
  // const [darkMode, setDarkMode] = useState(true);
  // const [connectionStatus, setConnectionStatus] = useState<'disconnected' | 'connecting' | 'connected' | 'error'>('disconnected');

  // SFTP state
  const [showSFTP, setShowSFTP] = useState(false);
  const [remoteFiles, setRemoteFiles] = useState<SFTPFile[]>([]);
  const [remotePath, setRemotePath] = useState('/');
  const [transfers, setTransfers] = useState<TransferItem[]>([]);
  const [selectedFiles, setSelectedFiles] = useState<SFTPFile[]>([]);

  // Load saved data on component mount
  useEffect(() => {
    const initializeApp = async () => {
      console.log('=== APP USEEFFECT INIT ===');
      console.log('Current hash:', window.location.hash);
      console.log('Window terminalData:', (window as { terminalData?: unknown }).terminalData);
      console.log('localStorage terminalData:', localStorage.getItem('quantumxfer-terminal-data'));
      
      // Check if this is a terminal tab
      if (window.location.hash === '#terminal') {
        console.log('Terminal mode detected from hash');
        const terminalData = localStorage.getItem('quantumxfer-terminal-data');
        const windowTerminalData = (window as { terminalData?: unknown }).terminalData;
        
        if (terminalData || windowTerminalData) {
          try {
            const data = windowTerminalData || JSON.parse(terminalData || '{}');
            console.log('Loading terminal data:', data);
            setConfig(data.config);
            setSessionId(data.sessionId);
            setIsConnected(true);
            setIsTerminalTab(true);
            
            // Set document title for terminal tab
            document.title = `QuantumXfer Terminal - ${data.config.username}@${data.config.host}`;
            
            // Load command history from centralized file for terminal mode
            try {
              if (window.electronAPI && window.electronAPI.loadCommandHistory) {
                const result = await window.electronAPI.loadCommandHistory();
                if (result.success && result.commands) {
                  setCommandHistory(result.commands);
                  console.log('Terminal: Loaded global command history:', result.commands.length, 'commands');
                }
              }
            } catch (error) {
              console.error('Terminal: Error loading global command history:', error);
            }
            
            console.log('Terminal tab initialized successfully');
            return; // Skip normal loading for terminal tab
          } catch (error) {
            console.error('Error loading terminal data:', error);
          }
        } else {
          console.warn('No terminal data found for terminal mode');
        }
      } else {
        console.log('Main app mode (no terminal hash)');
        // Load existing logs and profiles for main app
      }
      
      loadProfiles().catch(error => console.error('Error loading profiles:', error));
      loadSession();
      loadDirectoryPreference();
      
      // Clear old logs with duplicate IDs
      const savedLogs = localStorage.getItem('quantumxfer-logs');
      if (savedLogs) {
        try {
          const logs = JSON.parse(savedLogs);
          const logIds = logs.map((log: TerminalLog) => log.id);
          const hasDuplicates = logIds.length !== new Set(logIds).size;
          
          if (hasDuplicates) {
            // Clear logs if duplicates found
            localStorage.removeItem('quantumxfer-logs');
            setTerminalLogs([]);
            console.log('Cleared duplicate terminal logs');
          } else {
            setTerminalLogs(logs);
          }
        } catch (error) {
          console.error('Error loading logs:', error);
          localStorage.removeItem('quantumxfer-logs');
        }
      }
    };

    initializeApp();
  }, []);

  // Listen for terminal mode ready event
  useEffect(() => {
    const handleTerminalModeReady = (event: CustomEvent) => {
      console.log('Terminal mode ready event received:', event.detail);
      const data = event.detail;
      setConfig(data.config);
      setSessionId(data.sessionId);
      setIsConnected(true);
      setIsTerminalTab(true);
      document.title = `QuantumXfer Terminal - ${data.config.username}@${data.config.host}`;
    };

    window.addEventListener('terminal-mode-ready', handleTerminalModeReady as EventListener);
    
    return () => {
      window.removeEventListener('terminal-mode-ready', handleTerminalModeReady as EventListener);
    };
  }, []);

  // Auto-save logs
  useEffect(() => {
    if (autoSave && terminalLogs.length > 0) {
      localStorage.setItem('quantumxfer-logs', JSON.stringify(terminalLogs));
    }
  }, [terminalLogs, autoSave]);

  // Auto-clear notifications after 3 seconds
  useEffect(() => {
    if (notification) {
      const timer = setTimeout(() => {
        setNotification(null);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [notification]);

  // Cleanup: Save logs and command history when component unmounts (app closes)
  useEffect(() => {
    return () => {
      if (selectedLogsDirectory && terminalLogs.length > 0) {
        // Use a synchronous approach for cleanup since async operations might not complete
        const logData = terminalLogs.map(log =>
          `[${log.timestamp.toLocaleString()}] ${log.directory}> ${log.command}\n${log.output}\n`
        ).join('\n');

        // Try to save logs synchronously if possible
        try {
          if (window.electronAPI?.writeLogFile) {
            // Note: This is async but we'll attempt it for cleanup
            window.electronAPI.writeLogFile(logData, selectedLogsDirectory).catch(() => {
              // Silently handle cleanup errors
            });
          }
        } catch {
          // Silently handle cleanup errors
        }
      }

      // Save command history on app close
      if (commandHistory.length > 0) {
        saveCommandHistoryToProfile().catch(error =>
          console.error('Error saving command history on app close:', error)
        );
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedLogsDirectory, terminalLogs, commandHistory]);

  // Load command history for current profile when connected
  useEffect(() => {
    if (isConnected && config.profileName) {
      if (window.electronAPI && window.electronAPI.loadCommandHistory && commandHistory.length === 0) {
        window.electronAPI.loadCommandHistory()
          .then(result => {
            if (result.success && result.commands && result.commands.length > 0) {
              setCommandHistory(result.commands);
              console.log('Loaded global command history on connect:', result.commands.length, 'commands');
            }
          })
          .catch(error => {
            console.error('Error loading global command history on connect:', error);
          });
      }
    }
  }, [isConnected, config, commandHistory.length]);  // Save command history when disconnecting or unmounting
  const saveCommandHistoryToProfile = async () => {
    if (commandHistory.length > 0 && config.profileName) {
      try {
        if (window.electronAPI && window.electronAPI.saveCommandHistory) {
          await window.electronAPI.saveCommandHistory({
            commands: commandHistory
          });
          console.log('Command history saved to global file on disconnect:', config.profileName);
        }
      } catch (error) {
        console.error('Error saving command history to global file on disconnect:', error);
      }
    }
  };

  // Save command history when disconnecting
  useEffect(() => {
    if (!isConnected && commandHistory.length > 0) {
      saveCommandHistoryToProfile().catch(error =>
        console.error('Error saving command history on disconnect:', error)
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isConnected, commandHistory]);

  // Load SFTP files when SFTP panel is opened
  useEffect(() => {
    if (showSFTP && isConnected) {
      loadRemoteDirectory(remotePath);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showSFTP, isConnected, remotePath]);

  // Keep terminal input focused when connected
  useEffect(() => {
    if (isConnected) {
      const focusInput = () => {
        const input = document.querySelector('input[data-terminal-input="true"]') as HTMLInputElement;
        if (input && document.activeElement !== input) {
          input.focus();
        }
      };
      
      // Focus immediately
      focusInput();
      
      // Set up interval to maintain focus
      const interval = setInterval(focusInput, 1000);
      
      return () => clearInterval(interval);
    }
  }, [isConnected]);

  const loadProfiles = async () => {
    try {
      // Try to load from file first (Electron environment)
      if (window.electronAPI && window.electronAPI.loadProfilesFromFile) {
        console.log('Loading profiles from file storage...');
        const result = await window.electronAPI.loadProfilesFromFile();
        if (result.success && result.profiles) {
          // Convert lastUsed string back to Date object and ensure commandHistory exists
          const profilesWithDates = result.profiles.map((profile: ConnectionProfile) => ({
            ...profile,
            lastUsed: new Date(profile.lastUsed),
            commandHistory: profile.commandHistory || [] // Ensure commandHistory exists
          }));
          setProfiles(profilesWithDates);
          console.log(`Loaded ${profilesWithDates.length} profiles from file storage`);
          return;
        }
      }
      
      // Fallback to localStorage (browser environment or if file loading fails)
      console.log('Falling back to localStorage for profiles...');
      const saved = localStorage.getItem('quantumxfer-profiles');
      if (saved) {
        const parsedProfiles = JSON.parse(saved);
        // Convert lastUsed string back to Date object and ensure commandHistory exists
        const profilesWithDates = parsedProfiles.map((profile: ConnectionProfile) => ({
          ...profile,
          lastUsed: new Date(profile.lastUsed),
          commandHistory: profile.commandHistory || [] // Ensure commandHistory exists
        }));
        setProfiles(profilesWithDates);
        console.log(`Loaded ${profilesWithDates.length} profiles from localStorage`);
        
        // Migrate profiles from localStorage to file storage if in Electron
        if (window.electronAPI && window.electronAPI.saveProfilesToFile) {
          console.log('Migrating profiles from localStorage to file storage...');
          await window.electronAPI.saveProfilesToFile(profilesWithDates);
          console.log('Profiles migrated successfully');
        }
      } else {
        console.log('No profiles found in any storage');
      }
    } catch (error) {
      console.error('Error loading profiles:', error);
      // Silently handle profile loading errors
    }
  };

  const saveProfiles = async (newProfiles: ConnectionProfile[]) => {
    try {
      // Try to save to file first (Electron environment)
      if (window.electronAPI && window.electronAPI.saveProfilesToFile) {
        console.log('Saving profiles to file storage...');
        const result = await window.electronAPI.saveProfilesToFile(newProfiles);
        if (result.success) {
          setProfiles(newProfiles);
          console.log(`Saved ${newProfiles.length} profiles to file storage`);
          return;
        } else {
          console.error('Failed to save profiles to file:', result.error);
        }
      }
      
      // Fallback to localStorage (browser environment or if file saving fails)
      console.log('Falling back to localStorage for profile saving...');
      localStorage.setItem('quantumxfer-profiles', JSON.stringify(newProfiles));
      setProfiles(newProfiles);
      console.log(`Saved ${newProfiles.length} profiles to localStorage`);
    } catch (error) {
      console.error('Error saving profiles:', error);
      // Silently handle profile saving errors
    }
  };

  const saveSession = () => {
    const sessionData = {
      config,
      sessionId,
      timestamp: Date.now()
    };
    localStorage.setItem('quantumxfer-session', JSON.stringify(sessionData));
  };

  const loadSession = () => {
    try {
      const saved = localStorage.getItem('quantumxfer-session');
      if (saved) {
        const sessionData = JSON.parse(saved);
        // Always load session data for better UX, regardless of timestamp
        // Users expect their last connection details to be remembered
        setConfig(sessionData.config);
        setSessionId(sessionData.sessionId);
        console.log('Loaded session data:', sessionData.config);
      }
    } catch (error) {
      console.error('Error loading session:', error);
      // Silently handle session loading errors
    }
  };

  const saveLogsDirectoryPreference = (dir: string) => {
    setSelectedLogsDirectory(dir);
    localStorage.setItem('quantumxfer-logs-directory', dir);
  };

  const loadDirectoryPreference = () => {
    const saved = localStorage.getItem('quantumxfer-directory');
    if (saved) {
      setCurrentDirectory(saved);
    }

    // Load logs directory preference
    const savedLogsDir = localStorage.getItem('quantumxfer-logs-directory');
    if (savedLogsDir) {
      setSelectedLogsDirectory(savedLogsDir);
    }
  };

  const handleConnect = async () => {
    console.log('=== HANDLE CONNECT STARTED ===');
    console.log('Current config state:', config);
    console.log('Config validation - host:', !!config.host, 'username:', !!config.username, 'password:', !!config.password);
    
    const hasAuth = useSSHKey ? !!config.privateKey : !!config.password;
    if (!config.host || !config.username || !hasAuth) {
      console.log('=== CONFIG VALIDATION FAILED ===');
      setNotification({ message: 'Please complete host, username, and authentication', type: 'error' });
      return;
    }

    console.log('=== CONFIG VALIDATION PASSED ===');
    setIsConnected(false); // Reset connection state
    setNotification({ message: 'Connecting to server...', type: 'info' });
    
    try {
      // Check if we're running in Electron
      if (window.electronAPI && window.electronAPI.ssh) {
        // Use real SSH connection via Electron
        const connectConfig: SSHConfig = {
          host: config.host,
          port: config.port,
          username: config.username,
          profileName: config.profileName
        };
        if (useSSHKey && config.privateKey) {
          connectConfig.privateKey = config.privateKey;
        } else {
          connectConfig.password = config.password;
        }
        const result = await window.electronAPI.ssh.connect(connectConfig);

        if (result.success && result.connectionId) {
          setIsConnected(true);
          const newSessionId = `session-${Date.now()}`;
          setSessionId(newSessionId);
          
          // Store the real connection ID for later use
          localStorage.setItem('quantumxfer-connection-id', result.connectionId.toString());
          
          // Save as profile if profile name is provided
          if (config.profileName && config.profileName.trim()) {
            const existingProfile = profiles.find(profile => 
              profile.host === config.host && 
              profile.username === config.username && 
              profile.port === config.port
            );
            
            if (existingProfile) {
              const updatedProfiles = profiles.map(profile => 
                profile.id === existingProfile.id 
                  ? { 
                      ...profile, 
                      name: config.profileName!, 
                      lastUsed: new Date(), 
                      password: useSSHKey ? undefined : config.password, 
                      sshKeyPath: useSSHKey ? config.privateKey : undefined 
                    }
                  : profile
              );
              saveProfiles(updatedProfiles);
              addTerminalLog('profile-update', `Updated existing profile: ${config.profileName}`);
            } else {
              const newProfile: ConnectionProfile = {
                id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                name: config.profileName,
                host: config.host,
                port: config.port,
                username: config.username,
                password: useSSHKey ? undefined : config.password, // Store password securely
                lastUsed: new Date(),
                logsDirectory: selectedLogsDirectory || undefined,
                commandHistory: [],
                sshKeyPath: useSSHKey ? config.privateKey : undefined
              };
              const updatedProfiles = [...profiles, newProfile];
              saveProfiles(updatedProfiles);
              addTerminalLog('profile-create', `Created new profile: ${config.profileName}`);
            }
          }
          
          // Add connection log
          addTerminalLog('ssh-connect', `✅ Successfully connected to ${config.username}@${config.host}:${config.port}`);
          setNotification({ message: `Connected to ${result.serverInfo?.host}`, type: 'success' });
          saveSession();

          // Write all existing logs to file if logs directory is configured
          if (selectedLogsDirectory && terminalLogs.length > 0) {
            writeAllLogsToFile();
          }
          
          // Load remote directory
          try {
            const dirResult = await window.electronAPI.ssh.listDirectory(result.connectionId, '/');
            if (dirResult.success && dirResult.files) {
              setRemoteFiles(dirResult.files.map(file => ({
                name: file.name,
                type: file.type,
                size: file.size,
                modified: new Date(file.modified),
                permissions: file.permissions,
                path: file.path
              })));
              setRemotePath('/');
              addTerminalLog('sftp-ls', `Listed directory: ${dirResult.path}`);
            }
          } catch {
            // Silently handle directory loading errors
          }
          
          // Store terminal data for the terminal window
          const terminalData = {
            config: config,
            sessionId: newSessionId,
            connectionId: result.connectionId,
            isConnected: true
          };
          localStorage.setItem('quantumxfer-terminal-data', JSON.stringify(terminalData));
          
          // Open terminal in a NEW WINDOW via IPC
          console.log('=== ATTEMPTING TO OPEN TERMINAL WINDOW ===');
          console.log('window.electronAPI available:', !!window.electronAPI);
          console.log('window.electronAPI.openTerminalWindow available:', !!window.electronAPI?.openTerminalWindow);
          
          try {
            console.log('Calling openTerminalWindow with data:', {
              config: config,
              sessionId: newSessionId,
              connectionId: result.connectionId
            });
            
            const terminalResult = await window.electronAPI.openTerminalWindow({
              config: config,
              sessionId: newSessionId,
              connectionId: result.connectionId
            });
            
            console.log('Terminal window result:', terminalResult);
            setNotification({ message: 'Terminal window opened', type: 'success' });
          } catch (terminalError) {
            console.error('=== TERMINAL WINDOW ERROR ===');
            console.error('Error details:', terminalError);
            console.error('Error message:', (terminalError as Error)?.message);
            console.error('Error stack:', (terminalError as Error)?.stack);
            setNotification({ message: 'Failed to open terminal window', type: 'error' });
          }
          
        } else {
          // Connection failed
          setNotification({ message: `Connection failed: ${result.error || 'Unknown error'}`, type: 'error' });
          addTerminalLog('ssh-error', `❌ Connection failed: ${result.error}`);
        }
      } else {
        // Fallback to simulation mode if not in Electron
        setIsConnected(true);
        const newSessionId = `session-${Date.now()}`;
        setSessionId(newSessionId);
        
        addTerminalLog('ssh-connect', `🔧 Simulation mode: Connected to ${config.username}@${config.host}:${config.port}`);
        setNotification({ message: 'Connected (Simulation Mode)', type: 'info' });
        saveSession();
        
        // Open terminal in a NEW WINDOW via IPC (simulation mode)
        try {
          await window.electronAPI.openTerminalWindow({
            config: config,
            sessionId: newSessionId,
            connectionId: null // No real connection in simulation mode
          });
          setNotification({ message: 'Terminal window opened (Simulation)', type: 'success' });
        } catch (terminalError) {
          console.error('Failed to open terminal window:', terminalError);
          setNotification({ message: 'Failed to open terminal window', type: 'error' });
        }
      }
      
    } catch (error: unknown) {
      console.error('Connection error:', error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      setNotification({ message: `Connection failed: ${errorMessage}`, type: 'error' });
      addTerminalLog('ssh-error', `❌ Connection error: ${errorMessage}`);
    }
  };

  const handleDisconnect = async () => {
    try {
      // Get stored connection ID
      const connectionId = localStorage.getItem('quantumxfer-connection-id');
      
      if (connectionId && window.electronAPI && window.electronAPI.ssh) {
        // Close real SSH connection
        const result = await window.electronAPI.ssh.disconnect(parseInt(connectionId));
        if (result.success) {
          addTerminalLog('ssh-disconnect', '✅ SSH connection closed');
        } else {
          addTerminalLog('ssh-disconnect', `❌ Disconnect error: ${result.error}`);
        }
        localStorage.removeItem('quantumxfer-connection-id');
      } else {
        addTerminalLog('ssh-disconnect', '🔧 Simulation mode: Connection closed');
      }
      
      setIsConnected(false);
      setRemoteFiles([]);
      setRemotePath('/');

      // Automatically save logs to file when disconnecting
      if (selectedLogsDirectory && terminalLogs.length > 0) {
        writeAllLogsToFile();
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      addTerminalLog('ssh-disconnect', `❌ Disconnect error: ${errorMessage}`);
      setIsConnected(false);
    }
  };

  const addTerminalLog = (command: string, output: string) => {
    const newLog: TerminalLog = {
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date(),
      command,
      output,
      directory: currentDirectory
    };
    setTerminalLogs(prev => [...prev, newLog]);

    // Only write to log file if logs directory is configured
    if (selectedLogsDirectory && window.electronAPI) {
      const logEntry = `[${newLog.timestamp.toLocaleString()}] ${newLog.directory}> ${newLog.command}\n${newLog.output}\n\n`;
      writeLogToFile(logEntry);
    }
  };

  const writeLogToFile = async (logEntry: string) => {
    // Since we already check selectedLogsDirectory in addTerminalLog,
    // this function assumes it's been validated
    if (!window.electronAPI) {
      return;
    }

    try {
      const result = await window.electronAPI.writeLogFile(logEntry, selectedLogsDirectory);
      if (!result.success) {
        setNotification({ message: `Failed to save log: ${result.error}`, type: 'error' });
      } else {
        // Optional: Show success notification for first log file
        if (!localStorage.getItem('quantumxfer-first-log-saved')) {
          setNotification({ message: `Logs are being saved to: ${selectedLogsDirectory}`, type: 'success' });
          localStorage.setItem('quantumxfer-first-log-saved', 'true');
        }
      }
    } catch {
      setNotification({ message: 'Failed to save log to file', type: 'error' });
    }
  };

  const writeAllLogsToFile = async () => {
    if (!selectedLogsDirectory || !window.electronAPI?.writeLogFile || terminalLogs.length === 0) {
      return;
    }

    try {
      const logData = terminalLogs.map(log =>
        `[${log.timestamp.toLocaleString()}] ${log.directory}> ${log.command}\n${log.output}\n`
      ).join('\n');

      const result = await window.electronAPI.writeLogFile(logData, selectedLogsDirectory);
      if (!result.success) {
        setNotification({ message: `Failed to save logs: ${result.error}`, type: 'error' });
      } else {
        setNotification({ message: `Logs saved to: ${result.filename}`, type: 'success' });
      }
    } catch {
      setNotification({ message: 'Failed to save logs to file', type: 'error' });
    }
  };

  const executeCommand = async () => {
    if (currentCommand.trim()) {
      const cmd = currentCommand.trim();

      // Add to command history (limit to last 100 commands)
      const newHistory = [...commandHistory, cmd].slice(-100);
      setCommandHistory(newHistory);
      setHistoryIndex(-1);

      // Save command history back to the current profile
      if (config.profileName) {
        const currentProfile = profiles.find(profile =>
          profile.host === config.host &&
          profile.username === config.username &&
          profile.port === config.port
        );

        if (currentProfile) {
          const updatedProfile = {
            ...currentProfile,
            lastUsed: new Date()
          };

          const updatedProfiles = profiles.map(profile =>
            profile.id === currentProfile.id ? updatedProfile : profile
          );

          await saveProfiles(updatedProfiles);
        }
      }

      // Save command to centralized history
      if (config.profileName) {
        try {
          if (window.electronAPI && window.electronAPI.appendCommandHistory) {
            await window.electronAPI.appendCommandHistory({
              command: cmd
            });
            console.log('Command saved to global history:', cmd);
          }
        } catch (error) {
          console.error('Error saving command to global history:', error);
        }
      }

      try {
        // Get stored connection ID
        const connectionId = localStorage.getItem('quantumxfer-connection-id');
        
        if (connectionId && window.electronAPI && window.electronAPI.ssh && isConnected) {
          // Execute real SSH command
          addTerminalLog(cmd, '⏳ Executing...');
          
          const result = await window.electronAPI.ssh.executeCommand(parseInt(connectionId), cmd);
          
          if (result.success) {
            let output = '';
            if (result.stdout) output += result.stdout;
            if (result.stderr) output += `\nError: ${result.stderr}`;
            
            // Update the last log entry with the real result
            setTerminalLogs(prev => {
              const updated = [...prev];
              if (updated.length > 0) {
                updated[updated.length - 1] = {
                  ...updated[updated.length - 1],
                  output: output.trim()
                };
              }
              return updated;
            });
          } else {
            // Update the last log entry with error
            setTerminalLogs(prev => {
              const updated = [...prev];
              if (updated.length > 0) {
                updated[updated.length - 1] = {
                  ...updated[updated.length - 1],
                  output: `❌ Command failed: ${result.error}`
                };
              }
              return updated;
            });
          }
        } else {
          // Fallback to simulation mode
          let output = '';
          
          if (cmd.toLowerCase() === 'help' || cmd.toLowerCase() === 'get-help') {
            output = `🔧 Simulation Mode - Available commands:
  ls, dir - List directory contents
  cd      - Change directory
  pwd     - Show current directory
  date    - Show current date/time
  whoami  - Show current user
  clear   - Clear terminal
  exit    - Disconnect session`;
          } else if (cmd.toLowerCase() === 'date') {
            output = new Date().toString();
          } else if (cmd.toLowerCase() === 'ls' || cmd.toLowerCase() === 'dir') {
            output = `total 8
drwxr-xr-x 2 user user 4096 Aug 21 10:00 Documents
drwxr-xr-x 2 user user 4096 Aug 21 10:00 Downloads
-rw-r--r-- 1 user user 1024 Aug 21 10:00 config.txt
-rw-r--r-- 1 user user 2048 Aug 21 10:00 readme.md`;
          } else if (cmd.toLowerCase().startsWith('cd ')) {
            const newDir = cmd.split(' ').slice(1).join(' ');
            output = `Changed directory to: ${newDir}`;
          } else if (cmd.toLowerCase() === 'pwd') {
            output = currentDirectory;
          } else if (cmd.toLowerCase() === 'whoami') {
            output = config.username;
          } else if (cmd.toLowerCase() === 'clear' || cmd.toLowerCase() === 'cls') {
            setTerminalLogs([]);
            setCurrentCommand('');
            return;
          } else if (cmd.toLowerCase() === 'exit' || cmd.toLowerCase() === 'logout') {
            output = 'Disconnecting...';
            setTimeout(() => handleDisconnect(), 1000);
          } else {
            output = `🔧 Simulation: '${cmd}' - Use 'help' to see available commands.`;
          }
          
          addTerminalLog(cmd, output);
        }
        
        setCurrentCommand('');
        
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        addTerminalLog(cmd, `❌ Error: ${errorMessage}`);
        setCurrentCommand('');
      }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    console.log('=== KEY PRESSED ===', e.key, 'History length:', commandHistory.length, 'History index:', historyIndex);
    
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (commandHistory.length > 0 && historyIndex < commandHistory.length - 1) {
        const newIndex = historyIndex + 1;
        setHistoryIndex(newIndex);
        const command = commandHistory[commandHistory.length - 1 - newIndex];
        setCurrentCommand(command);
        console.log('History navigation UP - Index:', newIndex, 'Command:', command);
      } else {
        console.log('History navigation UP - No more commands (at beginning)');
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (historyIndex > 0) {
        const newIndex = historyIndex - 1;
        setHistoryIndex(newIndex);
        const command = commandHistory[commandHistory.length - 1 - newIndex];
        setCurrentCommand(command);
        console.log('History navigation DOWN - Index:', newIndex, 'Command:', command);
      } else if (historyIndex === 0) {
        setHistoryIndex(-1);
        setCurrentCommand('');
        console.log('History navigation DOWN - Back to empty input');
      } else {
        console.log('History navigation DOWN - No more commands (at end)');
      }
    }
  };

  const loadProfile = async (profile: ConnectionProfile) => {
    setConfig(prev => ({
      ...prev,
      host: profile.host,
      port: profile.port,
      username: profile.username,
      password: profile.password || '', // Load password from profile
      profileName: profile.name
    }));
    // Toggle auth method based on profile
    if (profile.sshKeyPath) {
      setUseSSHKey(true);
      setConfig(prev => ({ ...prev, privateKey: profile.sshKeyPath, password: '' }));
    } else {
      setUseSSHKey(false);
      setConfig(prev => ({ ...prev, privateKey: '' }));
    }
    
    // Load logs directory from profile if available
    if (profile.logsDirectory) {
      setSelectedLogsDirectory(profile.logsDirectory);
    }
    
    // Load command history from centralized file
    try {
      if (window.electronAPI && window.electronAPI.loadCommandHistory) {
        const result = await window.electronAPI.loadCommandHistory();
        if (result.success && result.commands) {
          setCommandHistory(result.commands);
          setHistoryIndex(-1);
          console.log('Loaded global command history from file:', profile.name, '- Commands:', result.commands.length);
        } else {
          setCommandHistory([]);
          setHistoryIndex(-1);
          console.log('No global command history found for profile:', profile.name);
        }
      }
    } catch (error) {
      console.error('Error loading global command history:', error);
      setCommandHistory([]);
      setHistoryIndex(-1);
    }
    
    setShowProfiles(false);
    
    // Update last used
    const updatedProfiles = profiles.map(p => 
      p.id === profile.id ? { ...p, lastUsed: new Date() } : p
    );
    saveProfiles(updatedProfiles);
  };

  const deleteProfile = (profileId: string) => {
    const updatedProfiles = profiles.filter(p => p.id !== profileId);
    saveProfiles(updatedProfiles);
  };

  const downloadLogs = () => {
    const logData = terminalLogs.map(log => 
      `[${log.timestamp.toLocaleString()}] ${log.directory}> ${log.command}\n${log.output}\n`
    ).join('\n');
    
    const blob = new Blob([logData], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `quantumxfer-logs-${sessionId}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const selectLogsDirectory = async () => {
    try {
      // Use Electron's dialog API to select directory
      if (window.electronAPI?.showOpenDialog) {
        const result = await window.electronAPI.showOpenDialog({
          properties: ['openDirectory'],
          title: 'Select Logs Directory'
        });

        if (!result.canceled && result.filePaths && result.filePaths.length > 0) {
          const selectedPath = result.filePaths[0];
          saveLogsDirectoryPreference(selectedPath);
          setNotification({ message: `Logs directory set to: ${selectedPath}`, type: 'success' });
        }
      } else {
        // Fallback: Use a default logs directory
        const defaultLogsDir = 'quantumxfer-logs';
        saveLogsDirectoryPreference(defaultLogsDir);
        setNotification({ message: `Logs directory set to: ${defaultLogsDir}`, type: 'success' });
      }
    } catch {
      // Fallback: Use a default logs directory
      const defaultLogsDir = 'quantumxfer-logs';
      saveLogsDirectoryPreference(defaultLogsDir);
      setNotification({ message: `Using default logs directory: ${defaultLogsDir}`, type: 'info' });
    }
  };

  // SFTP Functions
  const generateMockFiles = (path: string): SFTPFile[] => {
    // Mock SFTP file listing for demonstration
    if (path === '/') {
      return [
        { name: '..', type: 'directory', size: 0, modified: new Date(), permissions: 'drwxr-xr-x', path: '/' },
        { name: 'home', type: 'directory', size: 4096, modified: new Date('2025-08-19'), permissions: 'drwxr-xr-x', path: '/home' },
        { name: 'var', type: 'directory', size: 4096, modified: new Date('2025-08-18'), permissions: 'drwxr-xr-x', path: '/var' },
        { name: 'etc', type: 'directory', size: 4096, modified: new Date('2025-08-17'), permissions: 'drwxr-xr-x', path: '/etc' },
        { name: 'tmp', type: 'directory', size: 4096, modified: new Date('2025-08-20'), permissions: 'drwxrwxrwx', path: '/tmp' },
        { name: 'README.txt', type: 'file', size: 1024, modified: new Date('2025-08-19'), permissions: '-rw-r--r--', path: '/README.txt' },
        { name: 'config.json', type: 'file', size: 2048, modified: new Date('2025-08-18'), permissions: '-rw-r--r--', path: '/config.json' }
      ];
    } else if (path === '/home') {
      return [
        { name: '..', type: 'directory', size: 0, modified: new Date(), permissions: 'drwxr-xr-x', path: '/' },
        { name: 'user', type: 'directory', size: 4096, modified: new Date('2025-08-19'), permissions: 'drwxr-xr-x', path: '/home/user' },
        { name: 'documents', type: 'directory', size: 4096, modified: new Date('2025-08-18'), permissions: 'drwxr-xr-x', path: '/home/documents' },
        { name: 'backup.tar.gz', type: 'file', size: 104857600, modified: new Date('2025-08-17'), permissions: '-rw-r--r--', path: '/home/backup.tar.gz' }
      ];
    } else {
      return [
        { name: '..', type: 'directory', size: 0, modified: new Date(), permissions: 'drwxr-xr-x', path: path.split('/').slice(0, -1).join('/') || '/' },
        { name: 'file1.txt', type: 'file', size: 512, modified: new Date('2025-08-19'), permissions: '-rw-r--r--', path: `${path}/file1.txt` },
        { name: 'file2.log', type: 'file', size: 1024, modified: new Date('2025-08-18'), permissions: '-rw-r--r--', path: `${path}/file2.log` }
      ];
    }
  };

  const loadRemoteDirectory = (path: string) => {
    setRemotePath(path);
    const files = generateMockFiles(path);
    setRemoteFiles(files);
    addTerminalLog('sftp-ls', `Listed directory: ${path} (${files.length - 1} items)`);
  };

  const navigateToPath = (newPath: string) => {
    loadRemoteDirectory(newPath);
  };

  const downloadFile = (file: SFTPFile) => {
    // Only allow downloading files, not directories
    if (file.type !== 'file') {
      setNotification({ message: 'Cannot download directories', type: 'warning' });
      return;
    }
    
    const transferId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const newTransfer: TransferItem = {
      id: transferId,
      name: file.name,
      type: 'download',
      status: 'pending',
      progress: 0,
      size: file.size,
      remotePath: file.path
    };
    
    setTransfers(prev => [...prev, newTransfer]);
    addTerminalLog('sftp-download', `Starting download: ${file.name} (${file.size} bytes)`);
    
    // Simulate download progress
    simulateTransfer(transferId, 'download');
  };

  const uploadFiles = async (fileList?: File[]) => {
    try {
      let filesToUpload: File[] = [];
      
      if (fileList) {
        filesToUpload = fileList;
      } else if ('showOpenFilePicker' in window) {
        const fileHandles = await (window as { showOpenFilePicker?: (options: { multiple: boolean }) => Promise<FileSystemFileHandle[]> }).showOpenFilePicker?.({ multiple: true });
        
        if (fileHandles) {
          for (const fileHandle of fileHandles) {
            const file = await fileHandle.getFile();
            filesToUpload.push(file);
          }
        }
      } else {
        setNotification({ message: 'File picker not supported in this browser', type: 'warning' });
        return;
      }

      for (const file of filesToUpload) {
        const transferId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        const newTransfer: TransferItem = {
          id: transferId,
          name: file.name,
          type: 'upload',
          status: 'pending',
          progress: 0,
          size: file.size,
          localPath: file.name,
          remotePath: `${remotePath}/${file.name}`
        };
        
        setTransfers(prev => [...prev, newTransfer]);
        addTerminalLog('sftp-upload', `Starting upload: ${file.name} (${file.size} bytes)`);
        
        // Simulate upload progress
        simulateTransfer(transferId, 'upload');
      }
      
      setNotification({ message: `Uploaded ${filesToUpload.length} file(s)`, type: 'success' });
      loadRemoteDirectory(remotePath);
    } catch {
      setNotification({ message: 'Error selecting files for upload', type: 'warning' });
    }
  };

  const simulateTransfer = (transferId: string, type: 'upload' | 'download') => {
    let progress = 0;
    const interval = setInterval(() => {
      progress += Math.random() * 20 + 5; // Random progress increment
      
      setTransfers(prev => prev.map(transfer => 
        transfer.id === transferId 
          ? { ...transfer, status: 'transferring', progress: Math.min(progress, 100) }
          : transfer
      ));
      
      if (progress >= 100) {
        clearInterval(interval);
        setTransfers(prev => prev.map(transfer => 
          transfer.id === transferId 
            ? { ...transfer, status: 'completed', progress: 100 }
            : transfer
        ));
        
        const actionText = type === 'upload' ? 'uploaded' : 'downloaded';
        addTerminalLog(`sftp-${type}-complete`, `Successfully ${actionText} file`);
        setNotification({ message: `File ${actionText} completed`, type: 'success' });
        
        // Refresh directory listing after upload
        if (type === 'upload') {
          setTimeout(() => loadRemoteDirectory(remotePath), 1000);
        }
      }
    }, 200);
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const deleteFile = (file: SFTPFile) => {
    if (confirm(`Are you sure you want to delete "${file.name}"?`)) {
      setRemoteFiles(prev => prev.filter(f => f.name !== file.name));
      addTerminalLog('sftp-delete', `Deleted: ${file.name}`);
      setNotification({ message: `File "${file.name}" deleted`, type: 'success' });
    }
  };

  // Terminal-only interface for terminal tabs
  if (isTerminalTab && isConnected) {
    return (
      <div style={{ minHeight: '100vh', backgroundColor: '#0f172a', color: 'white', padding: '1rem' }}>
        <style>{`
          @keyframes blink {
            0%, 50% { opacity: 1; }
            51%, 100% { opacity: 0; }
          }
          
          .powershell-scrollbar::-webkit-scrollbar {
            width: 12px;
          }
          
          .powershell-scrollbar::-webkit-scrollbar-track {
            background: #012456;
          }
          
          .powershell-scrollbar::-webkit-scrollbar-thumb {
            background: #1e40af;
            border-radius: 6px;
          }
          
          .powershell-scrollbar::-webkit-scrollbar-thumb:hover {
            background: #3b82f6;
          }
          
          input[data-terminal-input="true"] {
            caret-color: white !important;
          }
          
          input[data-terminal-input="true"]:focus {
            caret-color: white !important;
          }
        `}</style>

        {/* Terminal Tab Header */}
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center', 
          marginBottom: '1rem',
          padding: '1rem',
          backgroundColor: '#1e293b',
          borderRadius: '8px'
        }}>
          <div>
            <h1 style={{ margin: 0, fontSize: '1.5rem', color: '#f8fafc' }}>
              ⚡ QuantumXfer Terminal
            </h1>
            <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.9rem', color: '#94a3b8' }}>
              Connected to {config.username}@{config.host}:{config.port}
            </p>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button
              onClick={() => setShowSFTP(!showSFTP)}
              style={{
                padding: '0.5rem 1rem',
                backgroundColor: showSFTP ? '#059669' : '#3b82f6',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '0.8rem'
              }}
            >
              {showSFTP ? '📁 Hide SFTP' : '📁 Show SFTP'}
            </button>
            <button
              onClick={() => window.close()}
              style={{
                padding: '0.5rem 1rem',
                backgroundColor: '#6b7280',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '0.8rem'
              }}
            >
              ✖️ Close Tab
            </button>
          </div>
        </div>

        {/* PowerShell Terminal Interface */}
        <div style={{ backgroundColor: '#012456', borderRadius: '8px', border: '1px solid #1e40af', overflow: 'hidden' }}>
          {/* Terminal Header */}
          <div style={{ backgroundColor: '#1e40af', padding: '0.5rem 1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{ fontSize: '1rem' }}>🟦</span>
              <span style={{ color: 'white', fontSize: '0.9rem', fontWeight: '500' }}>Windows PowerShell</span>
              {isTerminalTab && (
                <button
                  onClick={() => {
                    setIsTerminalTab(false);
                    document.title = 'QuantumXfer Enterprise';
                    setNotification({ message: 'Switched back to connection mode', type: 'info' });
                  }}
                  style={{
                    marginLeft: '1rem',
                    padding: '0.25rem 0.5rem',
                    fontSize: '0.75rem',
                    backgroundColor: '#059669',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer'
                  }}
                >
                  ← Back to Connection
                </button>
              )}
            </div>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button style={{ width: '12px', height: '12px', borderRadius: '2px', border: 'none', backgroundColor: '#fbbf24', cursor: 'pointer' }}></button>
              <button style={{ width: '12px', height: '12px', borderRadius: '2px', border: 'none', backgroundColor: '#22c55e', cursor: 'pointer' }}></button>
              <button 
                onClick={handleDisconnect}
                style={{ width: '12px', height: '12px', borderRadius: '2px', border: 'none', backgroundColor: '#ef4444', cursor: 'pointer' }}
              ></button>
            </div>
          </div>

          {/* Terminal Content */}
          <div style={{ 
            display: 'flex', 
            height: 'calc(100vh - 200px)', 
            gap: '0.5rem' 
          }}>
            {/* PowerShell Terminal */}
            <div style={{ 
              flex: showSFTP ? '2' : '1',
              backgroundColor: '#012456',
              border: '2px solid #1e40af',
              borderRadius: '8px',
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column'
            }}>
              <div 
                className="powershell-scrollbar"
                onClick={() => {
                  const input = document.querySelector('input[data-terminal-input="true"]') as HTMLInputElement;
                  if (input) input.focus();
                }}
                style={{ 
                  backgroundColor: '#012456', 
                  color: 'white', 
                  fontFamily: 'Consolas, "Courier New", monospace',
                  fontSize: '0.85rem',
                  padding: '1rem',
                  flex: '1',
                  overflowY: 'auto',
                  cursor: 'text'
                }}
              >
                {/* PowerShell Header */}
                <div style={{ marginBottom: '1rem', color: '#e5e7eb' }}>
                  <div>Windows PowerShell</div>
                  <div>Copyright (C) Microsoft Corporation. All rights reserved.</div>
                  <div style={{ marginTop: '0.5rem' }}>
                    Install the latest PowerShell for new features and improvements! https://aka.ms/PSWindows
                  </div>
                  <div style={{ marginTop: '0.5rem' }}></div>
                </div>

                {/* Command History */}
                {terminalLogs.map(log => (
                  <div key={log.id} style={{ marginBottom: '0.5rem' }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start' }}>
                      <span style={{ color: '#60a5fa', marginRight: '0.5rem', flexShrink: 0 }}>
                        PS {log.directory}&gt;
                      </span>
                      <span style={{ color: 'white' }}>{log.command}</span>
                    </div>
                    {log.output && (
                      <div style={{ 
                        color: '#e5e7eb', 
                        marginLeft: '0rem', 
                        marginTop: '0.25rem',
                        whiteSpace: 'pre-wrap',
                        lineHeight: '1.3'
                      }}>
                        {log.output}
                      </div>
                    )}
                  </div>
                ))}

                {/* Current Command Line */}
                <div style={{ display: 'flex', alignItems: 'flex-start' }}>
                  <span style={{ color: '#60a5fa', marginRight: '0.5rem', flexShrink: 0 }}>
                    PS {currentDirectory}&gt;
                  </span>
                  <div style={{ flex: 1, position: 'relative' }}>
                    <input
                      type="text"
                      value={currentCommand}
                      onChange={(e) => setCurrentCommand(e.target.value)}
                      onKeyDown={handleKeyDown}
                      onKeyPress={(e) => e.key === 'Enter' && executeCommand()}
                      onBlur={(e) => {
                        setTimeout(() => e.target.focus(), 10);
                      }}
                      data-terminal-input="true"
                      style={{
                        width: '100%',
                        backgroundColor: 'transparent',
                        border: 'none',
                        outline: 'none',
                        color: 'white',
                        fontSize: '0.85rem',
                        fontFamily: 'Consolas, "Courier New", monospace',
                        padding: 0,
                        margin: 0,
                        caretColor: 'white'
                      }}
                      placeholder={commandHistory.length > 0 
                        ? `Type command... (${commandHistory.length} in global history, ↑↓ to navigate) [${isTerminalTab ? 'TERMINAL' : 'MAIN'}]` 
                        : `Type command... [${isTerminalTab ? 'TERMINAL' : 'MAIN'}]`}
                      autoComplete="off"
                      autoFocus
                    />
                  </div>
                </div>
              </div>

              {/* Status Bar */}
              <div style={{ 
                backgroundColor: '#1e40af', 
                padding: '0.25rem 1rem', 
                fontSize: '0.75rem', 
                color: 'white',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}>
                <span>Connected: {config.username}@{config.host}:{config.port}</span>
                <span>Session: {sessionId.slice(-8)} | Logs: {terminalLogs.length}</span>
              </div>
            </div>

            {/* SFTP Panel */}
            {showSFTP && (
              <div style={{
                flex: '1',
                minWidth: '300px',
                maxWidth: '400px',
                backgroundColor: '#f8fafc',
                border: '2px solid #1e40af',
                borderRadius: '8px',
                overflow: 'hidden',
                display: 'flex',
                flexDirection: 'column'
              }}>
                {/* SFTP Header */}
                <div style={{
                  padding: '0.75rem',
                  backgroundColor: '#1e40af',
                  color: 'white',
                  fontWeight: 'bold',
                  borderBottom: '1px solid #e2e8f0'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.85rem' }}>📁 SFTP Browser</span>
                    <button
                      onClick={() => loadRemoteDirectory(remotePath)}
                      style={{
                        padding: '0.2rem 0.4rem',
                        backgroundColor: '#3b82f6',
                        color: 'white',
                        border: 'none',
                        borderRadius: '3px',
                        cursor: 'pointer',
                        fontSize: '0.7rem'
                      }}
                    >
                      🔄
                    </button>
                  </div>
                  <div style={{ fontSize: '0.7rem', marginTop: '0.3rem', opacity: '0.9' }}>
                    {remotePath.length > 25 ? '...' + remotePath.slice(-22) : remotePath}
                  </div>
                </div>

                {/* File Browser */}
                <div style={{
                  flex: '1',
                  overflow: 'auto',
                  padding: '0.5rem'
                }}>
                  <div style={{ marginBottom: '0.5rem' }}>
                    <input
                      type="file"
                      multiple
                      onChange={(e) => {
                        if (e.target.files) {
                          uploadFiles(Array.from(e.target.files));
                        }
                      }}
                      style={{ display: 'none' }}
                      id="file-upload"
                    />
                    <label
                      htmlFor="file-upload"
                      style={{
                        display: 'inline-block',
                        padding: '0.3rem 0.6rem',
                        backgroundColor: '#10b981',
                        color: 'white',
                        borderRadius: '3px',
                        cursor: 'pointer',
                        fontSize: '0.7rem',
                        marginRight: '0.3rem'
                      }}
                    >
                      ⬆️ Upload
                    </label>
                    {selectedFiles.filter(file => file.type === 'file').length > 0 && (
                      <button
                        onClick={() => {
                          const filesToDownload = selectedFiles.filter(file => file.type === 'file');
                          filesToDownload.forEach(file => downloadFile(file));
                          setSelectedFiles(selectedFiles.filter(file => file.type === 'directory'));
                        }}
                        style={{
                          padding: '0.3rem 0.6rem',
                          backgroundColor: '#3b82f6',
                          color: 'white',
                          border: 'none',
                          borderRadius: '3px',
                          cursor: 'pointer',
                          fontSize: '0.7rem'
                        }}
                      >
                        ⬇️ Get ({selectedFiles.filter(file => file.type === 'file').length})
                      </button>
                    )}
                  </div>

                  {/* File List - Compact List View */}
                  <div style={{
                    border: '1px solid #e2e8f0',
                    borderRadius: '4px',
                    overflow: 'hidden',
                    fontSize: '0.75rem'
                  }}>
                    {/* Parent Directory */}
                    {remotePath !== '/' && (
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          padding: '0.4rem',
                          borderBottom: '1px solid #e2e8f0',
                          cursor: 'pointer',
                          backgroundColor: '#f8fafc'
                        }}
                        onClick={() => navigateToPath(remotePath.split('/').slice(0, -1).join('/') || '/')}
                        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#e2e8f0'}
                        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#f8fafc'}
                      >
                        <span style={{ marginRight: '0.5rem' }}>📁</span>
                        <span style={{ fontWeight: 'bold' }}>..</span>
                      </div>
                    )}

                    {/* Files List */}
                    {remoteFiles.map((file, index) => (
                      <div
                        key={index}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          padding: '0.4rem',
                          borderBottom: index < remoteFiles.length - 1 ? '1px solid #e2e8f0' : 'none',
                          cursor: file.type === 'directory' ? 'pointer' : 'default',
                          backgroundColor: selectedFiles.includes(file) ? '#dbeafe' : 'white'
                        }}
                        onClick={() => {
                          if (file.type === 'directory') {
                            navigateToPath(file.path);
                          }
                          // Don't auto-select files on click - only via checkbox
                        }}
                        onMouseEnter={(e) => {
                          if (!selectedFiles.includes(file)) {
                            e.currentTarget.style.backgroundColor = '#f8fafc';
                          }
                        }}
                        onMouseLeave={(e) => {
                          if (!selectedFiles.includes(file)) {
                            e.currentTarget.style.backgroundColor = 'white';
                          }
                        }}
                      >
                        {/* Checkbox */}
                        <input
                          type="checkbox"
                          checked={selectedFiles.includes(file)}
                          onChange={(e) => {
                            e.stopPropagation();
                            const newSelected = e.target.checked
                              ? [...selectedFiles, file]
                              : selectedFiles.filter(f => f !== file);
                            setSelectedFiles(newSelected);
                          }}
                          style={{ 
                            cursor: 'pointer', 
                            marginRight: '0.4rem', 
                            transform: 'scale(0.8)',
                            opacity: file.type === 'directory' ? 0.6 : 1
                          }}
                          title={file.type === 'directory' ? 'Directories cannot be downloaded' : 'Select for download'}
                        />
                        
                        {/* File Icon & Name */}
                        <div style={{ flex: 1, display: 'flex', alignItems: 'center', minWidth: 0 }}>
                          <span style={{ marginRight: '0.4rem', fontSize: '0.8rem' }}>
                            {file.type === 'directory' ? '📁' : '📄'}
                          </span>
                          <span style={{ 
                            overflow: 'hidden', 
                            textOverflow: 'ellipsis', 
                            whiteSpace: 'nowrap',
                            fontSize: '0.75rem'
                          }}>
                            {file.name}
                          </span>
                        </div>

                        {/* File Size */}
                        <div style={{ 
                          minWidth: '50px', 
                          textAlign: 'right', 
                          marginRight: '0.4rem',
                          fontSize: '0.65rem',
                          color: '#6b7280'
                        }}>
                          {file.type === 'file' ? formatFileSize(file.size) : ''}
                        </div>

                        {/* Actions */}
                        <div style={{ display: 'flex', gap: '0.2rem' }}>
                          {file.type === 'file' && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                downloadFile(file);
                              }}
                              style={{
                                padding: '0.15rem',
                                backgroundColor: '#3b82f6',
                                color: 'white',
                                border: 'none',
                                borderRadius: '2px',
                                cursor: 'pointer',
                                fontSize: '0.6rem',
                                lineHeight: 1
                              }}
                              title="Download"
                            >
                              ⬇️
                            </button>
                          )}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              deleteFile(file);
                            }}
                            style={{
                              padding: '0.15rem',
                              backgroundColor: '#ef4444',
                              color: 'white',
                              border: 'none',
                              borderRadius: '2px',
                              cursor: 'pointer',
                              fontSize: '0.6rem',
                              lineHeight: 1
                            }}
                            title="Delete"
                          >
                            🗑️
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Transfer Progress */}
                {transfers.length > 0 && (
                  <div style={{
                    borderTop: '1px solid #e2e8f0',
                    padding: '0.5rem',
                    backgroundColor: '#f8fafc',
                    maxHeight: '120px',
                    overflow: 'auto'
                  }}>
                    <h4 style={{ margin: '0 0 0.3rem 0', fontSize: '0.75rem', fontWeight: 'bold' }}>
                      Transfers
                    </h4>
                    {transfers.map((transfer) => (
                      <div
                        key={transfer.id}
                        style={{
                          marginBottom: '0.3rem',
                          padding: '0.3rem',
                          backgroundColor: 'white',
                          border: '1px solid #e2e8f0',
                          borderRadius: '3px',
                          fontSize: '0.65rem'
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>
                            {transfer.type === 'upload' ? '⬆️' : '⬇️'} {transfer.name}
                          </span>
                          <span style={{
                            color: transfer.status === 'completed' ? '#10b981' : 
                                  transfer.status === 'error' ? '#ef4444' : '#6b7280',
                            fontSize: '0.6rem',
                            marginLeft: '0.3rem'
                          }}>
                            {transfer.status}
                          </span>
                        </div>
                        {transfer.status === 'transferring' && (
                          <div style={{ marginTop: '0.2rem' }}>
                            <div style={{
                              width: '100%',
                              height: '3px',
                              backgroundColor: '#e2e8f0',
                              borderRadius: '1px',
                              overflow: 'hidden'
                            }}>
                              <div style={{
                                width: `${transfer.progress}%`,
                                height: '100%',
                                backgroundColor: '#3b82f6',
                                transition: 'width 0.3s ease'
                              }} />
                            </div>
                            <div style={{ fontSize: '0.6rem', color: '#6b7280', marginTop: '0.1rem' }}>
                              {transfer.progress}%
                            </div>
                          </div>
                        )}
                        {transfer.error && (
                          <div style={{ color: '#ef4444', fontSize: '0.6rem', marginTop: '0.2rem' }}>
                            Error: {transfer.error}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Terminal Controls */}
        <div style={{ marginTop: '1rem', display: 'flex', gap: '1rem', alignItems: 'center' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.9rem', color: '#cbd5e1' }}>
            <input
              type="checkbox"
              checked={autoSave}
              onChange={(e) => setAutoSave(e.target.checked)}
            />
            Auto-save terminal logs
          </label>
          <button
            onClick={() => {
              if (selectedLogsDirectory) {
                // Automatically save logs to configured directory
                writeAllLogsToFile();
              } else {
                // Fallback to manual download
                downloadLogs();
              }
            }}
            style={{
              padding: '0.5rem 1rem',
              backgroundColor: '#0ea5e9',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '0.8rem'
            }}
            title={selectedLogsDirectory ? 'Save logs to configured directory' : 'Select a logs directory first to enable automatic saving'}
          >
            {selectedLogsDirectory ? '💾 Save Logs' : '📥 Download Logs'}
          </button>
          <button
            onClick={() => {
              setTerminalLogs([]);
              addTerminalLog('cls', 'Terminal cleared');
            }}
            style={{
              padding: '0.5rem 1rem',
              backgroundColor: '#6b7280',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '0.8rem'
            }}
          >
            🗑️ Clear Terminal
          </button>
        </div>
      </div>
    );
  }

  // Connection confirmation in main window after connecting
  if (isConnected && !isTerminalTab) {
    return (
      <div style={{ minHeight: '100vh', backgroundColor: '#0f172a', color: 'white', padding: '2rem' }}>
        <div style={{ maxWidth: '800px', margin: '0 auto' }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1rem' }}>
            <div style={{
              width: '60px',
              height: '60px',
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              borderRadius: '16px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginRight: '1rem',
              boxShadow: '0 8px 32px rgba(0,0,0,0.2)'
            }}>
              <span style={{ fontSize: '24px', color: 'white' }}>⚡</span>
            </div>
            <div style={{ textAlign: 'left' }}>
              <h1 style={{ 
                fontSize: '2.5rem', 
                fontWeight: 'bold', 
                margin: '0',
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', 
                WebkitBackgroundClip: 'text', 
                WebkitTextFillColor: 'transparent',
                fontFamily: '"Segoe UI", Tahoma, Geneva, Verdana, sans-serif'
              }}>
                QuantumXfer
              </h1>
              <p style={{ 
                fontSize: '0.9rem', 
                color: '#64748b', 
                margin: '0',
                fontWeight: '500'
              }}>
                Enterprise SSH/SFTP Client
              </p>
            </div>
          </div>
          <p style={{ 
            fontSize: '1.1rem', 
            color: '#475569',
            maxWidth: '600px',
            margin: '0 auto',
            lineHeight: '1.6'
          }}>
            Secure SSH/SFTP Client with PowerShell Terminal, File Management, and Advanced Session Control
          </p>
        </div>          {/* Connection Success */}
          <div style={{ 
            textAlign: 'center', 
            padding: '2rem', 
            backgroundColor: '#065f46', 
            borderRadius: '8px',
            border: '1px solid #10b981',
            marginBottom: '2rem'
          }}>
            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>✅</div>
            <h2 style={{ margin: '0 0 1rem 0', color: 'white' }}>Successfully Connected!</h2>
            <p style={{ margin: '0 0 1rem 0', color: '#d1fae5' }}>
              Connected to {config.username}@{config.host}:{config.port}
            </p>
            <p style={{ margin: '0', color: '#a7f3d0', fontSize: '0.9rem' }}>
              Terminal opened in new window. You can continue using this window to manage connections.
            </p>
          </div>

          {/* Action Buttons */}
          <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', marginBottom: '2rem' }}>
            <button
              onClick={() => {
                setIsConnected(false);
                setConfig(prev => ({ ...prev, password: '' }));
              }}
              style={{
                padding: '1rem 2rem',
                backgroundColor: '#3b82f6',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                fontSize: '1rem',
                fontWeight: '600'
              }}
            >
              🔗 New Connection
            </button>
            <button
              onClick={() => {
                if (selectedLogsDirectory) {
                  // Automatically save logs to configured directory
                  writeAllLogsToFile();
                } else {
                  // Fallback to manual download
                  downloadLogs();
                }
              }}
              style={{
                padding: '1rem 2rem',
                backgroundColor: '#0ea5e9',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                fontSize: '1rem',
                fontWeight: '600'
              }}
              title={selectedLogsDirectory ? 'Save logs to configured directory' : 'Select a logs directory first to enable automatic saving'}
            >
              {selectedLogsDirectory ? '💾 Save Logs' : '📥 Download Logs'}
            </button>
          </div>

          {/* Quick Stats */}
          <div style={{ 
            padding: '1.5rem', 
            backgroundColor: '#1e293b', 
            borderRadius: '8px',
            textAlign: 'center'
          }}>
            <h3 style={{ margin: '0 0 1rem 0', color: '#f8fafc' }}>Session Information</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem', fontSize: '0.9rem' }}>
              <div>
                <div style={{ color: '#64748b' }}>Session ID</div>
                <div style={{ color: '#f1f5f9', fontFamily: 'monospace' }}>{sessionId.slice(-8)}</div>
              </div>
              <div>
                <div style={{ color: '#64748b' }}>Terminal Logs</div>
                <div style={{ color: '#f1f5f9' }}>{terminalLogs.length} entries</div>
              </div>
              <div>
                <div style={{ color: '#64748b' }}>Directory</div>
                <div style={{ color: '#f1f5f9', fontFamily: 'monospace' }}>{currentDirectory}</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Main connection form
  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#0f172a', color: 'white', padding: '2rem' }} data-testid="app-container">
      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
      <div style={{ maxWidth: '800px', margin: '0 auto' }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <h1 style={{ fontSize: '3rem', fontWeight: 'bold', marginBottom: '0.5rem', background: 'linear-gradient(45deg, #06b6d4, #3b82f6)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            QuantumXfer
          </h1>
          <p style={{ fontSize: '1.2rem', color: '#94a3b8' }}>
            Secure SSH/SFTP Client with Terminal Logging & Session Management
          </p>
          
          {/* Reset App Data Button */}
          <div style={{ marginTop: '1rem' }}>
            <button
              onClick={() => {
                if (confirm('This will clear all saved profiles, logs, and settings. Continue?')) {
                  localStorage.clear();
                  window.location.reload();
                }
              }}
              style={{
                padding: '0.5rem 1rem',
                backgroundColor: '#dc2626',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '0.85rem',
                fontWeight: '500',
                boxShadow: '0 2px 4px rgba(220, 38, 38, 0.2)',
                transition: 'all 0.2s',
                opacity: 0.8
              }}
              onMouseOver={(e) => e.currentTarget.style.opacity = '1'}
              onMouseOut={(e) => e.currentTarget.style.opacity = '0.8'}
              title="Clear all app data and reload"
            >
              🔄 Reset App Data
            </button>
          </div>
        </div>

        {/* Notification */}
        {notification && (
          <div style={{
            position: 'fixed',
            top: '2rem',
            right: '2rem',
            padding: '1rem 1.5rem',
            borderRadius: '8px',
            backgroundColor: notification.type === 'success' ? '#065f46' : notification.type === 'info' ? '#1e40af' : '#92400e',
            color: 'white',
            border: `1px solid ${notification.type === 'success' ? '#10b981' : notification.type === 'info' ? '#3b82f6' : '#f59e0b'}`,
            boxShadow: '0 10px 25px rgba(0, 0, 0, 0.2)',
            zIndex: 1000,
            maxWidth: '400px',
            fontSize: '0.9rem'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span>
                {notification.type === 'success' ? '✅' : notification.type === 'info' ? 'ℹ️' : '⚠️'}
              </span>
              <span>{notification.message}</span>
              <button
                onClick={() => setNotification(null)}
                style={{
                  marginLeft: 'auto',
                  background: 'none',
                  border: 'none',
                  color: 'white',
                  cursor: 'pointer',
                  fontSize: '1.2rem',
                  padding: '0',
                  opacity: 0.7
                }}
              >
                ×
              </button>
            </div>
          </div>
        )}

        {/* Connection Profiles */}
        <div style={{ backgroundColor: '#1e293b', padding: '1.5rem', borderRadius: '8px', marginBottom: '2rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h2 style={{ margin: 0, fontSize: '1.3rem' }}>Connection Profiles</h2>
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
              {/* Enterprise Profile Management */}
              <div style={{ display: 'flex', gap: '0.25rem' }}>
                <button
                  onClick={() => setShowFavoritesOnly(!showFavoritesOnly)}
                  style={{
                    padding: '0.4rem 0.8rem',
                    backgroundColor: showFavoritesOnly ? '#f59e0b' : '#374151',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontSize: '0.75rem'
                  }}
                >
                  ⭐ Favorites
                </button>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as 'lastUsed' | 'name' | 'frequency')}
                  style={{
                    padding: '0.4rem',
                    backgroundColor: '#374151',
                    color: 'white',
                    border: '1px solid #4b5563',
                    borderRadius: '4px',
                    fontSize: '0.75rem'
                  }}
                >
                  <option value="lastUsed">Last Used</option>
                  <option value="name">Name</option>
                  <option value="frequency">Frequency</option>
                </select>
              </div>
              <button
                onClick={() => setShowProfiles(!showProfiles)}
                style={{
                  padding: '0.5rem 1rem',
                  backgroundColor: '#6366f1',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '0.9rem'
                }}
              >
                {showProfiles ? 'Hide' : 'Show'} Profiles ({profiles.length})
              </button>
            </div>
          </div>

          {/* Enterprise Analytics Dashboard */}
          {profiles.length > 0 && (
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: '1fr 1fr 1fr 1fr', 
              gap: '1rem', 
              marginBottom: '1rem',
              padding: '1rem',
              backgroundColor: '#0f172a',
              borderRadius: '6px'
            }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '1.5rem', color: '#3b82f6', fontWeight: 'bold' }}>
                  {profiles.length}
                </div>
                <div style={{ fontSize: '0.8rem', color: '#94a3b8' }}>Total Profiles</div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '1.5rem', color: '#10b981', fontWeight: 'bold' }}>
                  {profiles.filter(p => p.favorited).length}
                </div>
                <div style={{ fontSize: '0.8rem', color: '#94a3b8' }}>Favorites</div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '1.5rem', color: '#f59e0b', fontWeight: 'bold' }}>
                  {profiles.reduce((total, p) => total + (p.connectionCount || 0), 0)}
                </div>
                <div style={{ fontSize: '0.8rem', color: '#94a3b8' }}>Total Connections</div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '1.5rem', color: '#8b5cf6', fontWeight: 'bold' }}>
                  {Math.round(profiles.reduce((total, p) => total + (p.totalSessionTime || 0), 0) / 60)}h
                </div>
                <div style={{ fontSize: '0.8rem', color: '#94a3b8' }}>Total Session Time</div>
              </div>
            </div>
          )}

          {showProfiles && (
            <div style={{ backgroundColor: '#0f172a', padding: '1rem', borderRadius: '6px' }}>
              {/* Search and Filter */}
              <div style={{ marginBottom: '1rem', display: 'flex', gap: '0.5rem' }}>
                <input
                  type="text"
                  placeholder="Search profiles..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  style={{
                    flex: 1,
                    padding: '0.5rem',
                    backgroundColor: '#1e293b',
                    color: 'white',
                    border: '1px solid #374151',
                    borderRadius: '4px',
                    fontSize: '0.85rem'
                  }}
                />
                <button
                  onClick={() => {
                    setSearchQuery('');
                    setShowFavoritesOnly(false);
                    setSortBy('lastUsed');
                  }}
                  style={{
                    padding: '0.5rem 1rem',
                    backgroundColor: '#6b7280',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontSize: '0.8rem'
                  }}
                >
                  Clear
                </button>
              </div>

              {(() => {
                let filteredProfiles = [...profiles];
                
                // Filter by search query
                if (searchQuery) {
                  filteredProfiles = filteredProfiles.filter(profile => 
                    profile.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                    profile.host.toLowerCase().includes(searchQuery.toLowerCase()) ||
                    profile.username.toLowerCase().includes(searchQuery.toLowerCase())
                  );
                }
                
                // Filter by favorites
                if (showFavoritesOnly) {
                  filteredProfiles = filteredProfiles.filter(profile => profile.favorited);
                }
                
                // Sort profiles
                filteredProfiles.sort((a, b) => {
                  switch (sortBy) {
                    case 'name':
                      return a.name.localeCompare(b.name);
                    case 'frequency':
                      return (b.connectionCount || 0) - (a.connectionCount || 0);
                    case 'lastUsed':
                    default:
                      return new Date(b.lastUsed).getTime() - new Date(a.lastUsed).getTime();
                  }
                });

                return filteredProfiles.length === 0 ? (
                  <p style={{ color: '#94a3b8', textAlign: 'center', margin: 0, fontStyle: 'italic' }}>
                    {profiles.length === 0 ? 'No saved profiles' : 'No profiles match your search criteria'}
                  </p>
                ) : (
                  filteredProfiles.map(profile => (
                    <div key={profile.id} style={{ 
                      display: 'flex', 
                      justifyContent: 'space-between', 
                      alignItems: 'center', 
                      padding: '1rem', 
                      backgroundColor: '#1e293b', 
                      borderRadius: '6px', 
                      marginBottom: '0.5rem',
                      border: profile.favorited ? '1px solid #f59e0b' : '1px solid transparent'
                    }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                          <span style={{ fontWeight: '600', fontSize: '1rem' }}>{profile.name}</span>
                          {profile.favorited && <span style={{ color: '#f59e0b' }}>⭐</span>}
                          {profile.tags && profile.tags.length > 0 && (
                            <div style={{ display: 'flex', gap: '0.25rem' }}>
                              {profile.tags.map(tag => (
                                <span key={tag} style={{
                                  fontSize: '0.7rem',
                                  padding: '0.1rem 0.4rem',
                                  backgroundColor: '#374151',
                                  color: '#9ca3af',
                                  borderRadius: '8px'
                                }}>
                                  {tag}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                        <div style={{ fontSize: '0.85rem', color: '#94a3b8', marginBottom: '0.25rem' }}>
                          {profile.username}@{profile.host}:{profile.port}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: '#6b7280', display: 'flex', gap: '1rem' }}>
                          <span>Last used: {new Date(profile.lastUsed).toLocaleDateString()}</span>
                          <span>Connections: {profile.connectionCount || 0}</span>
                          {profile.totalSessionTime && <span>Time: {Math.round(profile.totalSessionTime / 60)}h</span>}
                        </div>
                        {profile.logsDirectory && (
                          <div style={{ fontSize: '0.7rem', color: '#8b5cf6', marginTop: '0.25rem' }}>
                            📁 Logs: {profile.logsDirectory}
                          </div>
                        )}
                      </div>
                      <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                        <button
                          onClick={() => {
                            const updatedProfiles = profiles.map(p => 
                              p.id === profile.id ? { ...p, favorited: !p.favorited } : p
                            );
                            saveProfiles(updatedProfiles);
                          }}
                          style={{
                            padding: '0.4rem',
                            backgroundColor: profile.favorited ? '#f59e0b' : '#374151',
                            color: 'white',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            fontSize: '0.8rem'
                          }}
                          title={profile.favorited ? 'Remove from favorites' : 'Add to favorites'}
                        >
                          {profile.favorited ? '⭐' : '☆'}
                        </button>
                        <button
                          onClick={() => loadProfile(profile).catch(error => console.error('Error loading profile:', error))}
                          style={{
                            padding: '0.5rem 1rem',
                            backgroundColor: '#10b981',
                            color: 'white',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            fontSize: '0.8rem',
                            fontWeight: '500'
                          }}
                        >
                          Connect
                        </button>
                        <button
                          onClick={() => {
                            if (confirm(`Delete profile "${profile.name}"?`)) {
                              deleteProfile(profile.id);
                            }
                          }}
                          style={{
                            padding: '0.5rem',
                            backgroundColor: '#dc2626',
                            color: 'white',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            fontSize: '0.8rem'
                          }}
                        >
                          🗑️
                        </button>
                      </div>
                    </div>
                  ))
                );
              })()}
            </div>
          )}
        </div>

        {/* Global Logs Directory Settings */}
        <div style={{ backgroundColor: '#1e293b', padding: '1.5rem', borderRadius: '8px', marginBottom: '2rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h2 style={{ margin: 0, fontSize: '1.3rem' }}>Logs Directory Settings</h2>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button
                onClick={selectLogsDirectory}
                style={{
                  padding: '0.5rem 1rem',
                  backgroundColor: '#8b5cf6',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '0.9rem'
                }}
              >
                {selectedLogsDirectory ? '📁 Change Directory' : '📁 Select Directory'}
              </button>
              <div style={{
                fontSize: '0.8rem',
                color: selectedLogsDirectory ? '#10b981' : '#f59e0b',
                display: 'flex',
                alignItems: 'center',
                gap: '0.3rem'
              }}>
                {selectedLogsDirectory ? (
                  <>✅ Logs will be saved to: {selectedLogsDirectory}</>
                ) : (
                  <>⚠️ No directory selected - logs won't be saved</>
                )}
              </div>
              {selectedLogsDirectory && (
                <button
                  onClick={() => saveLogsDirectoryPreference('')}
                  style={{
                    padding: '0.5rem 1rem',
                    backgroundColor: '#dc2626',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontSize: '0.9rem'
                  }}
                >
                  Clear
                </button>
              )}
            </div>
          </div>
          
          <div style={{ backgroundColor: '#0f172a', padding: '1rem', borderRadius: '6px' }}>
            {selectedLogsDirectory ? (
              <div>
                <div style={{ color: '#10b981', fontSize: '0.9rem', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  ✅ <strong>Logs Directory Selected:</strong>
                </div>
                <div style={{ color: '#f1f5f9', fontFamily: 'monospace', fontSize: '0.9rem', padding: '0.5rem', backgroundColor: '#1e293b', borderRadius: '4px' }}>
                  {selectedLogsDirectory}
                </div>
                <div style={{ color: '#94a3b8', fontSize: '0.8rem', marginTop: '0.5rem' }}>
                  • Session logs will be automatically saved to this directory
                  <br />
                  • New profiles will inherit this logs directory setting
                  <br />
                  • You can still download logs manually if needed
                </div>
              </div>
            ) : (
              <div>
                <div style={{ color: '#94a3b8', fontSize: '0.9rem', marginBottom: '0.5rem' }}>
                  📁 <strong>No logs directory selected</strong>
                </div>
                <div style={{ color: '#64748b', fontSize: '0.8rem' }}>
                  • Logs will be downloaded as files instead of saved to a directory
                  <br />
                  • Select a directory to automatically save session logs
                  <br />
                  • Each connection profile can have its own logs directory
                </div>
              </div>
            )}
          </div>
        </div>

        {/* SSH Connection Form */}
        <div style={{ 
          backgroundColor: 'rgba(30, 41, 59, 0.95)', 
          backdropFilter: 'blur(10px)',
          padding: '2.5rem', 
          borderRadius: '20px',
          border: '1px solid rgba(255,255,255,0.1)',
          boxShadow: '0 20px 40px rgba(0,0,0,0.3), 0 1px 3px rgba(255,255,255,0.1)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', marginBottom: '2rem' }}>
            <div style={{
              width: '40px',
              height: '40px',
              background: 'linear-gradient(135deg, #06b6d4, #3b82f6)',
              borderRadius: '12px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginRight: '1rem'
            }}>
              <span style={{ fontSize: '20px', color: 'white' }}>🔒</span>
            </div>
            <div>
              <h2 style={{ 
                margin: '0', 
                fontSize: '1.5rem', 
                fontWeight: '600',
                color: 'white',
                fontFamily: '"Segoe UI", Tahoma, Geneva, Verdana, sans-serif'
              }}>
                SSH Connection
              </h2>
              <p style={{ 
                margin: '0', 
                fontSize: '0.9rem', 
                color: '#94a3b8',
                fontWeight: '400'
              }}>
                Secure Shell Remote Access
              </p>
            </div>
          </div>
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.9rem', marginBottom: '0.5rem' }}>Host *</label>
              <input
                type="text"
                value={config.host}
                onChange={(e) => setConfig(prev => {
                  const newHost = e.target.value;
                  const newUsername = prev.username;
                  return { 
                    ...prev, 
                    host: newHost,
                    profileName: newUsername && newHost ? `${newUsername}@${newHost}` : prev.profileName
                  };
                })}
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  backgroundColor: '#334155',
                  border: '1px solid #475569',
                  borderRadius: '4px',
                  color: 'white',
                  fontSize: '1rem'
                }}
                placeholder="192.168.1.100"
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.9rem', marginBottom: '0.5rem' }}>Port *</label>
              <input
                type="number"
                value={config.port}
                onChange={(e) => setConfig(prev => ({ ...prev, port: parseInt(e.target.value) || 22 }))}
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  backgroundColor: '#334155',
                  border: '1px solid #475569',
                  borderRadius: '4px',
                  color: 'white',
                  fontSize: '1rem'
                }}
                placeholder="22"
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.9rem', marginBottom: '0.5rem' }}>Username *</label>
              <input
                type="text"
                value={config.username}
                onChange={(e) => setConfig(prev => {
                  const newUsername = e.target.value;
                  const newHost = prev.host;
                  return { 
                    ...prev, 
                    username: newUsername,
                    profileName: newUsername && newHost ? `${newUsername}@${newHost}` : prev.profileName
                  };
                })}
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  backgroundColor: '#334155',
                  border: '1px solid #475569',
                  borderRadius: '4px',
                  color: 'white',
                  fontSize: '1rem'
                }}
                placeholder="username"
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.9rem', marginBottom: '0.5rem' }}>Authentication *</label>
              <div style={{ display: 'flex', gap: '1rem', marginBottom: '0.5rem' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <input
                    type="radio"
                    checked={!useSSHKey}
                    onChange={() => setUseSSHKey(false)}
                  />
                  <span>Password</span>
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <input
                    type="radio"
                    checked={useSSHKey}
                    onChange={() => setUseSSHKey(true)}
                  />
                  <span>SSH Key</span>
                </label>
              </div>
              {!useSSHKey ? (
                <input
                  type="password"
                  value={config.password}
                  onChange={(e) => setConfig(prev => ({ ...prev, password: e.target.value }))}
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    backgroundColor: '#334155',
                    border: '1px solid #475569',
                    borderRadius: '4px',
                    color: 'white',
                    fontSize: '1rem'
                  }}
                  placeholder="••••••••"
                />
              ) : (
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <select
                    value={selectedKeyName}
                    onChange={(e) => {
                      const name = e.target.value;
                      setSelectedKeyName(name);
                      const key = sshKeys.find(k => (k.name || '') === name);
                      setConfig(prev => ({ ...prev, privateKey: key?.privateKeyPath || '' }));
                    }}
                    style={{
                      flex: 1,
                      padding: '0.75rem',
                      backgroundColor: '#334155',
                      border: '1px solid #475569',
                      borderRadius: '4px',
                      color: 'white',
                      fontSize: '1rem'
                    }}
                  >
                    <option value="">Select SSH key...</option>
                    {sshKeys.map(k => (
                      <option key={k.name} value={k.name || ''}>
                        {k.name} {k.type ? `(${k.type})` : ''}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={() => { window.location.hash = '#keys'; }}
                    style={{
                      padding: '0.75rem 1rem',
                      backgroundColor: '#3b82f6',
                      border: '1px solid #475569',
                      borderRadius: '4px',
                      color: 'white',
                      fontSize: '0.9rem',
                      cursor: 'pointer'
                    }}
                    title="Manage SSH Keys"
                  >Manage Keys</button>
                </div>
              )}
            </div>
          </div>

          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{ display: 'block', fontSize: '0.9rem', marginBottom: '0.5rem' }}>Profile Name (Optional - Save this connection)</label>
            <input
              type="text"
              value={config.profileName}
              onChange={(e) => setConfig(prev => ({ ...prev, profileName: e.target.value }))}
              style={{
                width: '100%',
                padding: '0.75rem',
                backgroundColor: '#334155',
                border: '1px solid #475569',
                borderRadius: '4px',
                color: 'white',
                fontSize: '1rem'
              }}
              placeholder="My Server Connection"
            />
          </div>

          {/* Logs Directory Selection */}
          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{ display: 'block', fontSize: '0.9rem', marginBottom: '0.5rem' }}>
              Logs Directory (Optional - Where to save session logs)
            </label>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <input
                type="text"
                value={selectedLogsDirectory}
                readOnly
                style={{
                  flex: 1,
                  padding: '0.75rem',
                  backgroundColor: '#334155',
                  border: '1px solid #475569',
                  borderRadius: '4px',
                  color: '#94a3b8',
                  fontSize: '1rem'
                }}
                placeholder="Click 'Select Directory' to choose logs folder"
              />
              <button
                type="button"
                onClick={selectLogsDirectory}
                style={{
                  padding: '0.75rem 1rem',
                  backgroundColor: '#8b5cf6',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '0.9rem',
                  fontWeight: '500',
                  whiteSpace: 'nowrap'
                }}
              >
                {selectedLogsDirectory ? '📁 Change Directory' : '📁 Select Directory'}
              </button>
              <div style={{
                fontSize: '0.8rem',
                color: selectedLogsDirectory ? '#10b981' : '#f59e0b',
                display: 'flex',
                alignItems: 'center',
                gap: '0.3rem',
                marginTop: '0.5rem'
              }}>
                {selectedLogsDirectory ? (
                  <>✅ Logs will be saved to: {selectedLogsDirectory}</>
                ) : (
                  <>⚠️ No directory selected - logs won't be saved</>
                )}
              </div>
              {selectedLogsDirectory && (
                <button
                  type="button"
                  onClick={() => saveLogsDirectoryPreference('')}
                  style={{
                    padding: '0.75rem',
                    backgroundColor: '#6b7280',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontSize: '0.8rem'
                  }}
                  title="Clear selected directory"
                >
                  ✖️
                </button>
              )}
            </div>
            {selectedLogsDirectory && (
              <div style={{ 
                marginTop: '0.5rem', 
                fontSize: '0.8rem', 
                color: '#10b981',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem'
              }}>
                ✅ Logs will be saved to: {selectedLogsDirectory}
              </div>
            )}
          </div>

          <button
            onClick={handleConnect}
            disabled={
              !config.host || 
              !config.username || 
              (!useSSHKey && !config.password) ||
              (useSSHKey && !config.privateKey)
            }
            style={{
              width: '100%',
              padding: '1rem 1.5rem',
              background: (!config.host || !config.username || (!useSSHKey && !config.password) || (useSSHKey && !config.privateKey)) ? '#374151' : 'linear-gradient(45deg, #06b6d4, #3b82f6)',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              fontSize: '1.1rem',
              fontWeight: '600',
              cursor: (!config.host || !config.username || (!useSSHKey && !config.password) || (useSSHKey && !config.privateKey)) ? 'not-allowed' : 'pointer',
              transition: 'all 0.2s'
            }}
          >
            🚀 Connect to SSH Server
          </button>
        </div>

        {/* Features */}
        <div style={{ marginTop: '2rem', textAlign: 'center' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem', fontSize: '0.85rem', color: '#94a3b8' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
              <span>🔒</span>
              <span>Passwords are stored locally and encrypted</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
              <span>📊</span>
              <span>Terminal sessions auto-logged with timestamps</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
              <span>👤</span>
              <span>Directory preferences and profiles persist across sessions</span>
            </div>
          </div>
        </div>

        {/* Enterprise Footer */}
        <div style={{ 
          marginTop: '3rem',
          padding: '2rem',
          backgroundColor: 'rgba(15, 23, 42, 0.8)',
          borderRadius: '16px',
          border: '1px solid rgba(71, 85, 105, 0.3)',
          backdropFilter: 'blur(10px)'
        }}>
          {/* Enterprise Features Grid */}
          <div style={{ marginBottom: '2rem' }}>
            <h3 style={{ 
              fontSize: '1.2rem', 
              fontWeight: '600', 
              color: '#e2e8f0', 
              marginBottom: '1.5rem',
              textAlign: 'center',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem'
            }}>
              🚀 Enterprise Features
            </h3>
            
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', 
              gap: '1rem'
            }}>
              {/* Security Features */}
              <div style={{
                padding: '1.5rem',
                backgroundColor: 'rgba(30, 41, 59, 0.6)',
                borderRadius: '12px',
                border: '1px solid rgba(71, 85, 105, 0.3)'
              }}>
                <h4 style={{ 
                  margin: '0 0 1rem 0', 
                  fontSize: '1rem', 
                  color: '#3b82f6',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem'
                }}>
                  🛡️ Security & Authentication
                </h4>
                <ul style={{ 
                  margin: 0, 
                  padding: '0 0 0 1rem', 
                  fontSize: '0.85rem', 
                  color: '#cbd5e1',
                  lineHeight: '1.6'
                }}>
                  <li>SSH Key Authentication Support</li>
                  <li>Multi-Factor Authentication (MFA)</li>
                  <li>Jump Host & Bastion Support</li>
                  <li>Encrypted Password Storage</li>
                  <li>Session Security Monitoring</li>
                </ul>
              </div>

              {/* Management Features */}
              <div style={{
                padding: '1.5rem',
                backgroundColor: 'rgba(30, 41, 59, 0.6)',
                borderRadius: '12px',
                border: '1px solid rgba(71, 85, 105, 0.3)'
              }}>
                <h4 style={{ 
                  margin: '0 0 1rem 0', 
                  fontSize: '1rem', 
                  color: '#10b981',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem'
                }}>
                  📊 Management & Analytics
                </h4>
                <ul style={{ 
                  margin: 0, 
                  padding: '0 0 0 1rem', 
                  fontSize: '0.85rem', 
                  color: '#cbd5e1',
                  lineHeight: '1.6'
                }}>
                  <li>Connection Profile Management</li>
                  <li>Session Time Tracking</li>
                  <li>Usage Analytics & Statistics</li>
                  <li>Favorite Connections</li>
                  <li>Advanced Search & Filtering</li>
                </ul>
              </div>

              {/* File Management */}
              <div style={{
                padding: '1.5rem',
                backgroundColor: 'rgba(30, 41, 59, 0.6)',
                borderRadius: '12px',
                border: '1px solid rgba(71, 85, 105, 0.3)'
              }}>
                <h4 style={{ 
                  margin: '0 0 1rem 0', 
                  fontSize: '1rem', 
                  color: '#8b5cf6',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem'
                }}>
                  📁 File Management
                </h4>
                <ul style={{ 
                  margin: 0, 
                  padding: '0 0 0 1rem', 
                  fontSize: '0.85rem', 
                  color: '#cbd5e1',
                  lineHeight: '1.6'
                }}>
                  <li>Integrated SFTP Client</li>
                  <li>Drag & Drop File Transfers</li>
                  <li>Progress Tracking</li>
                  <li>Batch File Operations</li>
                  <li>Remote File Browser</li>
                </ul>
              </div>

              {/* Terminal Features */}
              <div style={{
                padding: '1.5rem',
                backgroundColor: 'rgba(30, 41, 59, 0.6)',
                borderRadius: '12px',
                border: '1px solid rgba(71, 85, 105, 0.3)'
              }}>
                <h4 style={{ 
                  margin: '0 0 1rem 0', 
                  fontSize: '1rem', 
                  color: '#f59e0b',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem'
                }}>
                  💻 Terminal Experience
                </h4>
                <ul style={{ 
                  margin: 0, 
                  padding: '0 0 0 1rem', 
                  fontSize: '0.85rem', 
                  color: '#cbd5e1',
                  lineHeight: '1.6'
                }}>
                  <li>PowerShell-Style Interface</li>
                  <li>Command History & Navigation</li>
                  <li>Multi-Tab Support</li>
                  <li>Session Logging</li>
                  <li>Auto-Focus Terminal Input</li>
                </ul>
              </div>

              {/* Enterprise Tools */}
              <div style={{
                padding: '1.5rem',
                backgroundColor: 'rgba(30, 41, 59, 0.6)',
                borderRadius: '12px',
                border: '1px solid rgba(71, 85, 105, 0.3)'
              }}>
                <h4 style={{ 
                  margin: '0 0 1rem 0', 
                  fontSize: '1rem', 
                  color: '#ef4444',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem'
                }}>
                  🔧 Enterprise Tools
                </h4>
                <ul style={{ 
                  margin: 0, 
                  padding: '0 0 0 1rem', 
                  fontSize: '0.85rem', 
                  color: '#cbd5e1',
                  lineHeight: '1.6'
                }}>
                  <li>Connection Monitoring</li>
                  <li>Performance Metrics</li>
                  <li>Log Export & Management</li>
                  <li>Tag-Based Organization</li>
                  <li>Dark/Light Theme Support</li>
                </ul>
              </div>

              {/* Integration & APIs */}
              <div style={{
                padding: '1.5rem',
                backgroundColor: 'rgba(30, 41, 59, 0.6)',
                borderRadius: '12px',
                border: '1px solid rgba(71, 85, 105, 0.3)'
              }}>
                <h4 style={{ 
                  margin: '0 0 1rem 0', 
                  fontSize: '1rem', 
                  color: '#06b6d4',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem'
                }}>
                  🔗 Integration Ready
                </h4>
                <ul style={{ 
                  margin: 0, 
                  padding: '0 0 0 1rem', 
                  fontSize: '0.85rem', 
                  color: '#cbd5e1',
                  lineHeight: '1.6'
                }}>
                  <li>REST API Integration</li>
                  <li>Webhook Support</li>
                  <li>Cloud Storage Integration</li>
                  <li>Single Sign-On (SSO)</li>
                  <li>Enterprise Directory Support</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Branding Footer */}
          <div style={{ 
            textAlign: 'center',
            paddingTop: '2rem',
            borderTop: '1px solid rgba(71, 85, 105, 0.3)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1rem' }}>
              <div style={{
                width: '32px',
                height: '32px',
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                borderRadius: '8px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginRight: '0.75rem'
              }}>
                <span style={{ fontSize: '16px', color: 'white' }}>⚡</span>
              </div>
              <div>
                <div style={{
                  fontSize: '1.2rem',
                  fontWeight: 'bold',
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  fontFamily: '"Segoe UI", Tahoma, Geneva, Verdana, sans-serif'
                }}>
                  QuantumXfer Enterprise
                </div>
              </div>
            </div>
            <p style={{ 
              margin: '0', 
              fontSize: '0.85rem', 
              color: '#64748b',
              lineHeight: '1.5'
            }}>
              Professional SSH/SFTP Client with Enterprise-Grade Security, Management & Analytics
              <br />
              Built with React 18 + TypeScript + Modern Web Technologies
            </p>
            <div style={{ 
              marginTop: '1rem',
              fontSize: '0.75rem',
              color: '#475569',
              display: 'flex',
              justifyContent: 'center',
              gap: '1rem',
              flexWrap: 'wrap'
            }}>
              <span>🔒 Secure by Design</span>
              <span>📊 Analytics Enabled</span>
              <span>🚀 Performance Optimized</span>
              <span>🎨 Modern UI/UX</span>
              <span>🔧 Enterprise Ready</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;