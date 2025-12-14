# Issue #56 - IPC Handler Validation Status Matrix

**Generated:** December 14, 2025  
**Analysis Tool:** Comprehensive IPC Handler Audit  

---

## Handler Validation Status Overview

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                     IPC HANDLER VALIDATION STATUS                            │
├──────────────────────────────────────────────────────────────────────────────┤
│  Category     │ Handler Name              │ Risk   │ Status │ Tests Needed   │
├──────────────────────────────────────────────────────────────────────────────┤
│ APP           │ app-version               │ ✅ Safe│ DONE  │ 0 (no input)   │
│ APP           │ show-save-dialog          │ 🔴 High│ TODO  │ 8-10           │
│ APP           │ show-open-dialog          │ 🔴 High│ TODO  │ 8-10           │
│ APP           │ write-log-file            │ 🟡 Med │ TODO  │ 6-8            │
│               │                           │        │       │                │
│ SSH           │ ssh-connect               │🔴🔴Crit│ TODO  │ 12-15          │
│ SSH           │ ssh-execute-command       │🔴🔴Crit│ TODO  │ 12-15          │
│ SSH           │ ssh-list-directory        │ 🔴 High│ TODO  │ 10-12          │
│ SSH           │ ssh-list-directory-recur  │ 🔴 High│ TODO  │ 10-12          │
│ SSH           │ ssh-download-file         │ 🔴 High│ TODO  │ 10-12          │
│ SSH           │ ssh-upload-file           │🔴🔴Crit│ TODO  │ 12-15          │
│ SSH           │ ssh-disconnect            │ 🟢 Low │ TODO  │ 3-4            │
│ SSH           │ ssh-get-connections       │ ✅ Safe│ DONE  │ 0 (no input)   │
│               │                           │        │       │                │
│ BOOKMARK      │ bookmarks-list            │ ✅ Safe│ DONE  │ 0 (no input)   │
│ BOOKMARK      │ bookmarks-add             │ 🟡 Med │ TODO  │ 6-8            │
│ BOOKMARK      │ bookmarks-remove          │ 🟢 Low │ TODO  │ 3-4            │
│               │                           │        │       │                │
│ PROFILE       │ save-profiles-to-file     │ 🟡 Med │ TODO  │ 6-8            │
│ PROFILE       │ load-profiles-from-file   │ ✅ Safe│ DONE  │ 0 (no input)   │
│               │                           │        │       │                │
│ HISTORY       │ save-command-history      │ 🟡 Med │ TODO  │ 6-8            │
│ HISTORY       │ load-command-history      │ ✅ Safe│ DONE  │ 0 (no input)   │
│ HISTORY       │ append-command-history    │ 🟡 Med │ TODO  │ 6-8            │
│               │                           │        │       │                │
│ TERMINAL      │ open-terminal-window      │ 🔴 High│ TODO  │ 8-10           │
└──────────────────────────────────────────────────────────────────────────────┘

LEGEND:
  ✅ Safe      = No input, validation not needed
  🟢 Low       = Minimal validation needed, low risk
  🟡 Med       = Medium validation, data integrity important
  🔴 High      = High risk, security sensitive
  🔴🔴 Crit   = Critical risk, could enable RCE or file system attacks
