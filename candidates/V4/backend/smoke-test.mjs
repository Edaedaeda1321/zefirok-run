const base=String(process.argv[2]||process.env.CANDIDATE_API_URL||'').replace(/\/$/,'');
if(!base){console.error('Usage: node candidates/V4/backend/smoke-test.mjs https://candidate-worker.workers.dev');process.exit(2)}
const player='smoke-'+Date.now().toString(36);
async function call(path,body={}){const r=await fetch(base+'/api/candidate/v4'+path,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({playerKey:player,...body})});const d=await r.json();if(!r.ok||d.ok===false)throw new Error(`${path}: ${d.error||r.status}`);return d}
function ok(cond,msg){if(!cond)throw new Error(msg);console.log('OK',msg)}
await call('/test/reset');
let s=await call('/daily/bootstrap');ok(s.state.progressDays===0,'bootstrap starts at 0');
s=await call('/daily/activity',{requestId:'smoke-a-'+Date.now()});ok(s.state.progressDays===1,'first run advances one day');
const one=s.state.progressDays;s=await call('/daily/activity',{requestId:'smoke-b-'+Date.now()});ok(s.state.progressDays===one,'second run same server day is idempotent');
await call('/test/advance',{days:1});s=await call('/daily/activity',{requestId:'smoke-c-'+Date.now()});ok(s.state.streak===2,'next-day run continues streak');
await call('/test/advance',{days:2});s=await call('/daily/bootstrap');ok(s.state.streak===0,'full missed day breaks displayed streak');
s=await call('/test/preset',{days:14});ok(s.state.progressDays===14,'preset reaches day 14');ok(s.state.claimedDays.includes(7)&&s.state.claimedDays.includes(14),'milestone claims reconciled');
console.log('Candidate V4.2 smoke passed for',player);
