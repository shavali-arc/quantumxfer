# QuantumXfer Validation Framework - Quick Start Guide

**Version:** 1.0  
**Date:** December 14, 2025  
**Status:** Phase 5 - Quick Start Documentation  
**Branch:** `feature/phase5-implementation`

---

## 5-Minute Quick Start

### 1. Basic SSH Connection

```typescript
// Import the API
const api = window.api;

// Create connection config
const config = {
  host: '192.168.1.100',
  port: 22,
  username: 'admin',
  password: 'your-password'
};

// Connect (validation happens automatically)
const response = await api.ssh.connect(config);

if (response.success) {
  const connectionId = response.data.connectionId;
  console.log('Connected! ID:', connectionId);
} else {
  console.error('Connection failed:', response.error);
}
```

### 2. Execute Command

```typescript
// Using the connection from above
const result = await api.ssh.executeCommand({
  connectionId,
  command: 'ls -la /home/user'
});

if (result.success) {
  console.log('Output:', result.data.output);
  console.log('Exit code:', result.data.exitCode);
} else {
  console.error('Command failed:', result.error);
}
```

### 3. Download File

```typescript
const download = await api.ssh.downloadFile({
  connectionId,
  remotePath: '/home/user/document.txt',
  localPath: './downloaded.txt'
});

if (download.success) {
  console.log('Downloaded:', download.data.bytesTransferred, 'bytes');
} else {
  console.error('Download failed:', download.error);
}
```

### 4. Clean Up

```typescript
// Disconnect when done
await api.ssh.disconnect({ connectionId });
```

---

## Common Tasks

### Task 1: Connect to Server

```typescript
async function connectToServer(hostname, username, password) {
  const response = await window.api.ssh.connect({
    host: hostname,
    port: 22,
    username: username,
    password: password
  });

  if (!response.success) {
    // Check specific error
    if (response.error.includes('Connection refused')) {
      alert('Cannot reach server. Check hostname and port.');
    } else if (response.error.includes('Authentication failed')) {
      alert('Invalid username or password');
    } else {
      alert('Connection failed: ' + response.error);
    }
    return null;
  }

  return response.data.connectionId;
}

// Usage
const connId = await connectToServer(
  'example.com',
  'admin',
  'password'
);
```

### Task 2: List Files

```typescript
async function listFiles(connectionId, remotePath = '/home/user') {
  const response = await window.api.ssh.listDirectory({
    connectionId,
    path: remotePath,
    recursive: false
  });

  if (!response.success) {
    console.error('Failed to list files:', response.error);
    return [];
  }

  return response.data.files;
}

// Usage
const files = await listFiles(connectionId, '/home/user/documents');
files.forEach(file => {
  console.log(`${file.name} (${file.size} bytes)`);
});
```

### Task 3: Upload File

```typescript
async function uploadFileToServer(
  connectionId,
  localPath,
  remotePath
) {
  const response = await window.api.ssh.uploadFile({
    connectionId,
    localPath,
    remotePath
  });

  if (!response.success) {
    console.error('Upload failed:', response.error);
    return false;
  }

  console.log('Uploaded:', response.data.bytesTransferred, 'bytes');
  return true;
}

// Usage
const success = await uploadFileToServer(
  connectionId,
  './local-file.txt',
  '/home/user/uploaded.txt'
);
```

### Task 4: Save Bookmark

```typescript
async function saveServerBookmark(
  serverName,
  hostname,
  username,
  port = 22
) {
  const response = await window.api.bookmarks.add({
    name: serverName,
    host: hostname,
    port: port,
    username: username,
    description: 'Bookmarked server'
  });

  if (!response.success) {
    console.error('Failed to save bookmark:', response.error);
    return null;
  }

  console.log('Bookmark saved:', response.data.id);
  return response.data.id;
}

// Usage
const bookmarkId = await saveServerBookmark(
  'Production Server',
  'prod.example.com',
  'admin',
  22
);
```

### Task 5: Quick Connect from Bookmark

```typescript
async function quickConnect(bookmarkId) {
  // Get bookmarks
  const bookmarks = await window.api.bookmarks.list();

  if (!bookmarks.success) {
    console.error('Failed to load bookmarks');
    return null;
  }

  // Find the bookmark
  const bookmark = bookmarks.data.bookmarks.find(
    b => b.id === bookmarkId
  );

  if (!bookmark) {
    console.error('Bookmark not found');
    return null;
  }

  // Get stored password (from secure storage)
  const password = await getStoredPassword(bookmarkId);

  // Connect using bookmark data
  const connection = await window.api.ssh.connect({
    host: bookmark.host,
    port: bookmark.port,
    username: bookmark.username,
    password: password
  });

  if (!connection.success) {
    console.error('Connection failed:', connection.error);
    return null;
  }

  return connection.data.connectionId;
}

// Usage
const connId = await quickConnect('bookmark-123');
```

