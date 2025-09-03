import { useState, useEffect, useRef } from 'react';
import type { ConnectionProfile } from './types/electron.d.ts';

// Global Command History Feature:
// - Single shared command history across all profiles and terminal windows
// - Stored in: %APPDATA%\quantumxfer\command-history\global-command-history.json
// - Maximum 500 commands to prevent excessive storage
// - Persistent across app restarts and available in both main and terminal windows

interface TerminalSession {
  id: string;
  config: SSHConfig;
  terminalLogs: TerminalLog[];
  commandHistory: string[];
  historyIndex: number;
  currentDirectory: string;
  sessionId: string;
  isConnected: boolean;
  connectionId?: number;
}

interface SSHConfig {
  host: string;
  port: number;
  username: string;
  password: string;
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
  const [config, setConfig] = useState<SSHConfig>({
    host: '',
    port: 22,
    username: '',
    password: '',
    profileName: ''
  });

  // Tab management - replace isTerminalTab with activeTab
  const [activeTab, setActiveTab] = useState<'connection' | 'terminal'>('connection');
  const [terminalMode, setTerminalMode] = useState<'ssh' | 'sftp'>('ssh'); // For switching between SSH and SFTP in terminal tab

  // Multiple terminal sessions management
  const [terminalSessions, setTerminalSessions] = useState<TerminalSession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);

  // Notification state
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'info' | 'warning' | 'error' } | null>(null);

  // Terminal state
  const [terminalLogs, setTerminalLogs] = useState<TerminalLog[]>([]);
  const [currentDirectory] = useState('/home');
  const [commandHistory, setCommandHistory] = useState<string[]>([]);
  const [autoSave] = useState(true);
  const [sessionId, setSessionId] = useState(`session-${Date.now()}`);

  // Connection state
  const [isConnected, setIsConnected] = useState(false);

  // Terminal refs
  const terminalRef = useRef<HTMLDivElement>(null);
  const commandInputRef = useRef<HTMLSpanElement>(null);

  // Current session computed values
  const activeSession = terminalSessions.find(session => session.id === activeSessionId);

  // Debug: Monitor terminal logs changes
  useEffect(() => {
    if (activeSession) {
      console.log('=== TERMINAL LOGS UPDATED ===');
      console.log('Active Session ID:', activeSession.id);
      console.log('Terminal Logs Count:', activeSession.terminalLogs.length);
      console.log('Terminal Logs:', activeSession.terminalLogs);
    }
  }, [activeSession?.terminalLogs]);



  // Connection profiles state
  const [profiles, setProfiles] = useState<ConnectionProfile[]>([]);
  const [showProfiles, setShowProfiles] = useState(false);
  const [selectedLogsDirectory, setSelectedLogsDirectory] = useState<string>('');

  // Cleanup: Save logs to file when component unmounts (app closes)
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
        } catch (error) {
          // Silently handle cleanup errors
        }
      }
    };
  }, [selectedLogsDirectory, terminalLogs]);

  // Enterprise features state
  const [_searchQuery, _setSearchQuery] = useState('');
  const [_showFavoritesOnly, _setShowFavoritesOnly] = useState(false);
  const [_sortBy, _setSortBy] = useState<'lastUsed' | 'name' | 'frequency'>('lastUsed');

  // SFTP state
  const [_showSFTP, _setShowSFTP] = useState(false);
  const [_remoteFiles, _setRemoteFiles] = useState<SFTPFile[]>([]);
  const [_remotePath, _setRemotePath] = useState('/');
  const [_transfers, _setTransfers] = useState<TransferItem[]>([]);
  const [_selectedFiles, _setSelectedFiles] = useState<SFTPFile[]>([]);

  // Load saved data on component mount
  useEffect(() => {
    const initializeApp = async () => {
      console.log('=== APP USEEFFECT INIT ===');
      console.log('Current hash:', window.location.hash);
      console.log('Window terminalData:', (window as any).terminalData);
      console.log('localStorage terminalData:', localStorage.getItem('quantumxfer-terminal-data'));

      // Check if this is a terminal tab
      if (window.location.hash === '#terminal') {
        console.log('Terminal mode detected from hash');
        const terminalData = localStorage.getItem('quantumxfer-terminal-data');
        const windowTerminalData = (window as any).terminalData;

        if (terminalData || windowTerminalData) {
          try {
            const data = windowTerminalData || JSON.parse(terminalData || '{}');
            console.log('Loading terminal data:', data);
            setConfig(data.config);
            setSessionId(data.sessionId);
            setIsConnected(true);
            setActiveTab('terminal'); // Switch to terminal tab instead of separate window

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
          const logIds = logs.map((log: any) => log.id);
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
      setActiveTab('terminal'); // Switch to terminal tab
      document.title = `QuantumXfer Terminal - ${data.config.username}@${data.config.host}`;
    };

    window.addEventListener('terminal-mode-ready', handleTerminalModeReady as EventListener);

    return () => {
      window.removeEventListener('terminal-mode-ready', handleTerminalModeReady as EventListener);
    };
  }, []);

  // Auto-select first session when terminal tab is active
  useEffect(() => {
    if (activeTab === 'terminal' && terminalSessions.length > 0 && !activeSessionId) {
      setActiveSessionId(terminalSessions[0].id);
    }
  }, [activeTab, terminalSessions, activeSessionId]);

  // Keyboard shortcuts for tab switching
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Only handle shortcuts when not typing in an input
      if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) {
        return;
      }

      if (event.ctrlKey || event.metaKey) {
        switch (event.key) {
          case '1':
            event.preventDefault();
            setActiveTab('connection');
            break;
          case '2':
            event.preventDefault();
            if (isConnected) {
              setActiveTab('terminal');
            }
            break;
          case 'ArrowLeft':
            event.preventDefault();
            if (activeTab === 'terminal' && isConnected) {
              setActiveTab('connection');
            }
            break;
          case 'ArrowRight':
            event.preventDefault();
            if (activeTab === 'connection' && isConnected) {
              setActiveTab('terminal');
            }
            break;
        }
      }

      // Switch between SSH and SFTP in terminal tab
      if (activeTab === 'terminal' && isConnected) {
        if (event.key === 's' && event.altKey) {
          event.preventDefault();
          setTerminalMode(terminalMode === 'ssh' ? 'sftp' : 'ssh');
        }
      }

      // Switch between terminal sessions
      if (activeTab === 'terminal' && terminalSessions.length > 1) {
        if (event.key === 'Tab' && event.ctrlKey) {
          event.preventDefault();
          const currentIndex = terminalSessions.findIndex(s => s.id === activeSessionId);
          const nextIndex = (currentIndex + 1) % terminalSessions.length;
          setActiveSessionId(terminalSessions[nextIndex].id);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeTab, isConnected, terminalMode]);

  // Auto-save logs
  useEffect(() => {
    if (autoSave && terminalLogs.length > 0) {
      localStorage.setItem('quantumxfer-logs', JSON.stringify(terminalLogs));
    }
  }, [terminalLogs, autoSave]);

  // Load profiles function
  const loadProfiles = async () => {
    try {
      // Try to load from file first (Electron environment)
      if (window.electronAPI && window.electronAPI.loadProfilesFromFile) {
        console.log('Loading profiles from file storage...');
        const result = await window.electronAPI.loadProfilesFromFile();
        if (result.success && result.profiles) {
          // Convert lastUsed string back to Date object and ensure commandHistory exists
          const profilesWithDates = result.profiles.map((profile: any) => ({
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
        const profilesWithDates = parsedProfiles.map((profile: any) => ({
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
        setProfiles([]);
      }
    } catch (error) {
      console.error('Error loading profiles:', error);
      setProfiles([]);
    }
  };

  // Save profiles function
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
    }
  };

  // Load session function
  const loadSession = () => {
    const saved = localStorage.getItem('quantumxfer-session');
    if (saved) {
      try {
        const sessionData = JSON.parse(saved);
        setConfig(prev => ({ ...prev, ...sessionData.config }));
        setSessionId(sessionData.sessionId || `session-${Date.now()}`);
        setTerminalLogs(sessionData.logs || []);
        setCommandHistory(sessionData.commandHistory || []);
        console.log('Session loaded successfully');
      } catch (error) {
        console.error('Error loading session:', error);
      }
    }
  };

  // Load directory preference
  const loadDirectoryPreference = () => {
    const saved = localStorage.getItem('quantumxfer-logs-directory');
    if (saved) {
      setSelectedLogsDirectory(saved);
    }
  };

  // Add terminal log function
  const addTerminalLog = (command: string, output: string) => {
    const newLog: TerminalLog = {
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date(),
      command,
      output,
      directory: currentDirectory
    };
    setTerminalLogs(prev => [...prev, newLog]);
  };

  // Execute command function
  const executeCommand = async () => {
    if (!activeSession) return;

    // Get command from contentEditable element directly
    const command = commandInputRef.current?.textContent?.trim() || '';

    if (command) {
      const cmd = command;

      // Add command to session's command history
      const newHistory = [...activeSession.commandHistory, cmd].slice(-100);
      setTerminalSessions(prev => prev.map(session =>
        session.id === activeSession.id
          ? { ...session, commandHistory: newHistory, historyIndex: -1 }
          : session
      ));

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

      // Create initial log entry with "Executing..." message
      const executingLog: TerminalLog = {
        id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        timestamp: new Date(),
        command: cmd,
        output: '⏳ Executing...',
        directory: activeSession.currentDirectory
      };

      // Add the executing log to the active session
      setTerminalSessions(prev => prev.map(session =>
        session.id === activeSession.id
          ? { ...session, terminalLogs: [...session.terminalLogs, executingLog] }
          : session
      ));

      try {
        // Get stored connection ID from the active session
        const connectionId = activeSession.connectionId;
        console.log('=== EXECUTING COMMAND ===');
        console.log('Command:', cmd);
        console.log('Connection ID:', connectionId);
        console.log('Is Connected:', activeSession.isConnected);
        console.log('Electron API available:', !!window.electronAPI);
        console.log('SSH API available:', !!(window.electronAPI && window.electronAPI.ssh));

        if (connectionId && window.electronAPI && window.electronAPI.ssh && activeSession.isConnected) {
          console.log('=== EXECUTING REAL SSH COMMAND ===');
          // Execute real SSH command
          const result = await window.electronAPI.ssh.executeCommand(connectionId, cmd);
          console.log('SSH Command Result:', result);

          if (result.success) {
            let output = '';
            if (result.stdout) output += result.stdout;
            if (result.stderr) output += `\nError: ${result.stderr}`;

            console.log('Command output:', output);

            // Update the last log entry with the real result
            setTerminalSessions(prev => prev.map(session => {
              if (session.id === activeSession.id && session.terminalLogs.length > 0) {
                const updatedLogs = [...session.terminalLogs];
                const lastLogIndex = updatedLogs.length - 1;
                updatedLogs[lastLogIndex] = {
                  ...updatedLogs[lastLogIndex],
                  output: output
                };
                return { ...session, terminalLogs: updatedLogs };
              }
              return session;
            }));
          } else {
            console.log('Command failed:', result.error);
            // Update the last log entry with error
            setTerminalSessions(prev => prev.map(session => {
              if (session.id === activeSession.id && session.terminalLogs.length > 0) {
                const updatedLogs = [...session.terminalLogs];
                const lastLogIndex = updatedLogs.length - 1;
                updatedLogs[lastLogIndex] = {
                  ...updatedLogs[lastLogIndex],
                  output: `❌ Error: ${result.error}`
                };
                return { ...session, terminalLogs: updatedLogs };
              }
              return session;
            }));
          }
        } else {
          console.log('=== FALLBACK TO SIMULATION MODE ===');
          // Simulation mode - update the last log entry
          setTerminalSessions(prev => prev.map(session => {
            if (session.id === activeSession.id && session.terminalLogs.length > 0) {
              const updatedLogs = [...session.terminalLogs];
              const lastLogIndex = updatedLogs.length - 1;
              updatedLogs[lastLogIndex] = {
                ...updatedLogs[lastLogIndex],
                output: `🔧 Simulation: ${cmd} executed`
              };
              return { ...session, terminalLogs: updatedLogs };
            }
            return session;
          }));
        }
      } catch (error) {
        console.error('Error executing command:', error);
        // Update the last log entry with error
        setTerminalSessions(prev => prev.map(session => {
          if (session.id === activeSession.id && session.terminalLogs.length > 0) {
            const updatedLogs = [...session.terminalLogs];
            const lastLogIndex = updatedLogs.length - 1;
            updatedLogs[lastLogIndex] = {
              ...updatedLogs[lastLogIndex],
              output: `❌ Error: ${error}`
            };
            return { ...session, terminalLogs: updatedLogs };
          }
          return session;
        }));
      }

      // Clear the command input
      if (commandInputRef.current) {
        commandInputRef.current.textContent = '';
      }
    }
  };

  // Handle command input

  const handleTerminalKeyDown = (e: React.KeyboardEvent) => {
    if (commandInputRef.current && !commandInputRef.current.contains(e.target as Node)) {
      commandInputRef.current.focus();
    }
  };

  // Handle command input changes
  const handleCommandInputChange = () => {
    // No need to update state - we'll get the value directly from the element when needed
  };

  // Handle command key down
  const handleCommandKeyDown = (e: React.KeyboardEvent<HTMLSpanElement>) => {
    if (!activeSession) return;

    if (e.key === 'Enter') {
      e.preventDefault();
      executeCommand();
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (activeSession.commandHistory.length > 0) {
        const newIndex = activeSession.historyIndex === -1 ? activeSession.commandHistory.length - 1 : Math.max(0, activeSession.historyIndex - 1);
        setTerminalSessions(prev => prev.map(session =>
          session.id === activeSession.id
            ? { ...session, historyIndex: newIndex }
            : session
        ));
        // Update the contentEditable element without triggering re-renders
        if (commandInputRef.current) {
          // Use requestAnimationFrame to ensure DOM is updated
          requestAnimationFrame(() => {
            if (commandInputRef.current) {
              commandInputRef.current.textContent = activeSession.commandHistory[newIndex];
              // Move cursor to end
              const range = document.createRange();
              const selection = window.getSelection();
              range.selectNodeContents(commandInputRef.current);
              range.collapse(false);
              selection?.removeAllRanges();
              selection?.addRange(range);
            }
          });
        }
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (activeSession.historyIndex >= 0) {
        const newIndex = activeSession.historyIndex + 1;
        if (newIndex >= activeSession.commandHistory.length) {
          setTerminalSessions(prev => prev.map(session =>
            session.id === activeSession.id
              ? { ...session, historyIndex: -1 }
              : session
          ));
          if (commandInputRef.current) {
            requestAnimationFrame(() => {
              if (commandInputRef.current) {
                commandInputRef.current.textContent = '';
              }
            });
          }
        } else {
          setTerminalSessions(prev => prev.map(session =>
            session.id === activeSession.id
              ? { ...session, historyIndex: newIndex }
              : session
          ));
          if (commandInputRef.current) {
            requestAnimationFrame(() => {
              if (commandInputRef.current) {
                commandInputRef.current.textContent = activeSession.commandHistory[newIndex];
                // Move cursor to end
                const range = document.createRange();
                const selection = window.getSelection();
                range.selectNodeContents(commandInputRef.current);
                range.collapse(false);
                selection?.removeAllRanges();
                selection?.addRange(range);
              }
            });
          }
        }
      }
    }
  };

  // Handle connect function
  const handleConnect = async () => {
    console.log('=== HANDLE CONNECT STARTED ===');
    console.log('Current config state:', config);
    console.log('Config validation - host:', !!config.host, 'username:', !!config.username, 'password:', !!config.password);

    if (!config.host || !config.username || !config.password) {
      console.log('=== CONFIG VALIDATION FAILED ===');
      setNotification({ message: 'Please fill in all connection details', type: 'error' });
      return;
    }

    console.log('=== CONFIG VALIDATION PASSED ===');
    setIsConnected(false); // Reset connection state
    setNotification({ message: 'Connecting to server...', type: 'info' });

    try {
      // Check if we're running in Electron
      if (window.electronAPI && window.electronAPI.ssh) {
        // Use real SSH connection via Electron
        const result = await window.electronAPI.ssh.connect({
          host: config.host,
          port: config.port,
          username: config.username,
          password: config.password,
          profileName: config.profileName
        });

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
                  ? { ...profile, name: config.profileName!, lastUsed: new Date(), password: config.password, logsDirectory: selectedLogsDirectory || undefined }
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
                password: config.password, // Store password securely
                lastUsed: new Date(),
                logsDirectory: selectedLogsDirectory || undefined,
                commandHistory: []
              };
              const updatedProfiles = [...profiles, newProfile];
              saveProfiles(updatedProfiles);
              addTerminalLog('profile-create', `Created new profile: ${config.profileName}`);
            }
          }

          // Create new terminal session
          const newSession: TerminalSession = {
            id: `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            config: { ...config },
            terminalLogs: [],
            commandHistory: [],
            historyIndex: -1,
            currentDirectory: '/home',
            sessionId: newSessionId,
            isConnected: true,
            connectionId: result.connectionId
          };

          setTerminalSessions(prev => [...prev, newSession]);
          setActiveSessionId(newSession.id);

          // Add connection log to the new session
          setTimeout(() => {
            setTerminalSessions(prev => prev.map(session =>
              session.id === newSession.id
                ? {
                    ...session,
                    terminalLogs: [{
                      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                      timestamp: new Date(),
                      command: 'ssh-connect',
                      output: `✅ Successfully connected to ${config.username}@${config.host}:${config.port}`,
                      directory: '/home'
                    }]
                  }
                : session
            ));
          }, 100);

          // Switch to terminal tab after successful connection
          setActiveTab('terminal');
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
        
        // Update window title with connection info
        document.title = `QuantumXfer - ${config.username}@${config.host} (Simulation)`;
        
        saveSession();

        // Switch to terminal tab after successful connection
        setActiveTab('terminal');
      }
    } catch (error) {
      console.error('=== CONNECTION ERROR ===');
      console.error('Error details:', error);
      setNotification({ message: 'Failed to connect to server', type: 'error' });
      addTerminalLog('ssh-error', `❌ Connection error: ${error}`);
    }
  };

  // Save session function
  const saveSession = () => {
    const sessionData = {
      config,
      sessionId,
      logs: terminalLogs,
      commandHistory
    };
    localStorage.setItem('quantumxfer-session', JSON.stringify(sessionData));
  };

  // Load profile function
  const loadProfile = async (profile: ConnectionProfile) => {
    setConfig(prev => ({
      ...prev,
      host: profile.host,
      port: profile.port,
      username: profile.username,
      password: profile.password || '', // Load password from profile
      profileName: profile.name
    }));

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
          console.log('Loaded global command history from file:', profile.name, '- Commands:', result.commands.length);
        } else {
          setCommandHistory([]);
          console.log('No global command history found for profile:', profile.name);
        }
      }
    } catch (error) {
      console.error('Error loading global command history:', error);
    }
  };

  // Delete profile function
  const deleteProfile = (profileId: string) => {
    const updatedProfiles = profiles.filter(profile => profile.id !== profileId);
    saveProfiles(updatedProfiles);
    setNotification({ message: 'Profile deleted', type: 'success' });
  };

  // Select logs directory function
  const selectLogsDirectory = async () => {
    if (window.electronAPI && window.electronAPI.showOpenDialog) {
      const result = await window.electronAPI.showOpenDialog({
        properties: ['openDirectory']
      });
      if (!result.canceled && result.filePaths.length > 0) {
        setSelectedLogsDirectory(result.filePaths[0]);
        localStorage.setItem('quantumxfer-logs-directory', result.filePaths[0]);
        setNotification({ message: 'Logs directory selected: ' + result.filePaths[0], type: 'success' });
      }
    }
  };


  // Main tabbed interface - Single return statement
  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#0f172a', color: 'white', display: 'flex' }}>
      <style>
        {`
          @keyframes blink {
            0%, 50% { opacity: 1; }
            51%, 100% { opacity: 0; }
          }
        `}
      </style>

      {/* Vertical Sidebar Navigation */}
      <div style={{
        width: '240px',
        backgroundColor: '#1e293b',
        borderRight: '1px solid #334155',
        display: 'flex',
        flexDirection: 'column',
        minHeight: '100vh'
      }}>
        {/* Logo/Brand */}
        <div style={{
          padding: '1rem',
          borderBottom: '1px solid #334155',
          textAlign: 'center'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '0.5rem' }}>
            <div style={{
              width: '40px',
              height: '40px',
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              borderRadius: '10px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '18px'
            }}>
              ⚡
            </div>
          </div>
          <span style={{ fontSize: '1.1rem', fontWeight: 'bold', color: '#f1f5f9' }}>
            QuantumXfer
          </span>
        </div>

        {/* Navigation Sections */}
        <div style={{ padding: '1rem 0', flex: 1, overflowY: 'auto' }}>
          {/* MAIN Section */}
          <div style={{ marginBottom: '2rem' }}>
            <div style={{
              padding: '0.5rem 0.75rem',
              fontSize: '11px',
              fontWeight: 'bold',
              color: '#64748b',
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
              marginBottom: '0.5rem'
            }}>
              Main
            </div>
            <button
              onClick={() => setActiveTab('connection')}
              style={{
                width: '100%',
                padding: '16px 20px',
                backgroundColor: activeTab === 'connection' ? '#3b82f6' : 'transparent',
                color: 'white',
                border: 'none',
                borderLeft: activeTab === 'connection' ? '4px solid #60a5fa' : '4px solid transparent',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: '500',
                transition: 'all 0.2s ease',
                textAlign: 'left',
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                borderRadius: '0 8px 8px 0',
                marginBottom: '0.25rem'
              }}
            >
              <span>🔗</span>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <span>Connection</span>
                {isConnected && (
                  <span style={{ fontSize: '11px', opacity: 0.8, fontWeight: 'normal' }}>
                    {config.username}@{config.host}
                  </span>
                )}
              </div>
            </button>
          </div>

          {/* TERMINALS Section */}
            {/* Terminal Sessions Sub-section */}
            {terminalSessions.length > 0 && (
              <div style={{ marginTop: '1rem', paddingLeft: '1rem' }}>
                <div style={{
                  fontSize: '10px',
                  fontWeight: 'bold',
                  color: '#94a3b8',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                  marginBottom: '0.5rem'
                }}>
                  Sessions ({terminalSessions.length})
                </div>
                {terminalSessions.map((session) => (
                  <button
                    key={session.id}
                    onClick={() => {
                      setActiveTab('terminal');
                      setActiveSessionId(session.id);
                    }}
                    style={{
                      width: '100%',
                      padding: '10px 16px',
                      backgroundColor: activeSessionId === session.id ? '#1e40af' : 'transparent',
                      color: '#cbd5e1',
                      border: 'none',
                      borderLeft: activeSessionId === session.id ? '3px solid #60a5fa' : '3px solid transparent',
                      cursor: 'pointer',
                      fontSize: '12px',
                      fontWeight: '400',
                      transition: 'all 0.2s ease',
                      textAlign: 'left',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                      borderRadius: '0 6px 6px 0',
                      marginBottom: '0.125rem',
                      opacity: 0.8
                    }}
                  >
                    <span style={{ fontSize: '10px' }}>●</span>
                    <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                      <span style={{ fontSize: '11px', fontWeight: '500' }}>
                        {session.config.username}@{session.config.host}
                      </span>
                      <span style={{ fontSize: '9px', opacity: 0.7 }}>
                        {session.config.port}
                      </span>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setTerminalSessions(prev => prev.filter(s => s.id !== session.id));
                        if (activeSessionId === session.id) {
                          const remainingSessions = terminalSessions.filter(s => s.id !== session.id);
                          setActiveSessionId(remainingSessions.length > 0 ? remainingSessions[0].id : null);
                        }
                      }}
                      style={{
                        marginLeft: 'auto',
                        background: 'none',
                        border: 'none',
                        color: '#94a3b8',
                        cursor: 'pointer',
                        fontSize: '10px',
                        padding: '2px',
                        borderRadius: '2px'
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.color = '#ef4444'}
                      onMouseLeave={(e) => e.currentTarget.style.color = '#94a3b8'}
                    >
                      ✕
                    </button>
                  </button>
                ))}
              </div>
            )}
        </div>

        {/* Status Footer */}
        <div style={{
          padding: '1rem',
          borderTop: '1px solid #334155',
          fontSize: '12px',
          color: '#94a3b8'
        }}>
          {isConnected ? (
            <div style={{ color: '#10b981', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span>🟢</span>
              <div>
                <div>Connected</div>
                <div style={{ fontSize: '10px', opacity: 0.7 }}>
                  {config.username}@{config.host}:{config.port}
                </div>
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span>🔴</span>
              <span>Not Connected</span>
            </div>
          )}
        </div>
      </div>

      {/* Main Content Area */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        {/* Content Header */}
        <div style={{
          backgroundColor: '#1e293b',
          borderBottom: '1px solid #334155',
          padding: '0.75rem 1.5rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <h1 style={{
            fontSize: '1.5rem',
            fontWeight: 'bold',
            color: '#f1f5f9',
            margin: 0
          }}>
            {activeTab === 'connection' ? 'SSH Connection Setup' : 'Terminal Sessions'}
          </h1>
          <div style={{ fontSize: '12px', color: '#94a3b8' }}>
            QuantumXfer v1.0.0
          </div>
        </div>

        {/* Tab Content */}
        <div style={{ flex: 1, padding: '0.75rem', overflowY: 'auto' }}>
        {activeTab === 'connection' && (
          <div>
            {/* Connection Tab Content */}
            <div style={{ maxWidth: '800px', margin: '0 auto' }}>
              {/* Connection Form */}
              <div style={{
                backgroundColor: '#1e293b',
                borderRadius: '12px',
                padding: '1.5rem',
                border: '1px solid #334155'
              }}>
                <h2 style={{ marginBottom: '0.75rem', color: '#f1f5f9' }}>SSH Connection</h2>

                <div style={{ display: 'grid', gap: '0.75rem' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                    <div>
                      <label style={{ display: 'block', marginBottom: '0.5rem', color: '#94a3b8' }}>
                        Host
                      </label>
                      <input
                        type="text"
                        value={config.host}
                        onChange={(e) => setConfig(prev => ({ ...prev, host: e.target.value }))}
                        placeholder="example.com or 192.168.1.100"
                        style={{
                          width: '100%',
                          padding: '0.5rem',
                          backgroundColor: '#0f172a',
                          border: '1px solid #334155',
                          borderRadius: '6px',
                          color: 'white',
                          fontSize: '14px'
                        }}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', marginBottom: '0.5rem', color: '#94a3b8' }}>
                        Port
                      </label>
                      <input
                        type="number"
                        value={config.port}
                        onChange={(e) => setConfig(prev => ({ ...prev, port: parseInt(e.target.value) || 22 }))}
                        placeholder="22"
                        style={{
                          width: '100%',
                          padding: '0.5rem',
                          backgroundColor: '#0f172a',
                          border: '1px solid #334155',
                          borderRadius: '6px',
                          color: 'white',
                          fontSize: '14px'
                        }}
                      />
                    </div>
                  </div>

                  <div>
                    <label style={{ display: 'block', marginBottom: '0.5rem', color: '#94a3b8' }}>
                      Username
                    </label>
                    <input
                      type="text"
                      value={config.username}
                      onChange={(e) => setConfig(prev => ({ ...prev, username: e.target.value }))}
                      placeholder="your-username"
                      style={{
                        width: '100%',
                        padding: '0.5rem',
                        backgroundColor: '#0f172a',
                        border: '1px solid #334155',
                        borderRadius: '6px',
                        color: 'white',
                        fontSize: '14px'
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', marginBottom: '0.5rem', color: '#94a3b8' }}>
                      Password
                    </label>
                    <input
                      type="password"
                      value={config.password}
                      onChange={(e) => setConfig(prev => ({ ...prev, password: e.target.value }))}
                      placeholder="your-password"
                      style={{
                        width: '100%',
                        padding: '0.5rem',
                        backgroundColor: '#0f172a',
                        border: '1px solid #334155',
                        borderRadius: '6px',
                        color: 'white',
                        fontSize: '14px'
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', marginBottom: '0.5rem', color: '#94a3b8' }}>
                      Profile Name (Optional)
                    </label>
                    <input
                      type="text"
                      value={config.profileName}
                      onChange={(e) => setConfig(prev => ({ ...prev, profileName: e.target.value }))}
                      placeholder="My Server Profile"
                      style={{
                        width: '100%',
                        padding: '0.5rem',
                        backgroundColor: '#0f172a',
                        border: '1px solid #334155',
                        borderRadius: '6px',
                        color: 'white',
                        fontSize: '14px'
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', marginBottom: '0.5rem', color: '#94a3b8' }}>
                      Logs Directory (Optional)
                    </label>
                    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'stretch' }}>
                      <input
                        type="text"
                        value={selectedLogsDirectory}
                        onChange={(e) => setSelectedLogsDirectory(e.target.value)}
                        placeholder="Select directory for saving logs"
                        readOnly
                        style={{
                          flex: 1,
                          padding: '0.5rem',
                          backgroundColor: '#0f172a',
                          border: '1px solid #334155',
                          borderRadius: '6px',
                          color: 'white',
                          fontSize: '14px'
                        }}
                      />
                      <button
                        onClick={selectLogsDirectory}
                        style={{
                          padding: '0.75rem 0.75rem',
                          backgroundColor: '#64748b',
                          color: 'white',
                          border: 'none',
                          borderRadius: '6px',
                          cursor: 'pointer',
                          fontSize: '14px',
                          whiteSpace: 'nowrap'
                        }}
                      >
                        📁 Browse
                      </button>
                    </div>
                    {selectedLogsDirectory && (
                      <div style={{ marginTop: '0.5rem', fontSize: '0.9rem', color: '#10b981' }}>
                        ✓ Logs will be saved to: {selectedLogsDirectory}
                      </div>
                    )}
                  </div>

                  <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-end' }}>
                    <button
                      onClick={handleConnect}
                      disabled={!config.host || !config.username || !config.password}
                      style={{
                        padding: '0.75rem 1.5rem',
                        backgroundColor: '#3b82f6',
                        color: 'white',
                        border: 'none',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        fontSize: '14px',
                        fontWeight: '500',
                        opacity: (!config.host || !config.username || !config.password) ? 0.5 : 1
                      }}
                    >
                      {isConnected ? 'Connected' : 'Connect'}
                    </button>

                    <button
                      onClick={() => setShowProfiles(!showProfiles)}
                      style={{
                        padding: '0.75rem 0.75rem',
                        backgroundColor: '#64748b',
                        color: 'white',
                        border: 'none',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        fontSize: '14px'
                      }}
                    >
                      Profiles
                    </button>
                  </div>
                </div>
              </div>

              {/* Profiles Section */}
              {showProfiles && (
                <div style={{
                  marginTop: '1.5rem',
                  backgroundColor: '#1e293b',
                  borderRadius: '12px',
                  padding: '1.5rem',
                  border: '1px solid #334155'
                }}>
                  <h3 style={{ marginBottom: '0.75rem', color: '#f1f5f9' }}>Connection Profiles</h3>

                  {profiles.length === 0 ? (
                    <p style={{ color: '#94a3b8' }}>No saved profiles yet.</p>
                  ) : (
                    <div style={{ display: 'grid', gap: '0.75rem' }}>
                      {profiles.map(profile => (
                        <div key={profile.id} style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          padding: '0.75rem',
                          backgroundColor: '#0f172a',
                          borderRadius: '8px',
                          border: '1px solid #334155'
                        }}>
                          <div>
                            <div style={{ fontWeight: '500', color: '#f1f5f9' }}>{profile.name}</div>
                            <div style={{ fontSize: '0.9rem', color: '#94a3b8' }}>
                              {profile.username}@{profile.host}:{profile.port}
                            </div>
                          </div>
                          <div style={{ display: 'flex', gap: '0.5rem' }}>
                            <button
                              onClick={() => loadProfile(profile)}
                              style={{
                                padding: '0.5rem 0.75rem',
                                backgroundColor: '#10b981',
                                color: 'white',
                                border: 'none',
                                borderRadius: '4px',
                                cursor: 'pointer',
                                fontSize: '0.9rem'
                              }}
                            >
                              Load
                            </button>
                            <button
                              onClick={() => deleteProfile(profile.id)}
                              style={{
                                padding: '0.5rem 0.75rem',
                                backgroundColor: '#ef4444',
                                color: 'white',
                                border: 'none',
                                borderRadius: '4px',
                                cursor: 'pointer',
                                fontSize: '0.9rem'
                              }}
                            >
                              Delete
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'terminal' && terminalSessions.length > 0 && (
          <div>
            {/* Terminal Tab Content */}
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

                input:focus {
                  outline: none;
                  caret-color: white !important;
                }
              `}</style>

              {/* Terminal Header */}
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '1rem',
                padding: '1rem',
                backgroundColor: '#1e293b',
                borderRadius: '8px',
                border: '1px solid #334155'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span style={{ fontSize: '1rem' }}>🟦</span>
                  <span style={{ color: 'white', fontSize: '0.9rem', fontWeight: '500' }}>
                    Windows PowerShell - {activeSession ? `${activeSession.config.username}@${activeSession.config.host}:${activeSession.config.port}` : 'No Active Session'}
                  </span>
                  {terminalSessions.length > 1 && (
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                      marginLeft: '1rem',
                      padding: '0.25rem 0.5rem',
                      backgroundColor: '#0f172a',
                      borderRadius: '4px',
                      border: '1px solid #334155'
                    }}>
                      <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>
                        Session {terminalSessions.findIndex(s => s.id === activeSessionId) + 1} of {terminalSessions.length}
                      </span>
                      <button
                        onClick={() => {
                          const currentIndex = terminalSessions.findIndex(s => s.id === activeSessionId);
                          const nextIndex = (currentIndex + 1) % terminalSessions.length;
                          setActiveSessionId(terminalSessions[nextIndex].id);
                        }}
                        style={{
                          padding: '0.2rem 0.4rem',
                          backgroundColor: '#3b82f6',
                          color: 'white',
                          border: 'none',
                          borderRadius: '3px',
                          cursor: 'pointer',
                          fontSize: '0.7rem',
                          fontWeight: 'bold'
                        }}
                        title="Switch to next session (Ctrl+Tab)"
                      >
                        ↻
                      </button>
                    </div>
                  )}
                </div>

                {/* Terminal Mode Toggle */}
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button
                    onClick={() => setTerminalMode('ssh')}
                    style={{
                      padding: '0.5rem 0.75rem',
                      backgroundColor: terminalMode === 'ssh' ? '#059669' : '#64748b',
                      color: 'white',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      fontSize: '0.8rem'
                    }}
                  >
                    SSH Terminal
                  </button>
                  <button
                    onClick={() => setTerminalMode('sftp')}
                    style={{
                      padding: '0.5rem 0.75rem',
                      backgroundColor: terminalMode === 'sftp' ? '#059669' : '#64748b',
                      color: 'white',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      fontSize: '0.8rem'
                    }}
                  >
                    SFTP Browser
                  </button>
                </div>
              </div>

              {/* Terminal Content */}
              {terminalMode === 'ssh' ? (
                <div style={{ backgroundColor: '#012456', borderRadius: '8px', border: '1px solid #1e40af', overflow: 'hidden' }}>
                  {/* Traditional Terminal Interface */}
                  <div
                    className="powershell-scrollbar"
                    style={{
                      height: '400px',
                      overflowY: 'auto',
                      padding: '1rem',
                      fontFamily: 'Consolas, Monaco, "Courier New", monospace',
                      fontSize: '14px',
                      lineHeight: '1.4',
                      backgroundColor: '#012456',
                      color: '#f1f5f9'
                    }}
                    tabIndex={0}
                    onKeyDown={handleTerminalKeyDown}
                    ref={terminalRef}
                  >
                    {/* Terminal History */}
                    {(activeSession?.terminalLogs || []).map((log) => (
                      <div key={log.id} style={{ marginBottom: '0.5rem' }}>
                        <div style={{ color: '#3b82f6', fontWeight: 'bold' }}>
                          {activeSession ? `${activeSession.config.username}@${activeSession.config.host}:${activeSession.config.port}${log.directory}$ ${log.command}` : ''}
                        </div>
                        {log.output && (
                          <div style={{ color: '#94a3b8', whiteSpace: 'pre-wrap' }}>{log.output}</div>
                        )}
                      </div>
                    ))}

                    {/* Current Command Line */}
                    <div style={{ display: 'flex', alignItems: 'center' }}>
                      <span style={{ color: '#3b82f6', fontWeight: 'bold' }}>
                        {activeSession ? `${activeSession.config.username}@${activeSession.config.host}:${activeSession.config.port}${activeSession.currentDirectory}$` : 'No active session'}
                      </span>
                      <span
                        style={{
                          marginLeft: '0.5rem',
                          flex: 1,
                          outline: 'none',
                          border: 'none',
                          backgroundColor: 'transparent',
                          color: '#f1f5f9',
                          fontFamily: 'inherit',
                          fontSize: 'inherit',
                          caretColor: '#3b82f6',
                          minHeight: '1.4em',
                          display: 'inline-block'
                        }}
                        contentEditable
                        suppressContentEditableWarning
                        onInput={handleCommandInputChange}
                        onKeyDown={handleCommandKeyDown}
                        ref={commandInputRef}
                        data-placeholder={activeSession && activeSession.commandHistory.length > 0
                          ? `Type command... (${activeSession.commandHistory.length} in session history, ↑↓ to navigate)`
                          : `Type command...`}
                      />
                      <span
                        style={{
                          color: '#3b82f6',
                          animation: 'blink 1s infinite'
                        }}
                      >
                        ▊
                      </span>
                    </div>
                  </div>
                </div>
              ) : (
                <div style={{ backgroundColor: '#1e293b', borderRadius: '8px', border: '1px solid #334155', overflow: 'hidden' }}>
                  {/* SFTP Browser */}
                  <div style={{ padding: '0.75rem', borderBottom: '1px solid #334155' }}>
                    <h3 style={{ margin: 0, color: '#f1f5f9' }}>SFTP File Browser</h3>
                    <p style={{ margin: '0.5rem 0 0 0', color: '#94a3b8' }}>
                      Remote: {config.username}@{config.host}:{config.port}
                    </p>
                  </div>

                  <div style={{ padding: '0.75rem' }}>
                    <p style={{ color: '#94a3b8' }}>SFTP functionality will be implemented here...</p>
                  </div>
                </div>
              )}

              {/* Terminal Controls */}
              <div style={{
                marginTop: '1rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.5rem'
              }}>
                {/* Logs Directory Status */}
                {selectedLogsDirectory && (
                  <div style={{
                    padding: '0.5rem',
                    backgroundColor: '#1e293b',
                    borderRadius: '4px',
                    border: '1px solid #3b82f6',
                    fontSize: '0.8rem',
                    color: '#94a3b8'
                  }}>
                    📁 Logs Directory: {selectedLogsDirectory}
                  </div>
                )}

                {/* Control Buttons */}
                <div style={{
                  display: 'flex',
                  gap: '1rem',
                  justifyContent: 'flex-end'
                }}>
                  <button
                    onClick={selectLogsDirectory}
                    style={{
                      padding: '0.5rem 0.75rem',
                      backgroundColor: '#3b82f6',
                      color: 'white',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      fontSize: '0.9rem'
                    }}
                  >
                    📁 Select Logs Directory
                  </button>
                  <button
                    onClick={() => {
                      if (activeSession) {
                        setTerminalSessions(prev => prev.map(session =>
                          session.id === activeSession.id
                            ? { ...session, terminalLogs: [] }
                            : session
                        ));
                      }
                    }}
                    style={{
                      padding: '0.5rem 0.75rem',
                      backgroundColor: '#64748b',
                      color: 'white',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      fontSize: '0.9rem'
                    }}
                  >
                    🗑️ Clear Terminal
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
        </div>
      </div>

      {/* Notification */}
      {notification && (
        <div style={{
          position: 'fixed',
          top: '2rem',
          right: '2rem',
          padding: '0.75rem 1.25rem',
          borderRadius: '8px',
          backgroundColor: notification.type === 'success' ? '#10b981' :
                          notification.type === 'error' ? '#ef4444' :
                          notification.type === 'warning' ? '#f59e0b' : '#3b82f6',
          color: 'white',
          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
          zIndex: 1000,
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem'
        }}>
          <span>{notification.message}</span>
          <button
            onClick={() => setNotification(null)}
            style={{
              marginLeft: 'auto',
              background: 'none',
              border: 'none',
              color: 'white',
              cursor: 'pointer',
              fontSize: '1.2rem'
            }}
          >
            ×
          </button>
        </div>
      )}
    </div>
  );
}

export default App;
