---
name: adopt-traceweave
description: Adopt TraceWeave into projects — probe repository structure, create deterministic backups, and apply non-destructive overlay or full clean-root restructure.
---

# Adopt TraceWeave

Apply TraceWeave's V-Model traceability matrix and test stratum analyzer to any repository.

## Leading words

**probe** — Inspect repository topology: scan languages, testing setups, existing docs, package manifests, and git cleanliness.
**checkpoint** — Guard existing assets: create a verified, timestamped backup and manifest (`.traceweave-backup/`) before touching files.
**overlay** — Apply non-destructive adoption: keep existing structure intact; add `docs/` V-Model skeleton, `bin/` wrappers, and `.cursor/rules/`.
**restructure** — Apply full clean-root migration: reorganize the repository to TraceWeave standards (encapsulate source into `src/`, route commands via `bin/`, purge root clutter).
**verify** — Prove mechanical correctness: run `./bin/traceweave check` and ensure all starter docs strictly satisfy `docs-document-schema.mdc` with exit code 0.
**rollback** — Revert cleanly: restore original files from the checkpoint manifest if any phase fails or user requests cancellation.

---

## Steps

### 1. probe (Analyze Project Topology)

Inspect the target repository before applying changes:
1. Identify the target directory path (default: current workspace).
2. Scan root files and subdirectories to detect:
   - Primary languages (`TypeScript`, `JavaScript`, `Python`, `Go`, `Rust`, etc.)
   - Test runner and command (`jest`, `vitest`, `pytest`, `go test`, `cargo test`, `npm test`)
   - Existing documentation (`README.md`, existing `docs/`, `spec/`)
   - Existing source directories (`src/`, `lib/`, `app/`)
3. Check Git working tree cleanliness via `git status --porcelain`.
4. Determine adoption branch with the user:
   - **Branch A (overlay)**: Safe, temporary, non-destructive trial. Keeps existing structure unchanged.
   - **Branch B (restructure)**: Permanent architecture migration. Reorganizes root to TraceWeave clean-root layout.

**Completion criterion**: Detected project attributes (language, test runner, git state) are documented, and adoption mode (`overlay` or `restructure`) is confirmed.

---

### 2. checkpoint (Create Verified Backup)

Create a safe backup before any modification:
1. Run the backup command or ensure automatic backup is enabled:
   ```bash
   ./bin/traceweave adopt "<targetDir>" --mode <overlay|restructure> --dry-run
   ```
2. For live execution, ensure the backup directory (`.traceweave-backup/<timestamp>_<mode>/`) is created.
3. Verify that `backup-manifest.json` exists inside the backup directory and lists all backed-up files.

**Completion criterion**: A timestamped backup exists in `.traceweave-backup/` containing `backup-manifest.json` with a non-empty `backedUpFiles` record.

---

### 3. adopt (Execute Selected Mode)

Apply TraceWeave using the adoption engine:

#### Branch A: Overlay Mode (`overlay`)
Execute non-destructive overlay:
```bash
./bin/traceweave adopt "<targetDir>" --mode overlay
```
1. Injects `docs/` V-Model skeleton (`NEED-0001`, `ACT-0001`, `UC-0001`, `REQ-0001`, `SPEC-0001`, `DSN-0001`, `ADR-0001`, `QA-0001`, `TC-0001`, `SYSTEM_OVERVIEW.md`) with detected project metadata.
2. Injects transparent execution wrappers (`bin/traceweave`, `bin/traceweave.cmd`, `bin/traceweave.ps1`).
3. Injects Cursor rules (`.cursor/rules/docs-document-schema.mdc`, `implementation-workflow.mdc`).

#### Branch B: Restructure Mode (`restructure`)
Execute full clean-root restructure:
```bash
./bin/traceweave adopt "<targetDir>" --mode restructure
```
1. Executes all overlay steps above.
2. Moves root development manifests (`package.json`, `tsconfig.json`) into `src/`.
3. Injects clean-root `.gitignore` rules (`src/node_modules/`, `src/dist/`, `.traceweave-backup/`).
4. Injects root governance document `DEVELOPER_GUIDE.md`.

**Completion criterion**: All starter files exist at target paths, executable permissions are set on `bin/traceweave`, and no unbacked-up files were deleted.

---

### 4. verify & guard (Validate Docs & Traceability)

Prove that the adopted project satisfies all TraceWeave rules:
1. Run schema and cycle validation in the target project:
   ```bash
   ./bin/traceweave check -d "<targetDir>/docs"
   ```
2. Confirm the output reports:
   - `0 errors`
   - `PASS: Traceability and documentation checks passed successfully!`
3. Verify that starter test case `TC-0001` matches the detected project test runner.
4. If validation fails and cannot be resolved immediately, execute rollback:
   ```bash
   ./bin/traceweave adopt "<targetDir>" --rollback "<backupDir>"
   ```

**Completion criterion**: `./bin/traceweave check` completes with exit code 0.

---

## References

- **Rollback one-liner**:
  ```bash
  ./bin/traceweave adopt "<targetDir>" --rollback "<targetDir>/.traceweave-backup/<timestamp>_<mode>"
  ```
- **CLI Options**:
  - `--mode <overlay|restructure>`: Mode selection
  - `--backup-dir <path>`: Custom backup directory
  - `--dry-run`: Preview actions without touching disk
  - `--force`: Bypass git dirty-tree guard for restructure
