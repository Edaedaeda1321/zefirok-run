-- Retention integration: execute the same archive-before-delete shapes against
-- local D1 and verify detail windows, rollups and reward idempotency survive.
CREATE TABLE __retention_assert(label TEXT PRIMARY KEY,ok INTEGER NOT NULL CHECK(ok=1));

-- Run sessions: terminal old detail is rolled up; active/recent rows remain.
INSERT INTO game_run_sessions(run_id,telegram_id,started_at_ms,expires_at_ms,status,duration_ms,score,run_treats,run_coffee,economy_points,economy_treats,economy_coffee,profile_xp,new_record,accepted_rating,season_id,created_at,updated_at)
VALUES('run-old','p1',1,2,'finished',15000,100,2,1,10,2,1,3,1,1,'s1',100,100),('run-live','p1',1,999999,'started',0,0,0,0,0,0,0,0,0,0,'s1',100,100);
INSERT INTO game_run_session_daily_archive(day_at,status,season_id,runs,duration_ms,score,run_treats,run_coffee,economy_points,economy_treats,economy_coffee,profile_xp,new_records,accepted_rating)
SELECT CAST(updated_at/86400 AS INTEGER)*86400,status,season_id,COUNT(*),SUM(duration_ms),SUM(score),SUM(run_treats),SUM(run_coffee),SUM(economy_points),SUM(economy_treats),SUM(economy_coffee),SUM(profile_xp),SUM(new_record),SUM(accepted_rating)
FROM game_run_sessions WHERE status IN ('finished','expired','superseded') AND updated_at<500 GROUP BY CAST(updated_at/86400 AS INTEGER)*86400,status,season_id
ON CONFLICT(day_at,status,season_id) DO UPDATE SET runs=game_run_session_daily_archive.runs+excluded.runs;
DELETE FROM game_run_sessions WHERE run_id IN (SELECT run_id FROM game_run_sessions WHERE status IN ('finished','expired','superseded') AND updated_at<500 ORDER BY updated_at,run_id LIMIT 100);
INSERT INTO __retention_assert VALUES('session-rollup',(SELECT NOT EXISTS(SELECT 1 FROM game_run_sessions WHERE run_id='run-old') AND EXISTS(SELECT 1 FROM game_run_sessions WHERE run_id='run-live') AND EXISTS(SELECT 1 FROM game_run_session_daily_archive WHERE status='finished' AND runs=1 AND score=100)));

-- Live proofs: short-lived exact evidence becomes daily operational telemetry.
INSERT INTO game_run_live_proofs(run_id,telegram_id,seq,duration_ms,score,run_treats,run_coffee,last_server_at_ms,created_at,updated_at) VALUES('proof-old','p1',3,15000,100,2,1,1,100,100);
INSERT INTO game_run_proof_daily_archive(day_at,proofs,seq_total,seq_max,duration_ms,score,run_treats,run_coffee)
SELECT CAST(updated_at/86400 AS INTEGER)*86400,COUNT(*),SUM(seq),MAX(seq),SUM(duration_ms),SUM(score),SUM(run_treats),SUM(run_coffee) FROM game_run_live_proofs WHERE updated_at<500 GROUP BY CAST(updated_at/86400 AS INTEGER)*86400
ON CONFLICT(day_at) DO UPDATE SET proofs=game_run_proof_daily_archive.proofs+excluded.proofs;
DELETE FROM game_run_live_proofs WHERE run_id IN (SELECT run_id FROM game_run_live_proofs WHERE updated_at<500 ORDER BY updated_at,run_id LIMIT 100);
INSERT INTO __retention_assert VALUES('proof-rollup',(SELECT NOT EXISTS(SELECT 1 FROM game_run_live_proofs WHERE run_id='proof-old') AND EXISTS(SELECT 1 FROM game_run_proof_daily_archive WHERE proofs=1 AND seq_max=3)));