```

---

## Risk Distribution

```
                    IPC Handler Risk Distribution
                                    
  Critical Risk (🔴🔴) - 2 handlers
  ┌─────────────────────────────────────┐
  │ • ssh-connect                       │ 12.5%
  │ • ssh-upload-file                   │ 12.5%
  └─────────────────────────────────────┘
                    
  High Risk (🔴) - 6 handlers
  ┌─────────────────────────────────────┐
  │ • show-save-dialog                  │ 6.25%
  │ • show-open-dialog                  │ 6.25%
  │ • ssh-list-directory                │ 6.25%
  │ • ssh-list-directory-recursive       │ 6.25%
  │ • ssh-download-file                 │ 6.25%
  │ • open-terminal-window              │ 6.25%
  └─────────────────────────────────────┘

  Medium Risk (🟡) - 5 handlers
  ┌─────────────────────────────────────┐
  │ • write-log-file                    │ 6.25%
  │ • bookmarks-add                     │ 6.25%
  │ • save-profiles-to-file             │ 6.25%
  │ • save-command-history              │ 6.25%
  │ • append-command-history            │ 6.25%
  └─────────────────────────────────────┘

  Low Risk (🟢) - 2 handlers
  ┌─────────────────────────────────────┐
  │ • ssh-disconnect                    │ 6.25%
  │ • bookmarks-remove                  │ 6.25%
  └─────────────────────────────────────┘

  Safe (✅) - 1 handler (no validation needed)
  ┌─────────────────────────────────────┐
  │ • app-version                       │ 6.25%
  │ • ssh-get-connections               │ 6.25%
  │ • bookmarks-list                    │ 6.25%
  │ • load-profiles-from-file           │ 6.25%
  │ • load-command-history              │ 6.25%
  └─────────────────────────────────────┘

  TOTAL HANDLERS: 16
  NEEDING VALIDATION: 13 (81%)
  FULLY SAFE: 3 (19%)
```

---

## Validation Requirements by Handler

### Critical Priority (MUST FIX FIRST)

#### 1️⃣ `ssh-connect` - Connection Configuration
```
Parameter: config (object)

Fields Required:
├─ host (string)
│  ├─ Required: YES
│  ├─ Pattern: hostname or IP
│  ├─ Max Length: 255
│  └─ Validation: validateHostname()
│
├─ port (number)
│  ├─ Required: YES
│  ├─ Range: 1 - 65535
│  └─ Validation: validatePort()
│
├─ username (string)
│  ├─ Required: YES
│  ├─ Pattern: [a-zA-Z0-9._-@]+
│  ├─ Max Length: 32
│  └─ Validation: validateUsername()
│
├─ password (string | null)
│  ├─ Required: NO
│  ├─ Max Length: 500
│  ├─ Allow Null: YES
│  └─ Validation: validatePassword()
│
└─ privateKey, algorithm (optional)
   └─ Validation: validateKeyFormat()

Attack Vectors:
  ❌ Inject shell commands in host field
  ❌ Invalid port range causing connection errors
  ❌ Special characters in username bypassing auth
  ❌ Null bytes in password field
```

#### 2️⃣ `ssh-execute-command` - Command Execution
```
Parameters: connectionId (string), command (string)

Validation Rules:
├─ connectionId
│  ├─ Format: valid UUID/connection ID
│  ├─ Must exist in active connections
│  └─ Validation: validateConnectionId()
│
└─ command
   ├─ Required: YES
   ├─ Type: string
   ├─ Max Length: 10,000
   ├─ Pattern: no shell metacharacters unless escaped
   └─ Check: detectCommandInjection()

Dangerous Patterns Detected:
  🚫 ; rm -rf /
  🚫 `command`  (backtick execution)
  🚫 $(command) (command substitution)
  🚫 | grep   (piping)
  🚫 && command
  🚫 > /dev/null (redirection)

Attack Vectors:
  ❌ Remote code execution via shell injection
  ❌ Privilege escalation
  ❌ Data exfiltration
```

#### 3️⃣ `ssh-upload-file` - File Upload
```
Parameters: connectionId, localPath, remotePath

Validation Rules:
├─ connectionId
│  ├─ Validation: validateConnectionId()
│  └─ Check: Connection exists
│
├─ localPath
│  ├─ Type: string
│  ├─ Validation: validateLocalFilePath()
│  ├─ Check: File exists
│  └─ Check: readable
│
└─ remotePath
   ├─ Type: string
   ├─ Max Length: 4,096
   ├─ Prevent Traversal: YES
   ├─ Block Patterns: /etc/, /root/, /proc/
   └─ Validation: validateRemotePath()

Size Limits:
  ├─ Max file: 2 GB
  ├─ Check via: file stat before upload
  └─ Block: oversized files

Attack Vectors:
  ❌ Upload malware/backdoors
  ❌ Path traversal to write system files
  ❌ Fill disk with huge files (DoS)
  ❌ Overwrite critical files
```

---

### High Priority (IMPORTANT)

#### 4️⃣ `ssh-list-directory` - Directory Listing
```
Parameters: connectionId, remotePath

