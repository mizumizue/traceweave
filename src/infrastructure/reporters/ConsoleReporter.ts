import { TraceWeaveReport, DecisionsCatalog, DecisionsCatalogItem } from '../../core/models/types.js';

export class ConsoleReporter {
  public static printSummary(report: TraceWeaveReport): void {
    const { summary, strata, pyramid, gaps } = report;

    console.log('\n\x1b[1m\x1b[36m============================================================\x1b[0m');
    const subjectName = report.subject?.displayName || 'unknown-project';
    console.log(`\x1b[1m\x1b[36m              TraceWeave Quality Report for ${subjectName}           \x1b[0m`);
    console.log('\x1b[1m\x1b[36m============================================================\x1b[0m\n');

    // Summary counts
    console.log('\x1b[1m[1. 全体サマリー]\x1b[0m');
    console.log(`  - 総要求数 (NEED):          ${summary.totalNeeds}`);
    console.log(`  - 総要件数 (REQ):           ${summary.totalRequirements}`);
    console.log(`  - 機能要件 (FR):            ${summary.functionalRequirementCount}`);
    console.log(`  - 非機能要件 (NFR):         ${summary.nonFunctionalRequirementCount}`);
    console.log(`  - 総詳細仕様数 (SPEC):      ${summary.totalSpecifications}`);
    console.log(`  - 総テストケース数 (TC):    ${summary.totalTestCases}`);
    console.log(`  - 実行合格 / 未実行 / 失敗:  ${summary.passedTestCaseCount} / ${summary.pendingTestCaseCount} / ${summary.failedTestCaseCount}`);
    console.log(`  - 平均品質充足度スコア:     \x1b[1m\x1b[32m${summary.overallSufficiencyScore}%\x1b[0m （実行合格ベース）`);
    console.log(`  - 重要要件 (High) 充足率:   \x1b[1m\x1b[32m${summary.highCriticalityCoverage}%\x1b[0m\n`);

    // Strata density table
    console.log('\x1b[1m[2. 工程地層密度分析 (Stratum Density)]\x1b[0m');
    console.log('  -------------------------------------------------------------');
    console.log('  工程                          テスト数   要件カバー率   密度判定');
    console.log('  -------------------------------------------------------------');
    for (const stratum of strata) {
      let densityColor = '\x1b[32m'; // green
      let densityText = 'Heavy (厚い)';
      if (stratum.density === 'adequate') {
        densityColor = '\x1b[34m'; // blue
        densityText = 'Adequate (適正)';
      } else if (stratum.density === 'thin') {
        densityColor = '\x1b[33m'; // yellow
        densityText = 'Thin (薄い)';
      } else if (stratum.density === 'missing') {
        densityColor = '\x1b[31m'; // red
        densityText = 'Missing (欠落)';
      }

      const paddedLabel = stratum.label.padEnd(28, ' ');
      const paddedCount = String(stratum.count).padStart(6, ' ');
      const paddedRatio = `${Math.round(stratum.coverageRatio * 100)}%`.padStart(12, ' ');
      console.log(`  ${paddedLabel} ${paddedCount} ${paddedRatio}   ${densityColor}${densityText}\x1b[0m`);
    }
    console.log('  -------------------------------------------------------------\n');

    // Pyramid Health
    console.log('\x1b[1m[3. テストピラミッド診断]\x1b[0m');
    if (pyramid.status === 'healthy') {
      console.log('  状態: \x1b[32m✓ 健全ピラミッド型 (Healthy Pyramid)\x1b[0m');
    } else if (pyramid.status === 'healthy_trophy') {
      console.log('  状態: \x1b[36m✓ 健全トロフィー型 (Healthy Trophy)\x1b[0m');
    } else if (pyramid.status === 'unbalanced') {
      console.log('  状態: \x1b[33m⚠ 不均衡・工程欠落型 (Unbalanced Distribution)\x1b[0m');
    } else if (pyramid.status === 'inverted_ice_cream') {
      console.log('  状態: \x1b[31m⚠ 逆ピラミッド型 (Inverted Ice-Cream)\x1b[0m');
    } else if (pyramid.status === 'hollow_hourglass') {
      console.log('  状態: \x1b[31m⚠ 中間空洞化・ひょうたん型 (Hollow Hourglass)\x1b[0m');
    } else {
      console.log('  状態: \x1b[33m⚠ 仕様テスト不足 (Missing Specs)\x1b[0m');
    }

    for (const w of pyramid.warnings) {
      console.log(`  \x1b[33m⚠ 警告: ${w}\x1b[0m`);
    }
    for (const s of pyramid.suggestions) {
      console.log(`  \x1b[36m💡 推奨: ${s}\x1b[0m`);
    }
    console.log('');

    // Gaps
    console.log('\x1b[1m[4. ギャップ・リスク要因]\x1b[0m');
    if (gaps.untestedRequirements.length > 0) {
      console.log(`  - \x1b[31m実行合格テストのない要件 (${gaps.untestedRequirements.length}件):\x1b[0m ${gaps.untestedRequirements.join(', ')}`);
    } else {
      console.log('  - \x1b[32m✓ すべての要件に実行合格したテストが紐づいています\x1b[0m');
    }

    if (gaps.missingIntegrationRequirements.length > 0) {
      console.log(`  - \x1b[33m結合テスト未実施要件 (${gaps.missingIntegrationRequirements.length}件):\x1b[0m ${gaps.missingIntegrationRequirements.join(', ')}`);
    }

    if (gaps.untestedSpecs.length > 0) {
      console.log(`  - \x1b[33mテスト未紐付け仕様 (${gaps.untestedSpecs.length}件):\x1b[0m ${gaps.untestedSpecs.join(', ')}`);
    }
    console.log('\n\x1b[1m\x1b[36m============================================================\x1b[0m\n');
  }