-- Economy ledger: wide detail is removed only after both daily aggregate and the
-- compact per-run achievement fact exist.
INSERT INTO player_economy_run_ledger(run_id,telegram_id,points,treats,coffee,profile_xp,raw_score,raw_treats,raw_coffee,duration_ms,new_record,accepted_rating,season_id,created_at)
VALUES('ledger-old','p2',10,2,1,3,100,2,1,15000,1,1,'s1',100);
INSERT INTO leaderboard_runs(run_id,telegram_id,score,accepted,created_at) VALUES('ledger-old','p2',120,1,100);
INSERT OR IGNORE INTO player_economy_run_fact_archive(run_id,telegram_id,qualification_ms,qualified,raw_score,raw_treats,raw_coffee,created_at)
SELECT run_id,telegram_id,12000,CASE WHEN duration_ms>=12000 THEN 1 ELSE 0 END,raw_score,raw_treats,raw_coffee,created_at FROM player_economy_run_ledger WHERE created_at<500;
INSERT INTO player_economy_run_daily_archive(day_at,telegram_id,qualification_ms,runs,qualifying_runs,points,treats,coffee,profile_xp,raw_score,raw_treats,raw_coffee,qualifying_raw_score,qualifying_raw_treats,qualifying_raw_coffee,duration_ms,new_records,accepted_rating)
SELECT CAST(created_at/86400 AS INTEGER)*86400,telegram_id,12000,COUNT(*),SUM(duration_ms>=12000),SUM(points),SUM(treats),SUM(coffee),SUM(profile_xp),SUM(raw_score),SUM(raw_treats),SUM(raw_coffee),SUM(CASE WHEN duration_ms>=12000 THEN raw_score ELSE 0 END),SUM(CASE WHEN duration_ms>=12000 THEN raw_treats ELSE 0 END),SUM(CASE WHEN duration_ms>=12000 THEN raw_coffee ELSE 0 END),SUM(duration_ms),SUM(new_record),SUM(accepted_rating) FROM player_economy_run_ledger WHERE created_at<500 GROUP BY CAST(created_at/86400 AS INTEGER)*86400,telegram_id
ON CONFLICT(day_at,telegram_id) DO UPDATE SET runs=player_economy_run_daily_archive.runs+excluded.runs;
DELETE FROM player_economy_run_ledger WHERE run_id IN (SELECT run_id FROM player_economy_run_ledger WHERE created_at<500 ORDER BY created_at,run_id LIMIT 100);
INSERT INTO __retention_assert VALUES('ledger-compact',(SELECT NOT EXISTS(SELECT 1 FROM player_economy_run_ledger WHERE run_id='ledger-old') AND EXISTS(SELECT 1 FROM player_economy_run_fact_archive WHERE run_id='ledger-old' AND qualified=1 AND raw_treats=2) AND EXISTS(SELECT 1 FROM player_economy_run_daily_archive WHERE telegram_id='p2' AND qualifying_runs=1)));
INSERT INTO __retention_assert VALUES('ledger-achievement-dedupe',(SELECT count=1 AND total_score=120 AND run_zefir=2 FROM (SELECT COUNT(*) count,SUM(score) total_score,SUM(run_zefir) run_zefir FROM (SELECT run_id,MAX(score) score,MAX(run_zefir) run_zefir FROM (SELECT run_id,raw_score score,raw_treats run_zefir FROM player_economy_run_fact_archive WHERE telegram_id='p2' AND qualification_ms=12000 AND qualified=1 UNION ALL SELECT run_id,score,0 FROM leaderboard_runs WHERE telegram_id='p2' AND accepted=1) GROUP BY run_id))));

