// @ts-nocheck
import { spawn } from 'child_process';
import path from 'path';

// Timeout is now a safety net for exceptional failures only
// Normal operation completes when __READY__ signal is received
jest.setTimeout(20000);

function runWithEnv(env) {
  return new Promise((resolve, reject) => {
    const stdoutChunks = [];
    const stderrChunks = [];
    let isReady = false;
    
    // Use tsx to execute TypeScript directly - it's faster and better with ESM
    const tsxPath = path.resolve(__dirname, '../../node_modules/.bin/tsx');
    const child = spawn(tsxPath, [path.resolve(__dirname, '../../index.ts')], {
      env: {
        ...process.env,
        ...env,
        EMIT_READY_SIGNAL: 'true', // Request explicit ready signal
      },
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    // Listen for explicit ready signal on stdout
    child.stdout.on('data', (data) => {
      stdoutChunks.push(data);
    });

    // Listen for ready/failed signals on stderr
    child.stderr.on('data', (data) => {
      stderrChunks.push(data);
      const output = data.toString();
      
      if (output.includes('__READY__')) {
        isReady = true;
        // Give it a moment to capture any trailing logs, then gracefully exit
        setTimeout(() => {
          child.kill('SIGTERM');
        }, 100);
      } else if (output.includes('__FAILED__')) {
        child.kill('SIGTERM');
        reject(new Error('Matter server failed to start'));
      }
    });

    child.on('error', reject);

    // Safety timeout - only for catching exceptional hangs
    // Normal operation completes via __READY__ signal
    const safetyTimeout = setTimeout(() => {
      child.kill('SIGKILL'); // Force kill on timeout
      reject(new Error(
        `Test timeout: ${isReady ? 'Ready signal received but process hung' : 'No ready signal received - Matter.js may have hung'}`
      ));
    }, 18000); // 18s - gives plenty of margin but catches real hangs

    child.on('close', (code) => {
      clearTimeout(safetyTimeout);
      resolve({
        code,
        stdout: Buffer.concat(stdoutChunks).toString('utf8'),
        stderr: Buffer.concat(stderrChunks).toString('utf8'),
      });
    });
  });
}

describe('Runtime log level behavior (child process)', () => {
  const baseEnv = {
    NODE_ENV: 'development', // ensure index.js runs the device startup logic
    RTT_USER: 'demo',
    RTT_PASS: 'demo',
    // No longer need EXIT_AFTER_MS - we wait for explicit __READY__ signal
    MATTER_LOG_FORMAT: 'plain', // avoid ANSI color codes for easier matching
    FORCE_COLOR: '0', // ensure no color codes interfere
  };

  test('LOG_LEVEL=info suppresses all DEBUG logs', async () => {
    const { stdout, stderr } = await runWithEnv({ ...baseEnv, LOG_LEVEL: 'info' });
    const out = `${stdout}${stderr}`;
    // Should contain INFO lines but no DEBUG lines at all (Pino format or matter.js format)
    expect(out).toMatch(/INFO|"level":30/);
    expect(out).not.toMatch(/DEBUG|"level":20/);
    // The explicit verification debug message must be absent
    expect(out).not.toContain('Debug verification');
  });

  test('LOG_LEVEL=debug includes DEBUG logs', async () => {
    const { stdout, stderr } = await runWithEnv({ ...baseEnv, LOG_LEVEL: 'debug' });
    const out = `${stdout}${stderr}`;
    // Expect presence of debug lines from facilities and the verification message (Pino or matter.js format)
    expect(out).toMatch(/DEBUG|"level":20/);
    expect(out).toContain('Debug verification');
  });
});
