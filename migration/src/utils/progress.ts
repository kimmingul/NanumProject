import { readFileSync, existsSync } from 'node:fs';
import { FileWriter } from './file-writer.js';

export type PhaseStatus = 'pending' | 'in_progress' | 'completed' | 'failed';

export interface PhaseState {
  status: PhaseStatus;
  startedAt?: string;
  completedAt?: string;
  itemsProcessed: number;
  itemsTotal: number;
}

export interface ErrorEntry {
  timestamp: string;
  phase: string;
  entityId?: string;
  endpoint?: string;
  statusCode?: number;
  message: string;
}

export interface MigrationState {
  startedAt: string;
  lastUpdatedAt: string;
  phases: {
    discovery: PhaseState;
    company: PhaseState;
    projects: PhaseState;
    projectDetails: PhaseState;
    tasks: PhaseState;
    timeTracking: PhaseState;
    boards: PhaseState;
    documents: PhaseState;
    verification: PhaseState;
  };
  completedProjectIds: string[];
  completedTaskIds: string[];
  discoveredTaskIds: string[];
  discoveredGroupIds: string[];
  documentQueue: Array<{ docId: string; taskId: string; fileName: string }>;
  errors: ErrorEntry[];
}

const STATE_PATH = '_metadata/migration-state.json';

function createInitialPhase(): PhaseState {
  return { status: 'pending', itemsProcessed: 0, itemsTotal: 0 };
}

function createInitialState(): MigrationState {
  return {
    startedAt: new Date().toISOString(),
    lastUpdatedAt: new Date().toISOString(),
    phases: {
      discovery: createInitialPhase(),
      company: createInitialPhase(),
      projects: createInitialPhase(),
      projectDetails: createInitialPhase(),
      tasks: createInitialPhase(),
      timeTracking: createInitialPhase(),
      boards: createInitialPhase(),
      documents: createInitialPhase(),
      verification: createInitialPhase(),
    },
    completedProjectIds: [],
    completedTaskIds: [],
    discoveredTaskIds: [],
    discoveredGroupIds: [],
    documentQueue: [],
    errors: [],
  };
}

export class ProgressTracker {
  private state: MigrationState;
  private writer: FileWriter;

  constructor(writer: FileWriter, resume: boolean = false) {
    this.writer = writer;
    const fullPath = writer.getFullPath(STATE_PATH);

    if (resume && existsSync(fullPath)) {
      const raw = readFileSync(fullPath, 'utf-8');
      this.state = JSON.parse(raw) as MigrationState;
    } else {
      this.state = createInitialState();
    }

    this.save();
  }

  getState(): MigrationState {
    return this.state;
  }

  getPhase(name: keyof MigrationState['phases']): PhaseState {
    return this.state.phases[name];
  }

  startPhase(name: keyof MigrationState['phases'], total?: number): void {
    this.state.phases[name] = {
      status: 'in_progress',
      startedAt: new Date().toISOString(),
      itemsProcessed: 0,
      itemsTotal: total ?? 0,
    };
    this.save();
  }

  updatePhaseProgress(name: keyof MigrationState['phases'], processed: number, total?: number): void {
    const phase = this.state.phases[name];
    phase.itemsProcessed = processed;
    if (total !== undefined) phase.itemsTotal = total;
    this.save();
  }

  completePhase(name: keyof MigrationState['phases']): void {
    this.state.phases[name].status = 'completed';
    this.state.phases[name].completedAt = new Date().toISOString();
    this.save();
  }

  failPhase(name: keyof MigrationState['phases']): void {
    this.state.phases[name].status = 'failed';
    this.state.phases[name].completedAt = new Date().toISOString();
    this.save();
  }

  isPhaseCompleted(name: keyof MigrationState['phases']): boolean {
    return this.state.phases[name].status === 'completed';
  }

  addCompletedProject(projectId: string): void {
    if (!this.state.completedProjectIds.includes(projectId)) {
      this.state.completedProjectIds.push(projectId);
      this.save();
    }
  }

  isProjectCompleted(projectId: string): boolean {
    return this.state.completedProjectIds.includes(projectId);
  }

  addCompletedTask(taskId: string): void {
    if (!this.state.completedTaskIds.includes(taskId)) {
      this.state.completedTaskIds.push(taskId);
      // Save periodically instead of every task to reduce I/O
      if (this.state.completedTaskIds.length % 50 === 0) {
        this.save();
      }
    }
  }

  isTaskCompleted(taskId: string): boolean {
    return this.state.completedTaskIds.includes(taskId);
  }

  addDiscoveredTasks(taskIds: string[]): void {
    for (const id of taskIds) {
      if (!this.state.discoveredTaskIds.includes(id)) {
        this.state.discoveredTaskIds.push(id);
      }
    }
    this.save();
  }

  addDiscoveredGroups(groupIds: string[]): void {
    for (const id of groupIds) {
      if (!this.state.discoveredGroupIds.includes(id)) {
        this.state.discoveredGroupIds.push(id);
      }
    }
    this.save();
  }

  addDocumentToQueue(docId: string, taskId: string, fileName: string): void {
    if (!this.state.documentQueue.some(d => d.docId === docId)) {
      this.state.documentQueue.push({ docId, taskId, fileName });
    }
  }

  getDocumentQueue() {
    return this.state.documentQueue;
  }

  addError(error: Omit<ErrorEntry, 'timestamp'>): void {
    this.state.errors.push({
      ...error,
      timestamp: new Date().toISOString(),
    });
    this.save();
  }

  save(): void {
    this.state.lastUpdatedAt = new Date().toISOString();
    this.writer.writeJson(STATE_PATH, this.state);
  }
}
