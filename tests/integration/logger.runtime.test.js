import { spawn } from 'child_process';
import path from 'path';

// Allow extra time for spawning the Node process and Matter server init
jest.setTimeout(20000);

function runWithEnv(env) {
  return new Promise((resolve, reject) => {
    const stdoutChunks = [];
    const stderrChunks = [];
    // Use tsx to execute TypeScript directly - it's faster and better with ESM
    const tsxPath = path.resolve(__dirname, '../../node_modules/.bin/tsx');
    const child = spawn(tsxPath, [path.resolve(__dirname, '../../index.ts')], {
      env: {
        ...process.env,
        ...env,
      },
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    child.stdout.on('data', (d) => stdoutChunks.push(d));
    child.stderr.on('data', (d) => stderrChunks.push(d));
    child.on('error', reject);
    child.on('close', (code) => {
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
    EXIT_AFTER_MS: '1500', // allow a bit more time to flush logs
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
