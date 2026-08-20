import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const root = process.cwd();
const runtimePath = path.join(root, 'scripts', 'local-test-runtime.js');
if (!fs.existsSync(runtimePath)) throw new Error(`Missing ${runtimePath}`);
const runtime = fs.readFileSync(runtimePath, 'utf8');

const strictCsp = `<meta data-zlocal-csp http-equiv="Content-Security-Policy" content="default-src 'self' blob: data:; script-src 'self' 'unsafe-inline' 'unsafe-eval' blob: data:; style-src 'self' 'unsafe-inline' blob: data:; img-src 'self' blob: data:; font-src 'self' blob: data:; media-src 'self' blob: data:; connect-src 'self'; frame-src 'self' blob: data:; worker-src blob:; object-src 'none'; form-action 'none'">`;
const inlineRuntime = runtime.replace(/<\/script/gi, '<\\/script');
const runtimeLiteral = JSON.stringify(runtime).replace(/<\/script/gi, '<\\/script');
const bootstrap = `${strictCsp}\n<script data-zlocal-runtime>${inlineRuntime}</script>\n<script data-zlocal-runtime-source>window.__ZEFIROK_LOCAL_RUNTIME_SOURCE__=${runtimeLiteral};</script>`;

const targets = [
  ['index.html', 'index_test.html', 'index'],
  ['battle-pass.html', 'battle-pass_test.html', 'page'],
  ['rating.html', 'rating_test.html', 'page'],
  ['referrals.html', 'referrals_test.html', 'page'],
  ['legal.html', 'legal_test.html', 'page']
];

function removeTelegramScript(html) {
  return html.replace(/\s*<script[^>]+src=["']https:\/\/telegram\.org\/js\/telegram-web-app\.js[^"']*["'][^>]*><\/script>\s*/gi, '\n');
}


function removeLegacyTestProjectBridge(html) {
  return html.replace(/\s*<script>\s*\(\(\)=>\{\s*let testProjectActive=new URLSearchParams\(location\.search\)\.get\("test_project"\)==="1";[\s\S]*?<\/script>\s*/i, '\n');
}

function injectBootstrap(html, sourceSha) {
  if (html.includes('data-zlocal-runtime')) return html;
  return html.replace(/<head([^>]*)>/i, `<head$1>\n<!-- ZEFIROK LOCAL BUILD 2.2 · source-sha256:${sourceSha} -->\n${bootstrap}`);
}

function forceLocalMode(html) {
  return html
    .replace('const TEST_PROJECT_MODE = TEST_PROJECT_QUERY.get("test_project") === "1";', 'const TEST_PROJECT_MODE = false;')
    .replace(/const TEST_PROJECT_MODE = new URLSearchParams\(location\.search\)\.get\("test_project"\) === "1";/g, 'const TEST_PROJECT_MODE = false;');
}


function patchIndex(html) {
  let out = html;
  const replacements = [
    ['/battle-pass.html', '/battle-pass_test.html'],
    ['/rating.html', '/rating_test.html'],
    ['/referrals.html', '/referrals_test.html'],
    ['/legal.html', '/legal_test.html']
  ];
  for (const [from, to] of replacements) out = out.split(from).join(to);
  out = out.replace('const CLIENT_ANTI_CHEAT_ENABLED = true;', 'const CLIENT_ANTI_CHEAT_ENABLED = false;');
  const needle = '      gameFrame.srcdoc = preparedSource;';
  if (!out.includes(needle)) throw new Error('index.html activation point not found');
  const bridge = `      // LOCAL BUILD 2.2: inject the same LocalGameServer into the real embedded game.\n      try {\n        preparedSource = preparedSource.replace(/<script[^>]+telegram\\.org\\/js\\/telegram-web-app\\.js[^>]*><\\/script>/gi, \"\");\n        if (!preparedSource.includes(\"__ZEFIROK_LOCAL_BUILD_V2__\")) {\n          const localRuntime = String(window.__ZEFIROK_LOCAL_RUNTIME_SOURCE__ || \"\");\n          const localTag = \"<scr\" + \"ipt>\" + localRuntime.replace(/<\\/script/gi, \"<\\\\/script\") + \"</scr\" + \"ipt>\";\n          preparedSource = preparedSource.includes(\"</head>\") ? preparedSource.replace(\"</head>\", localTag + \"</head>\") : localTag + preparedSource;\n        }\n      } catch (error) { console.warn(\"LOCAL BUILD runtime injection failed\", error); }\n${needle}`;
  out = out.replace(needle, bridge);
  out = out.replace(/<title>([^<]*)<\/title>/i, (_m, title) => `<title>${title.replace(/\s*·\s*LOCAL.*$/i,'')} · LOCAL 2.2</title>`);
  return out;
}

for (const [sourceName, outputName, kind] of targets) {
  const sourcePath = path.join(root, sourceName);
  if (!fs.existsSync(sourcePath)) throw new Error(`Missing ${sourceName}`);
  const sourceHtml = fs.readFileSync(sourcePath, 'utf8');
  const sourceSha = crypto.createHash('sha256').update(sourceHtml).digest('hex').slice(0,16);
  let html = removeTelegramScript(sourceHtml);
  html = removeLegacyTestProjectBridge(html);
  html = forceLocalMode(html);
  html = injectBootstrap(html, sourceSha);
  if (kind === 'index') html = patchIndex(html);
  else html = html.replace(/<title>([^<]*)<\/title>/i, (_m, title) => `<title>${title.replace(/\s*·\s*LOCAL.*$/i,'')} · LOCAL 2.2</title>`);
  fs.writeFileSync(path.join(root, outputName), html);
  console.log(`LOCAL BUILD: ${sourceName} -> ${outputName}`);
}
