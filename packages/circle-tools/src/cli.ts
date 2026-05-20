import { execFileSync } from 'node:child_process';

export interface CliOptions {
  /** Append `--output json` if not already present. */
  json?: boolean;
  /** Working directory for the child process. */
  cwd?: string;
  /** Override the `circle` binary path (defaults to `circle` on PATH). */
  binary?: string;
  /** Extra environment variables for the child process. */
  env?: NodeJS.ProcessEnv;
}

export class CircleCliError extends Error {
  constructor(
    message: string,
    readonly args: readonly string[],
    readonly stdout: string,
    readonly stderr: string,
    readonly exitCode: number | null,
  ) {
    super(message);
    this.name = 'CircleCliError';
  }
}

/**
 * Invoke the Circle CLI synchronously with the given args and return stdout.
 * Wraps `child_process.execFileSync` against the globally installed `circle` binary
 * (`bun add -g @circle-fin/cli`).
 *
 * Uses `execFileSync` rather than `execSync`: arguments like service URLs,
 * keywords, and JSON payloads pass through verbatim with no shell parsing,
 * preventing shell metacharacters in untrusted input from being interpreted.
 */
export function runCircle(args: readonly string[], options: CliOptions = {}): string {
  const finalArgs =
    options.json && !args.includes('--output') ? [...args, '--output', 'json'] : [...args];
  const binary = options.binary ?? 'circle';
  try {
    return execFileSync(binary, finalArgs, {
      cwd: options.cwd,
      env: options.env ?? process.env,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
      maxBuffer: 10 * 1024 * 1024,
    });
  } catch (err) {
    const e = err as {
      stderr?: Buffer | string;
      stdout?: Buffer | string;
      status?: number | null;
      message: string;
    };
    const stderr = e.stderr ? e.stderr.toString() : '';
    const stdout = e.stdout ? e.stdout.toString() : '';
    const detail = stderr.trim() || stdout.trim() || e.message;
    throw new CircleCliError(
      `circle ${finalArgs.join(' ')} failed: ${detail}`,
      finalArgs,
      stdout,
      stderr,
      e.status ?? null,
    );
  }
}

/** Run the CLI with `--output json` and parse the resulting JSON payload. */
export function runCircleJson<T>(args: readonly string[], options: CliOptions = {}): T {
  const out = runCircle(args, { ...options, json: true });
  const trimmed = out.trim();
  try {
    return JSON.parse(trimmed) as T;
  } catch (err) {
    throw new CircleCliError(
      `Failed to parse JSON output from circle ${args.join(' ')}: ${(err as Error).message}`,
      args,
      out,
      '',
      0,
    );
  }
}
