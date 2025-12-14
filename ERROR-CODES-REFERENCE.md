# QuantumXfer - Error Codes Reference

**Version:** 1.0  
**Date:** December 14, 2025  
**Status:** Phase 5 - Complete Error Code Documentation  
**Branch:** `feature/phase5-implementation`

---

## Table of Contents

1. [Overview](#overview)
2. [Error Code Categories](#error-code-categories)
3. [Validation Errors (400-level)](#validation-errors-400-level)
4. [Connection Errors (500-level)](#connection-errors-500-level)
5. [Command Execution Errors (600-level)](#command-execution-errors-600-level)
6. [File Operation Errors (700-level)](#file-operation-errors-700-level)
7. [Bookmark Errors (800-level)](#bookmark-errors-800-level)
8. [Profile Errors (900-level)](#profile-errors-900-level)
9. [System Errors (1000-level)](#system-errors-1000-level)
10. [Error Response Format](#error-response-format)
11. [Debugging Guide](#debugging-guide)

---

## Overview

QuantumXfer uses a comprehensive error code system to help developers understand and handle errors effectively. Each error code is unique and includes:

- **Error Code** - Numeric identifier (e.g., 401, 502)
- **Error Name** - Short name (e.g., `INVALID_HOST`)
- **HTTP Status** - Equivalent HTTP status (e.g., 400, 500)
- **Description** - What went wrong
- **Common Causes** - Why it happened
- **Solution** - How to fix it
- **Example** - Code example showing the error

---

## Error Code Categories

| Range | Category | HTTP Status | Severity |
|-------|----------|-------------|----------|
| 400-499 | Validation Errors | 400 | High |
| 500-599 | Connection Errors | 500 | Critical |
| 600-699 | Command Execution Errors | 500 | High |
| 700-799 | File Operation Errors | 500 | High |
| 800-899 | Bookmark Errors | 400 | Medium |
| 900-999 | Profile Errors | 400 | Medium |
| 1000+ | System Errors | 500 | Critical |

---

## Validation Errors (400-level)

### 401 - INVALID_HOST

**Name:** `INVALID_HOST`  
**HTTP Status:** 400 Bad Request  
**Severity:** High  

**Description:**  
The provided hostname is invalid or improperly formatted.

**Common Causes:**
- Hostname contains invalid characters
- Hostname exceeds 255 characters
- Hostname doesn't follow DNS naming convention
- Hostname is an empty string

**Solution:**
- Check hostname format (alphanumeric, hyphens, dots only)
- Ensure hostname is 1-255 characters
- Use FQDN (e.g., `example.com`) or IP address

**Example:**
```typescript
const response = await window.api.ssh.connect({
  host: 'invalid@host#name',  // ❌ Invalid characters
  port: 22,
  username: 'user',
  password: 'pass'
});

// Response:
{
  success: false,
  error: 'Hostname contains invalid characters',
  code: 'INVALID_HOST',
  details: {
    received: 'invalid@host#name',
    expected: 'valid hostname or IP address'
  }
}
```

**Fix:**
```typescript
const response = await window.api.ssh.connect({
  host: 'example.com',  // ✅ Valid hostname
  port: 22,
  username: 'user',
  password: 'pass'
});
```

---

### 402 - INVALID_PORT

**Name:** `INVALID_PORT`  
**HTTP Status:** 400 Bad Request  
**Severity:** High  

**Description:**  
The port number is invalid or out of range.

**Common Causes:**
- Port number is not an integer
- Port is less than 1 or greater than 65535
- Port is a negative number
- Port is a float (e.g., 22.5)

**Solution:**
- Use integer between 1-65535
- Standard SSH port is 22
- Use 22, 2222, 2022 for non-standard SSH ports

**Example:**
```typescript
// ❌ Error: Port out of range
const response = await window.api.ssh.connect({
  host: 'example.com',
  port: 99999,  // Out of range
  username: 'user',
  password: 'pass'
});

// Response:
{
  success: false,
  error: 'Port must be between 1 and 65535',
  code: 'INVALID_PORT',
  details: {
    received: 99999,
    expected: '1-65535'
  }
}
```

**Fix:**
```typescript
// ✅ Valid port
const response = await window.api.ssh.connect({
  host: 'example.com',
  port: 2222,  // Custom SSH port
  username: 'user',
  password: 'pass'
});
```

---

### 403 - INVALID_USERNAME

**Name:** `INVALID_USERNAME`  
**HTTP Status:** 400 Bad Request  
**Severity:** High  

**Description:**  
The username is invalid or improperly formatted.

**Common Causes:**
- Username is empty
- Username contains invalid characters
- Username exceeds 32 characters
- Username contains spaces

**Solution:**
- Username should be 1-32 alphanumeric characters
- Can include underscores and hyphens
- No spaces or special characters

**Example:**
```typescript
// ❌ Error: Invalid username
const response = await window.api.ssh.connect({
  host: 'example.com',
  port: 22,
  username: 'invalid user!',  // Contains space and special char
  password: 'pass'
});
```

**Fix:**
```typescript
// ✅ Valid username
const response = await window.api.ssh.connect({
  host: 'example.com',
  port: 22,
  username: 'admin_user',  // Valid format
  password: 'pass'
});
```

---

### 404 - INVALID_PASSWORD

**Name:** `INVALID_PASSWORD`  
**HTTP Status:** 400 Bad Request  
**Severity:** High  

**Description:**  
The password is invalid or improperly formatted.

**Common Causes:**
- Password is empty
- Password exceeds 255 characters
- Password contains null bytes
- Password is missing when required

**Solution:**
- Provide password of 1-255 characters
- Ensure password is not empty
- Avoid null bytes in password

**Example:**
```typescript
// ❌ Error: Empty password
const response = await window.api.ssh.connect({
  host: 'example.com',
  port: 22,
  username: 'user',
  password: ''  // Empty
});
```

**Fix:**
```typescript
// ✅ Valid password
const response = await window.api.ssh.connect({
  host: 'example.com',
  port: 22,
  username: 'user',
  password: 'securePassword123'  // Non-empty
});
```

---

### 405 - INVALID_PRIVATE_KEY

**Name:** `INVALID_PRIVATE_KEY`  
**HTTP Status:** 400 Bad Request  
**Severity:** High  

**Description:**  
The private key format is invalid.

**Common Causes:**
- Key is not in valid format (PEM, OpenSSH, etc.)
- Key is corrupted or truncated
- Key is empty
- Key contains invalid characters

**Solution:**
- Use valid PEM format private key
- Ensure key is complete (includes BEGIN/END markers)
- Use `ssh-keygen` to validate key format
- Check key file permissions

**Example:**
```typescript
// ❌ Error: Invalid key format
const response = await window.api.ssh.connect({
  host: 'example.com',
  port: 22,
  username: 'user',
  privateKey: 'not-a-valid-key'  // Invalid format
});
```

**Fix:**
```typescript
// ✅ Valid private key (PEM format)
const keyContent = `-----BEGIN RSA PRIVATE KEY-----
MIIEpAIBAAKCAQEA2z...
...key content...
-----END RSA PRIVATE KEY-----`;

const response = await window.api.ssh.connect({
  host: 'example.com',
  port: 22,
  username: 'user',
  privateKey: keyContent
});
```

---

### 406 - INVALID_PATH

**Name:** `INVALID_PATH`  
**HTTP Status:** 400 Bad Request  
**Severity:** High  

**Description:**  
The file path is invalid or contains path traversal attempts.

**Common Causes:**
- Path contains `../` or `..\\` (path traversal)
- Path is empty
- Path contains null bytes
- Path is excessively long (>4096 characters)

**Solution:**
- Use absolute or relative paths without traversal
- Avoid `../` sequences
- Paths will be sanitized to prevent traversal attacks
- Keep paths under 4096 characters

**Example:**
```typescript
// ❌ Error: Path traversal attempt
const response = await window.api.ssh.downloadFile({
  connectionId: 'conn-123',
  remotePath: '../../../etc/passwd',  // Path traversal
  localPath: './file.txt'
});
```

**Fix:**
```typescript
// ✅ Safe path
const response = await window.api.ssh.downloadFile({
  connectionId: 'conn-123',
  remotePath: '/home/user/documents/file.txt',  // Absolute path
  localPath: './file.txt'
});
```

---

### 407 - INVALID_COMMAND

**Name:** `INVALID_COMMAND`  
**HTTP Status:** 400 Bad Request  
**Severity:** High  

**Description:**  
The command string is invalid or dangerous.

**Common Causes:**
- Command is empty
- Command contains null bytes
- Command is excessively long (>10000 characters)
- Command contains dangerous patterns

**Solution:**
- Provide non-empty command
- Commands are sanitized automatically
- Keep commands reasonable length
- Avoid dangerous shell metacharacters

**Example:**
```typescript
// ❌ Error: Empty command
const response = await window.api.ssh.executeCommand({
  connectionId: 'conn-123',
  command: ''  // Empty
});
```

**Fix:**
```typescript
// ✅ Valid command
const response = await window.api.ssh.executeCommand({
  connectionId: 'conn-123',
  command: 'ls -la /home/user'  // Valid command
});
```

---

### 408 - MISSING_REQUIRED_FIELD

**Name:** `MISSING_REQUIRED_FIELD`  
**HTTP Status:** 400 Bad Request  
**Severity:** High  

**Description:**  
A required field is missing from the request.

**Common Causes:**
- Forgot to include required parameter
- Field value is null or undefined
- Field was deleted from object

**Solution:**
- Include all required fields
- Check API documentation for required fields
- Use TypeScript interfaces for type safety

**Example:**
```typescript
// ❌ Error: Missing connectionId
const response = await window.api.ssh.executeCommand({
  // connectionId is missing!
  command: 'ls -la'
});
```

**Fix:**
```typescript
// ✅ Include required field
const response = await window.api.ssh.executeCommand({
  connectionId: 'conn-123',  // Required
  command: 'ls -la'
});
```

---

### 409 - INVALID_TIMEOUT

**Name:** `INVALID_TIMEOUT`  
**HTTP Status:** 400 Bad Request  
**Severity:** Medium  

**Description:**  
The timeout value is invalid.

**Common Causes:**
- Timeout is not a number
- Timeout is negative
- Timeout is less than minimum (100ms)
- Timeout is greater than maximum (600000ms)

**Solution:**
- Use number between 100-600000 milliseconds
- Default timeout is 30000ms (30 seconds)
- For long operations, increase timeout

**Example:**
```typescript
// ❌ Error: Invalid timeout
const response = await window.api.ssh.connect({
  host: 'example.com',
  port: 22,
  username: 'user',
  password: 'pass',
  timeout: -5000  // Negative timeout
});
```

**Fix:**
```typescript
// ✅ Valid timeout
const response = await window.api.ssh.connect({
  host: 'example.com',
  port: 22,
  username: 'user',
  password: 'pass',
  timeout: 60000  // 60 seconds
});
```

---

### 410 - INVALID_CONNECTION_ID

**Name:** `INVALID_CONNECTION_ID`  
**HTTP Status:** 400 Bad Request  
**Severity:** High  

**Description:**  
The connection ID is invalid or malformed.

**Common Causes:**
- Connection ID is empty
- Connection ID doesn't exist
- Connection ID is not a string
- Connection ID format is invalid

**Solution:**
- Ensure connection ID is a valid string
- Check that connection is still active
- Verify connection ID from response

**Example:**
```typescript
// ❌ Error: Invalid connection ID
const response = await window.api.ssh.executeCommand({
  connectionId: '',  // Empty
  command: 'ls'
});
```

**Fix:**
```typescript
// ✅ Valid connection ID
const connections = await window.api.ssh.listConnections();
const connectionId = connections[0].id;

const response = await window.api.ssh.executeCommand({
  connectionId,  // Valid ID
  command: 'ls'
});
```

---

## Connection Errors (500-level)

### 501 - CONNECTION_FAILED

**Name:** `CONNECTION_FAILED`  
**HTTP Status:** 500 Internal Server Error  
**Severity:** Critical  

**Description:**  
Failed to establish SSH connection to the server.

**Common Causes:**
- Server is unreachable
- Server rejected connection
- Network connectivity issues
- Firewall blocking connection
- Wrong host or port

**Solution:**
- Verify server is running and reachable
- Check host and port are correct
- Verify firewall allows connection
- Check network connectivity
- Try increasing timeout

**Example:**
```typescript
const response = await window.api.ssh.connect({
  host: 'unreachable.example.com',
  port: 22,
  username: 'user',
  password: 'pass'
});

// Response:
{
  success: false,
  error: 'Failed to connect to host',
  code: 'CONNECTION_FAILED'
}
```

---

### 502 - AUTHENTICATION_FAILED

**Name:** `AUTHENTICATION_FAILED`  
**HTTP Status:** 500 Internal Server Error  
**Severity:** Critical  

**Description:**  
Authentication with the server failed.

**Common Causes:**
- Invalid username or password
- Invalid or wrong private key
- User account doesn't exist
- Account locked or disabled
- Wrong authentication method

**Solution:**
- Verify credentials are correct
- Check if user account exists on server
- Verify private key matches server's authorized_keys
- Check account is not locked
- Try different authentication method

**Example:**
```typescript
const response = await window.api.ssh.connect({
  host: 'example.com',
  port: 22,
  username: 'user',
  password: 'wrongpassword'  // Wrong password
});

// Response:
{
  success: false,
  error: 'Authentication failed',
  code: 'AUTHENTICATION_FAILED'
}
```

---

### 503 - CONNECTION_TIMEOUT

**Name:** `CONNECTION_TIMEOUT`  
**HTTP Status:** 500 Internal Server Error  
**Severity:** Critical  

**Description:**  
Connection attempt timed out.

**Common Causes:**
- Server is slow to respond
- Network latency is high
- Firewall is blocking packets
- Server is overloaded
- Timeout is too short

**Solution:**
- Increase timeout value
- Check network connectivity
- Verify server is responsive (ping)
- Reduce network latency
- Check server load

**Example:**
```typescript
const response = await window.api.ssh.connect({
  host: 'slow.example.com',
  port: 22,
  username: 'user',
  password: 'pass',
  timeout: 5000  // 5 second timeout - too short
});

// Response:
{
  success: false,
  error: 'Connection timed out',
  code: 'CONNECTION_TIMEOUT'
}

// Fix: Increase timeout
const response = await window.api.ssh.connect({
  host: 'slow.example.com',
  port: 22,
  username: 'user',
  password: 'pass',
  timeout: 60000  // 60 second timeout
});
```

---

### 504 - CONNECTION_RESET

**Name:** `CONNECTION_RESET`  
**HTTP Status:** 500 Internal Server Error  
**Severity:** Critical  

**Description:**  
Connection was reset by the server.

**Common Causes:**
- Server closed connection
- Network connection dropped
- Server process crashed
- Firewall reset connection
- Server timeout

**Solution:**
- Retry connection
- Check server logs
- Verify network stability
- Check firewall rules
- Increase idle timeout

---

### 505 - CONNECTION_REFUSED

**Name:** `CONNECTION_REFUSED`  
**HTTP Status:** 500 Internal Server Error  
**Severity:** Critical  

**Description:**  
Server refused the connection.

**Common Causes:**
- SSH server not running
- Wrong port
- Firewall blocking port
- Server reached connection limit
- Server misconfigured

**Solution:**
- Verify SSH server is running
- Check port number
- Verify firewall allows connection
- Check server configuration
- Try different port (e.g., 2222)

---

## Command Execution Errors (600-level)

### 601 - COMMAND_EXECUTION_FAILED

**Name:** `COMMAND_EXECUTION_FAILED`  
**HTTP Status:** 500 Internal Server Error  
**Severity:** High  

**Description:**  
Command execution failed on the server.

**Common Causes:**
- Command doesn't exist
- Command returned non-zero exit code
- Permission denied
- File not found
- Syntax error in command

**Solution:**
- Verify command exists on server
- Check permissions
- Verify file paths
- Check command syntax
- Run command manually to test

**Example:**
```typescript
const response = await window.api.ssh.executeCommand({
  connectionId: 'conn-123',
  command: 'nonexistent-command'
});

// Response:
{
  success: false,
  error: 'Command execution failed',
  code: 'COMMAND_EXECUTION_FAILED',
  details: {
    exitCode: 127
  }
}
```

---

### 602 - COMMAND_TIMEOUT

**Name:** `COMMAND_TIMEOUT`  
**HTTP Status:** 500 Internal Server Error  
**Severity:** High  

**Description:**  
Command execution exceeded timeout.

**Common Causes:**
- Command is taking too long
- Command is waiting for input
- Command is hanging
- Server is unresponsive
- Timeout is too short

**Solution:**
- Increase timeout
- Optimize command performance
- Use non-blocking commands
- Add input to command if needed
- Check server resources

---

### 603 - COMMAND_CANCELLED

**Name:** `COMMAND_CANCELLED`  
**HTTP Status:** 500 Internal Server Error  
**Severity:** Medium  

**Description:**  
Command was cancelled by user or system.

**Common Causes:**
- User cancelled operation
- Timeout reached
- Connection closed
- System shutdown

**Solution:**
- Retry command
- Check if connection is still active
- Increase timeout if needed

---

### 604 - PERMISSION_DENIED

**Name:** `PERMISSION_DENIED`  
**HTTP Status:** 500 Internal Server Error  
**Severity:** High  

**Description:**  
User doesn't have permission to execute command.

**Common Causes:**
- User lacks required privileges
- File has restrictive permissions
- User not in required group
- sudo/root access required

**Solution:**
- Use appropriate user account
- Use sudo if required
- Check file permissions
- Add user to required groups

**Example:**
```typescript
const response = await window.api.ssh.executeCommand({
  connectionId: 'conn-123',
  command: 'rm /root/important-file'
});

// Response:
{
  success: false,
  error: 'Permission denied',
  code: 'PERMISSION_DENIED'
}
```

---

## File Operation Errors (700-level)

### 701 - FILE_NOT_FOUND

**Name:** `FILE_NOT_FOUND`  
**HTTP Status:** 500 Internal Server Error  
**Severity:** High  

**Description:**  
File or directory does not exist.

**Common Causes:**
- File path is incorrect
- File was deleted
- Path doesn't exist
- Case sensitivity issue

**Solution:**
- Verify file path
- Check file exists with `ls` command
- Verify spelling and case
- Use full absolute path

---

### 702 - FILE_READ_ERROR

**Name:** `FILE_READ_ERROR`  
**HTTP Status:** 500 Internal Server Error  
**Severity:** High  

**Description:**  
Failed to read file.

**Common Causes:**
- Permission denied
- File is in use
- Disk read error
- File is corrupted
- Path is directory, not file

**Solution:**
- Check file permissions
- Close file if in use
- Check disk health
- Verify it's a file, not directory
- Use `cat` command to test

---

### 703 - FILE_WRITE_ERROR

**Name:** `FILE_WRITE_ERROR`  
**HTTP Status:** 500 Internal Server Error  
**Severity:** High  

**Description:**  
Failed to write file.

**Common Causes:**
- Permission denied
- Disk full
- File is read-only
- Directory doesn't exist
- Invalid filename

**Solution:**
- Check permissions
- Free disk space
- Remove read-only flag
- Create directory first
- Check filename is valid

---

### 704 - FILE_SIZE_EXCEEDS_LIMIT

**Name:** `FILE_SIZE_EXCEEDS_LIMIT`  
**HTTP Status:** 400 Bad Request  
**Severity:** High  

**Description:**  
File size exceeds maximum limit.

**Common Causes:**
- File is too large
- Limit is too small
- Configuration issue

**Solution:**
- Increase size limit
- Split file into smaller parts
- Use compression
- Check configuration

---

### 705 - DIRECTORY_NOT_EMPTY

**Name:** `DIRECTORY_NOT_EMPTY`  
**HTTP Status:** 500 Internal Server Error  
**Severity:** Medium  

**Description:**  
Cannot delete directory because it's not empty.

**Common Causes:**
- Directory contains files
- Directory contains subdirectories
- Hidden files in directory

**Solution:**
- Delete contents first
- Use recursive delete
- Check for hidden files

---

## Bookmark Errors (800-level)

### 801 - BOOKMARK_NOT_FOUND

**Name:** `BOOKMARK_NOT_FOUND`  
**HTTP Status:** 400 Bad Request  
**Severity:** Medium  

**Description:**  
Bookmark does not exist.

**Common Causes:**
- Bookmark ID is invalid
- Bookmark was deleted
- Typo in ID

**Solution:**
- Verify bookmark ID
- List bookmarks to find correct ID
- Recreate bookmark if deleted

---

### 802 - BOOKMARK_ALREADY_EXISTS

**Name:** `BOOKMARK_ALREADY_EXISTS`  
**HTTP Status:** 400 Bad Request  
**Severity:** Medium  

**Description:**  
Bookmark with this name already exists.

**Common Causes:**
- Duplicate bookmark name
- Name collision

**Solution:**
- Use different bookmark name
- Update existing bookmark instead
- Check for similar names

---

### 803 - INVALID_BOOKMARK

**Name:** `INVALID_BOOKMARK`  
**HTTP Status:** 400 Bad Request  
**Severity:** Medium  

**Description:**  
Bookmark data is invalid.

**Common Causes:**
- Missing required fields
- Invalid field values
- Incorrect format

**Solution:**
- Verify all required fields
- Check field formats
- Refer to bookmark schema

---

## Profile Errors (900-level)

### 901 - PROFILE_NOT_FOUND

**Name:** `PROFILE_NOT_FOUND`  
**HTTP Status:** 400 Bad Request  
**Severity:** Medium  

**Description:**  
Profile does not exist.

**Common Causes:**
- Profile ID is invalid
- Profile was deleted
- Profile not loaded

**Solution:**
- Verify profile ID
- List profiles to find correct ID
- Create profile if needed

---

### 902 - PROFILE_SAVE_FAILED

**Name:** `PROFILE_SAVE_FAILED`  
**HTTP Status:** 500 Internal Server Error  
**Severity:** Medium  

**Description:**  
Failed to save profile.

**Common Causes:**
- Permission denied
- Disk full
- Invalid profile data
- File corruption

**Solution:**
- Check permissions
- Free disk space
- Verify profile data
- Check disk health

---

### 903 - PROFILE_LOAD_FAILED

**Name:** `PROFILE_LOAD_FAILED`  
**HTTP Status:** 500 Internal Server Error  
**Severity:** Medium  

**Description:**  
Failed to load profile.

**Common Causes:**
- Profile file corrupted
- Permission denied
- File not found
- Invalid format

**Solution:**
- Recreate profile
- Check file permissions
- Restore from backup
- Repair profile file

---

## System Errors (1000-level)

### 1001 - INTERNAL_SERVER_ERROR

**Name:** `INTERNAL_SERVER_ERROR`  
**HTTP Status:** 500 Internal Server Error  
**Severity:** Critical  

**Description:**  
An unexpected internal error occurred.

**Common Causes:**
- Bug in application
- Unexpected state
- Memory error
- Uncaught exception

**Solution:**
- Check application logs
- Report issue with steps to reproduce
- Restart application
- Check for available updates

---

### 1002 - OPERATION_NOT_SUPPORTED

**Name:** `OPERATION_NOT_SUPPORTED`  
**HTTP Status:** 500 Internal Server Error  
**Severity:** High  

**Description:**  
This operation is not supported.

**Common Causes:**
- Feature not implemented
- Server doesn't support operation
- Version mismatch

**Solution:**
- Use alternative operation
- Check feature availability
- Update application

---

## Error Response Format

All errors follow this standard format:

```typescript
interface ErrorResponse {
  success: false;
  error: string;              // Human-readable error message
  code: string;               // Error code (e.g., 'INVALID_HOST')
  details?: {
    [key: string]: any;       // Additional error details
    received?: any;           // What was received
    expected?: any;           // What was expected
    field?: string;           // Which field caused error
  };
  timestamp?: string;         // ISO 8601 timestamp
  context?: {
    handler?: string;         // IPC handler name
    connectionId?: string;    // Connection ID if applicable
  };
}
```

**Example:**
```typescript
{
  success: false,
  error: 'Port must be between 1 and 65535',
  code: 'INVALID_PORT',
  details: {
    received: 99999,
    expected: '1-65535',
    field: 'port'
  },
  timestamp: '2025-12-14T10:30:45.123Z',
  context: {
    handler: 'ssh-connect'
  }
}
```

---

## Debugging Guide

### Step 1: Identify Error Code

Look for the `code` field in error response to identify the error type.

### Step 2: Check Details

Review the `details` field for specific information about what went wrong.

### Step 3: Review Common Solutions

Use this document to find common solutions for the error code.

### Step 4: Check Logs

Review application logs for more context:
```bash
# On Linux/Mac
tail -f ~/.config/QuantumXfer/logs/app.log

# On Windows
tail -f %APPDATA%\QuantumXfer\logs\app.log
```

### Step 5: Validate Input

Ensure input matches expected format:
```typescript
// Enable debug logging
const config = {
  host: 'example.com',
  port: 22,
  username: 'user',
  password: 'pass'
};

console.log('Config:', config);
console.log('Port type:', typeof config.port);
console.log('Host type:', typeof config.host);

const response = await window.api.ssh.connect(config);
console.log('Response:', response);
```

### Step 6: Retry Operation

For transient errors, retry the operation:
```typescript
async function retryWithBackoff(fn, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      if (i < maxRetries - 1) {
        await new Promise(r => setTimeout(r, 1000 * Math.pow(2, i)));
      } else {
        throw error;
      }
    }
  }
}

const response = await retryWithBackoff(() =>
  window.api.ssh.connect(config)
);
```

### Step 7: Contact Support

If error persists, gather information for support:
- Error code and message
- Steps to reproduce
- Application version
- Server information
- Relevant logs
- Network diagnostics (ping, traceroute)

---

## Summary

This error codes reference provides:

- ✅ Comprehensive error code definitions (400-1002)
- ✅ Clear descriptions and common causes
- ✅ Actionable solutions for each error
- ✅ Examples and debugging tips
- ✅ Standard error response format
- ✅ Debugging guide for support

For more information, refer to:
- [Developer Guide](VALIDATION-DEVELOPER-GUIDE.md)
- [Handler Examples](HANDLER-USAGE-EXAMPLES.md)
- [Security Best Practices](SECURITY-BEST-PRACTICES.md)
- [Quick Start Guide](VALIDATION-QUICK-START.md)

---

**Phase 5 - Error Codes Reference** ✅  
**Status:** Ready for Production  
**Date:** December 14, 2025
