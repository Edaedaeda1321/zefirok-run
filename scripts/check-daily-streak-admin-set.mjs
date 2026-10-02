#!/usr/bin/env node
import fs from 'node:fs';

function assert(condition, message) {
  if (!condition) throw new Error(`Daily streak admin setter check failed: ${message}`);
}

const owner = fs.readFileSync('owner.html', 'utf8');
const worker = fs.readFileSync('src/worker.js', 'utf8');
const gate = fs.readFileSync('scripts/check-production-gate.mjs', 'utf8');

assert(owner.includes('<label>Установить текущую серию</label><input type="number" id="playerDailyStreak" min="1" max="3650"'), 'owner input must allow 1..3650');
assert(owner.includes("if(!Number.isInteger(days)||days<1||days>3650){toast('Серия должна быть от 1 до 3 650 дней.'"), 'client validation must allow lowering the streak');
assert(!owner.includes('days<Math.max(1,current)'), 'legacy client lower-bound guard still blocks decreases');
assert(owner.includes('Лучшая серия, прогресс карточки и уже полученные награды не изменятся.'), 'confirmation must explain preserved history');
assert(owner.includes("toast(result?.message||'Серия установлена')"), 'setter success copy missing');

assert(worker.includes("if (!Number.isInteger(desired) || desired < 1 || desired > 3650) throw new ApiError(400, 'Серия должна быть от 1 до 3650 дней.');"), 'server range validation must stay 1..3650');
assert(!worker.includes("if (desired < effectiveBefore) throw new ApiError(400, 'Восстановление не может уменьшать текущую серию.');"), 'server still blocks lowering the current streak');
assert(worker.includes('best_streak=MAX(best_streak,?)'), 'historical best streak must remain preserved');
assert(worker.includes("direction:desired<effectiveBefore?'decrease':desired>effectiveBefore?'increase':'same'"), 'audit direction metadata missing');
assert(worker.includes('message:`Серия установлена: ${effectiveBefore} → ${desired}.`'), 'server success message missing');
assert(gate.includes("['daily streak admin setter', 'node', ['scripts/check-daily-streak-admin-set.mjs']]"), 'production gate wiring missing');

console.log('Daily streak admin setter check PASS: owner can set 1..3650 in either direction while best streak and rewards remain preserved.');