  public static printMatrixText(report: TraceWeaveReport): void {
    console.log('\n\x1b[1m[Traceability Matrix]\x1b[0m\n');
    console.log('-------------------------------------------------------------------------------------------------------------');
    console.log('要件ID      区分   重要度  スコア  紐づく仕様 (SPEC)       紐づくテスト (工程・手法)');
    console.log('-------------------------------------------------------------------------------------------------------------');

    for (const row of report.matrix) {
      const critColor = row.criticality === 'high' ? '\x1b[31m' : row.criticality === 'medium' ? '\x1b[33m' : '\x1b[37m';
      const scoreColor = row.score >= 80 ? '\x1b[32m' : row.score >= 50 ? '\x1b[33m' : '\x1b[31m';
      const classLabel = row.requirementClass === 'non_functional' ? 'NFR' : row.requirementClass === 'functional' ? 'FR ' : '-  ';
      const classColor = row.requirementClass === 'non_functional' ? '\x1b[33m' : '\x1b[32m';

      const specsStr = row.specs.map(s => s.id).join(', ') || '(なし)';
      const testsStr =
        row.allTestCases.map(t => `${t.id}(${t.level}/${t.method})`).join(', ') || '\x1b[31m(未テスト)\x1b[0m';

      console.log(
        `${row.requirementId.padEnd(11, ' ')} ${classColor}${classLabel}\x1b[0m  ${critColor}${row.criticality.padEnd(7, ' ')}\x1b[0m ${scoreColor}${String(row.score + '%').padStart(5, ' ')}\x1b[0m  ${specsStr.padEnd(22, ' ')} ${testsStr}`
      );
    }
    console.log('-------------------------------------------------------------------------------------------------------------\n');
  }

