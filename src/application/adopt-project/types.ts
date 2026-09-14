export type AdoptionMode = 'overlay' | 'restructure';

export interface AdoptionOptions {
  targetDir?: string;
  mode?: AdoptionMode;
  backupDir?: string;
  noBackup?: boolean;
  dryRun?: boolean;
  rollbackPath?: string;
  force?: boolean;
  projectName?: string;
  silent?: boolean;
}

export interface ProjectProbeResult {
  projectName: string;
  languages: string[];
  testFramework?: string;
  packageJsonDir: '.' | 'src';
  hasPackageJson: boolean;
  hasGit: boolean;
  isGitDirty: boolean;
  existingDocsDir: boolean;
  existingSrcDir: boolean;
  rootFiles: string[];
}

export interface BackupManifest {
  version: '1.0.0';
  createdAt: string;
  mode: AdoptionMode;
  targetDir: string;
  backupDir: string;
  backedUpFiles: string[];
  createdFiles: string[];
}