Protection:
├─ Block paths: /etc/, /root/, /proc/, /sys/
├─ Block: relative paths with ../
├─ Max length: 4,096 chars
└─ Validate: safe path structure

Threat: Information disclosure, directory traversal
Tests Needed: 10-12
```

#### 5️⃣ `show-save-dialog` / `show-open-dialog`
```
Parameter: options (object)

Validation:
├─ Path validation (no traversal)
├─ Filter pattern validation
├─ Property type checking
└─ Size limit on dialog state

Threat: File system access bypass, path traversal
Tests Needed: 8-10 each
```

#### 6️⃣ `open-terminal-window` - Terminal Launch
```
Parameter: terminalData (object)

Validation:
├─ Command/shell validation
├─ Working directory validation
├─ Environment variable sanitization
└─ No execution vectors

Threat: Command execution, environment manipulation
Tests Needed: 8-10
```

---

### Medium Priority (IMPORTANT BUT LESS CRITICAL)

#### 7️⃣ `bookmarks-add` - Bookmark Creation
```
Threat: XSS via label field

Validation:
├─ type: enum ['directory', 'server']
├─ label: HTML encode, max 100 chars
├─ server: object validation
└─ path: path validation

Tests Needed: 6-8
```

#### 8️⃣ `save-profiles-to-file` - Profile Persistence
```
Threat: Data corruption, DoS via large arrays

Validation:
├─ profiles: must be array
├─ Max length: 1,000 items
├─ Each item: required fields
└─ Field types: validated

Tests Needed: 6-8
```

#### 9️⃣ `save-command-history` - Command History
```
Threat: Log injection, DoS via large strings

Validation:
├─ commands: array validation
├─ Max items: 500
├─ Each: string, max 10,000 chars
└─ Total size: < 50 MB

Tests Needed: 6-8
```

---

### Low Priority (NICE TO HAVE)

#### 1️⃣0️⃣ `ssh-disconnect`, `bookmarks-remove`
```
Validation: Basic format checking
Tests Needed: 3-4 each
```

---

## Implementation Roadmap Gantt Chart

```
Phase 1: Foundation (Days 1-2)
████████████████░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
├─ Common validators (3h)
├─ Sanitizers (3h)
├─ Tests (4h)
└─ Status: Ready for Phase 2

Phase 2: SSH Validators (Days 2-3)
░░░░░░░░░░░░░░░░████████████████████░░░░░░░░░░░░░░░░░░░░
├─ SSH validators (4h)
├─ Update handlers (4h)
├─ Tests (4h)
└─ Status: SSH handlers production-ready

Phase 3: Other Validators (Days 3-4)
░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░██████████████░░░░░░
├─ File/Bookmark/Profile validators (5h)
├─ Update handlers (3h)
├─ Tests (2h)
└─ Status: All handlers validated

Phase 4: Integration (Days 4-5)
░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░███████
├─ Full integration (5h)
├─ Security testing (2h)
└─ Status: Ready for production