-- Performance: raw -> hourly -> daily.
INSERT INTO admin_performance_samples(area,duration_ms,success,created_at) VALUES('owner',25,1,100),('owner',75,0,101);
INSERT INTO admin_performance_hourly_archive(bucket_at,area,samples,total_duration_ms,max_duration_ms,errors)
SELECT CAST(created_at/3600 AS INTEGER)*3600,area,COUNT(*),SUM(duration_ms),MAX(duration_ms),SUM(CASE WHEN success=1 THEN 0 ELSE 1 END) FROM admin_performance_samples WHERE created_at<500 GROUP BY CAST(created_at/3600 AS INTEGER)*3600,area
ON CONFLICT(bucket_at,area) DO UPDATE SET samples=admin_performance_hourly_archive.samples+excluded.samples,total_duration_ms=admin_performance_hourly_archive.total_duration_ms+excluded.total_duration_ms,max_duration_ms=MAX(admin_performance_hourly_archive.max_duration_ms,excluded.max_duration_ms),errors=admin_performance_hourly_archive.errors+excluded.errors;
DELETE FROM admin_performance_samples WHERE created_at<500;
INSERT INTO admin_performance_daily_archive(day_at,area,samples,total_duration_ms,max_duration_ms,errors)
SELECT CAST(bucket_at/86400 AS INTEGER)*86400,area,SUM(samples),SUM(total_duration_ms),MAX(max_duration_ms),SUM(errors) FROM admin_performance_hourly_archive WHERE bucket_at<500 GROUP BY CAST(bucket_at/86400 AS INTEGER)*86400,area
ON CONFLICT(day_at,area) DO UPDATE SET samples=admin_performance_daily_archive.samples+excluded.samples;
DELETE FROM admin_performance_hourly_archive WHERE bucket_at<500;
INSERT INTO __retention_assert VALUES('performance-rollup',(SELECT NOT EXISTS(SELECT 1 FROM admin_performance_samples) AND EXISTS(SELECT 1 FROM admin_performance_daily_archive WHERE area='owner' AND samples=2 AND max_duration_ms=75 AND errors=1)));

-- Server analytics, content analytics and timeline retain aggregate history.
INSERT INTO server_analytics_hourly(bucket_at,active_players,new_players,runs_total,runs_accepted,cases_opened,shop_operations,rewards_delivered,rewards_failed,staff_notifications_sent,staff_notifications_failed,player_notifications_sent,player_notifications_failed,cron_runs,cron_failures,cron_duration_ms,created_at,updated_at) VALUES(100,5,2,10,8,1,1,3,1,2,0,4,1,6,1,50,100,100);
INSERT INTO server_analytics_daily_archive(day_at,peak_active_players,active_player_hours,new_players,runs_total,runs_accepted,cases_opened,shop_operations,rewards_delivered,rewards_failed,staff_notifications_sent,staff_notifications_failed,player_notifications_sent,player_notifications_failed,cron_runs,cron_failures,cron_duration_ms) SELECT CAST(bucket_at/86400 AS INTEGER)*86400,MAX(active_players),SUM(active_players),SUM(new_players),SUM(runs_total),SUM(runs_accepted),SUM(cases_opened),SUM(shop_operations),SUM(rewards_delivered),SUM(rewards_failed),SUM(staff_notifications_sent),SUM(staff_notifications_failed),SUM(player_notifications_sent),SUM(player_notifications_failed),SUM(cron_runs),SUM(cron_failures),SUM(cron_duration_ms) FROM server_analytics_hourly WHERE bucket_at<500 GROUP BY CAST(bucket_at/86400 AS INTEGER)*86400 ON CONFLICT(day_at) DO UPDATE SET runs_total=server_analytics_daily_archive.runs_total+excluded.runs_total;
DELETE FROM server_analytics_hourly WHERE bucket_at<500;
INSERT INTO content_analytics_events(telegram_id,item_kind,item_id,event_type,source_type,source_id,created_at) VALUES('p3','skin','s1','equipped','shop','x',100);
INSERT INTO content_analytics_daily_archive(day_at,item_kind,item_id,event_type,source_type,events) SELECT CAST(created_at/86400 AS INTEGER)*86400,item_kind,item_id,event_type,source_type,COUNT(*) FROM content_analytics_events WHERE created_at<500 GROUP BY CAST(created_at/86400 AS INTEGER)*86400,item_kind,item_id,event_type,source_type ON CONFLICT(day_at,item_kind,item_id,event_type,source_type) DO UPDATE SET events=content_analytics_daily_archive.events+excluded.events;
DELETE FROM content_analytics_events WHERE created_at<500;
INSERT INTO player_timeline_events(telegram_id,event_type,title,source_id,created_at) VALUES('p3','reward','old','timeline-old',100);
INSERT INTO player_timeline_daily_archive(day_at,telegram_id,event_type,events) SELECT CAST(created_at/86400 AS INTEGER)*86400,telegram_id,event_type,COUNT(*) FROM player_timeline_events WHERE created_at<500 GROUP BY CAST(created_at/86400 AS INTEGER)*86400,telegram_id,event_type ON CONFLICT(day_at,telegram_id,event_type) DO UPDATE SET events=player_timeline_daily_archive.events+excluded.events;
DELETE FROM player_timeline_events WHERE created_at<500;
INSERT INTO __retention_assert VALUES('analytics-rollups',(SELECT EXISTS(SELECT 1 FROM server_analytics_daily_archive WHERE runs_total=10) AND EXISTS(SELECT 1 FROM content_analytics_daily_archive WHERE item_id='s1' AND events=1) AND EXISTS(SELECT 1 FROM player_timeline_daily_archive WHERE telegram_id='p3' AND events=1)));

