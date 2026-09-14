---
name: traceweave-docs-export
description: Aggregate V-model docs into ephemeral 3-book exports (DOCUMENT_INDEX, CONSOLIDATED_DESIGN). Use when the user wants a single consolidated requirements/basic/detailed design document, 3書類集約, or DOCUMENT_INDEX generation.
---

# Docs Export

**verify** — prove canonical docs pass schema lint before aggregating.
**aggregate** — merge active `docs/` artifacts into 3-book layout per `scripts/lib/document-export-structure.ts`.
**ephemeral** — write only to `.export/docs/` (gitignored); never commit or edit canonical docs for export output.

## Steps

### 1. verify

```bash
npm --prefix src run lint
```

Resolve failures before exporting.

**Completion criterion**: `npm --prefix src run lint` exits 0.

### 2. aggregate

```bash
npm --prefix src run export-docs
```

Produces:

| 出力 | 内容 |
|---|---|
| `.export/docs/DOCUMENT_INDEX.md` | 3書類目次（リンクのみ） |
| `.export/docs/CONSOLIDATED_DESIGN.md` | 要件定義・基本設計・詳細設計 + TC 付録の単一本文 |

章立てを変えるときは `scripts/lib/document-export-structure.ts` の `EXPORT_STRUCTURE` を更新してから再実行する。

**Completion criterion**: 両ファイルが `.export/docs/` に存在し、コンソールに byte サイズが表示される。

### 3. ephemeral

- `docs/CONSOLIDATED_DESIGN.md` や `docs/DOCUMENT_INDEX.md` を正本ディレクトリに置かない（スクリプトが旧配置を削除する）。
- `.export/` は `.gitignore` 済み。生成物を `git add` しない。

**Completion criterion**: 出力が `.export/docs/` のみにあり、`docs/` 直下に同名ファイルがない。

## Structure changes

`EXPORT_STRUCTURE` の編集が必要なときだけ `scripts/lib/document-export-structure.ts` を読む。通常の export 実行では開かない。
