import { useState, useEffect, useRef } from 'react';
import type { ConnectionProfile, Bookmark, NewBookmark, ServerRef } from './types/electron.d.ts';

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
  // Auto-generate profile name based on username/host/port until user overrides it
  const [isProfileNameAuto, setIsProfileNameAuto] = useState<boolean>(true);

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

  // Generate a default profile name from fields
  const generateProfileName = (u: string, h: string, p: number) => {
    const username = (u || '').trim();
    const host = (h || '').trim();
    const port = p || 22;
    if (username && host) return `${username}@${host}:${port}`;
    if (host) return `${host}:${port}`;
    if (username) return `${username}@`;
    return '';
  };

  // Keep profile name in sync while auto mode is enabled
  useEffect(() => {
    if (!isProfileNameAuto) return;
    const autoName = generateProfileName(config.username, config.host, config.port);
    if (autoName !== (config.profileName || '')) {
      setConfig(prev => ({ ...prev, profileName: autoName }));
    }
  }, [config.username, config.host, config.port, isProfileNameAuto]);

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
  const [_showFavoritesOnly, _setShowFavoritesOnly] = useState(false);
  const [_sortBy, _setSortBy] = useState<'lastUsed' | 'name' | 'frequency'>('lastUsed');

  // SFTP state
  const [remoteFiles, setRemoteFiles] = useState<SFTPFile[]>([]);
  const [remotePath, setRemotePath] = useState('/home/work');

  // Bookmarks state
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);

  // SFTP Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchFilter, setSearchFilter] = useState<'all' | 'files' | 'directories'>('all');
  const [sizeFilter, setSizeFilter] = useState<'all' | 'small' | 'medium' | 'large'>('all');
  const [dateFilter, setDateFilter] = useState<'all' | 'today' | 'week' | 'month'>('all');
  const [useRegex, setUseRegex] = useState(false);
  const [useRecursiveSearch, setUseRecursiveSearch] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [filteredFiles, setFilteredFiles] = useState<SFTPFile[]>([]);

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
      // Load bookmarks
      try {
        if (window.electronAPI?.bookmarks?.list) {
          const res = await window.electronAPI.bookmarks.list();
          if (res.success) {
            setBookmarks(res.bookmarks || []);
          }
        }
      } catch (err) {
        console.error('Failed to load bookmarks:', err);
      }

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
            commandHistory: [...commandHistory], // Use global command history
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


  // SFTP Functions
  const loadSFTPFiles = async (path: string = remotePath) => {
    if (!isConnected || !activeSession?.connectionId) {
      setNotification({ message: 'Not connected to server', type: 'error' });
      return;
    }

    try {
      if (window.electronAPI && window.electronAPI.ssh && window.electronAPI.ssh.listDirectory) {
        const result = await window.electronAPI.ssh.listDirectory(activeSession.connectionId, path);
        if (result.success && result.files) {
          setRemoteFiles(result.files);
          setRemotePath(path);
          console.log('📁 SFTP Files Loaded:', {
            path,
            fileCount: result.files.length,
            files: result.files.map(f => ({ name: f.name, type: f.type, size: f.size }))
          });
          addTerminalLog('sftp-ls', `Listed directory: ${path} (${result.files.length} items)`);
        } else {
          setNotification({ message: `Failed to list directory: ${result.error}`, type: 'error' });
          addTerminalLog('sftp-error', `Failed to list directory: ${result.error}`);
        }
      }
    } catch (error) {
      console.error('SFTP list directory error:', error);
      setNotification({ message: 'Failed to load SFTP files', type: 'error' });
    }
  };

  // -------------------------
  // Bookmarks: helpers (UI)
  // -------------------------
  // Note: Bookmarks refresh is inline in each action; no separate refresher to keep linter clean

  const addServerBookmark = async () => {
    if (!config.host || !config.port || !config.username) {
      setNotification({ message: 'Please fill Host, Port and Username to bookmark a server', type: 'warning' });
      return;
    }
    const server: ServerRef = { host: config.host, port: config.port, username: config.username };
    const payload: NewBookmark = {
      type: 'server',
      label: config.profileName || `${config.username}@${config.host}:${config.port}`,
      server
    };
    try {
      const res = await window.electronAPI?.bookmarks?.add?.(payload);
      if (res?.success) {
        setBookmarks(res.bookmarks || []);
        setNotification({ message: 'Server bookmarked', type: 'success' });
      } else {
        setNotification({ message: 'Failed to add bookmark', type: 'error' });
      }
    } catch (e) {
      console.error('addServerBookmark error:', e);
      setNotification({ message: 'Failed to add bookmark', type: 'error' });
    }
  };

  const addDirectoryBookmark = async () => {
    if (!isConnected || !activeSession?.connectionId) {
      setNotification({ message: 'Connect to a server before bookmarking a directory', type: 'warning' });
      return;
    }
    const server: ServerRef = { host: config.host, port: config.port, username: config.username };
    const payload: NewBookmark = {
      type: 'directory',
      label: `${server.username}@${server.host}:${server.port} • ${remotePath}`,
      server,
      path: remotePath
    };
    try {
      const res = await window.electronAPI?.bookmarks?.add?.(payload);
      if (res?.success) {
        setBookmarks(res.bookmarks || []);
        setNotification({ message: 'Directory bookmarked', type: 'success' });
      } else {
        setNotification({ message: 'Failed to add bookmark', type: 'error' });
      }
    } catch (e) {
      console.error('addDirectoryBookmark error:', e);
      setNotification({ message: 'Failed to add bookmark', type: 'error' });
    }
  };

  const removeBookmark = async (id: string) => {
    try {
      const res = await window.electronAPI?.bookmarks?.remove?.(id);
      if (res?.success) {
        setBookmarks(res.bookmarks || []);
        setNotification({ message: 'Bookmark removed', type: 'success' });
      }
    } catch (e) {
      console.error('removeBookmark error:', e);
    }
  };

  const goToBookmark = async (bm: Bookmark) => {
    if (bm.type === 'server' && bm.server) {
      setConfig(prev => ({
        ...prev,
        host: bm.server!.host,
        port: bm.server!.port,
        username: bm.server!.username || prev.username
      }));
      setActiveTab('connection');
      setNotification({ message: 'Server bookmark loaded. Click Connect to establish a session.', type: 'info' });
      return;
    }

    if (bm.type === 'directory') {
      // If server info present and different, preload and ask to connect
      if (bm.server && (!isConnected || bm.server.host !== config.host || bm.server.port !== config.port || bm.server.username !== config.username)) {
        setConfig(prev => ({ ...prev, host: bm.server!.host, port: bm.server!.port, username: bm.server!.username || prev.username }));
        setActiveTab('connection');
        setNotification({ message: 'Directory bookmark belongs to a different server. Connection details loaded—please Connect.', type: 'warning' });
        return;
      }
      if (!isConnected || !activeSession?.connectionId) {
        setNotification({ message: 'Connect to the server to navigate to the bookmarked directory.', type: 'warning' });
        return;
      }
      await loadSFTPFiles(bm.path || remotePath);
      setTerminalMode('sftp');
    }
  };

  // SFTP Search and Filter Functions
  const filterFiles = (files: SFTPFile[], query: string, filter: string, size: string, date: string, regex: boolean) => {
    console.log('🔍 filterFiles called with:', { filesCount: files.length, query, filter, size, date, regex });

    return files.filter(file => {
      // Type filter
      if (filter === 'files' && file.type !== 'file') return false;
      if (filter === 'directories' && file.type !== 'directory') return false;

      // Size filter
      if (size !== 'all') {
        const fileSize = file.size;
        if (size === 'small' && fileSize >= 1024 * 1024) return false; // > 1MB
        if (size === 'medium' && (fileSize < 1024 * 1024 || fileSize >= 100 * 1024 * 1024)) return false; // 1MB - 100MB
        if (size === 'large' && fileSize < 100 * 1024 * 1024) return false; // < 100MB
      }

      // Date filter
      if (date !== 'all') {
        const fileDate = new Date(file.modified);
        const now = new Date();
        const diffTime = now.getTime() - fileDate.getTime();
        const diffDays = diffTime / (1000 * 3600 * 24);

        if (date === 'today' && diffDays >= 1) return false;
        if (date === 'week' && diffDays >= 7) return false;
        if (date === 'month' && diffDays >= 30) return false;
      }

      // Search query
      if (query.trim()) {
        const searchTerm = query.toLowerCase();
        const fileName = file.name.toLowerCase();

        if (regex) {
          try {
            const regexPattern = new RegExp(searchTerm, 'i');
            return regexPattern.test(fileName);
          } catch (error) {
            // Invalid regex, fall back to simple search
            return fileName.includes(searchTerm);
          }
        } else {
          // Support wildcards (* and ?)
          if (searchTerm.includes('*') || searchTerm.includes('?')) {
            const pattern = searchTerm
              .replace(/[.+^${}()|[\]\\]/g, '\\$&') // Escape regex special chars
              .replace(/\*/g, '.*') // * matches any sequence
              .replace(/\?/g, '.'); // ? matches any single char
            try {
              const regex = new RegExp(`^${pattern}$`, 'i');
              return regex.test(fileName);
            } catch (error) {
              return fileName.includes(searchTerm.replace(/[*?]/g, ''));
            }
          } else {
            return fileName.includes(searchTerm);
          }
        }
      }

      return true;
    });
  };

  // Recursive search function
  const performRecursiveSearch = async (query: string) => {
    if (!isConnected || !activeSession?.connectionId || !query.trim()) {
      return remoteFiles;
    }

    setIsSearching(true);
    try {
      if (window.electronAPI && window.electronAPI.ssh && window.electronAPI.ssh.listDirectoryRecursive) {
        const result = await window.electronAPI.ssh.listDirectoryRecursive(
          activeSession.connectionId,
          remotePath,
          {
            maxDepth: 5,
            maxFiles: 500,
            includeHidden: true
          }
        );

        if (result.success && result.files) {
          console.log('🔍 Recursive search results:', {
            totalFiles: result.totalFiles,
            truncated: result.truncated,
            files: result.files.slice(0, 10) // Log first 10 results
          });

          // Apply filters to the recursive results
          const filtered = filterFiles(result.files, query, searchFilter, sizeFilter, dateFilter, useRegex);
          return filtered;
        } else {
          console.error('Recursive search failed:', result.error);
          return remoteFiles; // Fallback to current directory
        }
      }
    } catch (error) {
      console.error('Recursive search error:', error);
      return remoteFiles; // Fallback to current directory
    } finally {
      setIsSearching(false);
    }

    return remoteFiles;
  };

  // Update filtered files when search criteria change
  useEffect(() => {
    const updateFilteredFiles = async () => {
      if (searchQuery.trim() && useRecursiveSearch) {
        // Use recursive search
        const results = await performRecursiveSearch(searchQuery);
        setFilteredFiles(results);
      } else {
        // Use regular filtering
        const filtered = filterFiles(remoteFiles, searchQuery, searchFilter, sizeFilter, dateFilter, useRegex);
        setFilteredFiles(filtered);
      }
    };

    updateFilteredFiles();

    // Debug logging
    if (searchQuery.trim() || remoteFiles.length > 0) {
      console.log('🔍 Search Debug:', {
        searchQuery,
        useRecursiveSearch,
        useRegex,
        remoteFilesCount: remoteFiles.length,
        filteredCount: filteredFiles.length,
        remoteFiles: remoteFiles.slice(0, 5).map(f => ({ name: f.name, type: f.type })),
        filteredFiles: filteredFiles.slice(0, 5).map(f => ({ name: f.name, type: f.type }))
      });
    }
  }, [remoteFiles, searchQuery, searchFilter, sizeFilter, dateFilter, useRegex, useRecursiveSearch]);

  // Initialize filtered files with remote files on mount
  useEffect(() => {
    if (remoteFiles.length > 0 && filteredFiles.length === 0 && !searchQuery.trim()) {
      setFilteredFiles(remoteFiles);
      console.log('📁 Initializing filtered files with remote files:', remoteFiles.length);
    }
  }, [remoteFiles, filteredFiles.length, searchQuery]);

  const downloadFile = async (file: SFTPFile) => {
    if (!isConnected || !activeSession?.connectionId) {
      setNotification({ message: 'Not connected to server', type: 'error' });
      return;
    }

    try {
      // Show save dialog
      const result = await window.electronAPI.showSaveDialog({
        title: 'Save File',
        defaultPath: file.name,
        filters: [
          { name: 'All Files', extensions: ['*'] }
        ]
      });

      if (result.canceled) return;

      if (window.electronAPI && window.electronAPI.ssh && window.electronAPI.ssh.downloadFile) {
        const downloadResult = await window.electronAPI.ssh.downloadFile(activeSession.connectionId, file.path, result.filePath);
        if (downloadResult.success) {
          setNotification({ message: `Downloaded ${file.name}`, type: 'success' });
          addTerminalLog('sftp-download', `Downloaded: ${file.name} (${file.size} bytes)`);
        } else {
          setNotification({ message: `Download failed: ${downloadResult.error}`, type: 'error' });
          addTerminalLog('sftp-error', `Download failed: ${downloadResult.error}`);
        }
      }
    } catch (error) {
      console.error('SFTP download error:', error);
      setNotification({ message: 'Download failed', type: 'error' });
    }
  };

  const uploadFile = async () => {
    if (!isConnected || !activeSession?.connectionId) {
      setNotification({ message: 'Not connected to server', type: 'error' });
      return;
    }

    try {
      // Show open dialog
      const result = await window.electronAPI.showOpenDialog({
        title: 'Select File to Upload',
        properties: ['openFile']
      });

      if (result.canceled || result.filePaths.length === 0) return;

      const localPath = result.filePaths[0];
      const fileName = localPath.split(/[/\\]/).pop();
      const remotePathUpload = `${remotePath}/${fileName}`;

      if (window.electronAPI && window.electronAPI.ssh && window.electronAPI.ssh.uploadFile) {
        const uploadResult = await window.electronAPI.ssh.uploadFile(activeSession.connectionId, localPath, remotePathUpload);
        if (uploadResult.success) {
          setNotification({ message: `Uploaded ${fileName}`, type: 'success' });
          addTerminalLog('sftp-upload', `Uploaded: ${fileName}`);
          // Refresh file list
          loadSFTPFiles(remotePath);
        } else {
          setNotification({ message: `Upload failed: ${uploadResult.error}`, type: 'error' });
          addTerminalLog('sftp-error', `Upload failed: ${uploadResult.error}`);
        }
      }
    } catch (error) {
      console.error('SFTP upload error:', error);
      setNotification({ message: 'Upload failed', type: 'error' });
    }
  };

  const navigateToDirectory = (fileName: string) => {
    const newPath = remotePath === '/' ? `/${fileName}` : `${remotePath}/${fileName}`;
    loadSFTPFiles(newPath);
  };

  const goToParentDirectory = () => {
    const parentPath = remotePath.split('/').slice(0, -1).join('/') || '/';
    loadSFTPFiles(parentPath);
  };

  // Load SFTP files when terminal mode changes to SFTP
  useEffect(() => {
    if (terminalMode === 'sftp' && isConnected && activeSession?.connectionId) {
      // Start in user's home directory instead of root
      const homeDir = activeSession?.config?.username ? `/home/${activeSession.config.username}` : '/home/work';
      loadSFTPFiles(homeDir);
    }
  }, [terminalMode, isConnected, activeSession?.connectionId]);


  // Main tabbed interface - Single return statement
  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#0f172a', color: 'white', display: 'flex' }}>
      <style>
        {`
          @keyframes blink {
            0%, 50% { opacity: 1; }
            51%, 100% { opacity: 0; }
          }
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
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
                  <div
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
                  </div>
                ))}
              </div>
            )}

            {/* Bookmarks Section */}
            <div style={{ marginTop: '1rem', paddingLeft: '1rem' }}>
              <div style={{
                fontSize: '10px',
                fontWeight: 'bold',
                color: '#94a3b8',
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
                marginBottom: '0.5rem'
              }}>
                Bookmarks ({bookmarks.length})
              </div>

              {bookmarks.length === 0 ? (
                <div style={{ color: '#64748b', fontSize: '12px' }}>No bookmarks yet</div>
              ) : (
                bookmarks.map((bm) => (
                  <div
                    key={bm.id}
                    onClick={() => goToBookmark(bm)}
                    style={{
                      width: '100%',
                      padding: '10px 16px',
                      backgroundColor: 'transparent',
                      color: '#cbd5e1',
                      border: 'none',
                      borderLeft: '3px solid transparent',
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
                      opacity: 0.9
                    }}
                  >
                    <span>{bm.type === 'server' ? '🖥️' : '📁'}</span>
                    <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                      <span style={{ fontSize: '11px', fontWeight: '500', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {bm.label}
                      </span>
                      <span style={{ fontSize: '9px', opacity: 0.7, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {bm.type === 'server'
                          ? `${bm.server?.username || ''}${bm.server?.username ? '@' : ''}${bm.server?.host}:${bm.server?.port}`
                          : `${bm.server?.host}:${bm.server?.port} ${bm.path}`}
                      </span>
                    </div>
                    <button
                      onClick={(e) => { e.stopPropagation(); removeBookmark(bm.id); }}
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
                      title="Remove bookmark"
                      onMouseEnter={(e) => e.currentTarget.style.color = '#ef4444'}
                      onMouseLeave={(e) => e.currentTarget.style.color = '#94a3b8'}
                    >
                      ✕
                    </button>
                  </div>
                ))
              )}
            </div>
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
                      onChange={(e) => {
                        const val = e.target.value;
                        setConfig(prev => ({ ...prev, profileName: val }));
                        // Disable auto mode when user types a custom name; re-enable if cleared
                        setIsProfileNameAuto(val.trim() === '');
                      }}
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

                    <button
                      onClick={addServerBookmark}
                      style={{
                        padding: '0.75rem 0.75rem',
                        backgroundColor: '#f59e0b',
                        color: '#111827',
                        border: 'none',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        fontSize: '14px',
                        fontWeight: 600
                      }}
                      title="Bookmark this server"
                    >
                      ⭐ Bookmark Server
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
                <div style={{ backgroundColor: '#000000', borderRadius: '8px', border: '1px solid #1e40af', overflow: 'hidden' }}>
                  {/* Traditional Terminal Interface */}
                  <div
                    className="powershell-scrollbar"
                    style={{
                      height: '600px',
                      overflowY: 'auto',
                      padding: '1rem',
                      fontFamily: 'Consolas, Monaco, "Courier New", monospace',
                      fontSize: '14px',
                      lineHeight: '1.4',
                      backgroundColor: '#000000',
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
                  {/* SFTP Browser Header */}
                  <div style={{ padding: '0.75rem', borderBottom: '1px solid #334155' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                      <h3 style={{ margin: 0, color: '#f1f5f9' }}>SFTP File Browser</h3>
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <button
                          onClick={uploadFile}
                          style={{
                            padding: '0.25rem 0.5rem',
                            backgroundColor: '#10b981',
                            color: 'white',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            fontSize: '0.8rem'
                          }}
                        >
                          📤 Upload
                        </button>
                        <button
                          onClick={() => loadSFTPFiles(remotePath)}
                          style={{
                            padding: '0.25rem 0.5rem',
                            backgroundColor: '#64748b',
                            color: 'white',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            fontSize: '0.8rem'
                          }}
                        >
                          🔄 Refresh
                        </button>
                        <button
                          onClick={addDirectoryBookmark}
                          style={{
                            padding: '0.25rem 0.5rem',
                            backgroundColor: '#f59e0b',
                            color: '#111827',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            fontSize: '0.8rem',
                            fontWeight: 600
                          }}
                          title="Bookmark current directory"
                        >
                          ⭐ Bookmark Directory
                        </button>
                      </div>
                    </div>
                    <p style={{ margin: '0', color: '#94a3b8', fontSize: '0.9rem' }}>
                      Remote: {config.username}@{config.host}:{config.port}
                    </p>
                  </div>

                  {/* Path Navigation */}
                  <div style={{ padding: '0.5rem 0.75rem', borderBottom: '1px solid #334155', backgroundColor: '#0f172a' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <button
                        onClick={goToParentDirectory}
                        disabled={remotePath === '/'}
                        style={{
                          padding: '0.25rem',
                          backgroundColor: remotePath === '/' ? '#374151' : '#3b82f6',
                          color: 'white',
                          border: 'none',
                          borderRadius: '4px',
                          cursor: remotePath === '/' ? 'not-allowed' : 'pointer',
                          fontSize: '0.8rem'
                        }}
                      >
                        ⬅️
                      </button>
                      <span style={{ color: '#f1f5f9', fontSize: '0.9rem', fontFamily: 'monospace' }}>
                        {remotePath}
                      </span>
                    </div>
                  </div>

                  {/* Search and Filter Bar */}
                  <div style={{
                    padding: '1rem',
                    backgroundColor: '#1e293b',
                    borderRadius: '8px',
                    marginBottom: '1rem',
                    border: '1px solid #334155'
                  }}>
                    <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem' }}>
                      <input
                        type="text"
                        placeholder="Search files and folders... (supports * and ? wildcards)"
                        value={searchQuery}
                        onChange={(e) => {
                          const newValue = e.target.value;
                          console.log('🔍 Search input changed:', { oldValue: searchQuery, newValue });
                          setSearchQuery(newValue);
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            console.log('🔍 Enter pressed, triggering search for:', searchQuery);
                          }
                        }}
                        style={{
                          flex: 1,
                          padding: '0.5rem',
                          backgroundColor: '#0f172a',
                          border: '1px solid #334155',
                          borderRadius: '4px',
                          color: '#f1f5f9',
                          fontSize: '0.9rem'
                        }}
                      />
                      <button
                        onClick={() => setUseRegex(!useRegex)}
                        style={{
                          padding: '0.5rem 1rem',
                          backgroundColor: useRegex ? '#3b82f6' : '#374151',
                          color: 'white',
                          border: 'none',
                          borderRadius: '4px',
                          cursor: 'pointer',
                          fontSize: '0.8rem',
                          whiteSpace: 'nowrap'
                        }}
                        title="Toggle regex search mode"
                      >
                        {useRegex ? '🔍 Regex' : '🔍 Text'}
                      </button>
                      <button
                        onClick={() => setUseRecursiveSearch(!useRecursiveSearch)}
                        style={{
                          padding: '0.5rem 1rem',
                          backgroundColor: useRecursiveSearch ? '#10b981' : '#374151',
                          color: 'white',
                          border: 'none',
                          borderRadius: '4px',
                          cursor: 'pointer',
                          fontSize: '0.8rem',
                          whiteSpace: 'nowrap'
                        }}
                        title="Toggle recursive search in subdirectories"
                      >
                        {useRecursiveSearch ? '🔄 Recursive' : '📁 Current Dir'}
                      </button>
                    </div>

                    <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                      <select
                        value={searchFilter}
                        onChange={(e) => setSearchFilter(e.target.value as 'all' | 'files' | 'directories')}
                        style={{
                          padding: '0.25rem 0.5rem',
                          backgroundColor: '#0f172a',
                          border: '1px solid #334155',
                          borderRadius: '4px',
                          color: '#f1f5f9',
                          fontSize: '0.8rem'
                        }}
                      >
                        <option value="all">All Types</option>
                        <option value="files">Files Only</option>
                        <option value="directories">Folders Only</option>
                      </select>

                      <select
                        value={sizeFilter}
                        onChange={(e) => setSizeFilter(e.target.value as 'all' | 'small' | 'medium' | 'large')}
                        style={{
                          padding: '0.25rem 0.5rem',
                          backgroundColor: '#0f172a',
                          border: '1px solid #334155',
                          borderRadius: '4px',
                          color: '#f1f5f9',
                          fontSize: '0.8rem'
                        }}
                      >
                        <option value="all">Any Size</option>
                        <option value="small">Small (&lt; 1MB)</option>
                        <option value="medium">Medium (1MB - 100MB)</option>
                        <option value="large">Large (&gt; 100MB)</option>
                      </select>

                      <select
                        value={dateFilter}
                        onChange={(e) => setDateFilter(e.target.value as 'all' | 'today' | 'week' | 'month')}
                        style={{
                          padding: '0.25rem 0.5rem',
                          backgroundColor: '#0f172a',
                          border: '1px solid #334155',
                          borderRadius: '4px',
                          color: '#f1f5f9',
                          fontSize: '0.8rem'
                        }}
                      >
                        <option value="all">Any Date</option>
                        <option value="today">Today</option>
                        <option value="week">This Week</option>
                        <option value="month">This Month</option>
                      </select>

                      {(searchQuery || searchFilter !== 'all' || sizeFilter !== 'all' || dateFilter !== 'all') && (
                        <button
                          onClick={() => {
                            setSearchQuery('');
                            setSearchFilter('all');
                            setSizeFilter('all');
                            setDateFilter('all');
                            setUseRegex(false);
                          }}
                          style={{
                            padding: '0.25rem 0.5rem',
                            backgroundColor: '#dc2626',
                            color: 'white',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            fontSize: '0.8rem'
                          }}
                        >
                          Clear Filters
                        </button>
                      )}
                    </div>

                    {searchQuery && (
                      <div style={{
                        marginTop: '0.5rem',
                        fontSize: '0.8rem',
                        color: '#94a3b8'
                      }}>
                        {isSearching ? (
                          <span style={{ color: '#f59e0b' }}>
                            🔍 Searching for: "{searchQuery}"...
                          </span>
                        ) : (
                          <span>
                            Found {filteredFiles.length} of {remoteFiles.length} items for: "{searchQuery}"
                          </span>
                        )}
                        {useRegex && (
                          <span style={{ marginLeft: '1rem', color: '#3b82f6' }}>
                            Using regex pattern
                          </span>
                        )}
                        {useRecursiveSearch && (
                          <span style={{ marginLeft: '1rem', color: '#10b981' }}>
                            Recursive search enabled
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Loading Indicator */}
                  {isSearching && (
                    <div style={{
                      padding: '0.5rem',
                      backgroundColor: '#1e293b',
                      border: '1px solid #334155',
                      borderRadius: '4px',
                      color: '#f1f5f9',
                      fontSize: '0.9rem',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                      marginBottom: '1rem'
                    }}>
                      <div style={{
                        width: '16px',
                        height: '16px',
                        border: '2px solid #3b82f6',
                        borderTop: '2px solid transparent',
                        borderRadius: '50%',
                        animation: 'spin 1s linear infinite'
                      }}></div>
                      Searching {useRecursiveSearch ? 'recursively through subdirectories' : 'in current directory'}...
                    </div>
                  )}

                  {/* File List */}
                  <div style={{ maxHeight: '600px', overflowY: 'auto' }}>
                    {remoteFiles.length === 0 ? (
                      <div style={{ padding: '2rem', textAlign: 'center', color: '#94a3b8' }}>
                        {isConnected ? 'No files in this directory' : 'Connect to a server to browse files'}
                      </div>
                    ) : filteredFiles.length === 0 && searchQuery.trim() ? (
                      <div style={{ padding: '2rem', textAlign: 'center', color: '#94a3b8' }}>
                        No files match your search criteria: "{searchQuery}"
                      </div>
                    ) : (
                      <div style={{ display: 'grid', gap: '0.25rem', padding: '0.5rem' }}>
                        {filteredFiles.map((file, index) => (
                          <div
                            key={index}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              padding: '0.5rem',
                              backgroundColor: '#0f172a',
                              borderRadius: '4px',
                              border: '1px solid #334155',
                              cursor: file.type === 'directory' ? 'pointer' : 'default'
                            }}
                            onClick={() => file.type === 'directory' && navigateToDirectory(file.path && useRecursiveSearch ? file.path : file.name)}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flex: 1 }}>
                              <span style={{ fontSize: '1rem' }}>
                                {file.type === 'directory' ? '📁' : '📄'}
                              </span>
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{
                                  color: '#f1f5f9',
                                  fontSize: '0.9rem',
                                  whiteSpace: 'nowrap',
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis'
                                }}>
                                  {file.path && useRecursiveSearch ? file.path : file.name}
                                </div>
                                {file.path && useRecursiveSearch && (
                                  <div style={{
                                    color: '#64748b',
                                    fontSize: '0.7rem',
                                    whiteSpace: 'nowrap',
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                    marginTop: '0.1rem'
                                  }}>
                                    {file.name}
                                  </div>
                                )}
                                <div style={{
                                  color: '#94a3b8',
                                  fontSize: '0.7rem',
                                  display: 'flex',
                                  gap: '1rem'
                                }}>
                                  <span>{file.type === 'directory' ? 'Directory' : `${(file.size / 1024).toFixed(1)} KB`}</span>
                                  <span>{file.modified.toLocaleDateString()}</span>
                                </div>
                              </div>
                            </div>
                            {file.type === 'file' && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  downloadFile(file);
                                }}
                                style={{
                                  padding: '0.25rem 0.5rem',
                                  backgroundColor: '#3b82f6',
                                  color: 'white',
                                  border: 'none',
                                  borderRadius: '4px',
                                  cursor: 'pointer',
                                  fontSize: '0.8rem'
                                }}
                              >
                                ⬇️ Download
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
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
