# E2E Testing Guide - QuantumXfer

Complete guide to End-to-End testing with Playwright for the QuantumXfer Electron application.

## Overview

This guide covers the E2E testing infrastructure, test suites, and workflows for QuantumXfer Phase 2 testing.

**Framework**: Playwright (modern replacement for Spectron)
**Current Tests**: 53 tests across 6 suites
**Status**: 100% passing (3.5m duration)

## Quick Start

### Running Tests Locally

```bash
# Run all E2E tests
npm run test:e2e

# Run with visible browser (headed mode)
npm run test:e2e:headed

# Run with Playwright debugger
npm run test:e2e:debug

# Run specific test suite
npx playwright test tests/e2e/app-startup.spec.ts

# Run single test
npx playwright test tests/e2e/app-startup.spec.ts -g "should launch"

# Show test report
npx playwright show-report
```

### First Time Setup

```bash
# 1. Install dependencies
npm install

# 2. Install Playwright browsers
npx playwright install

# 3. Build the app
npm run build

# 4. Run tests
npm run test:e2e
```

## Test Suites

### 1. Application Startup (7 tests)

Location: `tests/e2e/app-startup.spec.ts`

Tests the basic Electron app initialization:
- Application launch and window creation
- Window title verification
- Main container rendering
- Window dimensions and sizing
- React application loading
- Graceful application shutdown
- Console error detection

**Key Assertions**:
```typescript
// App launches successfully
const { app, window } = await launchApp();
expect(app).toBeTruthy();
expect(window).toBeTruthy();

// Window has correct properties
const title = await getWindowTitle();
expect(title).toContain('QuantumXfer');
```

### 2. Connection Management (8 tests)

Location: `tests/e2e/connection-management.spec.ts`

Tests SSH connection form and profile management:
- Connection form display
- Input field functionality
- Profile management UI
- Required field validation
- SSH connection attempts
- Connection status feedback
- Form state preservation
- Field clearing

**Key Test Pattern**:
```typescript
const { window } = await launchApp();
await window.waitForSelector('#root', { state: 'attached' });

// Find and fill connection form
const inputs = await window.$$('input');
await inputs[0].fill('test-host.example.com');
```

### 3. Command Execution (9 tests)

Location: `tests/e2e/command-execution.spec.ts`

Tests the terminal and command execution UI:
- Terminal interface display
- Command input field
- Output display area
- Command history access
- Command submission
- Execution control buttons
- Output formatting
- Current directory/prompt
- Long output handling

### 4. File Browser (10 tests)

Location: `tests/e2e/file-browser.spec.ts`

Tests file system navigation:
- File browser interface
- Navigation controls
- Directory traversal
- File properties display
- File list sorting
- Breadcrumb navigation
- Empty directory display
- File selection
- Loading state display
- File type indicators

### 5. File Transfers (9 tests)

Location: `tests/e2e/file-transfers.spec.ts`

Tests upload/download functionality:
- Transfer UI display
- Upload button
- Download button
- Transfer queue display
- Progress indication
- Transfer status
- Transfer cancellation
- Error message display
- File size information

### 6. Error Handling (10 tests)

Location: `tests/e2e/error-handling.spec.ts`

Tests error scenarios and recovery:
- Error message display
- Invalid host handling
- Connection timeout handling
- Connection failure recovery
- Authentication failure handling
- Required field validation
- Disabled operations when disconnected
- User-friendly error messages
- Rapid operation handling
- UI state preservation after errors

## Test Infrastructure

### Helpers Module

Location: `tests/e2e/helpers.ts`

Provides utility functions for testing:

```typescript
// Launch app for testing
const { app, window } = await launchApp();

// Close app and cleanup
await closeApp();

// Wait for app ready
await waitForAppReady();

// Capture screenshot on failure
await captureScreenshot('test-name');

// App lifecycle utilities
await window.waitForSelector('#root', { state: 'attached' });
```

### Configuration

Location: `playwright.config.ts`

Key settings:
- **Timeout**: 30 seconds per test
- **Retries**: 1 local, 2 in CI
- **Workers**: 1 (serial execution for Electron)
- **Screenshots**: Only on failure
- **Video**: Retained on failure
- **Trace**: Collected on first retry

```typescript
export default defineConfig({
  testDir: './tests/e2e',
  timeout: 30 * 1000,
  retries: process.env.CI ? 2 : 1,
  workers: 1,
  use: {
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    trace: 'on-first-retry',
  },
});
```

## CI/CD Integration

### GitHub Actions Workflow

Location: `.github/workflows/e2e-tests.yml`

**Features**:
- Matrix testing: Ubuntu & Windows
- Node 22 LTS
- 30-minute timeout
- Display server for headless testing (Linux)
- Artifact upload (reports, videos, screenshots)

**Triggers**:
- Push to main, develop, or feature branches
- Pull requests to main or develop

**Example Run**:
```yaml
- Run E2E tests
  run: npm run test:e2e
  
- Upload test reports
  uses: actions/upload-artifact@v4
  with:
    name: playwright-report-${{ matrix.os }}
    path: test-results/e2e-report/
```

## Writing New Tests

### Test Structure

```typescript
import { test, expect } from '@playwright/test';
import { launchApp, closeApp, captureScreenshot } from './helpers';

test.describe('Feature Name', () => {
  
  test.beforeEach(async () => {
    await closeApp(); // Clean state
  });

  test.afterEach(async ({ }, testInfo) => {
    if (testInfo.status !== 'passed') {
      await captureScreenshot(testInfo.title);
    }
    await closeApp();
  });

  test('should do something', async () => {
    const { window } = await launchApp();
    
    // Wait for app ready
    await window.waitForSelector('#root', { state: 'attached' });
    
    // Perform test
    const element = await window.$('selector');
    expect(element).toBeTruthy();
  });
});
```

