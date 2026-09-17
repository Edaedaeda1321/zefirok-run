#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const root=process.cwd();
const read=(p)=>fs.readFileSync(path.join(root,p),'utf8');
const must=(label,source,needle)=>{const ok=source.includes(needle);console.log(`${ok?'PASS':'FAIL'}  ${label}`);if(!ok)process.exitCode=1;};
const worker=read('src/worker.js');
const owner=read('owner.html');
const migration=read('migrations/0095_achievement_art_override.sql');

must('runtime art_url compatibility column',worker,'addRuntimeColumnIfMissing(env, "achievement_settings", "art_url"');
must('art override validator',worker,'function achievementArtOverrideUrl(value,{strict=false}={})');
must('configured achievement reads art override',worker,'const artOverrideUrl=achievementArtOverrideUrl(row?.art_url,{strict:false});');
must('configured achievement exposes default art',worker,'defaultArtUrl,');
must('owner API exposes raw override',worker,'artOverrideUrl:String(item.artOverrideUrl||"")');
must('owner API exposes auto art',worker,'defaultArtUrl:String(item.defaultArtUrl||"")');
must('save endpoint validates art',worker,'achievementArtOverrideUrl(body.artUrl??body.art_url,{strict:true})');
must('save SQL persists art_url',worker,'description,art_url,reward_kind');
must('owner art editor',owner,'function achievementCcArtEditor(item,index)');
must('owner art input',owner,'ArtUrl" maxlength="500"');
must('owner reset control',owner,'data-achievement-art-reset');
must('owner save payload sends artUrl',owner,'artUrl:String($(`${prefix}ArtUrl`)?.value||\'\').trim()');
must('migration adds art_url',migration,'ADD COLUMN art_url TEXT NOT NULL DEFAULT');

if(process.exitCode)throw new Error('Achievement art override check failed.');
console.log('\nAchievement art override check OK.');
