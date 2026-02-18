import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';

/**
 * Manages TeamGantt INT ID <-> Supabase UUID mappings.
 * Supports persistence for resume capability.
 */
export class IdMapper {
  private maps: Map<string, Map<number, string>> = new Map();

  set(entity: string, tgId: number, uuid: string): void {
    if (!this.maps.has(entity)) {
      this.maps.set(entity, new Map());
    }
    this.maps.get(entity)!.set(tgId, uuid);
  }

  get(entity: string, tgId: number): string | undefined {
    return this.maps.get(entity)?.get(tgId);
  }

  getRequired(entity: string, tgId: number): string {
    const uuid = this.get(entity, tgId);
    if (!uuid) {
      throw new Error(`ID mapping not found: ${entity}/${tgId}`);
    }
    return uuid;
  }

  has(entity: string, tgId: number): boolean {
    return this.maps.get(entity)?.has(tgId) ?? false;
  }

  getEntityCount(entity: string): number {
    return this.maps.get(entity)?.size ?? 0;
  }

  getAllEntities(): string[] {
    return [...this.maps.keys()];
  }

  save(filePath: string): void {
    const dir = dirname(filePath);
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }

    const data: Record<string, Record<string, string>> = {};
    for (const [entity, map] of this.maps) {
      data[entity] = {};
      for (const [tgId, uuid] of map) {
        data[entity][String(tgId)] = uuid;
      }
    }

    writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
  }

  load(filePath: string): void {
    if (!existsSync(filePath)) return;

    const raw = readFileSync(filePath, 'utf-8');
    const data = JSON.parse(raw) as Record<string, Record<string, string>>;

    for (const [entity, entries] of Object.entries(data)) {
      for (const [tgIdStr, uuid] of Object.entries(entries)) {
        this.set(entity, Number(tgIdStr), uuid);
      }
    }
  }

  summary(): string {
    const lines: string[] = [];
    for (const [entity, map] of this.maps) {
      lines.push(`  ${entity}: ${map.size} mappings`);
    }
    return lines.join('\n');
  }
}
