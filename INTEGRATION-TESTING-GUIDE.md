# QuantumXfer Integration Testing Guide

## Overview

QuantumXfer uses a Docker-based OpenSSH server for realistic integration testing. This ensures all SSH/SFTP operations are tested against an actual SSH implementation rather than mocks.

---

## Quick Start

### Prerequisites
- Docker Desktop (Windows/Mac) or Docker Engine (Linux)
- Node.js 22+
- npm dependencies installed

### Run Integration Tests

```bash
# Start SSH test server and run tests
npm run test:integration:ssh

# Or manually control the server
npm run test:ssh-up      # Start SSH server
npm test -- tests/integration/ --run
npm run test:ssh-down    # Stop SSH server
```

---

## Docker SSH Test Server

### Container Details
- **Image**: `ghcr.io/linuxserver/openssh-server:latest`
- **Container Name**: `quantumxfer-ssh-test`
- **Host**: `127.0.0.1`
- **Port**: `2222`
- **Username**: `testuser`
- **Password**: `testpass`

### Helper Scripts

Located in `tests/scripts/`:

#### ssh-test-server.js
Manages the Docker container lifecycle:
```bash
node tests/scripts/ssh-test-server.js start    # Start container
node tests/scripts/ssh-test-server.js stop     # Stop container
node tests/scripts/ssh-test-server.js status   # Check status
node tests/scripts/ssh-test-server.js restart  # Restart container
```

#### run-integration-with-ssh.js
Orchestrates test runs with automatic cleanup:
```bash
node tests/scripts/run-integration-with-ssh.js
```
This script:
1. Starts SSH server container
2. Runs integration tests
3. Always stops container (even on failure)

---

## Integration Test Suites

### Test Files (42 total tests)

#### tests/integration/ssh-connection.test.js (13 tests)
- SSH connection establishment
- Password authentication
- Invalid credentials handling
- Timeout management
- Connection pooling
- Multiple simultaneous connections
- Connection disconnect
- Error handling

#### tests/integration/command-execution.test.js (9 tests)
- SSH service availability
- Connection configuration
- Connection tracking
- Multiple connection management
- Connection information retrieval
- Error handling

#### tests/integration/concurrency.test.js (11 tests)
- Concurrent connections (3-5 simultaneous)
- Sequential connection handling
- Connection pool efficiency
- Rapid connect/disconnect cycles
- Performance metrics
- Resource cleanup
- Failure recovery

#### tests/integration/file-operations.test.js (9 tests)
- SFTP operations support
- Directory listing
- Recursive directory listing
- Non-existent path handling
- Permission error handling
- SFTP helper methods
- Concurrent directory listings

---

## Local Development Workflow

### 1. First Time Setup
```bash
# Install Docker Desktop (if not already installed)
# Windows: https://www.docker.com/products/docker-desktop/
# Mac: https://www.docker.com/products/docker-desktop/
# Linux: sudo apt-get install docker.io

# Install dependencies
npm ci

# Start SSH test server
npm run test:ssh-up
```

### 2. Run Tests During Development
```bash
# Watch mode (auto-rerun on changes)
npm test -- tests/integration/ --watch

# Single run
npm test -- tests/integration/ --run

# Run specific test file
npm test -- tests/integration/ssh-connection.test.js --run

# Run with coverage
npm run test:coverage -- tests/integration/
```

### 3. Cleanup
```bash
# Stop SSH test server
npm run test:ssh-down

# Verify container is stopped
docker ps | grep quantumxfer-ssh-test
```

---

## CI/CD Integration

### GitHub Actions Workflow

The integration tests run automatically in CI via `.github/workflows/integration-tests.yml`:

```yaml
# Triggers:
- Push to main or feature/* branches
- Pull requests to main

# Workflow:
1. Start SSH server as GitHub Actions service
2. Wait for health checks to pass
3. Run all 42 integration tests
4. Upload test results as artifacts
```

### Viewing CI Test Results

1. Go to **Actions** tab in GitHub repository
2. Select the **Integration Tests** workflow
3. Click on the latest run
4. View test output in job logs
5. Download artifacts for detailed results

---

## Test Structure

### Test Patterns

#### Early Return for Missing SSH Server (Fallback)
```javascript
beforeAll(async () => {
  // Check if SSH server is available
  try {
    const result = await Promise.race([
      sshService.connect(testConfig),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('timeout')), 3000)
      )
    ]);
    
    if (result?.success) {
      sshServerAvailable = true;
      await sshService.disconnect(result.connectionId);
    }
  } catch (err) {
    sshServerAvailable = false;
  }
});

it('should test SSH functionality', async () => {
  if (!sshServerAvailable) return; // Skip if no server
  
  // Test implementation
});
```

