import { spawn } from 'child_process';
import path from 'path';

// Allow extra time for spawning the Node process and Matter server init
jest.setTimeout(20000);

function runWithEnv(env) {
  return new Promise((resolve, reject) => {
    const stdoutChunks = [];
    const stderrChunks = [];
    const child = spawn(process.execPath, [path.resolve(__dirname, '..', 'index.js')], {
      env: {
        ...process.env,
        ...env,
      },
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    child.stdout.on('data', d => stdoutChunks.push(d));
    child.stderr.on('data', d => stderrChunks.push(d));
    child.on('error', reject);
    child.on('close', code => {
      resolve({ code, stdout: Buffer.concat(stdoutChunks).toString('utf8'), stderr: Buffer.concat(stderrChunks).toString('utf8') });
    });
  });
}

describe('Runtime log level behavior (child process)', () => {
  const baseEnv = {
    NODE_ENV: 'development', // ensure index.js runs the device startup logic
    RTT_USER: 'demo',
    RTT_PASS: 'demo',
    EXIT_AFTER_MS: '1000', // keep runtime short for faster tests
    MATTER_LOG_FORMAT: 'plain', // avoid ANSI color codes for easier matching
  };

  test('LOG_LEVEL=info suppresses all DEBUG logs', async () => {
    const { stdout } = await runWithEnv({ ...baseEnv, LOG_LEVEL: 'info' });
    // Should contain INFO lines but no DEBUG lines at all
    expect(stdout).toMatch(/INFO\s+rtt-checker/);
    expect(stdout).not.toMatch(/\bDEBUG\b/);
    // The explicit verification debug message must be absent
    expect(stdout).not.toContain('Debug verification');
  });

  test('LOG_LEVEL=debug includes DEBUG logs', async () => {
    const { stdout } = await runWithEnv({ ...baseEnv, LOG_LEVEL: 'debug' });
    // Expect presence of debug lines from facilities and the verification message
    expect(stdout).toMatch(/\bDEBUG\b/);
    expect(stdout).toContain('Debug verification');
  });
});