-- Notification delivery history: recent/retryable rows stay detailed, older terminal
-- message bodies collapse into daily category/status counters.
INSERT INTO player_notification_log(telegram_id,category,sent_at) VALUES('p5','mail',100);
INSERT INTO player_notification_queue(telegram_id,chat_id,category,message_html,status,attempts,available_at,created_at,updated_at) VALUES('p5','p5','mail','sent-body','sent',1,1,100,100),('p5','p5','mail','retry-body','failed',4,1,100,100),('p5','p5','mail','terminal-body','failed',5,1,100,100);
INSERT INTO leaderboard_staff_notifications(event_key,recipient_telegram_id,message_html,status,attempts,created_at,updated_at,sent_at) VALUES('evt1','staff','staff-body','sent',1,100,100,100);
INSERT INTO notification_delivery_daily_archive(day_at,channel,category,status,deliveries,attempts,errors) SELECT CAST(sent_at/86400 AS INTEGER)*86400,'player_log',category,'sent',COUNT(*),0,0 FROM player_notification_log WHERE sent_at<500 GROUP BY CAST(sent_at/86400 AS INTEGER)*86400,category ON CONFLICT(day_at,channel,category,status) DO UPDATE SET deliveries=notification_delivery_daily_archive.deliveries+excluded.deliveries;
DELETE FROM player_notification_log WHERE sent_at<500;
INSERT INTO notification_delivery_daily_archive(day_at,channel,category,status,deliveries,attempts,errors) SELECT CAST(updated_at/86400 AS INTEGER)*86400,'player_queue',category,status,COUNT(*),SUM(attempts),SUM(status='failed') FROM player_notification_queue WHERE (status IN ('sent','cancelled') OR (status='failed' AND attempts>=5)) AND updated_at<500 GROUP BY CAST(updated_at/86400 AS INTEGER)*86400,category,status ON CONFLICT(day_at,channel,category,status) DO UPDATE SET deliveries=notification_delivery_daily_archive.deliveries+excluded.deliveries,attempts=notification_delivery_daily_archive.attempts+excluded.attempts,errors=notification_delivery_daily_archive.errors+excluded.errors;
DELETE FROM player_notification_queue WHERE id IN (SELECT id FROM player_notification_queue WHERE (status IN ('sent','cancelled') OR (status='failed' AND attempts>=5)) AND updated_at<500);
INSERT INTO notification_delivery_daily_archive(day_at,channel,category,status,deliveries,attempts,errors) SELECT CAST(updated_at/86400 AS INTEGER)*86400,'staff_queue','leaderboard',status,COUNT(*),SUM(attempts),SUM(status='failed') FROM leaderboard_staff_notifications WHERE (status='sent' OR (status='failed' AND attempts>=5)) AND updated_at<500 GROUP BY CAST(updated_at/86400 AS INTEGER)*86400,status ON CONFLICT(day_at,channel,category,status) DO UPDATE SET deliveries=notification_delivery_daily_archive.deliveries+excluded.deliveries;
DELETE FROM leaderboard_staff_notifications WHERE id IN (SELECT id FROM leaderboard_staff_notifications WHERE (status='sent' OR (status='failed' AND attempts>=5)) AND updated_at<500);
INSERT INTO __retention_assert VALUES('notification-delivery-rollup',(SELECT NOT EXISTS(SELECT 1 FROM player_notification_log) AND EXISTS(SELECT 1 FROM player_notification_queue WHERE status='failed' AND attempts=4) AND NOT EXISTS(SELECT 1 FROM player_notification_queue WHERE status='sent') AND NOT EXISTS(SELECT 1 FROM player_notification_queue WHERE status='failed' AND attempts=5) AND NOT EXISTS(SELECT 1 FROM leaderboard_staff_notifications WHERE status='sent') AND (SELECT SUM(deliveries) FROM notification_delivery_daily_archive)>=4));