---

## Error Handling

### Simple Error Handling

```typescript
async function simpleConnect(config) {
  try {
    const response = await window.api.ssh.connect(config);

    if (!response.success) {
      // Operation failed
      console.error('Error:', response.error);
      console.error('Code:', response.code);
      return null;
    }

    // Success
    return response.data.connectionId;
  } catch (error) {
    // Unexpected error
    console.error('Unexpected error:', error.message);
    return null;
  }
}
```

### Detailed Error Handling

```typescript
async function robustConnect(config) {
  const response = await window.api.ssh.connect(config);

  if (response.success) {
    return response.data.connectionId;
  }

  // Handle specific error codes
  switch (response.code) {
    case 'INVALID_HOST':
      return { error: 'Invalid hostname. Example: example.com' };

    case 'INVALID_PORT':
      return { error: 'Port must be between 1 and 65535' };

    case 'INVALID_USERNAME':
      return { error: 'Username must be 1-32 characters' };

    case 'INVALID_PASSWORD':
      return { error: 'Password cannot be empty' };

    case 'CONNECTION_FAILED':
      return { error: 'Cannot reach server. Check hostname and firewall.' };

    case 'AUTHENTICATION_FAILED':
      return { error: 'Invalid username or password' };

    case 'CONNECTION_TIMEOUT':
      return { error: 'Connection timed out. Server may be slow.' };

    default:
      return { error: `Error: ${response.error}` };
  }
}
```

### Error Recovery

```typescript
async function connectWithRetry(config, maxRetries = 3) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const response = await window.api.ssh.connect(config);

      if (response.success) {
        console.log(`Connected on attempt ${attempt}`);
        return response.data.connectionId;
      }

      // Don't retry validation errors
      if (response.code && response.code.includes('INVALID')) {
        throw new Error(`Validation error: ${response.error}`);
      }

      // Wait before retry
      if (attempt < maxRetries) {
        console.log(`Attempt ${attempt} failed. Retrying in 2 seconds...`);
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    } catch (error) {
      if (attempt === maxRetries) {
        throw error;
      }
    }
  }
}
```

---

## Key Concepts

### Validation

All inputs are automatically validated:
- Type checking (string, number, etc.)
- Format checking (valid hostnames, ports, paths)
- Range checking (port 1-65535)
- Sanitization (remove dangerous content)

**Result:** Invalid inputs are rejected before processing.

### Error Codes

Every error includes a code:
```
401 - INVALID_HOST
402 - INVALID_PORT
403 - INVALID_USERNAME
404 - INVALID_PASSWORD
501 - CONNECTION_FAILED
502 - AUTHENTICATION_FAILED
```

See [ERROR-CODES-REFERENCE.md](ERROR-CODES-REFERENCE.md) for complete list.

### Security

The framework provides:
- Input validation (prevent injection attacks)
- Path sanitization (prevent directory traversal)
- Secure credential handling
- Audit logging
- Sensitive data redaction

**Result:** Your application is protected from common vulnerabilities.

---

## Best Practices

### 1. Always Check Response

```typescript
// ❌ DON'T: Ignore response status
const connId = response.data.connectionId;

// ✅ DO: Check success first
if (response.success) {
  const connId = response.data.connectionId;
} else {
  console.error('Connection failed:', response.error);
}
```

### 2. Handle Errors Gracefully

```typescript
// ❌ DON'T: Generic error message
if (!response.success) {
  alert('Error occurred');
}

// ✅ DO: Specific, helpful error message
if (!response.success) {
  const message = response.code === 'AUTHENTICATION_FAILED'
    ? 'Check your username and password'
    : response.error;
  alert(`Connection failed: ${message}`);
}
```

### 3. Use Bookmarks for Frequent Servers

```typescript
// ❌ DON'T: Type password every time
const config = { host, port, username, password };
await api.ssh.connect(config);

// ✅ DO: Save bookmark and reuse
await api.bookmarks.add({
  name: 'My Server',
  host, port, username
});
// Later: quick connect with saved bookmark
```

### 4. Clean Up Connections

```typescript
// ❌ DON'T: Leave connections open
const connId = await api.ssh.connect(config);
// Use connId...
// Forgot to disconnect!

// ✅ DO: Always disconnect
const connId = await api.ssh.connect(config);
try {
  // Use connId...
} finally {
  await api.ssh.disconnect({ connectionId: connId });
}
```

### 5. Validate User Input

```typescript
// ❌ DON'T: Trust user input
const config = {
  host: userInput.host,
  port: userInput.port,
  // ...
};
// Will be validated, but better to pre-validate

// ✅ DO: Pre-validate in UI
if (!userInput.host || userInput.host.length === 0) {
  setError('Hostname is required');
  return;
}

if (userInput.port < 1 || userInput.port > 65535) {
  setError('Port must be 1-65535');
  return;
}

const config = {
  host: userInput.host,
  port: userInput.port,
  // ...
};
```