  public static printCatalog(catalog: DecisionsCatalog, items?: DecisionsCatalogItem[]): void {
    const targetItems = items || catalog.items;
    const { kindCounts, totalCount } = catalog;

    console.log('\n\x1b[1m\x1b[35m============================================================\x1b[0m');
    console.log('\x1b[1m\x1b[35m      TraceWeave Decisions & Architecture Catalog           \x1b[0m');
    console.log('\x1b[1m\x1b[35m============================================================\x1b[0m\n');

    console.log('\x1b[1m[決め事ドキュメント統計サマリー]\x1b[0m');
    console.log(`  - 総登録数: ${totalCount} 件 (表示中: ${targetItems.length} 件)`);
    console.log(
      `  - 内訳: ACT:${kindCounts.actor} | UC:${kindCounts.use_case} | GLO:${kindCounts.glossary} | REQ:${kindCounts.requirement} | SPEC:${kindCounts.specification} | DSN:${kindCounts.design} | ADR:${kindCounts.decision} | QA:${kindCounts.quality_assurance} | NEED:${kindCounts.need} | TC:${kindCounts.test_case}`
    );
    console.log(
      `  - 要件区分: FR:${catalog.requirementClassCounts.functional} | NFR:${catalog.requirementClassCounts.non_functional} | 未分類:${catalog.requirementClassCounts.unclassified}\n`
    );

    console.log('------------------------------------------------------------------------------------------------------------------------');
    console.log('種別   ID         区分 ステータス   タイトル                                      関連決め事 (相互参照)');
    console.log('------------------------------------------------------------------------------------------------------------------------');

    for (const item of targetItems) {
      const kindBadge = item.kind.toUpperCase().padEnd(6, ' ').slice(0, 6);
      const idStr = item.id.padEnd(10, ' ');
      const statusStr = item.status.padEnd(10, ' ').slice(0, 10);
      const titleStr = item.title.length > 40 ? item.title.slice(0, 37) + '...' : item.title.padEnd(40, ' ');

      const refs: string[] = [];
      if (item.relatedActors?.length) refs.push(`ACT:${item.relatedActors.map(a => a.id).join(',')}`);
      if (item.relatedUseCases?.length) refs.push(`UC:${item.relatedUseCases.map(u => u.id).join(',')}`);
      if (item.relatedDecisions?.length) refs.push(`ADR:${item.relatedDecisions.map(d => d.id).join(',')}`);
      if (item.relatedDesigns?.length) refs.push(`DSN:${item.relatedDesigns.map(d => d.id).join(',')}`);
      if (item.relatedReqs?.length) refs.push(`REQ:${item.relatedReqs.map(r => r.id).join(',')}`);
      if (item.relatedSpecs?.length) refs.push(`SPEC:${item.relatedSpecs.map(s => s.id).join(',')}`);
      const refsStr = refs.join(' | ') || '-';

      const classStr =
        item.kind === 'requirement'
          ? (item.requirement_class === 'non_functional' ? 'NFR ' : item.requirement_class === 'functional' ? 'FR  ' : '-   ')
          : '    ';

      console.log(`${kindBadge} ${idStr} ${classStr}${statusStr} ${titleStr}  ${refsStr}`);
    }
    console.log('------------------------------------------------------------------------------------------------------------------------\n');
  }

  public static printDecisions(catalog: DecisionsCatalog): void {
    const adrs = catalog.items.filter(i => i.kind === 'decision');
    const dsns = catalog.items.filter(i => i.kind === 'design');

    console.log('\n\x1b[1m\x1b[33m============================================================\x1b[0m');
    console.log('\x1b[1m\x1b[33m         TraceWeave Architectural Decisions (ADR & DSN)     \x1b[0m');
    console.log('\x1b[1m\x1b[33m============================================================\x1b[0m\n');

    console.log(`\x1b[1m[1. アーキテクチャ意思決定ログ (ADR: ${adrs.length}件)]\x1b[0m`);
    for (const adr of adrs) {
      console.log(`\n  \x1b[1m\x1b[33m[${adr.id}]\x1b[0m \x1b[1m${adr.title}\x1b[0m (${adr.status})`);
      if (adr.sections?.['Decision']) {
        console.log(`    \x1b[36m決定事項:\x1b[0m ${adr.sections['Decision'].split('\n')[0]}`);
      }
      if (adr.relatedDesigns?.length) {
        console.log(`    \x1b[32m関連設計 (DSN):\x1b[0m ${adr.relatedDesigns.map(d => `${d.id} (${d.title})`).join(', ')}`);
      }
      if (adr.tags.length) {
        console.log(`    \x1b[90mタグ:\x1b[0m #${adr.tags.join(' #')}`);
      }
    }

    console.log(`\n\n\x1b[1m[2. システム設計事項 (DSN: ${dsns.length}件)]\x1b[0m`);
    for (const dsn of dsns) {
      console.log(`\n  \x1b[1m\x1b[34m[${dsn.id}]\x1b[0m \x1b[1m${dsn.title}\x1b[0m (${dsn.status})`);
      if (dsn.sections?.['Decision']) {
        console.log(`    \x1b[36m設計方針:\x1b[0m ${dsn.sections['Decision'].split('\n')[0]}`);
      }
      if (dsn.relatedDecisions?.length) {
        console.log(`    \x1b[33m関連ADR:\x1b[0m ${dsn.relatedDecisions.map(d => `${d.id} (${d.title})`).join(', ')}`);
      }
      if (dsn.relatedSpecs?.length) {
        console.log(`    \x1b[35m実現仕様:\x1b[0m ${dsn.relatedSpecs.map(s => `${s.id} (${s.title})`).join(', ')}`);
      }
    }
    console.log('\n------------------------------------------------------------\n');
  }
}
