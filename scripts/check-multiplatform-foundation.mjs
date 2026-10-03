#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const worker = read('src/worker.js');
const index = read('index.html');
const platform = read('assets/sweet-run-platform.js');

function fail(message) {
  console.error(`Multi-platform foundation check failed: ${message}`);
  process.exit(1);
}
function requireText(source, needle, label) {
  if (!source.includes(needle)) fail(`${label}: missing ${needle}`);
}
function requireBefore(source, first, second, label) {
  const a = source.indexOf(first);
  const b = source.indexOf(second);
  if (a < 0 || b < 0 || a >= b) fail(`${label}: expected ${first} before ${second}`);
}

try { new vm.Script(platform, { filename: 'assets/sweet-run-platform.js' }); }
catch (error) { fail(`platform adapter syntax: ${error?.message || error}`); }

requireText(worker, 'const PLAYER_SESSION_VERSION = 1;', 'worker session contract');
requireText(worker, 'env.PLAYER_SESSION_SECRET', 'worker session secret');
requireText(worker, 'async function resolvePlayerAuth(', 'worker auth resolver');
requireText(worker, 'async function bootstrapPlayerSession(', 'worker session bootstrap');
requireText(worker, 'async function validatePlayerSessionToken(', 'worker session verification');
requireText(worker, 'url.pathname === "/api/auth/session/bootstrap"', 'worker session route');
requireText(worker, 'url.pathname === "/api/auth/session/verify"', 'worker session verify route');
requireBefore(worker, 'url.pathname === "/api/auth/session/bootstrap"', 'if (shouldEnforceRuntimeSchemaContract(url.pathname))', 'auth route cold-start lane');
requireText(worker, 'resolvePlayerAuth(request, body, env, { applyAdminControl:false });', 'legal gate auth resolver');
requireText(worker, 'resolvePlayerAuth(request, body, env)', 'startup auth resolver');
requireText(worker, "authProvider: String(auth.provider || \"telegram-miniapp\")", 'startup auth provider');
requireText(worker, "const auth = await resolvePlayerAuth(request, body, env, { missingMessage:'Telegram initData отсутствует.' });", 'account revision auth resolver');

requireText(platform, "const SESSION_KEY='sweet-run-player-session-v1';", 'platform session storage');
requireText(platform, "window.webkit?.messageHandlers?.[NATIVE_HANDLER]", 'native iOS bridge');
requireText(platform, "Authorization',`Bearer ${token}`", 'platform bearer header');
requireText(platform, "window.SweetRunPlatform=Object.freeze", 'platform global');

requireText(index, '<script src="/assets/sweet-run-platform.js?v=1.0.0"></script>', 'index platform adapter');
requireText(index, 'preparedSource.includes("sweet-run-platform.js")', 'srcdoc platform injection');
requireText(index, 'window.SweetRunPlatform?.haptic?.(kind, value)', 'host haptic bridge');
requireText(index, 'platformAuth?.headers?.({ "Content-Type": "application/json" })', 'host auth headers');
requireText(index, 'const playerAuthenticated = Boolean(initData || authSnapshot?.sessionToken);', 'game startup auth state');

for (const file of ['rating.html','battle-pass.html','referrals.html','album.html','achievements.html']) {
  requireText(read(file), '/assets/sweet-run-platform.js?v=1.0.0', `${file} platform adapter`);
}

// The production Telegram path must remain present during the migration.
requireText(worker, 'async function validateTelegramInitData(initData, env)', 'legacy Telegram auth preserved');
requireText(index, 'window.Telegram?.WebApp?.initData', 'Telegram client auth preserved');

console.log('Multi-platform foundation OK: Telegram auth preserved, native session lane and platform bridge are wired without UI changes.');
