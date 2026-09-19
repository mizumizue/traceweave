import { TestLevel } from '../models/types.js';

export const TEST_STRATUM_ORDER: readonly TestLevel[] = [
  'unit',
  'integration_internal',
  'integration_external',
  'system',
  'acceptance',
] as const;

/** 手順・期待値の仕様書一覧の対象（UT は実装カバレッジ軸、REQ-0031） */
export const TEST_SPEC_BOOK_LEVELS: readonly TestLevel[] = [
  'integration_internal',
  'integration_external',
  'system',
  'acceptance',
] as const;

/** テスト仕様・結果タブの工程切替（UT = カバレッジ、ITa〜UAT = 仕様表） */
export const TEST_BOOK_TAB_LEVELS: readonly TestLevel[] = [
  'unit',
  ...TEST_SPEC_BOOK_LEVELS,
] as const;

export const TEST_LEVEL_LABELS: Record<TestLevel, string> = {
  unit: '単体テスト (UT)',
  integration_internal: '内部結合テスト (ITa)',
  integration_external: '外部結合テスト (ITb)',
  system: 'システムテスト (ST)',
  acceptance: '受入テスト (UAT)',
};

export const TEST_LEVEL_SHORT_LABELS: Record<TestLevel, string> = {
  unit: 'UT',
  integration_internal: 'ITa',
  integration_external: 'ITb',
  system: 'ST',
  acceptance: 'UAT',
};
