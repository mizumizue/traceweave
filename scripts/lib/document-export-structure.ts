export type Section = { heading: string; files: string[] };

export type ExportPart = { part: string; sections: Section[] };

/** 3書類集約の章立て。INDEX と CONSOLIDATED の単一ソース。 */
export const EXPORT_STRUCTURE: ExportPart[] = [
  {
    part: '第1部 要件定義書',
    sections: [
      { heading: '1.1 目的・システム境界', files: ['SYSTEM_OVERVIEW.md'] },
      {
        heading: '1.2 アクター定義',
        files: ['actors/ACT-0001.md', 'actors/ACT-0002.md', 'actors/ACT-0003.md'],
      },
      {
        heading: '1.3 ステークホルダー・ニーズ（Why）',
        files: [
          'needs/NEED-0001.md',
          'needs/NEED-0002.md',
          'needs/NEED-0003.md',
          'needs/NEED-0005.md',
          'needs/NEED-0006.md',
          'needs/NEED-0007.md',
          'needs/NEED-0008.md',
          'needs/NEED-0009.md',
        ],
      },
      {
        heading: '1.4 ユースケース（業務シナリオ）',
        files: Array.from({ length: 9 }, (_, i) => `usecases/UC-${String(i + 1).padStart(4, '0')}.md`),
      },
      {
        heading: '1.5 機能要件（What: Functional）',
        files: [
          'requirements/REQ-0001.md',
          'requirements/REQ-0002.md',
          'requirements/REQ-0003.md',
          'requirements/REQ-0004.md',
          'requirements/REQ-0005.md',
          'requirements/REQ-0006.md',
          'requirements/REQ-0007.md',
          'requirements/REQ-0008.md',
          'requirements/REQ-0009.md',
          'requirements/REQ-0010.md',
          'requirements/REQ-0012.md',
          'requirements/REQ-0013.md',
          'requirements/REQ-0014.md',
          'requirements/REQ-0015.md',
          'requirements/REQ-0017.md',
          'requirements/REQ-0018.md',
          'requirements/REQ-0019.md',
          'requirements/REQ-0020.md',
          'requirements/REQ-0021.md',
          'requirements/REQ-0022.md',
          'requirements/REQ-0023.md',
          'requirements/REQ-0024.md',
          'requirements/REQ-0025.md',
          'requirements/REQ-0026.md',
          'requirements/REQ-0027.md',
        ],
      },
      {
        heading: '1.6 非機能要件（What: Non-Functional）',
        files: ['requirements/REQ-0028.md'],
      },
      {
        heading: '1.7 品質保証方針',
        files: ['quality/QA-0001.md', 'quality/QA-0002.md'],
      },
    ],
  },
  {
    part: '第2部 基本設計書',
    sections: [
      {
        heading: '2.1 全体アーキテクチャ',
        files: ['design/DSN-0001.md', 'design/DSN-0006.md', 'design/DSN-0007.md'],
      },
      {
        heading: '2.2 外部インターフェース仕様（Contract / ICD）',
        files: [
          'specifications/SPEC-0004.md',
          'specifications/SPEC-0005.md',
          'specifications/SPEC-0008.md',
          'specifications/SPEC-0017.md',
          'specifications/SPEC-0019.md',
          'specifications/SPEC-0020.md',
          'specifications/SPEC-0022.md',
        ],
      },
      {
        heading: '2.3 内部モジュール境界仕様',
        files: [
          'specifications/SPEC-0001.md',
          'specifications/SPEC-0002.md',
          'specifications/SPEC-0003.md',
          'specifications/SPEC-0006.md',
          'specifications/SPEC-0007.md',
          'specifications/SPEC-0009.md',
          'specifications/SPEC-0010.md',
          'specifications/SPEC-0012.md',
          'specifications/SPEC-0013.md',
          'specifications/SPEC-0014.md',
          'specifications/SPEC-0015.md',
          'specifications/SPEC-0018.md',
          'specifications/SPEC-0021.md',
        ],
      },
      {
        heading: '2.4 アーキテクチャ意思決定（ADR）',
        files: Array.from({ length: 7 }, (_, i) => `decisions/ADR-${String(i + 1).padStart(4, '0')}.md`),
      },
    ],
  },
  {
    part: '第3部 詳細設計書',
    sections: [
      {
        heading: '3.1 コア・インフラストラクチャ',
        files: [
          'design/DSN-0002.md',
          'design/DSN-0004.md',
          'design/DSN-0005.md',
          'design/DSN-0017.md',
        ],
      },
      {
        heading: '3.2 Web ダッシュボード（プレゼンテーション層）',
        files: [
          'design/DSN-0003.md',
          'design/DSN-0010.md',
          'design/DSN-0011.md',
          'design/DSN-0012.md',
          'design/DSN-0013.md',
          'design/DSN-0014.md',
          'design/DSN-0015.md',
          'design/DSN-0016.md',
          'design/DSN-0018.md',
        ],
      },
      {
        heading: '3.3 グラフ・カタログ',
        files: ['design/DSN-0008.md', 'design/DSN-0009.md'],
      },
    ],
  },
];

export const EXPORT_OUTPUT_DIR = '.export/docs';

export const SYSTEM_OVERVIEW_INDEX_ROWS = [
  ['1.1.1', 'システム目的・ビジョン・解決課題', 'SYSTEM_OVERVIEW.md', '§1'],
  ['1.1.2', 'In-Scope / Out-of-Scope 境界', 'SYSTEM_OVERVIEW.md', '§2'],
  ['1.1.3', '要求判定フロー（NEED/REQ/ADR/Chore）', 'SYSTEM_OVERVIEW.md', '§3'],
  ['1.1.4', '外部IF管理方針', 'SYSTEM_OVERVIEW.md', '§4'],
] as const;
