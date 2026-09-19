---
name: traceweave-install-skills
description: Install TraceWeave Cursor skills (and optionally rules) to personal or project targets.
disable-model-invocation: true
---

# Install TraceWeave Skills

Deploy bundled `traceweave-*` skills from this repository to a Cursor skills directory.

Automation canonical: `scripts/install-cursor-skills.ts`.

## Leading words

**probe** — Confirm repository root and list bundled skills before copying.
**deploy** — Copy `traceweave-*` skill folders (and optionally `.cursor/rules/`) to the target.
**verify** — Confirm every deployed skill has `SKILL.md` at the destination.

## Targets

| Target | Destination | Use when |
|---|---|---|
| `personal` (default) | `~/.cursor/skills/` | Skills available across all workspaces |
| `project` | `<project>/.cursor/skills/` | Adopted repo or overlay install |

Project-scoped skills in `.cursor/skills/` are already available in this repository without install. Run deploy only when copying to another machine or external project.

## Steps

### 1. probe (Confirm source)

From the TraceWeave repository root:

```bash
tsx scripts/install-cursor-skills.ts --dry-run
```

Confirm output lists every `traceweave-*` skill under `.cursor/skills/`.

**Completion criterion**: Dry-run exits 0 and lists all expected skill names with no `FAIL`.

### 2. deploy (Copy skills)

Personal install (cross-workspace):

```bash
tsx scripts/install-cursor-skills.ts --target personal
```

Project install (external or adopted repo):

```bash
tsx scripts/install-cursor-skills.ts --target project --project-dir "<path-to-target>"
```

Include Cursor rules and TraceWeave subagents:

```bash
tsx scripts/install-cursor-skills.ts --target personal --with-rules --with-agents
```

Adopt (`./bin/traceweave adopt`) deploys the project target with `--with-rules --with-agents` automatically.

POSIX wrapper:

```bash
./.cursor/skills/traceweave-install-skills/scripts/install-skills.sh --target personal
```

Windows PowerShell:

```powershell
.\.cursor\skills\traceweave-install-skills\scripts\install-skills.ps1 -Target personal
```

**Completion criterion**: Script exits 0; each bundled skill directory exists at the target with `SKILL.md`.

### 3. verify (Confirm deployment)

1. List installed skills at the reported target path.
2. Open one skill (e.g. `traceweave-docs-audit/SKILL.md`) and confirm content matches the repository version.
3. If `--with-rules` was used, confirm `.mdc` rule files exist in the target `.cursor/rules/`.

**Completion criterion**: Every skill from probe is present at the destination; user is advised to reload Cursor if skills do not appear immediately.

## Bundled skills

| Skill | Purpose |
|---|---|
| `traceweave-adopt` | Adopt TraceWeave into external projects |
| `traceweave-document-authoring` | V-model document authoring |
| `traceweave-docs-audit` | Documentation governance audit |
| `traceweave-docs-export` | Consolidated doc export |
| `traceweave-install-skills` | This installer |
| `traceweave-test-case-review` | TC oracle, interface prose, atomicity, split lineage |
| Subagent `traceweave-test-case-reviewer` | Read-only TC batch audit (`.cursor/agents/`) |
| `traceweave-test-fixture` | Test fixture placement |
