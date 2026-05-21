import { existsSync, unlinkSync } from 'node:fs';

export async function freshDb(path: string): Promise<void> {
	for (const ext of ['', '-shm', '-wal', '-journal']) {
		const p = `${path}${ext}`;
		if (existsSync(p)) unlinkSync(p);
	}
	const proc = Bun.spawnSync({
		cmd: ['bun', 'src/db/migrate.ts'],
		env: { ...process.env, DB_PATH: path, INITIAL_PASSWORD: process.env.INITIAL_PASSWORD ?? 'pw' },
		stdout: 'pipe',
		stderr: 'pipe',
	});
	if (proc.exitCode !== 0) {
		throw new Error(`migrate failed: ${proc.stderr.toString()}`);
	}
}

export function cleanupDb(path: string): void {
	for (const ext of ['', '-shm', '-wal', '-journal']) {
		const p = `${path}${ext}`;
		if (existsSync(p)) unlinkSync(p);
	}
}
