export interface CliArgs {
  discoverOnly: boolean;
  verifyOnly: boolean;
  resume: boolean;
  skipDocuments: boolean;
  entity?: string;
}

export interface VerificationCounts {
  projects: { extracted: number; expected: number };
  tasks: { extracted: number; expected: number };
  users: { extracted: number; expected: number };
  comments: { extracted: number; expected: number };
  timeBlocks: { extracted: number; expected: number };
  boards: { extracted: number; expected: number };
  documents: { extracted: number; downloaded: number };
}

export interface IntegrityReport {
  timestamp: string;
  overall: 'pass' | 'fail' | 'warnings';
  counts: VerificationCounts;
  orphans: Array<{
    entity: string;
    id: string;
    missingReference: string;
  }>;
  errors: string[];
  warnings: string[];
}
