#!/usr/bin/env node
/**
 * Orchestrate integration tests with the Docker SSH test server.
 * Starts the container, runs vitest integration suite, and always stops the container.
 */
import { execSync } from 'child_process';

function run(cmd) {
  execSync(cmd, { stdio: 'inherit', shell: true });
}

async function main() {
  try {
    run('node tests/scripts/ssh-test-server.js start');
    run('vitest tests/integration --run');
  } catch (err) {
    console.error('[integration-with-ssh] error:', err.message);
    process.exitCode = 1;
  } finally {
    try {
      run('node tests/scripts/ssh-test-server.js stop');
    } catch (err) {
      console.error('[integration-with-ssh] cleanup error:', err.message);
    }
  }
}

main();