-- Delivery history: terminal detail/effects are compacted but operation identity is
-- retained forever, and both new and rolling-deploy legacy writers are blocked.
INSERT OR IGNORE INTO reward_delivery_queue(operation_id,telegram_id,source_type,source_id,reward_kind,reward_id,amount,status,available_at,created_at,updated_at,delivered_at) VALUES('rq:v1:archive-test','p4','test','archive-source','points','',5,'delivered',1,100,100,100);
INSERT INTO reward_delivery_effects(queue_id,telegram_id,reward_kind,reward_id,apply_token,applied_at) SELECT id,'p4','points','','apply',100 FROM reward_delivery_queue WHERE operation_id='rq:v1:archive-test';
INSERT OR IGNORE INTO reward_delivery_archive(operation_id,queue_id,telegram_id,source_type,source_id,reward_kind,reward_id,amount,final_status,created_at,completed_at) SELECT operation_id,id,telegram_id,source_type,source_id,reward_kind,reward_id,amount,status,created_at,MAX(updated_at,delivered_at,claimed_at) FROM reward_delivery_queue WHERE operation_id='rq:v1:archive-test';
DELETE FROM reward_delivery_effects WHERE queue_id IN (SELECT id FROM reward_delivery_queue WHERE operation_id='rq:v1:archive-test');
DELETE FROM reward_delivery_queue WHERE operation_id='rq:v1:archive-test';
INSERT OR IGNORE INTO reward_delivery_queue(operation_id,telegram_id,source_type,source_id,reward_kind,reward_id,amount,available_at,created_at,updated_at) VALUES('rq:v1:archive-test','p4','test','archive-source','points','',5,1,200,200);
INSERT INTO __retention_assert VALUES('reward-archive-new-idempotency',(SELECT EXISTS(SELECT 1 FROM reward_delivery_archive WHERE operation_id='rq:v1:archive-test') AND NOT EXISTS(SELECT 1 FROM reward_delivery_queue WHERE operation_id='rq:v1:archive-test')));

INSERT INTO reward_delivery_archive(operation_id,queue_id,telegram_id,source_type,source_id,reward_kind,reward_id,amount,final_status,created_at,completed_at)
VALUES('rq:v1:'||json_array('legacy-retention','legacy-source','legacy-archived-player','points',''),9999,'legacy-archived-player','legacy-retention','legacy-source','points','',1,'delivered',1,1);
INSERT OR IGNORE INTO reward_delivery_queue(telegram_id,source_type,source_id,reward_kind,reward_id,amount,available_at,created_at,updated_at) VALUES('legacy-archived-player','legacy-retention','legacy-source','points','',1,1,300,300);
INSERT INTO __retention_assert VALUES('reward-archive-legacy-bridge',(SELECT NOT EXISTS(SELECT 1 FROM reward_delivery_queue WHERE telegram_id='legacy-archived-player' AND source_type='legacy-retention')));

INSERT INTO __retention_assert VALUES('retention-indexes',(SELECT COUNT(*)>=7 FROM sqlite_master WHERE type='index' AND name IN ('idx_game_run_sessions_retention','idx_game_run_live_proofs_retention','idx_player_economy_run_ledger_retention','idx_admin_performance_retention','idx_content_analytics_retention','idx_player_timeline_retention','idx_reward_delivery_retention')));
DROP TABLE __retention_assert;