Phase 5: Documentation (Day 5)
░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░██
├─ Guides & docs (5h)
└─ Status: Complete
```

---

## Test Coverage Plan

```
Current Status (Issues #52-54): 137 tests
┌──────────────────────────────────────────────────┐
│ Issue #52 (SSH): 29 tests [████░░░░░░]           │
│ Issue #53 (Logging): 40 tests [████████░░░░]     │
│ Issue #54 (Errors): 68 tests [████████████░░░░]  │
└──────────────────────────────────────────────────┘

New Tests (Issue #56): 290 tests
┌──────────────────────────────────────────────────┐
│ Common validators: 50 tests [█████░░░░░░]        │
│ SSH validators: 70 tests [███████░░░░░░░░]       │
│ File validators: 50 tests [█████░░░░░░]          │
│ Bookmark validators: 25 tests [██░░░░░░░░]       │
│ Profile validators: 35 tests [███░░░░░░░]        │
│ Sanitizers: 60 tests [██████░░░░░░░░░]          │
└──────────────────────────────────────────────────┘

After Issue #56 Complete: 427+ tests
┌──────────────────────────────────────────────────┐
│ TOTAL COVERAGE: 95%+ across entire codebase      │
│ ALL CRITICAL PATHS: 99%+                         │
│ SECURITY FUNCTIONS: 98%+                         │
└──────────────────────────────────────────────────┘
```

---

## File Creation Summary

### New Files to Create (8 files)

1. **electron/validators/common.js** - 200-300 lines
   - Basic type validators
   - String/number/array/object validators

2. **electron/validators/ssh.js** - 250-350 lines
   - SSH-specific validation rules
   - Connection config, command, path validation

3. **electron/validators/file.js** - 200-250 lines
   - File path validation
   - Size validation
   - Directory validation

4. **electron/validators/bookmark.js** - 100-150 lines
   - Bookmark structure validation
   - Type enum validation
   - Label sanitization

5. **electron/validators/profile.js** - 150-200 lines
   - Profile array validation
   - Required fields validation

6. **electron/sanitizers.js** - 300-400 lines
   - Path traversal prevention
   - XSS filtering
   - Command injection prevention
   - Null byte filtering

7. **tests/validators/common.test.js** - 300+ lines
   - 50+ test cases

8. **tests/validators/** (5 more test files)
   - ssh.test.js, file.test.js, bookmark.test.js, profile.test.js, sanitizers.test.js
   - 240+ total test cases

### Modified Files (2 files)

1. **electron/ipc-handler.js**
   - Add validation integration
   - Update createValidatedIPCHandler()
   - Add request size limits

2. **electron/main.js**
   - Wrap all 16 handlers with validation
   - Update handler signatures
   - Add validation middleware

---

## Key Metrics

```
Handlers to Validate:        13 of 16 (81%)
Handlers Already Safe:        3 of 16 (19%)

Critical Risk Handlers:       2 (must fix first)
High Risk Handlers:           6 (this sprint)
Medium Risk Handlers:         5 (this sprint)
Low Risk Handlers:            2 (optional)

New Validator Files:          6 files
New Test Files:               6 files
Modified Files:               2 files
New Test Cases:               290+ tests
Estimated Code:               2,000+ lines

Lines of Code by Category:
├─ Validators: 900-1,100 lines
├─ Sanitizers: 300-400 lines
├─ Tests: 1,800-2,000 lines
└─ Documentation: 1,000+ lines

Quality Metrics:
├─ Test Coverage Goal: 95%+
├─ Critical Path Coverage: 99%+
├─ Security Function Coverage: 98%+
└─ Zero Known Vulnerabilities Target
```

---

## Success Criteria

✅ **Security**
- [ ] All 13 handlers have input validation
- [ ] Path traversal attacks blocked
- [ ] Command injection blocked
- [ ] XSS prevention implemented
- [ ] File upload bombs prevented

✅ **Testing**
- [ ] 290+ new test cases passing
- [ ] 427+ total tests passing
- [ ] 95%+ code coverage
- [ ] Zero validation bypasses

✅ **Documentation**
- [ ] Validation guide complete
- [ ] Handler migration examples
- [ ] Security best practices documented
- [ ] API documentation updated

✅ **Integration**
- [ ] All 16 handlers updated
- [ ] Error handling integrated
- [ ] Logging integrated
- [ ] Performance validated

---

## Dependencies

**Build On (Completed):**
- ✅ Issue #52: SSH Service Unit Tests
- ✅ Issue #53: Structured Logging
- ✅ Issue #54: Error Standardization

**Required For:**
- ⏳ Issue #58: Technical Documentation
- ⏳ Future: Additional REST Clients

**External:**
- Vitest 2.1.9 (already in place)
- Node.js v18+ (already in use)
- Electron (already in use)

---

## Next Immediate Actions

1. ✅ Analysis complete
2. ⏳ Create Phase 1 files (common validators, sanitizers)
3. ⏳ Create Phase 1 tests (110+ tests)
4. ⏳ Verify Phase 1 tests passing
5. ⏳ Proceed to Phase 2 (SSH validation)

---

*Analysis Complete - Ready for Implementation*  
*All critical security gaps documented and prioritized*  
*Implementation can begin immediately on Phase 1*
