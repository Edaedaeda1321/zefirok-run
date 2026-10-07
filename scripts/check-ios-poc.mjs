#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const exists = (file) => fs.existsSync(path.join(root, file));
const worker = read('src/worker.js');
const platform = read('assets/sweet-run-platform.js');
const index = read('index.html');
const gameTasks = read('assets/game-tasks.js');
const assetsIgnore = read('.assetsignore');

function fail(message) {
  console.error(`iOS POC check failed: ${message}`);
  process.exit(1);
}
function requireText(source, needle, label) {
  if (!source.includes(needle)) fail(`${label}: missing ${needle}`);
}

try { new vm.Script(platform, { filename:'assets/sweet-run-platform.js' }); }
catch (error) { fail(`platform JS syntax: ${error?.message || error}`); }

for (const file of [
  'ios/SweetRun.xcodeproj/project.pbxproj',
  'ios/SweetRun.xcodeproj/xcshareddata/xcschemes/SweetRun.xcscheme',
  'ios/SweetRun/Info.plist',
  'ios/SweetRun/App/SweetRunApp.swift',
  'ios/SweetRun/App/AppState.swift',
  'ios/SweetRun/App/RootView.swift',
  'ios/SweetRun/Auth/TelegramAuth.swift',
  'ios/SweetRun/Auth/SweetRunAPI.swift',
  'ios/SweetRun/Auth/PlayerSession.swift',
  'ios/SweetRun/Auth/SessionStore.swift',
  'ios/SweetRun/Auth/KeychainStore.swift',
  'ios/SweetRun/Web/GameWebView.swift',
  'ios/SweetRun/Web/NativeBridge.swift',
  'ios/SweetRun/Platform/Haptics.swift',
  'ios/SweetRun/Config/SweetRunConfig.swift',
  'ios/scripts/check-ios-project.sh',
  'ios/scripts/configure-project.mjs'
]) {
  if (!exists(file)) fail(`missing ${file}`);
}

requireText(worker, 'url.pathname === "/api/auth/telegram-ios"', 'native Telegram auth route');
requireText(worker, 'async function validateTelegramIosIdToken(', 'Telegram OIDC verifier');
requireText(worker, 'https://oauth.telegram.org/.well-known/jwks.json', 'Telegram JWKS');
requireText(worker, 'TELEGRAM_LOGIN_CLIENT_ID', 'Telegram Login client id env');
requireText(worker, 'TELEGRAM_OIDC_ALLOWED_ALGORITHMS = new Set(["RS256"])', 'OIDC algorithm guard');
requireText(worker, 'PLAYER_SESSION_BODY_PREFIX = "sr-session:"', 'legacy session bridge prefix');
requireText(worker, 'rawInitData.startsWith(PLAYER_SESSION_BODY_PREFIX)', 'legacy server auth bridge');
requireText(worker, 'issuePlayerSession({ ...oidcAuth, user:controlledUser }, env, "telegram-ios")', 'same player session issuance');
requireText(worker, 'photo_url: String(user.photo_url || "").slice(0, 2048)', 'native profile photo session claim');

requireText(platform, "const VERSION='1.2.0';", 'platform version');
requireText(platform, "const LEGACY_SESSION_PREFIX='sr-session:';", 'client legacy bridge prefix');
requireText(platform, 'function legacyInitData()', 'client legacy auth bridge');
requireText(platform, 'legacyInitData,sessionToken', 'platform auth API');
requireText(index, 'window.SweetRunPlatform?.auth?.legacyInitData?.()', 'host native credential compatibility');
requireText(gameTasks, 'window.SweetRunPlatform?.auth?.legacyInitData?.()', 'task hub native credential compatibility');

requireText(read('ios/SweetRun/Auth/TelegramAuth.swift'), 'import TelegramLogin', 'official Telegram iOS SDK');
requireText(read('ios/SweetRun/Auth/TelegramAuth.swift'), 'scopes: ["profile"]', 'minimal Telegram scopes');
requireText(read('ios/SweetRun/Auth/SweetRunAPI.swift'), '/api/auth/telegram-ios', 'native session exchange');
requireText(read('ios/SweetRun/Auth/KeychainStore.swift'), 'kSecAttrAccessibleAfterFirstUnlockThisDeviceOnly', 'device-only Keychain storage');
requireText(read('ios/SweetRun/Web/GameWebView.swift'), '__SWEET_RUN_NATIVE_BOOTSTRAP__', 'WKWebView native bootstrap');
requireText(read('ios/SweetRun/Web/GameWebView.swift'), 'sweetRunBridge', 'WKWebView message bridge');
requireText(read('ios/SweetRun/Platform/Haptics.swift'), 'UINotificationFeedbackGenerator', 'native iOS haptics');
requireText(read('ios/SweetRun.xcodeproj/project.pbxproj'), 'TelegramMessenger/telegram-login-ios', 'Telegram SDK package');
requireText(read('ios/SweetRun.xcodeproj/project.pbxproj'), '215851df7e3cd32787a0054e5d1a97d7aa62796e', 'pinned Telegram SDK revision');

if (!/^ios\/$/m.test(assetsIgnore)) fail('ios/ must stay outside Cloudflare static asset deploy');
if (worker.includes('TELEGRAM_LOGIN_CLIENT_SECRET')) fail('Telegram OIDC client secret must not be committed into the Worker source');

console.log('iOS POC OK: native shell, Telegram OIDC exchange, Keychain session, WKWebView bridge and legacy API compatibility are wired without exposing secrets.');
