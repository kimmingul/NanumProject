import { writeFileSync, mkdirSync, createWriteStream } from 'node:fs';
import { dirname, join } from 'node:path';
import { pipeline } from 'node:stream/promises';
import { createHash } from 'node:crypto';
import type { Readable } from 'node:stream';

export class FileWriter {
  constructor(private baseDir: string) {}

  writeJson(relativePath: string, data: unknown): void {
    const fullPath = join(this.baseDir, relativePath);
    mkdirSync(dirname(fullPath), { recursive: true });
    writeFileSync(fullPath, JSON.stringify(data, null, 2), 'utf-8');
  }

  async writeStream(relativePath: string, stream: Readable): Promise<string> {
    const fullPath = join(this.baseDir, relativePath);
    mkdirSync(dirname(fullPath), { recursive: true });

    const hash = createHash('sha256');
    const fileStream = createWriteStream(fullPath);

    // Pipe through hash calculation
    stream.on('data', (chunk: Buffer) => hash.update(chunk));

    await pipeline(stream, fileStream);

    return hash.digest('hex');
  }

  getFullPath(relativePath: string): string {
    return join(this.baseDir, relativePath);
  }
}
