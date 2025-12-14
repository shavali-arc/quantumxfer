/**
 * Integration Testing Helpers
 * 
 * Utilities and helpers for integration testing
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Create temporary test directory
 */
export function createTestDirectory(baseName = 'test-') {
  const testDir = path.join('/tmp', baseName + Date.now());
  if (!fs.existsSync(testDir)) {
    fs.mkdirSync(testDir, { recursive: true });
  }
  return testDir;
}

/**
 * Clean up test directory
 */
export function cleanupTestDirectory(dirPath) {
  try {
    if (fs.existsSync(dirPath)) {
      fs.rmSync(dirPath, { recursive: true, force: true });
    }
  } catch (err) {
    console.error(`Error cleaning up test directory ${dirPath}:`, err);
  }
}

/**
 * Create test file with content
 */
export function createTestFile(dirPath, fileName, content = '', sizeBytes = 0) {
  const filePath = path.join(dirPath, fileName);
  
  if (sizeBytes > 0) {
    // Create file with specific size
    const buffer = Buffer.alloc(sizeBytes);
    fs.writeFileSync(filePath, buffer);
  } else if (content) {
    fs.writeFileSync(filePath, content);
  } else {
    fs.writeFileSync(filePath, '');
  }
  
  return filePath;
}

/**
 * Create test files
 */
export function createTestFiles(dirPath, count = 5) {
  const files = [];
  for (let i = 0; i < count; i++) {
    const fileName = `test-file-${i + 1}.txt`;
    const filePath = createTestFile(dirPath, fileName, `Test content ${i + 1}\n`);
    files.push(filePath);
  }
  return files;
}

/**
 * Verify file exists and has content
 */
export function verifyFileExists(filePath) {
  return fs.existsSync(filePath) && fs.statSync(filePath).size > 0;
}

/**
 * Get file size in bytes
 */
export function getFileSize(filePath) {
  try {
    return fs.statSync(filePath).size;
  } catch (err) {
    return 0;
  }
}

/**
 * Wait for condition with timeout
 */
export async function waitForCondition(condition, timeoutMs = 5000, intervalMs = 100) {
  const startTime = Date.now();
  
  while (Date.now() - startTime < timeoutMs) {
    if (await condition()) {
      return true;
    }
    await sleep(intervalMs);
  }
  
  return false;
}

/**
 * Sleep for milliseconds
 */
export function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Measure execution time
 */
export async function measureTime(fn) {
  const startTime = Date.now();
  const result = await fn();
  const duration = Date.now() - startTime;
  return { result, duration };
}

/**
 * Assert helper for tests
 */
export function assert(condition, message) {
  if (!condition) {
    throw new Error(`Assertion failed: ${message}`);
  }
}

/**
 * Assert file operations
 */
export const fileAssertions = {
  /**
   * Assert file exists
   */
  fileExists(filePath) {
    assert(
      fs.existsSync(filePath),
      `File should exist: ${filePath}`
    );
  },

  /**
   * Assert file does not exist
   */
  fileNotExists(filePath) {
    assert(
      !fs.existsSync(filePath),
      `File should not exist: ${filePath}`
    );
  },

  /**
   * Assert file has size
   */
  fileHasSize(filePath, expectedSize) {
    const actualSize = getFileSize(filePath);
    assert(
      actualSize === expectedSize,
      `File size should be ${expectedSize}, got ${actualSize}`
    );
  },

  /**
   * Assert file content
   */
  fileHasContent(filePath, expectedContent) {
    const content = fs.readFileSync(filePath, 'utf8');
    assert(
      content.includes(expectedContent),
      `File should contain "${expectedContent}"`
    );
  },

  /**
   * Assert directory exists
   */
  directoryExists(dirPath) {
    assert(
      fs.existsSync(dirPath) && fs.statSync(dirPath).isDirectory(),
      `Directory should exist: ${dirPath}`
    );
  },

  /**
   * Assert directory does not exist
   */
  directoryNotExists(dirPath) {
    assert(
      !fs.existsSync(dirPath),
      `Directory should not exist: ${dirPath}`
    );
  },

  /**
   * Assert directory has files
   */
  directoryHasFiles(dirPath, count) {
    const files = fs.readdirSync(dirPath).length;
    assert(
      files === count,
      `Directory should have ${count} files, got ${files}`
    );
  }
};

/**
 * Connection test helpers
 */
export const connectionHelpers = {
  /**
   * Verify successful connection
   */
  verifyConnection(result) {
    assert(
      result && result.success,
      'Connection should succeed'
    );
    assert(
      result.connectionId,
      'Connection should have ID'
    );
    return result.connectionId;
  },

  /**
   * Verify connection error
   */
  verifyConnectionError(error) {
    assert(
      error !== null && error !== undefined,
      'Connection should fail'
    );
  },

  /**
   * Verify command result
   */
  verifyCommandResult(result) {
    assert(
      result && result.success,
      'Command should execute successfully'
    );
    assert(
      result.output !== undefined,
      'Command should return output'
    );
    return result.output;
  }
};

/**
 * Performance test helpers
 */
export const performanceHelpers = {
  /**
   * Measure operation throughput
   */
  async measureThroughput(operation, count = 100) {
    const startTime = Date.now();
    
    for (let i = 0; i < count; i++) {
      await operation();
    }
    
    const duration = Date.now() - startTime;
    return {
      count,
      duration,
      opsPerSecond: (count / duration) * 1000
    };
  },

  /**
   * Measure memory usage
   */
  getMemoryUsage() {
    const usage = process.memoryUsage();
    return {
      heapUsed: Math.round(usage.heapUsed / 1024 / 1024), // MB
      heapTotal: Math.round(usage.heapTotal / 1024 / 1024), // MB
      rss: Math.round(usage.rss / 1024 / 1024), // MB
      external: Math.round(usage.external / 1024 / 1024) // MB
    };
  },

  /**
   * Assert performance within threshold
   */
  assertPerformance(duration, maxDurationMs, operationName) {
    assert(
      duration <= maxDurationMs,
      `${operationName} took ${duration}ms, expected <= ${maxDurationMs}ms`
    );
  }
};

export default {
  createTestDirectory,
  cleanupTestDirectory,
  createTestFile,
  createTestFiles,
  verifyFileExists,
  getFileSize,
  waitForCondition,
  sleep,
  measureTime,
  assert,
  fileAssertions,
  connectionHelpers,
  performanceHelpers
};
