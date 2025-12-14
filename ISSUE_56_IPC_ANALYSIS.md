# Issue #56: Input Validation & Sanitization Analysis

**Branch:** `feature/issue-56-input-validation`
**Created:** December 14, 2025
**Estimated Effort:** 40-50 hours over 1 week
**Status:** 📋 Analysis & Planning Phase

---

## Executive Summary

QuantumXfer currently has **16 IPC handlers** with varying input validation approaches. This analysis identifies validation requirements, security risks, and implementation strategy for comprehensive input validation and sanitization.

**Key Finding:** Most handlers lack proper input validation, creating potential security vulnerabilities and runtime errors. We need to implement a standardized validation framework.

---

## Current IPC Handlers Analysis

### 1. **Application & Dialog Handlers**

#### `app-version` ✅ No Input
- **Handler:** `ipcMain.handle('app-version', () => { ... })`
- **Parameters:** None
- **Validation Needed:** ❌ None
- **Risk Level:** 🟢 Safe

#### `show-save-dialog` ⚠️ High Risk
- **Handler:** `ipcMain.handle('show-save-dialog', async (event, options) => { ... })`
- **Parameters:** `options` (object)
- **Validation Needed:** ✅ HIGH PRIORITY
  - Required fields: None (optional)
  - Type validation: `options` must be object
  - Sanitize: File paths, allowed extensions
  - Constraints: Max file name length, valid characters
- **Risk Level:** 🔴 High - File system access

#### `show-open-dialog` ⚠️ High Risk
- **Handler:** `ipcMain.handle('show-open-dialog', async (event, options) => { ... })`
- **Parameters:** `options` (object)
- **Validation Needed:** ✅ HIGH PRIORITY
  - Same as save-dialog
  - Path traversal prevention
  - Filter validation
- **Risk Level:** 🔴 High - File system access

#### `write-log-file` ⚠️ Medium Risk
- **Handler:** `ipcMain.handle('write-log-file', async (event, logData, logsDirectory) => { ... })`
- **Parameters:** 
  - `logData` (string)
  - `logsDirectory` (string)
- **Validation Needed:** ✅ MEDIUM PRIORITY
  - `logData`: Type check, max length (10MB)
  - `logsDirectory`: Path validation, no traversal
  - Directory exists/accessible
- **Risk Level:** 🟡 Medium - Log injection, path traversal

---

### 2. **SSH Connection Handlers**

#### `ssh-connect` ⚠️ Critical Risk
- **Handler:** `ipcMain.handle('ssh-connect', async (event, config) => { ... })`
- **Parameters:** `config` (object)
- **Expected Structure:**
  ```javascript
  {
    host: string,
    port: number,
    username: string,
    password: string | null,
    privateKey: Buffer | string | null,
    algorithm: string | null
  }
  ```
- **Validation Needed:** ✅ CRITICAL PRIORITY
  - **host**: Required, valid hostname/IP, max 255 chars
  - **port**: Required, number 1-65535
  - **username**: Required, alphanumeric + _-.@, max 32 chars
  - **password**: Optional, max 500 chars, check for null bytes
  - **privateKey**: Optional, valid key format
  - **algorithm**: Optional, whitelist valid algorithms
- **Risk Level:** 🔴 Critical - Remote code execution potential

#### `ssh-execute-command` 🔴 Critical Risk
- **Handler:** `ipcMain.handle('ssh-execute-command', async (event, connectionId, command) => { ... })`
- **Parameters:**
  - `connectionId` (string)
  - `command` (string)
- **Validation Needed:** ✅ CRITICAL PRIORITY
  - **connectionId**: UUID/string format validation
  - **command**: 
    - Required field
    - Max 10000 chars
    - Check for dangerous patterns (injection attempts)
    - Log for audit trail
- **Risk Level:** 🔴 Critical - Command injection potential

#### `ssh-list-directory` ⚠️ High Risk
- **Handler:** `ipcMain.handle('ssh-list-directory', async (event, connectionId, remotePath) => { ... })`
- **Parameters:**
  - `connectionId` (string)
  - `remotePath` (string)
- **Validation Needed:** ✅ HIGH PRIORITY
  - **connectionId**: Valid connection
  - **remotePath**: 
    - No path traversal (../, /etc, etc)
    - Max 4096 chars
    - Valid path characters only
- **Risk Level:** 🔴 High - Path traversal, information disclosure

#### `ssh-list-directory-recursive` ⚠️ High Risk
- **Handler:** `ipcMain.handle('ssh-list-directory-recursive', async (event, connectionId, remotePath, options) => { ... })`
- **Parameters:**
  - `connectionId` (string)
  - `remotePath` (string)
  - `options` (object)