---

## Common Pitfalls

### Pitfall 1: Wrong Port Type

```typescript
// ❌ WRONG: Port as string
const config = {
  host: 'example.com',
  port: '22',  // String!
  username: 'user',
  password: 'pass'
};

// ✅ CORRECT: Port as number
const config = {
  host: 'example.com',
  port: 22,    // Number
  username: 'user',
  password: 'pass'
};
```

### Pitfall 2: Path Traversal

```typescript
// ❌ DANGEROUS: Path traversal attempt
const download = await api.ssh.downloadFile({
  connectionId,
  remotePath: '../../../etc/passwd'  // Blocked!
});

// ✅ SAFE: Proper path
const download = await api.ssh.downloadFile({
  connectionId,
  remotePath: '/home/user/documents/file.txt'
});
```

### Pitfall 3: Ignored Response Status

```typescript
// ❌ WRONG: Assumes success
const connId = response.data.connectionId;
await api.ssh.executeCommand({
  connectionId: connId,  // May not exist!
  command: 'ls'
});

// ✅ CORRECT: Check response.success
if (response.success) {
  const connId = response.data.connectionId;
  await api.ssh.executeCommand({
    connectionId: connId,
    command: 'ls'
  });
}
```

### Pitfall 4: No Error Context

```typescript
// ❌ BAD: No error context
if (!response.success) {
  console.error(response.error);  // What went wrong?
}

// ✅ GOOD: Include context
if (!response.success) {
  console.error({
    error: response.error,
    code: response.code,
    operation: 'ssh-connect',
    config: { host, port, username }
  });
}
```

---

## TypeScript Types

### Connection Config

```typescript
interface ConnectionConfig {
  host: string;          // Required: hostname or IP
  port?: number;         // Optional: default 22
  username: string;      // Required: SSH username
  password?: string;     // Required if no privateKey
  privateKey?: string;   // Required if no password
  timeout?: number;      // Optional: milliseconds (default 30000)
  retries?: number;      // Optional: auto-retry count (default 3)
}
```

### API Response

```typescript
interface ApiResponse<T> {
  success: boolean;      // Operation succeeded
  data?: T;              // Result data (if success)
  error?: string;        // Error message (if failed)
  code?: string;         // Error code (if failed)
  details?: Record<string, any>;  // Error details
}
```

### File Info

```typescript
interface FileInfo {
  name: string;          // Filename
  size: number;          // Size in bytes
  modified: string;      // Last modified timestamp
  permissions: string;   // File permissions
  isDirectory: boolean;  // Is it a directory?
}
```

---

## Troubleshooting

### "Connection refused"

**Cause:** Server not reachable  
**Solution:**
1. Check server is running
2. Verify hostname/IP
3. Verify port number
4. Check firewall

### "Authentication failed"

**Cause:** Invalid credentials  
**Solution:**
1. Verify username
2. Verify password
3. Check account exists
4. Check account not locked

### "Timeout"

**Cause:** Server too slow  
**Solution:**
1. Increase timeout value
2. Check network speed
3. Check server load
4. Reduce timeout if testing

### "Invalid path"

**Cause:** Bad file path  
**Solution:**
1. Use absolute paths
2. Avoid `../` sequences
3. Check path exists
4. Check spelling

---

## Next Steps

Learn more:
- [Developer Guide](VALIDATION-DEVELOPER-GUIDE.md) - Detailed API documentation
- [Handler Examples](HANDLER-USAGE-EXAMPLES.md) - Code examples
- [Error Codes](ERROR-CODES-REFERENCE.md) - Complete error reference
- [Security](SECURITY-BEST-PRACTICES.md) - Security guidelines

Get help:
- Check error code in [ERROR-CODES-REFERENCE.md](ERROR-CODES-REFERENCE.md)
- Review examples in [HANDLER-USAGE-EXAMPLES.md](HANDLER-USAGE-EXAMPLES.md)
- Read [SECURITY-BEST-PRACTICES.md](SECURITY-BEST-PRACTICES.md) for security questions

---

## Summary

**In 5 minutes:**
1. ✅ Connected to SSH server
2. ✅ Executed command
3. ✅ Downloaded file
4. ✅ Handled errors

**Key points:**
- Always check `response.success`
- Use error codes to handle specific errors
- Validation happens automatically
- Framework handles security for you

**Next:** Explore more in [HANDLER-USAGE-EXAMPLES.md](HANDLER-USAGE-EXAMPLES.md) or read [VALIDATION-DEVELOPER-GUIDE.md](VALIDATION-DEVELOPER-GUIDE.md) for complete API reference.

---

**Phase 5 - Quick Start Guide** ✅  
**Status:** Ready for Production  
**Date:** December 14, 2025
