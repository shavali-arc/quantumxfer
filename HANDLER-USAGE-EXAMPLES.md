# QuantumXfer - Handler Integration Examples

**Version:** 1.0  
**Date:** December 14, 2025  
**Status:** Phase 5 - Implementation Examples  
**Branch:** `feature/phase5-implementation`

---

## Table of Contents

1. [SSH Connection Handler](#ssh-connection-handler)
2. [SSH Command Execution Handler](#ssh-command-execution-handler)
3. [SSH File Operations](#ssh-file-operations)
4. [Bookmark Management](#bookmark-management)
5. [Profile Management](#profile-management)
6. [Error Handling Examples](#error-handling-examples)
7. [Advanced Patterns](#advanced-patterns)

---

## SSH Connection Handler

### Example 1: Basic Connection

**Renderer Process (React/TypeScript)**

```typescript
// src/api/ssh-client.ts

interface SSHConnection {
  host: string;
  port: number;
  username: string;
  password: string;
}

async function connectToServer(config: SSHConnection) {
  try {
    const response = await window.api.ssh.connect(config);

    if (!response.success) {
      throw new Error(response.error);
    }

    console.log('Connected! Connection ID:', response.data.connectionId);
    return response.data.connectionId;
  } catch (error) {
    console.error('Connection failed:', error);
    throw error;
  }
}

// Usage
async function handleConnect(formData: any) {
  try {
    const connectionId = await connectToServer({
      host: formData.hostname,
      port: parseInt(formData.port),
      username: formData.username,
      password: formData.password
    });

    setConnected(true);
    setConnectionId(connectionId);
  } catch (error) {
    setError(`Failed to connect: ${error.message}`);
  }
}
```

**Main Process (IPC Handler)**

```javascript
// electron/main.js

const { ipcMain } = require('electron');
const { HandlerValidator } = require('./validators/middleware');
const SSHService = require('./ssh-service');

// Register handler with validation
ipcMain.handle('ssh-connect', HandlerValidator.createValidatedHandler(
  async (event, config) => {
    try {
      // Config is already validated and sanitized
      const connection = await SSHService.connect(config);

      return {
        success: true,
        data: {
          connectionId: connection.id,
          host: config.host,
          port: config.port,
          username: config.username
        }
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        code: 'CONNECTION_FAILED'
      };
    }
  },
  'validateConnection'  // Validation method
));
```

### Example 2: Connection with Key-Based Authentication

```typescript
// src/api/ssh-client.ts

interface SSHKeyConnection {
  host: string;
  port?: number;
  username: string;
  privateKey: string;
  passphrase?: string;
}

async function connectWithKey(config: SSHKeyConnection) {
  const fullConfig = {
    host: config.host,
    port: config.port || 22,
    username: config.username,
    privateKey: config.privateKey,
    passphrase: config.passphrase
  };

  const response = await window.api.ssh.connect(fullConfig);

  if (!response.success) {
    throw new Error(response.error);
  }

  return response.data.connectionId;
}

// Usage
async function handleKeyAuth(formData: any) {
  try {
    const keyContent = await fs.promises.readFile(formData.keyPath, 'utf-8');
    const connectionId = await connectWithKey({
      host: formData.hostname,
      port: parseInt(formData.port) || 22,
      username: formData.username,
      privateKey: keyContent,
      passphrase: formData.passphrase
    });

    setConnected(true);
    setConnectionId(connectionId);
  } catch (error) {
    setError(`Key auth failed: ${error.message}`);
  }
}
```

### Example 3: Connection with Options

```typescript
// src/api/ssh-client.ts

interface SSHAdvancedConnection extends SSHConnection {
  timeout?: number;
  retries?: number;
  algorithms?: {
    cipher?: string[];
    serverHostKey?: string[];
  };
}

async function connectWithOptions(config: SSHAdvancedConnection) {
  const fullConfig = {
    ...config,
    timeout: config.timeout || 30000,
    retries: config.retries || 3
  };

  const response = await window.api.ssh.connect(fullConfig);

  if (!response.success) {
    throw new Error(`${response.error} (Code: ${response.code})`);
  }

  return response.data;
}

// Usage with timeout and retries
const connectionId = await connectWithOptions({
  host: '192.168.1.100',
  port: 22,
  username: 'admin',
  password: 'password',
  timeout: 60000,    // 60 seconds
  retries: 5,        // Retry up to 5 times
  algorithms: {
    cipher: ['aes128-ctr', 'aes256-ctr']
  }
});
```

---

## SSH Command Execution Handler

### Example 1: Simple Command Execution

```typescript
// src/api/ssh-client.ts

async function executeCommand(connectionId: string, command: string) {
  try {
    const response = await window.api.ssh.executeCommand({
      connectionId,
      command
    });

    if (!response.success) {
      throw new Error(response.error);
    }

    console.log('Command output:', response.data.output);
    console.log('Exit code:', response.data.exitCode);

    return response.data;
  } catch (error) {
    console.error('Command execution failed:', error);
    throw error;
  }
}

// Usage
async function listDirectoryContents(connectionId: string) {
  const result = await executeCommand(connectionId, 'ls -la /home/user');
  return result.output.split('\n');
}
```

### Example 2: Command with Long Output Handling

```typescript
// src/api/ssh-client.ts

async function executeLongCommand(
  connectionId: string,
  command: string,
  onOutput?: (chunk: string) => void
) {
  try {
    const response = await window.api.ssh.executeCommand({
      connectionId,
      command,
      streaming: true  // Request streaming output
    });

    if (!response.success) {
      throw new Error(response.error);
    }

    if (onOutput && response.data.output) {
      onOutput(response.data.output);
    }

    return response.data;
  } catch (error) {
    console.error('Long command failed:', error);
    throw error;
  }
}

// Usage with progress callback
async function backupDatabase(connectionId: string) {
  const backupCommand = 'mysqldump -u root -p database > backup.sql';

  await executeLongCommand(connectionId, backupCommand, (output) => {
    console.log('Progress:', output);
    // Update UI with progress
  });
}
```

### Example 3: Multiple Commands in Sequence

```typescript
// src/api/ssh-client.ts

interface CommandSequence {
  commands: string[];
  stopOnError?: boolean;
  timeout?: number;
}

async function executeCommandSequence(
  connectionId: string,
  sequence: CommandSequence
) {
  const results = [];

  for (const command of sequence.commands) {
    try {
      const result = await executeCommand(connectionId, command);
      results.push({
        command,
        success: true,
        output: result.output,
        exitCode: result.exitCode
      });

      // Stop on error if configured
      if (sequence.stopOnError && result.exitCode !== 0) {
        break;
      }
    } catch (error) {
      results.push({
        command,
        success: false,
        error: error.message
      });

      if (sequence.stopOnError) {
        break;
      }
    }
  }

  return results;
}

// Usage
async function setupServer(connectionId: string) {
  const commands = [
    'apt-get update',
    'apt-get install -y nodejs npm',
    'npm install -g pm2',
    'mkdir -p /app'
  ];

  const results = await executeCommandSequence(connectionId, {
    commands,
    stopOnError: true,
    timeout: 300000  // 5 minutes
  });

  // Check which commands succeeded/failed
  const failed = results.filter(r => !r.success);
  if (failed.length > 0) {
    console.error('Some commands failed:', failed);
  }
}
```

### Example 4: Command with Shell Pipes

```typescript
// src/api/ssh-client.ts

async function executeShellCommand(connectionId: string) {
  // Complex command with pipes
  const command = `
    ps aux | grep node | awk '{print $2}' | xargs kill -9
  `;

  const result = await executeCommand(connectionId, command);
  console.log('Killed processes:', result.output);
  return result;
}

// Usage - Find and stop services
async function stopNodeServices(connectionId: string) {
  try {
    const result = await executeShellCommand(connectionId);
    console.log('Node services stopped');
  } catch (error) {
    console.error('Failed to stop services:', error);
  }
}
```

---

## SSH File Operations

### Example 1: List Directory

```typescript
// src/api/ssh-client.ts

interface DirectoryListing {
  path: string;
  recursive?: boolean;
  filter?: string;  // Regex pattern
}

async function listDirectory(
  connectionId: string,
  options: DirectoryListing
) {
  try {
    const response = await window.api.ssh.listDirectory({
      connectionId,
      path: options.path,
      recursive: options.recursive || false
    });

    if (!response.success) {
      throw new Error(response.error);
    }

    return response.data.files;
  } catch (error) {
    console.error('Directory listing failed:', error);
    throw error;
  }
}

// Usage
async function browseServerFiles(connectionId: string) {
  const files = await listDirectory(connectionId, {
    path: '/home/user',
    recursive: false
  });

  files.forEach(file => {
    console.log(`${file.name} (${file.size} bytes)`);
  });

  return files;
}
```

### Example 2: Download File

```typescript
// src/api/ssh-client.ts

interface FileDownloadOptions {
  connectionId: string;
  remotePath: string;
  localPath: string;
  onProgress?: (progress: number) => void;
}

async function downloadFile(options: FileDownloadOptions) {
  try {
    const response = await window.api.ssh.downloadFile({
      connectionId: options.connectionId,
      remotePath: options.remotePath,
      localPath: options.localPath
    });

    if (!response.success) {
      throw new Error(response.error);
    }

    console.log('Download complete:', {
      bytesTransferred: response.data.bytesTransferred,
      duration: response.data.duration
    });

    return response.data;
  } catch (error) {
    console.error('Download failed:', error);
    throw error;
  }
}

// Usage with progress tracking
async function downloadConfigFile(connectionId: string) {
  const result = await downloadFile({
    connectionId,
    remotePath: '/etc/config/app.conf',
    localPath: './app.conf',
    onProgress: (progress) => {
      console.log(`Download progress: ${progress}%`);
    }
  });

  console.log(`Downloaded ${result.bytesTransferred} bytes`);
  return result;
}
```

### Example 3: Upload File

```typescript
// src/api/ssh-client.ts

interface FileUploadOptions {
  connectionId: string;
  localPath: string;
  remotePath: string;
  permissions?: string;  // e.g., '755'
}

async function uploadFile(options: FileUploadOptions) {
  try {
    const response = await window.api.ssh.uploadFile({
      connectionId: options.connectionId,
      localPath: options.localPath,
      remotePath: options.remotePath,
      permissions: options.permissions
    });

    if (!response.success) {
      throw new Error(response.error);
    }

    return response.data;
  } catch (error) {
    console.error('Upload failed:', error);
    throw error;
  }
}

// Usage
async function deployApplication(connectionId: string) {
  const files = [
    {
      localPath: './dist/app.js',
      remotePath: '/app/app.js',
      permissions: '755'
    },
    {
      localPath: './config/settings.json',
      remotePath: '/app/config/settings.json',
      permissions: '644'
    }
  ];

  for (const file of files) {
    const result = await uploadFile({
      connectionId,
      ...file
    });

    console.log(`Uploaded ${file.remotePath}`);
  }
}
```

### Example 4: File Verification

```typescript
// src/api/ssh-client.ts

async function verifyFileIntegrity(
  connectionId: string,
  localPath: string,
  remotePath: string
) {
  // Get local file checksum
  const localChecksum = await computeChecksum(localPath);

  // Compute remote file checksum
  const checksumResult = await executeCommand(
    connectionId,
    `sha256sum "${remotePath}" | cut -d' ' -f1`
  );

  const remoteChecksum = checksumResult.output.trim();

  const isValid = localChecksum === remoteChecksum;

  return {
    isValid,
    localChecksum,
    remoteChecksum,
    file: remotePath
  };
}

// Usage after upload
async function uploadAndVerify(connectionId: string) {
  await uploadFile({
    connectionId,
    localPath: './dist/app.js',
    remotePath: '/app/app.js'
  });

  const verification = await verifyFileIntegrity(
    connectionId,
    './dist/app.js',
    '/app/app.js'
  );

  if (!verification.isValid) {
    throw new Error('File verification failed!');
  }

  console.log('File verified successfully');
}
```

---

## Bookmark Management

### Example 1: Add Bookmark

```typescript
// src/api/bookmarks.ts

interface Bookmark {
  name: string;
  host: string;
  port: number;
  username: string;
  description?: string;
  tags?: string[];
}

async function addBookmark(bookmark: Bookmark) {
  try {
    const response = await window.api.bookmarks.add({
      name: bookmark.name,
      host: bookmark.host,
      port: bookmark.port,
      username: bookmark.username,
      description: bookmark.description,
      tags: bookmark.tags || []
    });

    if (!response.success) {
      throw new Error(response.error);
    }

    console.log('Bookmark created:', response.data.id);
    return response.data.id;
  } catch (error) {
    console.error('Failed to add bookmark:', error);
    throw error;
  }
}

// Usage
async function saveServerBookmark(formData: any) {
  const bookmarkId = await addBookmark({
    name: formData.serverName,
    host: formData.hostname,
    port: parseInt(formData.port),
    username: formData.username,
    description: 'Production database server',
    tags: ['production', 'database']
  });

  console.log('Saved bookmark:', bookmarkId);
  return bookmarkId;
}
```

### Example 2: List Bookmarks

```typescript
// src/api/bookmarks.ts

async function getBookmarks() {
  try {
    const response = await window.api.bookmarks.list();

    if (!response.success) {
      throw new Error(response.error);
    }

    return response.data.bookmarks;
  } catch (error) {
    console.error('Failed to load bookmarks:', error);
    throw error;
  }
}

// Usage
async function populateBookmarkList() {
  const bookmarks = await getBookmarks();

  return bookmarks
    .sort((a, b) => a.name.localeCompare(b.name))
    .map(bookmark => ({
      label: bookmark.name,
      value: bookmark.id,
      description: `${bookmark.host}:${bookmark.port} (${bookmark.username})`
    }));
}
```

### Example 3: Quick Connect from Bookmark

```typescript
// src/api/ssh-client.ts

async function quickConnectToBookmark(bookmarkId: string) {
  try {
    // Get bookmark details
    const bookmarks = await window.api.bookmarks.list();
    const bookmark = bookmarks.data.bookmarks.find(b => b.id === bookmarkId);

    if (!bookmark) {
      throw new Error('Bookmark not found');
    }

    // Connect using bookmark data
    const response = await window.api.ssh.connect({
      host: bookmark.host,
      port: bookmark.port,
      username: bookmark.username,
      // Note: Password should be retrieved from secure storage
      password: await getStoredPassword(bookmarkId)
    });

    if (!response.success) {
      throw new Error(response.error);
    }

    return response.data.connectionId;
  } catch (error) {
    console.error('Quick connect failed:', error);
    throw error;
  }
}

// Usage
async function handleQuickConnect(bookmarkId: string) {
  try {
    const connectionId = await quickConnectToBookmark(bookmarkId);
    setConnected(true);
    setConnectionId(connectionId);
  } catch (error) {
    setError(`Quick connect failed: ${error.message}`);
  }
}
```

### Example 4: Remove Bookmark

```typescript
// src/api/bookmarks.ts

async function removeBookmark(bookmarkId: string) {
  try {
    const response = await window.api.bookmarks.remove({
      id: bookmarkId
    });

    if (!response.success) {
      throw new Error(response.error);
    }

    return response.data;
  } catch (error) {
    console.error('Failed to remove bookmark:', error);
    throw error;
  }
}

// Usage
async function deleteBookmark(bookmarkId: string) {
  const confirmed = await confirmDelete('Delete this bookmark?');

  if (!confirmed) return;

  try {
    await removeBookmark(bookmarkId);
    console.log('Bookmark deleted');
    // Refresh bookmark list
    await refreshBookmarkList();
  } catch (error) {
    setError(`Failed to delete: ${error.message}`);
  }
}
```

---

## Profile Management

### Example 1: Save Profile

```typescript
// src/api/profiles.ts

interface Profile {
  name: string;
  connections: Array<{
    id: string;
    host: string;
    port: number;
    username: string;
  }>;
  settings: {
    defaultTimeout?: number;
    retries?: number;
    theme?: string;
  };
}

async function saveProfile(profile: Profile) {
  try {
    const response = await window.api.profiles.save({
      name: profile.name,
      connections: profile.connections,
      settings: profile.settings
    });

    if (!response.success) {
      throw new Error(response.error);
    }

    return response.data.profileId;
  } catch (error) {
    console.error('Failed to save profile:', error);
    throw error;
  }
}

// Usage
async function createProductionProfile() {
  const profileId = await saveProfile({
    name: 'Production Environment',
    connections: [
      {
        id: 'db-1',
        host: '10.0.1.100',
        port: 22,
        username: 'admin'
      },
      {
        id: 'web-1',
        host: '10.0.2.100',
        port: 22,
        username: 'admin'
      }
    ],
    settings: {
      defaultTimeout: 60000,
      retries: 3,
      theme: 'dark'
    }
  });

  console.log('Profile saved:', profileId);
  return profileId;
}
```

### Example 2: Load Profile

```typescript
// src/api/profiles.ts

async function loadProfile(profileId?: string) {
  try {
    const response = await window.api.profiles.load({
      profileId
    });

    if (!response.success) {
      throw new Error(response.error);
    }

    return response.data;
  } catch (error) {
    console.error('Failed to load profile:', error);
    throw error;
  }
}

// Usage
async function restoreSession(profileId: string) {
  const profile = await loadProfile(profileId);

  // Restore connections
  const connections = [];
  for (const conn of profile.connections) {
    try {
      const connId = await quickConnectToBookmark(conn.id);
      connections.push({
        ...conn,
        connectionId: connId
      });
    } catch (error) {
      console.error(`Failed to restore connection ${conn.id}:`, error);
    }
  }

  // Apply settings
  applySettings(profile.settings);

  return {
    profile,
    connections
  };
}
```

---

## Error Handling Examples

### Example 1: Comprehensive Error Handling

```typescript
// src/utils/error-handler.ts

async function handleSSHOperation(
  operation: () => Promise<any>,
  operationName: string
) {
  try {
    return await operation();
  } catch (error: any) {
    // Handle validation errors
    if (error.code === 'VALIDATION_ERROR') {
      return {
        success: false,
        error: error.message,
        type: 'validation',
        details: error.details
      };
    }

    // Handle connection errors
    if (error.message.includes('ECONNREFUSED')) {
      return {
        success: false,
        error: 'Connection refused. Check host and port.',
        type: 'connection'
      };
    }

    // Handle authentication errors
    if (error.message.includes('authentication')) {
      return {
        success: false,
        error: 'Authentication failed. Check credentials.',
        type: 'authentication'
      };
    }

    // Handle timeout errors
    if (error.message.includes('timeout')) {
      return {
        success: false,
        error: 'Operation timed out. Try increasing timeout.',
        type: 'timeout'
      };
    }

    // Generic error
    return {
      success: false,
      error: error.message || 'Unknown error occurred',
      type: 'unknown'
    };
  }
}

// Usage
async function connectWithErrorHandling(config: any) {
  const result = await handleSSHOperation(
    () => window.api.ssh.connect(config),
    'SSH Connection'
  );

  if (!result.success) {
    switch (result.type) {
      case 'validation':
        showValidationError(result.details);
        break;
      case 'connection':
        showConnectionError();
        break;
      case 'authentication':
        showAuthenticationError();
        break;
      case 'timeout':
        showTimeoutError();
        break;
      default:
        showGenericError(result.error);
    }

    return null;
  }

  return result;
}
```

### Example 2: Retry Logic with Backoff

```typescript
// src/utils/retry-handler.ts

interface RetryOptions {
  maxRetries?: number;
  delayMs?: number;
  backoffMultiplier?: number;
}

async function retryOperation<T>(
  operation: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const maxRetries = options.maxRetries || 3;
  const initialDelay = options.delayMs || 1000;
  const backoffMultiplier = options.backoffMultiplier || 2;

  let lastError;
  let delay = initialDelay;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;

      if (attempt < maxRetries) {
        console.log(`Attempt ${attempt} failed. Retrying in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
        delay *= backoffMultiplier;
      }
    }
  }

  throw lastError;
}

// Usage
async function connectWithRetry(config: any) {
  return await retryOperation(
    () => window.api.ssh.connect(config),
    {
      maxRetries: 5,
      delayMs: 2000,
      backoffMultiplier: 1.5
    }
  );
}
```

### Example 3: Validation Error Details

```typescript
// src/utils/validation-error-handler.ts

function displayValidationError(error: any) {
  if (error.code !== 'VALIDATION_ERROR') {
    return;
  }

  const { field, received, expected } = error.details || {};

  return {
    title: 'Invalid Input',
    message: error.error,
    field,
    hint: `Expected ${expected}, but received ${received}`,
    suggestion: getInputSuggestion(field)
  };
}

function getInputSuggestion(field: string): string {
  const suggestions: Record<string, string> = {
    port: 'Port should be a number between 1 and 65535',
    host: 'Host should be a valid hostname or IP address',
    username: 'Username should be alphanumeric, 1-32 characters',
    password: 'Password is required and should be 1-255 characters',
    path: 'Path should be an absolute or relative file path'
  };

  return suggestions[field] || 'Check the input format and try again';
}

// Usage
async function submitConnectionForm(formData: any) {
  const response = await window.api.ssh.connect(formData);

  if (!response.success) {
    const errorInfo = displayValidationError(response);
    if (errorInfo) {
      showErrorDialog({
        title: errorInfo.title,
        message: errorInfo.message,
        field: errorInfo.field,
        suggestion: errorInfo.suggestion
      });
      focusField(errorInfo.field);
    }
  }
}
```

---

## Advanced Patterns

### Example 1: Connection Pool Management

```typescript
// src/services/connection-pool.ts

class ConnectionPool {
  private connections: Map<string, { config: any; id: string }> = new Map();
  private maxConnections = 10;

  async addConnection(config: any): Promise<string> {
    if (this.connections.size >= this.maxConnections) {
      throw new Error('Maximum connections reached');
    }

    const connectionId = await window.api.ssh.connect(config);

    if (!connectionId.success) {
      throw new Error(connectionId.error);
    }

    this.connections.set(connectionId.data.connectionId, {
      config,
      id: connectionId.data.connectionId
    });

    return connectionId.data.connectionId;
  }

  async removeConnection(connectionId: string): Promise<void> {
    await window.api.ssh.disconnect({ connectionId });
    this.connections.delete(connectionId);
  }

  getConnection(connectionId: string) {
    return this.connections.get(connectionId);
  }

  async cleanup(): Promise<void> {
    for (const [connectionId] of this.connections) {
      await this.removeConnection(connectionId);
    }
  }
}

// Usage
const pool = new ConnectionPool();

async function manageMultipleConnections() {
  const ids = [];
  for (let i = 0; i < 3; i++) {
    const id = await pool.addConnection({
      host: `server${i}.com`,
      port: 22,
      username: 'user',
      password: 'pass'
    });
    ids.push(id);
  }

  // Use connections...

  // Cleanup
  await pool.cleanup();
}
```

### Example 2: Concurrent File Operations

```typescript
// src/services/file-operations.ts

async function downloadMultipleFiles(
  connectionId: string,
  files: Array<{ remote: string; local: string }>
): Promise<any[]> {
  const results = await Promise.allSettled(
    files.map(file =>
      downloadFile({
        connectionId,
        remotePath: file.remote,
        localPath: file.local
      })
    )
  );

  return results.map((result, index) => ({
    file: files[index],
    success: result.status === 'fulfilled',
    result: result.status === 'fulfilled' ? result.value : result.reason
  }));
}

// Usage
async function backupMultipleConfigs(connectionId: string) {
  const results = await downloadMultipleFiles(connectionId, [
    { remote: '/etc/app/config.json', local: './backups/config.json' },
    { remote: '/etc/app/secrets.env', local: './backups/secrets.env' },
    { remote: '/var/log/app.log', local: './backups/app.log' }
  ]);

  // Check results
  results.forEach(result => {
    if (result.success) {
      console.log(`✓ Downloaded ${result.file.remote}`);
    } else {
      console.error(`✗ Failed to download ${result.file.remote}`);
    }
  });
}
```

### Example 3: Command Output Parsing

```typescript
// src/utils/command-parser.ts

interface ParsedProcessInfo {
  pid: number;
  name: string;
  memory: string;
  cpu: string;
}

function parseProcessList(output: string): ParsedProcessInfo[] {
  return output
    .split('\n')
    .slice(1)  // Skip header
    .filter(line => line.trim())
    .map(line => {
      const parts = line.split(/\s+/);
      return {
        pid: parseInt(parts[1]),
        name: parts[10] || '',
        memory: parts[5] || '0',
        cpu: parts[2] || '0'
      };
    });
}

// Usage
async function getRunningProcesses(connectionId: string) {
  const result = await executeCommand(connectionId, 'ps aux');
  const processes = parseProcessList(result.output);
  return processes.filter(p => p.memory > 100);  // Filter by memory usage
}
```

---

## Summary

These examples demonstrate:

- ✅ Basic and advanced SSH operations
- ✅ Comprehensive error handling
- ✅ Bookmark and profile management
- ✅ Connection pooling and concurrent operations
- ✅ Data parsing and transformation
- ✅ Retry logic and resilience patterns

For more details, refer to:
- [Developer Guide](VALIDATION-DEVELOPER-GUIDE.md)
- [Error Codes Reference](ERROR-CODES-REFERENCE.md)
- [Security Best Practices](SECURITY-BEST-PRACTICES.md)
- [Quick Start Guide](VALIDATION-QUICK-START.md)

---

**Phase 5 - Handler Examples** ✅  
**Status:** Ready for Production  
**Date:** December 14, 2025