#### Cleanup Pattern
```javascript
afterAll(async () => {
  // Cleanup all connections
  const connections = sshService.getActiveConnections();
  for (const conn of connections) {
    try {
      await sshService.disconnect(conn.id);
    } catch (err) {
      // Ignore cleanup errors
    }
  }
});
```

---

## Troubleshooting

### Docker Issues

#### Docker not installed
```bash
# Windows/Mac: Install Docker Desktop
# https://www.docker.com/products/docker-desktop/

# Linux
sudo apt-get update
sudo apt-get install docker.io
sudo systemctl start docker
```

#### Docker daemon not running
```bash
# Windows/Mac: Start Docker Desktop application

# Linux
sudo systemctl start docker
sudo systemctl enable docker
```

#### Port 2222 already in use
```bash
# Find process using port 2222
# Windows
netstat -ano | findstr :2222

# Linux/Mac
lsof -i :2222

# Stop conflicting service or change port in:
# - tests/fixtures/mock-ssh-server.js (getCredentials)
# - tests/scripts/ssh-test-server.js (port constant)
```

### Test Issues

#### Tests timing out
- Increase timeout in test configuration
- Check network connectivity
- Verify SSH server is running: `docker ps | grep quantumxfer`

#### Authentication failures
- Verify credentials: testuser/testpass
- Check SSH server logs: `docker logs quantumxfer-ssh-test`

#### Connection refused
- Ensure SSH server is running: `npm run test:ssh-up`
- Wait for readiness: Server takes ~5-10 seconds to start

---

## Performance Benchmarks

### Expected Test Duration
- Total suite: ~13-15 seconds
- ssh-connection.test.js: ~10 seconds
- concurrency.test.js: ~6 seconds
- command-execution.test.js: ~2 seconds
- file-operations.test.js: < 1 second

### Test Statistics
- **Total Tests**: 42
- **Pass Rate**: 100% (when SSH server available)
- **Coverage**: SSH connection, authentication, SFTP, concurrency
- **Real SSH Operations**: All tests use actual SSH protocol

---

## Extending Tests

### Adding New Test Files

1. Create test file in `tests/integration/`:
```javascript
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import SSHService from '../../electron/ssh-service.js';
import { TestSSHFixtures } from '../fixtures/mock-ssh-server.js';

describe('My New Integration Tests', () => {
  let sshService;
  let sshServerAvailable = false;
  
  beforeAll(async () => {
    sshService = new SSHService();
    const testCredentials = TestSSHFixtures.getCredentials();
    
    // Check SSH availability
    try {
      const result = await sshService.connect({
        host: testCredentials.host,
        port: testCredentials.port,
        username: testCredentials.username,
        password: testCredentials.password,
        authType: 'password'
      });
      
      if (result?.success) {
        sshServerAvailable = true;
        await sshService.disconnect(result.connectionId);
      }
    } catch (err) {
      sshServerAvailable = false;
    }
  });
  
  it('should test new functionality', async () => {
    if (!sshServerAvailable) return;
    
    // Your test implementation
  });
});
```

2. Run your new tests:
```bash
npm test -- tests/integration/your-test.test.js --run
```

---

## Best Practices

### DO
✅ Use early return pattern for missing SSH server  
✅ Clean up connections in afterAll hooks  
✅ Use realistic test data and scenarios  
✅ Test both success and error cases  
✅ Use proper timeouts for network operations  
✅ Test concurrent operations for race conditions  

### DON'T
❌ Rely on mocks for integration tests  
❌ Hard-code server details (use TestSSHFixtures)  
❌ Leave connections open after tests  
❌ Use production credentials in tests  
❌ Skip cleanup in afterAll hooks  

---

## Related Documentation

- **[TESTING-GUIDE.md](TESTING-GUIDE.md)** - Complete testing guide including WSL setup
- **[Issue #85](https://github.com/shavali-arc/quantumxfer/issues/85)** - Docker SSH test server tracking
- **[Issue #74](https://github.com/shavali-arc/quantumxfer/issues/74)** - Functional/blackbox testing parent issue
- **[.github/workflows/integration-tests.yml](.github/workflows/integration-tests.yml)** - CI workflow configuration

---

## Support

For integration testing issues:
1. Check [Troubleshooting](#troubleshooting) section
2. Review [GitHub Issues](https://github.com/shavali-arc/quantumxfer/issues)
3. Check CI logs in GitHub Actions tab

---

**Last Updated**: December 14, 2025  
**Test Framework**: Vitest 2.1.9  
**SSH Server**: LinuxServer OpenSSH  
**Docker Support**: Required
