#!/usr/bin/env node
// Offline integration smoke check. No Worker, D1, network or saved-data writes.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import process from 'node:process';
const root=process.cwd();
const read=name=>fs.readFileSync(path.join(root,name),'utf8');
try {
  const app=read('world/app.js'), renderer=read('world/renderer.js');
  const citizens=read('world/citizens.js'),traffic=read('world/traffic.js');
  const gate=read('scripts/check-production-gate.mjs');
  const integration=read('scripts/check-world-integration.mjs');
  assert.match(app,/import\s*\{\s*buildBusScene,\s*sampleBusScene\s*\}\s*from\s*'\.\/traffic\.js'/);
  assert.match(app,/state\.trafficScene=buildBusScene\(state\.city,CATALOG,Date\.now\(\)\)/);
  assert.match(app,/buses:sampleBusScene\(state\.trafficScene,now\)/);
  assert.match(app,/if\(!state\.citizenScene\?\.routes\?\.length&&!state\.trafficScene\?\.routes\?\.length\)return/);
  assert.match(renderer,/import\s*\{\s*drawBus\s*\}\s*from\s*'\.\/traffic\.js'/);
  assert.match(renderer,/drawBus\(ctx,layer\.bus/);
  assert.match(citizens,/export function shortestRoadPath\(/);
  assert.match(citizens,/export function walkableCitizenRoads\(/);
  assert.match(traffic,/export function buildBusScene\(/);
  assert.match(traffic,/export function sampleBusScene\(/);
  assert.match(gate,/Zeffi World city life and buses/);
  assert.match(integration,/['"]traffic\.js['"]/);
  assert.ok(fs.existsSync(path.join(root,'world/tests/city-life.test.mjs')));
  console.log('PASS: World Zeffi living city and bus module integration is intact.');
  console.log('No server logic, D1, wallet or migration changes were installed.');
} catch(error) {
  console.error('FAIL: World Zeffi living city integration:',error.message);
  process.exitCode=1;
}
