import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { buildTraceWeaveReport } from './build-report.js';
import { TestRunnerRegistry } from '../core/testing/TestRunnerRegistry.js';
import { isPathInsideRoot } from '../infrastructure/system/resolveRepoRoot.js';

export interface ServeDashboardOptions {
  docsDir: string;
  distWeb: string;
}

export function createDashboardServer(options: ServeDashboardOptions): http.Server {
  const { docsDir, distWeb } = options;

  return http.createServer((req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');

    if (req.method === 'OPTIONS') {
      res.writeHead(204);
      res.end();
      return;
    }

    const url = req.url?.split('?')[0] || '/';

    if (url === '/api/data') {
      try {
        const { report } = buildTraceWeaveReport({ docsDir });
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(report));
      } catch (e: unknown) {
        const message = e instanceof Error ? e.message : String(e);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: message }));
      }
      return;
    }

    if (url === '/api/test/run' && req.method === 'POST') {
      let body = '';
      req.on('data', chunk => {
        body += chunk;
      });
      req.on('end', () => {
        void (async () => {
          try {
            const payload = JSON.parse(body);
            const testCaseId = String(payload.testCaseId || '');
            if (!testCaseId) {
              res.writeHead(400, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ error: 'ERR_INVALID_REQUEST: testCaseId is required', status: 'error' }));
              return;
            }

            const { nodes } = buildTraceWeaveReport({ docsDir });
            const tcNode = nodes.find(n => n.id === testCaseId && n.kind === 'test_case');
            if (!tcNode) {
              res.writeHead(404, { 'Content-Type': 'application/json' });
              res.end(
                JSON.stringify({
                  error: 'ERR_UNKNOWN_TEST_CASE',
                  message: `テストケース "${testCaseId}" は登録されていません。`,
                  status: 'error',
                })
              );
              return;
            }

            if (!tcNode.ui_executable || !TestRunnerRegistry.isExecutable(testCaseId)) {
              res.writeHead(400, { 'Content-Type': 'application/json' });
              res.end(
                JSON.stringify({
                  error: 'ERR_NOT_UI_EXECUTABLE',
                  message: `テストケース "${testCaseId}" はUI実行に対応していません（単純な入出力のみで実行できないテストのため除外）。`,
                  reason: tcNode.inputAnalysis?.reasonDescription,
                  status: 'error',
                })
              );
              return;
            }

            const result = await TestRunnerRegistry.runTestAsync({
              testCaseId,
              inputs: payload.inputs || {},
              expected: payload.expected,
            });
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify(result));
          } catch (e: unknown) {
            const message = e instanceof Error ? e.message : String(e);
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: message, status: 'error' }));
          }
        })();
      });
      return;
    }

    const relativePath = url === '/' ? 'index.html' : url.replace(/^\/+/, '');
    const targetFile = path.resolve(distWeb, relativePath);

    if (!isPathInsideRoot(distWeb, targetFile)) {
      res.writeHead(403, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('Forbidden');
      return;
    }

    if (fs.existsSync(targetFile) && fs.statSync(targetFile).isFile()) {
      const ext = path.extname(targetFile);
      const mimeTypes: Record<string, string> = {
        '.html': 'text/html',
        '.js': 'text/javascript',
        '.css': 'text/css',
        '.json': 'application/json',
        '.svg': 'image/svg+xml',
      };
      res.writeHead(200, { 'Content-Type': mimeTypes[ext] || 'application/octet-stream' });
      fs.createReadStream(targetFile).pipe(res);
    } else {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('Not found');
    }
  });
}
