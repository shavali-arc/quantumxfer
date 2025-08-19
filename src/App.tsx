import { useState, useEffect } from 'react';

interface SSHConfig {
  host: string;
  port: number;
  username: string;
  password: string;
  profileName?: string;
}

interface ConnectionProfile {
  id: string;
  name: string;
  host: string;
  port: number;
  username: string;
  lastUsed: Date;
  logsDirectory?: string;
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
    profileName: ''
  });
  
  // Check if this is a terminal tab
  const [isTerminalTab, setIsTerminalTab] = useState(false);
  
  // Notification state
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'info' | 'warning' } | null>(null);

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

  // SFTP state
  const [showSFTP, setShowSFTP] = useState(false);
  const [remoteFiles, setRemoteFiles] = useState<SFTPFile[]>([]);
  const [remotePath, setRemotePath] = useState('/');
  const [transfers, setTransfers] = useState<TransferItem[]>([]);
  const [selectedFiles, setSelectedFiles] = useState<SFTPFile[]>([]);

  // Load saved data on component mount
  useEffect(() => {
    // Check if this is a terminal tab
    if (window.location.hash === '#terminal') {
      const terminalData = localStorage.getItem('quantumxfer-terminal-data');
      if (terminalData) {
        try {
          const data = JSON.parse(terminalData);
          setConfig(data.config);
          setSessionId(data.sessionId);
          setIsConnected(true);
          setIsTerminalTab(true);
          
          // Set document title for terminal tab
          document.title = `QuantumXfer Terminal - ${data.config.username}@${data.config.host}`;
          
          // Load existing logs and profiles
          loadProfiles();
          loadSession();
          loadDirectoryPreference();
          
          return; // Skip normal loading for terminal tab
        } catch (error) {
          console.error('Error loading terminal data:', error);
        }
      }
    }
    
    loadProfiles();
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

  // Load SFTP files when SFTP panel is opened
  useEffect(() => {
    if (showSFTP && isConnected) {
      loadRemoteDirectory(remotePath);
    }
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

  const loadProfiles = () => {
    try {
      const saved = localStorage.getItem('quantumxfer-profiles');
      if (saved) {
        const parsedProfiles = JSON.parse(saved);
        // Convert lastUsed string back to Date object
        const profilesWithDates = parsedProfiles.map((profile: any) => ({
          ...profile,
          lastUsed: new Date(profile.lastUsed)
        }));
        setProfiles(profilesWithDates);
      }
    } catch (error) {
      console.error('Error loading profiles:', error);
    }
  };

  const saveProfiles = (newProfiles: ConnectionProfile[]) => {
    try {
      localStorage.setItem('quantumxfer-profiles', JSON.stringify(newProfiles));
      setProfiles(newProfiles);
    } catch (error) {
      console.error('Error saving profiles:', error);
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
        // Don't auto-load session data unless it's recent (within 1 hour)
        if (Date.now() - sessionData.timestamp < 3600000) {
          setConfig(sessionData.config);
          setSessionId(sessionData.sessionId);
        }
      }
    } catch (error) {
      console.error('Error loading session:', error);
    }
  };

  const saveDirectoryPreference = (dir: string) => {
    setCurrentDirectory(dir);
    localStorage.setItem('quantumxfer-directory', dir);
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

  const handleConnect = () => {
    if (config.host && config.username && config.password) {
      setIsConnected(true);
      const newSessionId = `session-${Date.now()}`;
      setSessionId(newSessionId);
      
      // Save as profile if profile name is provided and doesn't already exist
      if (config.profileName && config.profileName.trim()) {
        // Check if a profile with the same host, username, and port already exists
        const existingProfile = profiles.find(profile => 
          profile.host === config.host && 
          profile.username === config.username && 
          profile.port === config.port
        );
        
        if (existingProfile) {
          // Update the existing profile's last used date and name if different
          const updatedProfiles = profiles.map(profile => 
            profile.id === existingProfile.id 
              ? { ...profile, name: config.profileName!, lastUsed: new Date() }
              : profile
          );
          saveProfiles(updatedProfiles);
          addTerminalLog('profile-update', `Updated existing profile: ${config.profileName}`);
          setNotification({ message: `Profile "${config.profileName}" updated (connection already exists)`, type: 'info' });
        } else {
          // Create new profile
          const newProfile: ConnectionProfile = {
            id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            name: config.profileName,
            host: config.host,
            port: config.port,
            username: config.username,
            lastUsed: new Date(),
            logsDirectory: selectedLogsDirectory || undefined
          };
          const updatedProfiles = [...profiles, newProfile];
          saveProfiles(updatedProfiles);
          addTerminalLog('profile-create', `Created new profile: ${config.profileName}`);
          setNotification({ message: `New profile "${config.profileName}" created successfully`, type: 'success' });
        }
      }
      
      // Add connection log
      addTerminalLog('ssh-connect', `Connected to ${config.username}@${config.host}:${config.port}`);
      saveSession();
      
      // Open terminal in new tab
      const terminalData = {
        config,
        sessionId: newSessionId,
        timestamp: Date.now()
      };
      
      // Store connection data for the new tab
      localStorage.setItem('quantumxfer-terminal-data', JSON.stringify(terminalData));
      
      // Open new tab with terminal interface
      const newTab = window.open(`${window.location.origin}${window.location.pathname}#terminal`, '_blank');
      
      if (newTab) {
        setNotification({ message: 'Terminal opened in new tab', type: 'success' });
      } else {
        setNotification({ message: 'Please allow popups to open terminal in new tab', type: 'warning' });
      }
    }
  };

  const handleDisconnect = () => {
    addTerminalLog('ssh-disconnect', 'Connection closed');
    setIsConnected(false);
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
  };

  const executeCommand = () => {
    if (currentCommand.trim()) {
      const cmd = currentCommand.trim();
      
      // Add to command history
      setCommandHistory(prev => [...prev, cmd]);
      setHistoryIndex(-1);
      
      let output = '';
      
      // Simple command simulation
      if (cmd.toLowerCase() === 'help' || cmd.toLowerCase() === 'get-help') {
        output = `Available commands:
  ls, dir, Get-ChildItem - List directory contents
  cd, Set-Location       - Change directory
  pwd, Get-Location      - Show current directory
  Get-Date              - Show current date/time
  Get-Process           - List running processes
  Test-Connection       - Ping a host
  whoami                - Show current user
  clear, cls            - Clear terminal
  exit, logout          - Disconnect session`;
      } else if (cmd.toLowerCase() === 'get-date') {
        output = new Date().toString();
      } else if (cmd.toLowerCase() === 'ls' || cmd.toLowerCase() === 'dir' || cmd.toLowerCase() === 'get-childitem') {
        output = `Directory: ${currentDirectory}

Mode                LastWriteTime         Length Name
----                -------------         ------ ----
d-----        8/20/2025  12:00 AM                Documents
d-----        8/20/2025  12:00 AM                Downloads
d-----        8/20/2025  12:00 AM                Pictures
-a----        8/20/2025  12:00 AM           1024 config.txt
-a----        8/20/2025  12:00 AM           2048 readme.md
-a----        8/20/2025  12:00 AM            512 script.ps1`;
      } else if (cmd.toLowerCase().startsWith('cd ') || cmd.toLowerCase().startsWith('set-location ')) {
        const newDir = cmd.split(' ').slice(1).join(' ');
        saveDirectoryPreference(newDir);
        output = `Changed directory to: ${newDir}`;
      } else if (cmd.toLowerCase() === 'pwd' || cmd.toLowerCase() === 'get-location') {
        output = `Path
----
${currentDirectory}`;
      } else if (cmd.toLowerCase() === 'clear' || cmd.toLowerCase() === 'cls') {
        setTerminalLogs([]);
        setCurrentCommand('');
        return;
      } else if (cmd.toLowerCase() === 'exit' || cmd.toLowerCase() === 'logout') {
        output = 'Disconnecting...';
        setTimeout(() => handleDisconnect(), 1000);
      } else {
        output = `'${cmd}' is not recognized as an internal or external command.
Type 'help' to see available commands.`;
      }
      
      addTerminalLog(cmd, output);
      setCurrentCommand('');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (commandHistory.length > 0 && historyIndex < commandHistory.length - 1) {
        const newIndex = historyIndex + 1;
        setHistoryIndex(newIndex);
        setCurrentCommand(commandHistory[commandHistory.length - 1 - newIndex]);
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (historyIndex > 0) {
        const newIndex = historyIndex - 1;
        setHistoryIndex(newIndex);
        setCurrentCommand(commandHistory[commandHistory.length - 1 - newIndex]);
      } else if (historyIndex === 0) {
        setHistoryIndex(-1);
        setCurrentCommand('');
      }
    }
  };

  const loadProfile = (profile: ConnectionProfile) => {
    setConfig(prev => ({
      ...prev,
      host: profile.host,
      port: profile.port,
      username: profile.username,
      profileName: profile.name
    }));
    
    // Load logs directory from profile if available
    if (profile.logsDirectory) {
      setSelectedLogsDirectory(profile.logsDirectory);
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
      // Check if the File System Access API is available
      if ('showDirectoryPicker' in window) {
        const dirHandle = await (window as any).showDirectoryPicker();
        const dirPath = dirHandle.name;
        saveLogsDirectoryPreference(dirPath);
        setNotification({ message: `Logs directory set to: ${dirPath}`, type: 'success' });
      } else {
        // Fallback for browsers that don't support File System Access API
        setNotification({ message: 'Directory selection not supported in this browser. Logs will be downloaded instead.', type: 'warning' });
      }
    } catch (error) {
      if ((error as any).name !== 'AbortError') {
        console.error('Error selecting directory:', error);
        setNotification({ message: 'Error selecting directory. Logs will be downloaded instead.', type: 'warning' });
      }
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
        const fileHandles = await (window as any).showOpenFilePicker({ multiple: true });
        
        for (const fileHandle of fileHandles) {
          const file = await fileHandle.getFile();
          filesToUpload.push(file);
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
    } catch (error) {
      if ((error as any).name !== 'AbortError') {
        console.error('Error selecting files:', error);
        setNotification({ message: 'Error selecting files for upload', type: 'warning' });
      }
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
                      placeholder=""
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
                setNotification({ message: `Logs directory configured: ${selectedLogsDirectory}. Downloaded logs can be manually moved there.`, type: 'info' });
              }
              downloadLogs();
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
            title={selectedLogsDirectory ? `Download logs (configured to save in ${selectedLogsDirectory})` : 'Download logs as file'}
          >
            {selectedLogsDirectory ? '� Download Logs' : '📥 Download Session Logs'}
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
          <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
            <h1 style={{ fontSize: '3rem', fontWeight: 'bold', marginBottom: '0.5rem', background: 'linear-gradient(45deg, #06b6d4, #3b82f6)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              QuantumXfer
            </h1>
            <p style={{ fontSize: '1.2rem', color: '#94a3b8' }}>
              Secure SSH/SFTP Client with Terminal Logging & Session Management
            </p>
          </div>

          {/* Connection Success */}
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
              Terminal opened in new tab. You can continue using this window to manage connections.
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
                  setNotification({ message: `Logs directory configured: ${selectedLogsDirectory}. Downloaded logs can be manually moved there.`, type: 'info' });
                }
                downloadLogs();
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
              title={selectedLogsDirectory ? `Download logs (configured to save in ${selectedLogsDirectory})` : 'Download logs as file'}
            >
              {selectedLogsDirectory ? '� Download Logs' : '📥 Download Logs'}
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
    <div style={{ minHeight: '100vh', backgroundColor: '#0f172a', color: 'white', padding: '2rem' }}>
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
              Show Profiles ({profiles.length})
            </button>
          </div>

          {showProfiles && (
            <div style={{ backgroundColor: '#0f172a', padding: '1rem', borderRadius: '6px' }}>
              {profiles.length === 0 ? (
                <p style={{ color: '#94a3b8', textAlign: 'center', margin: 0 }}>No saved profiles</p>
              ) : (
                profiles.map(profile => (
                  <div key={profile.id} style={{ 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    alignItems: 'center', 
                    padding: '0.75rem', 
                    backgroundColor: '#1e293b', 
                    borderRadius: '4px', 
                    marginBottom: '0.5rem' 
                  }}>
                    <div>
                      <div style={{ fontWeight: '500' }}>{profile.name}</div>
                      <div style={{ fontSize: '0.85rem', color: '#94a3b8' }}>
                        {profile.username}@{profile.host}:{profile.port} • Last used: {new Date(profile.lastUsed).toLocaleDateString()}
                      </div>
                      {profile.logsDirectory && (
                        <div style={{ fontSize: '0.75rem', color: '#8b5cf6', marginTop: '0.25rem' }}>
                          📁 Logs: {profile.logsDirectory}
                        </div>
                      )}
                    </div>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <button
                        onClick={() => loadProfile(profile)}
                        style={{
                          padding: '0.5rem',
                          backgroundColor: '#10b981',
                          color: 'white',
                          border: 'none',
                          borderRadius: '4px',
                          cursor: 'pointer',
                          fontSize: '0.8rem'
                        }}
                      >
                        Load
                      </button>
                      <button
                        onClick={() => deleteProfile(profile.id)}
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
                        Delete
                      </button>
                    </div>
                  </div>
                ))
              )}
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
                📁 Select Directory
              </button>
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
        <div style={{ backgroundColor: '#1e293b', padding: '2rem', borderRadius: '8px' }}>
          <h2 style={{ margin: '0 0 1.5rem 0', fontSize: '1.5rem' }}>SSH Connection</h2>
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.9rem', marginBottom: '0.5rem' }}>Host *</label>
              <input
                type="text"
                value={config.host}
                onChange={(e) => setConfig(prev => ({ ...prev, host: e.target.value }))}
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
                onChange={(e) => setConfig(prev => ({ ...prev, username: e.target.value }))}
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
              <label style={{ display: 'block', fontSize: '0.9rem', marginBottom: '0.5rem' }}>Password *</label>
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
                📁 Select Directory
              </button>
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
            disabled={!config.host || !config.username || !config.password}
            style={{
              width: '100%',
              padding: '1rem 1.5rem',
              background: !config.host || !config.username || !config.password ? '#374151' : 'linear-gradient(45deg, #06b6d4, #3b82f6)',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              fontSize: '1.1rem',
              fontWeight: '600',
              cursor: !config.host || !config.username || !config.password ? 'not-allowed' : 'pointer',
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
      </div>
    </div>
  );
}

export default App;