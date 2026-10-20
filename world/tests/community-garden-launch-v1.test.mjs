import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {readFileSync} from 'node:fs';
const sql=n=>readFileSync(new URL(`../../migrations/${n}`,import.meta.url),'utf8');
function oldDb(){
 const db=new DatabaseSync(':memory:');db.exec('PRAGMA foreign_keys=ON; CREATE TABLE admin_profile_state(telegram_id TEXT PRIMARY KEY,wallet INTEGER,revision INTEGER);');
 db.exec("INSERT INTO admin_profile_state VALUES ('12345678',12000,1)");
 db.exec(sql('0115_zeffi_community_fund.sql'));db.exec(sql('0118_zeffi_story_progression.sql'));
 return db;
}
function migrate(db){db.exec('BEGIN IMMEDIATE;');try{db.exec(sql('0127_zeffi_garden_community_launch.sql'));db.exec('COMMIT;');}catch(e){db.exec('ROLLBACK;');throw e;}}
test('0127 transaction keeps ledger, wallet, chapter FK and historic Garden progress',()=>{
 const db=oldDb();
 db.prepare("UPDATE zeffi_community_projects SET total_points=35000,revision=4,last_request_id='historic',updated_at=456 WHERE project_id='garden'").run();
 db.prepare('INSERT INTO zeffi_community_contributions VALUES (?,?,?,?,?,?,?,?,?)').run('12345678','historic-receipt-1','garden',35000,35000,4,123,1,1);
 const before=db.prepare('SELECT * FROM zeffi_community_contributions').all();
 migrate(db);
 assert.deepEqual(db.prepare('SELECT * FROM zeffi_community_contributions').all(),before);
 assert.equal(db.prepare("SELECT wallet FROM admin_profile_state WHERE telegram_id='12345678'").get().wallet,12000);
 assert.deepEqual({...db.prepare("SELECT goal_points,total_points,stage,revision,last_request_id,updated_at FROM zeffi_community_projects WHERE project_id='garden'").get()},
  {goal_points:60000,total_points:35000,stage:0,revision:4,last_request_id:'historic',updated_at:456});
 assert.equal(db.prepare('SELECT * FROM pragma_foreign_key_check').all().length,0);
 assert.equal(db.prepare("SELECT COUNT(*) AS n FROM zeffi_story_events WHERE event_id='garden'").get().n,1);
});
test('0127 fails closed rather than erasing paid contributions when old Garden exceeded 60k',()=>{
 const db=oldDb();db.prepare("UPDATE zeffi_community_projects SET total_points=70000,revision=3 WHERE project_id='garden'").run();
 assert.throws(()=>migrate(db),/CHECK constraint failed/);
 assert.equal(db.prepare("SELECT goal_points FROM zeffi_community_projects WHERE project_id='garden'").get().goal_points,1000000);
 assert.equal(db.prepare('SELECT COUNT(*) n FROM zeffi_community_projects').get().n,2);
 assert.equal(db.prepare('SELECT * FROM pragma_foreign_key_check').all().length,0);
});

test('locked Festival entry stays in coming-soon panel even before story chapter 1',()=>{
 const app=readFileSync(new URL('../story/app.js',import.meta.url),'utf8');
 assert.ok(!app.includes("if(liveMode&&kind==='festival-project'&&storySnapshot?.chapter<1)"));
 assert.ok(app.includes("if(id==='festival'&&(liveMode||isPlaceOpen(place,worldState())))"));
});