### Best Practices

1. **One assertion per test** (or logically grouped)
2. **Use meaningful test names** - describe what's tested
3. **Always cleanup** - call `closeApp()` in afterEach
4. **Wait for elements** - use proper selectors and timeouts
5. **Handle errors gracefully** - test error scenarios
6. **Avoid hardcoded waits** - use `waitForSelector` or `waitForNavigation`

### Common Patterns

**Finding Elements**:
```typescript
// By selector
const element = await window.$('button');

// Multiple elements
const buttons = await window.$$('button');

// By text (if supported)
const button = await window.$('button:has-text("Click Me")');
```

**Interacting with Elements**:
```typescript
// Click
await element.click();

// Type text
await input.fill('text');

// Get value
const value = await input.inputValue();

// Get text
const text = await element.textContent();
```

**Waiting**:
```typescript
// Wait for element
await window.waitForSelector('selector', { state: 'visible' });

// Wait for navigation
await window.waitForNavigation();

// Wait for timeout
await window.waitForTimeout(1000);
```

## Debugging Tests

### View Test Report

```bash
npx playwright show-report
```

This opens an interactive HTML report showing:
- All test results
- Screenshots
- Videos
- Execution traces
- Detailed error messages

### Debug Mode

```bash
npm run test:e2e:debug
```

Opens Playwright Inspector for step-by-step execution:
- Step through tests
- Inspect elements
- Evaluate expressions
- View network activity

### Screenshots and Videos

Automatically captured on failure in:
- `test-results/screenshots/` - Failed test screenshots
- `test-results/e2e-artifacts/` - Videos and traces
- `test-results/e2e-report/` - HTML report

### View Traces

```bash
npx playwright show-trace test-results/e2e-artifacts/.../trace.zip
```

Interactive trace viewer showing:
- Network requests
- Console messages
- DOM mutations
- Screenshot timeline

## Troubleshooting

### Tests Timing Out

**Problem**: Test exceeds 30 second timeout

**Solutions**:
1. Increase timeout in specific test: `test.setTimeout(60000)`
2. Check for missing `await` statements
3. Ensure `waitForSelector` has proper timeout
4. Check app performance

### Element Not Found

**Problem**: `waitForSelector` fails to find element

**Solutions**:
1. Verify selector is correct
2. Check if element loads after connection
3. Use broader selector (e.g., `div` instead of `[data-testid="specific"]`)
4. Add explicit wait: `await window.waitForTimeout(1000)`

### Window Closed Errors

**Problem**: "Target page has been closed"

**Solutions**:
1. Check `closeApp()` isn't called prematurely
2. Ensure `test.afterEach()` cleanup happens last
3. Verify app doesn't auto-close
4. Check for unhandled errors causing app exit

### Flaky Tests

**Problem**: Test passes sometimes, fails others

**Solutions**:
1. Add `waitForSelector` instead of hard waits
2. Ensure proper element state before interaction
3. Use `window.waitForLoadState('domcontentloaded')`
4. Check app initialization timing
5. Increase retry count (already set to 2 in CI)

## Test Data & Fixtures

### SSH Credentials

```typescript
export const testCredentials = {
  host: '127.0.0.1',
  port: 2222,
  username: 'testuser',
  password: 'testpass'
};
```

Note: For actual SSH testing, use the Docker SSH server from Phase 1.

### App Paths

```typescript
// Main entry point
path.join(__dirname, '../../electron/main.js')

// Built app
dist/index.html

// Test results
test-results/
```

## Performance Metrics

### Current Test Suite

- **Total Tests**: 53
- **Pass Rate**: 100%
- **Duration**: 3.5 minutes
- **Avg Test Time**: 4 seconds
- **Max Test Time**: 8.9 seconds (file browser navigation)

### Performance Targets

- Keep individual test time under 10 seconds
- Total suite under 5 minutes
- 100% pass rate in CI

## Continuous Integration

### On Push

Tests run automatically on:
- Push to main, develop, feature branches
- Pull requests to main, develop

### Artifact Retention

- Test reports: 30 days
- Screenshots: 7 days
- Videos: 7 days
- Traces: Not uploaded (use local)

### Test Matrix

Runs on:
- Ubuntu Latest (Linux)
- Windows Latest (Windows)
- Node 22 LTS

## Maintenance

### Adding New Test Suites

1. Create `tests/e2e/feature-name.spec.ts`
2. Use consistent structure (see "Writing New Tests")
3. Add before/after hooks
4. Update test count in this guide
5. Test locally: `npm run test:e2e`
6. Commit: `[Issue #XX] Add feature-name E2E tests`

### Updating Playwright

```bash
# Check for updates
npm outdated @playwright/test

# Update Playwright
npm update @playwright/test
npx playwright install

# Test with new version
npm run test:e2e
```

### Common Maintenance Tasks

```bash
# Update all dependencies
npm update

# Audit for vulnerabilities
npm audit

# Clean test artifacts
rm -rf test-results/

# Reinstall browsers
npx playwright install --with-deps
```

## Resources

- [Playwright Documentation](https://playwright.dev)
- [Playwright API Reference](https://playwright.dev/docs/api/class-page)
- [Electron Testing Guide](https://www.electronjs.org/docs/latest/tutorial/testing)
- [QuantumXfer Repository](https://github.com/shavali-arc/quantumxfer)

## Support

For issues or questions about E2E testing:

1. Check test output and screenshots in `test-results/`
2. Review test report: `npx playwright show-report`
3. Check GitHub Issues (#83 for Phase 2)
4. Review similar tests in same suite
5. Create issue with test failure details

---

**Last Updated**: December 15, 2025
**Phase**: 2 - E2E Testing
**Status**: Complete (53/53 tests passing)
