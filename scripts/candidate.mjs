#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const root = process.cwd();
const command = String(process.argv[2] || 'help').toLowerCase();
const versionArg = String(process.argv[3] || '').trim();
const SOURCE_FILES = ['index.html','battle-pass.html','rating.html','referrals.html','legal.html'];
const STATUSES = ['DRAFT','LOCAL_QA','LOCAL_APPROVED','TP_QA','READY','RELEASED'];
const runtimePath = path.join(root,'scripts','local-test-runtime.js');

function fail(message){ console.error(message); process.exit(1); }
function slug(value){ const v=String(value||'').trim(); if(!/^[A-Za-z0-9._-]{1,40}$/.test(v)) fail('Версия должна содержать только A-Z, 0-9, точку, _ или -.'); return v; }
function dir(version){ return path.join(root,'candidates',version); }
function manifestPath(version){ return path.join(dir(version),'release.json'); }
function readJson(file){ return JSON.parse(fs.readFileSync(file,'utf8')); }
function writeJson(file,value){ fs.mkdirSync(path.dirname(file),{recursive:true}); fs.writeFileSync(file,JSON.stringify(value,null,2)+'\n'); }
function fileSha(file){ return crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex').slice(0,16); }
function now(){ return new Date().toISOString(); }
function readManifest(version){ const file=manifestPath(version); if(!fs.existsSync(file)) fail(`Candidate ${version} не найден. Сначала: node scripts/candidate.mjs init ${version}`); return readJson(file); }
function writeManifest(version,m){ m.updatedAt=now(); writeJson(manifestPath(version),m); writeJson(path.join(root,'candidates','active.json'),{version,manifest:`/candidates/${version}/release.json`,updatedAt:m.updatedAt}); }

function removeTelegramScript(html){ return html.replace(/\s*<script[^>]+src=["']https:\/\/telegram\.org\/js\/telegram-web-app\.js[^"']*["'][^>]*><\/script>\s*/gi,'\n'); }
function removeLegacyTpBridge(html){ return html.replace(/\s*<script>\s*\(\(\)=>\{\s*let testProjectActive=new URLSearchParams\(location\.search\)\.get\("test_project"\)==="1";[\s\S]*?<\/script>\s*/i,'\n'); }
function forceLocalMode(html){ return html.replace('const TEST_PROJECT_MODE = TEST_PROJECT_QUERY.get("test_project") === "1";','const TEST_PROJECT_MODE = false;').replace(/const TEST_PROJECT_MODE = new URLSearchParams\(location\.search\)\.get\("test_project"\) === "1";/g,'const TEST_PROJECT_MODE = false;'); }
function forceTpMode(html){ return html.replace('const TEST_PROJECT_MODE = TEST_PROJECT_QUERY.get("test_project") === "1";','const TEST_PROJECT_MODE = true;').replace(/const TEST_PROJECT_MODE = new URLSearchParams\(location\.search\)\.get\("test_project"\) === "1";/g,'const TEST_PROJECT_MODE = true;'); }
function title(html,suffix){ return html.replace(/<title>([^<]*)<\/title>/i,(_m,t)=>`<title>${t.replace(/\s*·\s*(?:LOCAL|CANDIDATE).*$/i,'')} · ${suffix}</title>`); }
function patchLinks(html,prefix){ let out=html; for(const name of ['battle-pass','rating','referrals','legal']) out=out.split(`/${name}.html`).join(`${prefix}/${name}.html`); return out; }

function buildLocal(version,manifest){
  if(!fs.existsSync(runtimePath)) fail(`Нет ${runtimePath}`);
  const runtime=fs.readFileSync(runtimePath,'utf8');
  const outDir=path.join(dir(version),'local'); fs.mkdirSync(outDir,{recursive:true});
  const prefix=`/candidates/${version}/local`;
  const manifestInline=`window.__ZEFIROK_CANDIDATE_MANIFEST__=${JSON.stringify(manifest).replace(/<\/script/gi,'<\\/script')};`;
  const strictCsp=`<meta data-zlocal-csp http-equiv="Content-Security-Policy" content="default-src 'self' blob: data:; script-src 'self' 'unsafe-inline' 'unsafe-eval' blob: data:; style-src 'self' 'unsafe-inline' blob: data:; img-src 'self' blob: data:; font-src 'self' blob: data:; media-src 'self' blob: data:; connect-src 'self'; frame-src 'self' blob: data:; worker-src blob:; object-src 'none'; form-action 'none'">`;
  const inlineRuntime=runtime.replace(/<\/script/gi,'<\\/script');
  const runtimeLiteral=JSON.stringify(runtime).replace(/<\/script/gi,'<\\/script');
  const bootstrap=`${strictCsp}\n<script data-zcandidate-manifest>${manifestInline}</script>\n<script data-zlocal-runtime>${inlineRuntime}</script>\n<script data-zlocal-runtime-source>window.__ZEFIROK_LOCAL_RUNTIME_SOURCE__=${runtimeLiteral};</script>`;
  for(const name of SOURCE_FILES){
    const src=path.join(dir(version),'source',name); if(!fs.existsSync(src)) fail(`Нет ${src}`);
    let html=fs.readFileSync(src,'utf8'); const sha=fileSha(src);
    html=removeTelegramScript(html); html=removeLegacyTpBridge(html); html=forceLocalMode(html); html=patchLinks(html,prefix);
    html=html.replace(/<head([^>]*)>/i,`<head$1>\n<!-- CANDIDATE ${manifest.candidate} · LOCAL 2.1 · source-sha256:${sha} -->\n${bootstrap}`);
    if(name==='index.html'){
      html=html.replace('const CLIENT_ANTI_CHEAT_ENABLED = true;','const CLIENT_ANTI_CHEAT_ENABLED = false;');
      const needle='      gameFrame.srcdoc = preparedSource;'; if(!html.includes(needle)) fail('Не найдена точка активации gameFrame в Candidate index.html');
      const bridge=`      // CANDIDATE LOCAL: тот же embedded client + LocalGameServer.\n      try {\n        preparedSource = preparedSource.replace(/<script[^>]+telegram\\.org\\/js\\/telegram-web-app\\.js[^>]*><\\/script>/gi, \"\");\n        if (!preparedSource.includes(\"__ZEFIROK_LOCAL_BUILD_V2__\")) {\n          const localRuntime = String(window.__ZEFIROK_LOCAL_RUNTIME_SOURCE__ || \"\");\n          const candidateManifest = \"<scr\"+\"ipt>window.__ZEFIROK_CANDIDATE_MANIFEST__=\"+JSON.stringify(window.__ZEFIROK_CANDIDATE_MANIFEST__||{})+\";</scr\"+\"ipt>\";\n          const localTag = \"<scr\" + \"ipt>\" + localRuntime.replace(/<\\/script/gi, \"<\\\\/script\") + \"</scr\" + \"ipt>\";\n          preparedSource = preparedSource.includes(\"</head>\") ? preparedSource.replace(\"</head>\", candidateManifest + localTag + \"</head>\") : candidateManifest + localTag + preparedSource;\n        }\n      } catch (error) { console.warn(\"Candidate LOCAL runtime injection failed\", error); }\n${needle}`;
      html=html.replace(needle,bridge);
    }
    html=title(html,`${manifest.candidate} · LOCAL`);
    fs.writeFileSync(path.join(outDir,name),html);
  }
}

function buildTp(version,manifest){
  const outDir=path.join(dir(version),'tp'); fs.mkdirSync(outDir,{recursive:true}); const prefix=`/candidates/${version}/tp`;
  const tpBridgePath=path.join(root,'scripts','candidate-tp-bridge.js'); const tpBridge=fs.existsSync(tpBridgePath)?fs.readFileSync(tpBridgePath,'utf8'):'';
  const badge=`<script data-zcandidate-tp>window.__ZEFIROK_CANDIDATE_MANIFEST__=${JSON.stringify(manifest).replace(/<\/script/gi,'<\\/script')};document.addEventListener('DOMContentLoaded',()=>{const b=document.createElement('div');b.textContent='🧪 ${manifest.candidate} · TP CANDIDATE';Object.assign(b.style,{position:'fixed',right:'8px',top:'8px',zIndex:'2147483647',padding:'7px 9px',borderRadius:'999px',background:'#261a3d',color:'#f1e7ff',font:'900 10px -apple-system,BlinkMacSystemFont,Segoe UI,sans-serif',border:'1px solid #8d69c7',pointerEvents:'none'});document.body.append(b)});</script>`;
  for(const name of SOURCE_FILES){
    const src=path.join(dir(version),'source',name); let html=fs.readFileSync(src,'utf8');
    html=patchLinks(html,prefix); html=forceTpMode(html);
    if(name!=='index.html' && !html.includes('/api/owner/test-project/game')) {
      html=removeTelegramScript(html);
      const safeBridge=tpBridge.replace(/<\/script/gi,'<\\/script');
      html=html.replace(/<head([^>]*)>/i,`<head$1><script data-zcandidate-tp-proxy>${safeBridge}</script>`);
    }
    html=html.replace(/<head([^>]*)>/i,`<head$1>${badge}`); html=title(html,`${manifest.candidate} · TP`); fs.writeFileSync(path.join(outDir,name),html);
  }
}

if(command==='init'){
  const version=slug(versionArg); const rootDir=dir(version); const sourceDir=path.join(rootDir,'source'); fs.mkdirSync(sourceDir,{recursive:true});
  for(const name of SOURCE_FILES){ const src=path.join(root,name); if(!fs.existsSync(src)) fail(`Нет Production source ${name}`); const dst=path.join(sourceDir,name); if(!fs.existsSync(dst)) fs.copyFileSync(src,dst); }
  const candidate=String(process.argv[4]||`${version}.0`);
  const manifest={schemaVersion:1,version,candidate,title:`Сладкий Забег · ${candidate}`,status:'DRAFT',sourceCommit:String(process.env.CANDIDATE_SOURCE_COMMIT||''),createdAt:now(),updatedAt:now(),features:[],sourceFiles:Object.fromEntries(SOURCE_FILES.map(name=>[name,fileSha(path.join(sourceDir,name))])),requiredChecks:['local-runtime','fake-telegram','cloud-storage-off','cases-state','profile-sync','season-pass','referrals','leaderboard','legal-initial','legal-agreement','legal-complete','legal-document','external-network-zero','new-js-errors'],localQa:{status:'pending'},tpQa:{status:'pending'},production:{status:'not_released'}};
  writeManifest(version,manifest); buildLocal(version,manifest); buildTp(version,manifest); console.log(`Candidate ${candidate} создан: candidates/${version}`);
} else if(command==='build'){
  const version=slug(versionArg),manifest=readManifest(version); manifest.sourceFiles=Object.fromEntries(SOURCE_FILES.map(name=>[name,fileSha(path.join(dir(version),'source',name))])); writeManifest(version,manifest); buildLocal(version,manifest); buildTp(version,manifest); console.log(`Candidate ${manifest.candidate} пересобран.`);
} else if(command==='status'){
  const version=slug(versionArg),status=String(process.argv[4]||'').toUpperCase(); if(!STATUSES.includes(status)) fail(`Статус: ${STATUSES.join(', ')}`); const m=readManifest(version); m.status=status; if(status==='LOCAL_APPROVED')m.localQa={...(m.localQa||{}),status:'approved',approvedAt:now()}; if(status==='READY')m.tpQa={...(m.tpQa||{}),status:'approved',approvedAt:now()}; if(status==='RELEASED')m.production={status:'released',releasedAt:now()}; writeManifest(version,m); buildLocal(version,m); buildTp(version,m); console.log(`${m.candidate}: ${status}`);
} else if(command==='prepare-release'){
  const version=slug(versionArg),m=readManifest(version); if(m.status!=='READY') fail(`Release запрещён: ${m.candidate} имеет статус ${m.status}, нужен READY.`); const out=path.join(dir(version),'release'); fs.rmSync(out,{recursive:true,force:true}); fs.mkdirSync(out,{recursive:true}); for(const name of SOURCE_FILES)fs.copyFileSync(path.join(dir(version),'source',name),path.join(out,name)); writeJson(path.join(out,'release.json'),{...m,production:{status:'prepared',preparedAt:now()}}); console.log(`Release подготовлен в candidates/${version}/release. Production root НЕ изменён.`);
} else {
  console.log(`Sweet Run Candidate Pipeline\n\n  node scripts/candidate.mjs init V3 [V3.0]\n  node scripts/candidate.mjs build V3\n  node scripts/candidate.mjs status V3 LOCAL_QA\n  node scripts/candidate.mjs status V3 LOCAL_APPROVED\n  node scripts/candidate.mjs status V3 TP_QA\n  node scripts/candidate.mjs status V3 READY\n  node scripts/candidate.mjs prepare-release V3\n\nprepare-release никогда не заменяет Production root.`);
}
