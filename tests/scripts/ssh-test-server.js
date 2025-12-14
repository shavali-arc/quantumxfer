#!/usr/bin/env node
/**
 * Docker-based SSH/SFTP test server helper (Option C)
 *
 * Actions: start | stop | status | restart
 */
import { execSync } from 'child_process';
import net from 'net';

const containerName = 'quantumxfer-ssh-test';
const image = 'ghcr.io/linuxserver/openssh-server:latest';
const host = '127.0.0.1';
const port = 2222;
const username = 'testuser';
const password = 'testpass';

function run(cmd) {
  execSync(cmd, { stdio: 'inherit', shell: true });
}

function runCapture(cmd) {
  try {
    return execSync(cmd, { encoding: 'utf8', shell: true }).trim();
  } catch {
    return '';
  }
}

function isRunning() {
  const out = runCapture(`docker ps --filter "name=${containerName}" --format "{{.Names}}"`);
  return out.split('\n').some(line => line.trim() === containerName);
}

function waitForPort(timeoutMs = 15000) {
  const start = Date.now();
  return new Promise((resolve, reject) => {
    const tryConnect = () => {
      const socket = net.connect({ host, port }, () => {
        socket.end();
        resolve(true);
      });
      socket.on('error', () => {
        const elapsed = Date.now() - start;
        if (elapsed >= timeoutMs) {
          reject(new Error('SSH test server not reachable on port 2222'));
        } else {
          setTimeout(tryConnect, 500);
        }
      });
    };
    tryConnect();
  });
}

async function start() {
  if (isRunning()) {
    console.log(`[ssh-test-server] already running on ${host}:${port}`);
    return;
  }

  console.log('[ssh-test-server] pulling image if missing...');
  run(`docker pull ${image}`);

  console.log('[ssh-test-server] starting container...');
  run(
    `docker run -d --rm --name ${containerName} ` +
      `-e PUID=1000 -e PGID=1000 -e TZ=UTC ` +
      `-e PASSWORD_ACCESS=true -e USER_PASSWORD=${password} -e USER_NAME=${username} ` +
      `-p ${port}:2222 ${image}`
  );

  console.log('[ssh-test-server] waiting for port to be ready...');
  await waitForPort();
  console.log(`[ssh-test-server] ready at ${host}:${port} (user: ${username}/${password})`);
}

function stop() {
  if (!isRunning()) {
    console.log('[ssh-test-server] not running');
    return;
  }
  console.log('[ssh-test-server] stopping container...');
  run(`docker rm -f ${containerName}`);
}

function status() {
  const running = isRunning();
  if (running) {
    const info = runCapture(`docker ps --filter "name=${containerName}" --format "{{.Names}}: {{.Status}} | Ports: {{.Ports}}"`);
    console.log(`[ssh-test-server] running -> ${info}`);
  } else {
    console.log('[ssh-test-server] not running');
  }
}

async function main() {
  const action = (process.argv[2] || 'status').toLowerCase();
  try {
    if (action === 'start') {
      await start();
    } else if (action === 'stop') {
      stop();
    } else if (action === 'restart') {
      stop();
      await start();
    } else {
      status();
    }
  } catch (err) {
    console.error('[ssh-test-server] error:', err.message);
    process.exitCode = 1;
  }
}

main();