- **Validation Needed:** ✅ HIGH PRIORITY
  - Same as list-directory
  - **options**: 
    - maxDepth: number, 1-50
    - maxFiles: number, 1-10000
    - filter patterns: whitelist only
- **Risk Level:** 🔴 High - DoS potential with recursion

#### `ssh-download-file` ⚠️ High Risk
- **Handler:** `ipcMain.handle('ssh-download-file', async (event, connectionId, remotePath, localPath) => { ... })`
- **Parameters:**
  - `connectionId` (string)
  - `remotePath` (string)
  - `localPath` (string)
- **Validation Needed:** ✅ HIGH PRIORITY
  - **connectionId**: Valid
  - **remotePath**: Path traversal prevention
  - **localPath**: 
    - Path traversal prevention
    - Max 4096 chars
    - Valid write location
- **Risk Level:** 🔴 High - File system tampering

#### `ssh-upload-file` 🔴 Critical Risk
- **Handler:** `ipcMain.handle('ssh-upload-file', async (event, connectionId, localPath, remotePath) => { ... })`
- **Parameters:**
  - `connectionId` (string)
  - `localPath` (string)
  - `remotePath` (string)
- **Validation Needed:** ✅ CRITICAL PRIORITY
  - File size validation (max 2GB)
  - **remotePath**: Path traversal prevention
  - File type whitelist (optional)
  - Checksum validation (optional)
- **Risk Level:** 🔴 Critical - Arbitrary file upload, malware

#### `ssh-disconnect` ⚠️ Low Risk
- **Handler:** `ipcMain.handle('ssh-disconnect', (event, connectionId) => { ... })`
- **Parameters:** `connectionId` (string)
- **Validation Needed:** ✅ LOW PRIORITY
  - Format validation
  - Connection exists
- **Risk Level:** 🟢 Low

#### `ssh-get-connections` ✅ No Input
- **Handler:** `ipcMain.handle('ssh-get-connections', () => { ... })`
- **Parameters:** None
- **Validation Needed:** ❌ None
- **Risk Level:** 🟢 Safe

---

### 3. **Bookmarks Handlers**

#### `bookmarks-list` ✅ No Input
- **Handler:** `ipcMain.handle('bookmarks-list', async () => { ... })`
- **Parameters:** None
- **Validation Needed:** ❌ None
- **Risk Level:** 🟢 Safe

#### `bookmarks-add` ⚠️ Medium Risk
- **Handler:** `ipcMain.handle('bookmarks-add', async (event, bookmark) => { ... })`
- **Parameters:** `bookmark` (object)
- **Expected Structure:**
  ```javascript
  {
    id: string (optional),
    type: 'directory' | 'server',
    label: string,
    server: object | null,
    path: string | null
  }
  ```
- **Validation Needed:** ✅ MEDIUM PRIORITY
  - **type**: Enum validation - must be 'directory' or 'server'
  - **label**: Required, max 100 chars, no HTML/scripts
  - **server**: If provided, validate host/port
  - **path**: If provided, path validation
- **Risk Level:** 🟡 Medium - XSS via label field

#### `bookmarks-remove` ⚠️ Low Risk
- **Handler:** `ipcMain.handle('bookmarks-remove', async (event, bookmarkId) => { ... })`
- **Parameters:** `bookmarkId` (string)
- **Validation Needed:** ✅ LOW PRIORITY
  - Format validation
  - Exists check
- **Risk Level:** 🟢 Low

---

### 4. **Profile Management Handlers**

#### `save-profiles-to-file` ⚠️ Medium Risk
- **Handler:** `ipcMain.handle('save-profiles-to-file', async (event, profiles) => { ... })`
- **Parameters:** `profiles` (array of objects)
- **Expected Structure:**
  ```javascript
  [
    {
      name: string,
      password: string (encrypted),
      ...otherFields
    }
  ]
  ```
- **Validation Needed:** ✅ MEDIUM PRIORITY
  - Array length validation (max 1000)
  - Each profile object validation
  - Required fields presence
  - Field type checking
- **Risk Level:** 🟡 Medium - Data corruption, DoS

#### `load-profiles-from-file` ✅ No Input
- **Handler:** `ipcMain.handle('load-profiles-from-file', async () => { ... })`
- **Parameters:** None
- **Validation Needed:** ❌ None (but validate output)
- **Risk Level:** 🟢 Safe

---

### 5. **Command History Handlers**

#### `save-command-history` ⚠️ Medium Risk
- **Handler:** `ipcMain.handle('save-command-history', async (event, data) => { ... })`
- **Parameters:** `data` (object with `commands` array)
- **Validation Needed:** ✅ MEDIUM PRIORITY
  - **commands**: Array, max 500 items
  - Each command: string, max 10000 chars
- **Risk Level:** 🟡 Medium - DoS via large payloads

#### `load-command-history` ✅ No Input
- **Handler:** `ipcMain.handle('load-command-history', async () => { ... })`
- **Parameters:** None
- **Validation Needed:** ❌ None
- **Risk Level:** 🟢 Safe

#### `append-command-history` ⚠️ Medium Risk
- **Handler:** `ipcMain.handle('append-command-history', async (event, data) => { ... })`
- **Parameters:** `data` (object with `command` string)
- **Validation Needed:** ✅ MEDIUM PRIORITY
  - **command**: Required, string, max 10000 chars
- **Risk Level:** 🟡 Medium - DoS, log injection

#### `open-terminal-window` ⚠️ High Risk
- **Handler:** `ipcMain.handle('open-terminal-window', async (event, terminalData) => { ... })`
- **Parameters:** `terminalData` (object)
- **Validation Needed:** ✅ HIGH PRIORITY
  - Validate all fields in terminalData
  - No command injection vectors
  - Path traversal prevention
- **Risk Level:** 🔴 High - Command execution

---

## Validation Framework Design

### Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    IPC Handler Layer                         │
│                   (electron/main.js)                         │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌──────────────────────────────────────────────────────────────┐
│         Input Validation & Sanitization Layer                │
│            (electron/validators/*.js)                        │
│                                                              │
│  ├─ Common Validators (strings, numbers, arrays)            │
│  ├─ SSH Validators (connection, paths, commands)            │
│  ├─ File Validators (paths, sizes)                          │
│  ├─ Bookmark Validators                                      │
│  └─ Profile Validators                                       │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌──────────────────────────────────────────────────────────────┐
│    Sanitization & Security Layer                             │
│         (electron/sanitizers.js)                             │
│                                                              │
│  ├─ Path traversal prevention                               │
│  ├─ XSS prevention                                           │
│  ├─ Command injection prevention                            │
│  ├─ Null byte filtering                                      │
│  └─ Size limits enforcement                                  │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌──────────────────────────────────────────────────────────────┐
│         IPC Handler Wrapper (Updated)                        │
│          (electron/ipc-handler.js)                           │
│                                                              │
│  Integrates validation into handler execution               │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌──────────────────────────────────────────────────────────────┐
│            Business Logic / Services                         │
│       (ssh-service.js, file operations, etc)                │
└──────────────────────────────────────────────────────────────┘
```

### Files to Create/Modify

1. **New: `electron/validators/common.js`** (200-300 lines)
   - String validators (required, length, pattern, enum)
   - Number validators (range, integer, float)
   - Array validators (length, type checking)
   - Object validators (required fields, type checking)

2. **New: `electron/validators/ssh.js`** (250-350 lines)
   - Connection config validation
   - Command validation
   - Path validation with traversal prevention
   - Host/port validation

3. **New: `electron/validators/file.js`** (200-250 lines)
   - Path validation
   - Size validation
   - File type validation
   - Directory operations

4. **New: `electron/validators/bookmark.js`** (100-150 lines)
   - Bookmark structure validation
   - Type enum validation
   - Label sanitization

5. **New: `electron/validators/profile.js`** (150-200 lines)
   - Profile array validation
   - Required fields validation
   - Encryption field validation

6. **New: `electron/sanitizers.js`** (300-400 lines)
   - Path traversal prevention
   - XSS filtering
   - Command injection prevention
   - Null byte filtering
   - Size limit enforcement

7. **Update: `electron/ipc-handler.js`**
   - Add validation integration
   - Update `createValidatedIPCHandler` for all handlers
   - Add request size limits

8. **New: `tests/validators/`**
   - `common.test.js` (300+ lines, 50+ tests)
   - `ssh.test.js` (400+ lines, 70+ tests)
   - `file.test.js` (300+ lines, 50+ tests)
   - `bookmark.test.js` (150+ lines, 25+ tests)
   - `profile.test.js` (200+ lines, 35+ tests)
   - `sanitizers.test.js` (300+ lines, 60+ tests)

9. **Update: `electron/main.js`**
   - Wrap all 16 IPC handlers with validation
   - Add request size middleware
   - Add rate limiting (optional)

---

## Validation Rules Matrix

### SSH Connection Validation

```javascript
sshConfig = {
  host: {
    type: 'string',
    required: true,
    minLength: 1,
    maxLength: 255,
    pattern: /^[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$|^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/,
    errorMessage: 'Invalid hostname or IP address'
  },
  port: {
    type: 'number',
    required: true,
    minimum: 1,
    maximum: 65535,
    errorMessage: 'Port must be between 1 and 65535'
  },
  username: {
    type: 'string',
    required: true,
    minLength: 1,
    maxLength: 32,
    pattern: /^[a-zA-Z0-9._-@]+$/,
    errorMessage: 'Invalid username format'
  },
  password: {
    type: 'string',
    required: false,
    maxLength: 500,
    allowNull: true,
    errorMessage: 'Password too long'
  },
  privateKey: {
    type: ['string', 'object'],
    required: false,
    allowNull: true,
    errorMessage: 'Invalid private key format'
  }
}
```

### Command Validation

```javascript
command = {
  type: 'string',
  required: true,
  minLength: 1,
  maxLength: 10000,
  checkInjectionPatterns: true,
  dangerousPatterns: [
    /;\s*rm\s+-rf/gi,      // rm -rf
    /`[^`]*`/g,            // backtick execution
    /\$\([^)]*\)/g,        // $() execution
    />\s*\/dev\/null/gi,   // output redirection
  ],
  errorMessage: 'Invalid or potentially dangerous command'
}
```

### Path Validation

```javascript
remotePath = {
  type: 'string',
  required: true,
  maxLength: 4096,
  preventTraversal: true,
  dangerousPatterns: [
    /\.\.\//g,             // ../
    /^\/etc\//,            // /etc/
    /^\/root\//,           // /root/
    /^\/proc\//,           // /proc/
  ],
  errorMessage: 'Invalid path or access denied'
}
```

---

## Implementation Roadmap

### Phase 1: Foundation (Days 1-2, 10 hours)
- [ ] Create validators structure
- [ ] Implement common validators
- [ ] Implement sanitizers
- [ ] Create comprehensive tests for common validators

### Phase 2: SSH Validation (Days 2-3, 12 hours)
- [ ] Implement SSH validators
- [ ] Update all SSH IPC handlers
- [ ] Add SSH validator tests
- [ ] Integration testing

### Phase 3: File & Other Handlers (Days 3-4, 10 hours)
- [ ] Implement file validators
- [ ] Implement bookmark validators
- [ ] Implement profile validators
- [ ] Update all remaining handlers

### Phase 4: Integration & Testing (Days 4-5, 8 hours)
- [ ] Update main.js with validation
- [ ] Full integration testing
- [ ] Security testing
- [ ] Performance validation

### Phase 5: Documentation (Days 5, 5 hours)
- [ ] Create validation guide
- [ ] Update handler documentation
- [ ] Add security best practices guide
- [ ] Complete test suite

**Total: 40-50 hours**

---

## Security Considerations

### 1. Path Traversal Prevention
- Reject paths containing `../`
- Reject absolute system paths (/etc, /root, /proc, etc.)
- Use path normalization and validation

### 2. Command Injection Prevention
- Validate against dangerous patterns
- No shell interpretation of user input
- Escape special characters if needed

### 3. XSS Prevention
- HTML-encode user input in labels
- Strip dangerous tags and attributes
- Sanitize before storing

### 4. Size Limits
- Request size: 50MB max
- File upload: 2GB max
- Array items: 10000 max
- String length: Context-specific max

### 5. Rate Limiting (Optional)
- Limit SSH connections: 10/minute
- Limit file operations: 100/minute
- Implement per-connection limits

### 6. Null Byte Filtering
- Remove null bytes from all string inputs
- Prevent null byte injection in file paths

---

## Test Coverage Goals

- **Common Validators:** 50+ tests (95%+ coverage)
- **SSH Validators:** 70+ tests (98%+ coverage)
- **File Validators:** 50+ tests (95%+ coverage)
- **Bookmark Validators:** 25+ tests (90%+ coverage)
- **Profile Validators:** 35+ tests (90%+ coverage)
- **Sanitizers:** 60+ tests (98%+ coverage)

**Total: 290+ new test cases**

**Overall Target:** 427+ total tests (Issues #52-56), 95%+ code coverage

---

## Success Criteria

✅ All IPC handlers have input validation
✅ Path traversal attacks blocked
✅ Command injection attempts blocked
✅ All tests passing (290+ new tests)
✅ Zero validation-related errors in logs
✅ 95%+ code coverage on validators
✅ Documentation complete
✅ Security review passed

---

## Related Issues

- **Issue #52:** ✅ SSH Service Unit Tests (foundation)
- **Issue #53:** ✅ Structured Logging Framework (logging)
- **Issue #54:** ✅ IPC Error Standardization (error handling)
- **Issue #56:** 🟠 This Issue - Input Validation
- **Issue #58:** ⏳ Technical Documentation (depends on this)

---

## Next Steps

1. ✅ Complete this analysis
2. ⏳ Create validators/common.js
3. ⏳ Create validators/ssh.js
4. ⏳ Create validators/file.js
5. ⏳ Create sanitizers.js
6. ⏳ Update all IPC handlers
7. ⏳ Add comprehensive tests
8. ⏳ Push to remote and close Issue #56

---

*Analysis conducted on December 14, 2025*
*Ready for implementation phase to begin*
