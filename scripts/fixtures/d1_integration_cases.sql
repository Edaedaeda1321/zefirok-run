-- Each INSERT into __assert must satisfy CHECK(ok=1), otherwise Wrangler exits non-zero.
CREATE TABLE __assert(label TEXT PRIMARY KEY,ok INTEGER NOT NULL CHECK(ok=1));

-- migration old DB -> current: rich workflow wins and reward queue gets operation_id.
INSERT INTO __assert VALUES('migration-support-authority',(SELECT status='working' AND closed_at=0 FROM support_tickets WHERE id=1));
INSERT INTO __assert VALUES('migration-support-rich-state-preserved',(SELECT workflow_state='waiting_player' FROM support_ticket_workflow WHERE ticket_id=1));
INSERT INTO __assert VALUES('migration-reward-operation-id',(SELECT TRIM(operation_id)<>'' FROM reward_delivery_queue WHERE telegram_id='legacy-player'));
INSERT INTO __assert VALUES('migration-legacy-audit',(SELECT COUNT(*)=2 FROM player_legacy_migration_audit));

-- Support authority: workflow -> legacy shadow.
UPDATE support_ticket_workflow SET workflow_state='resolved',updated_at=1700000200 WHERE ticket_id=1;
INSERT INTO __assert VALUES('support-workflow-to-shadow',(SELECT status='resolved' AND closed_at>0 FROM support_tickets WHERE id=1));
UPDATE support_ticket_workflow SET workflow_state='waiting_player',updated_at=1700000300 WHERE ticket_id=1;
INSERT INTO __assert VALUES('support-rich-shadow',(SELECT status='working' AND closed_at=0 FROM support_tickets WHERE id=1));
-- Old writer changes legacy status: bridge updates workflow, without a split-brain state.
UPDATE support_tickets SET status='rejected',updated_at=1700000400 WHERE id=1;
INSERT INTO __assert VALUES('support-legacy-bridge',(SELECT workflow_state='rejected' FROM support_ticket_workflow WHERE ticket_id=1));

-- accountRevision: new domains invalidate global account token.
INSERT INTO player_account_revision(telegram_id,revision,updated_at) VALUES('rev-player',10,0) ON CONFLICT DO NOTHING;
INSERT INTO player_mail_v3(mail_id,telegram_id,subject,reward_state,updated_at) VALUES('m1','rev-player','mail','available',1);
INSERT INTO achievement_claims(telegram_id) VALUES('rev-player');
INSERT INTO daily_loyalty_claims(telegram_id) VALUES('rev-player');
INSERT INTO __assert VALUES('account-revision-expanded',(SELECT revision>=13 FROM player_account_revision WHERE telegram_id='rev-player'));
INSERT INTO player_account_revision(telegram_id,revision,updated_at) VALUES('ref-a',1,0),('ref-b',1,0) ON CONFLICT DO NOTHING;
INSERT INTO referral_friend_gifts(gift_id,sender_telegram_id,recipient_telegram_id,created_at) VALUES('gift-x','ref-a','ref-b',1);
INSERT INTO __assert VALUES('account-revision-multiparty',(SELECT (SELECT revision FROM player_account_revision WHERE telegram_id='ref-a')>1 AND (SELECT revision FROM player_account_revision WHERE telegram_id='ref-b')>1));

-- purchase -> lost response -> retry: same request marker charges/grants once.
INSERT INTO admin_profile_state(telegram_id,wallet,treats,coffee,created_at,updated_at,updated_by) VALUES('buyer',1000,0,0,1,1,'seed');
UPDATE admin_profile_state SET wallet=wallet-100,revision=revision+1,updated_at=10,updated_by='case-purchase:req-timeout' WHERE telegram_id='buyer' AND wallet>=100 AND NOT EXISTS(SELECT 1 FROM granted_cases WHERE id='shopcase_buyer_req-timeout');
INSERT OR IGNORE INTO granted_cases(id,telegram_id,case_type,status,granted_by,reason,created_at) SELECT 'shopcase_buyer_req-timeout','buyer','small','pending','shop','test',10 WHERE EXISTS(SELECT 1 FROM admin_profile_state WHERE telegram_id='buyer' AND updated_by='case-purchase:req-timeout');
-- retry after client timed out
UPDATE admin_profile_state SET wallet=wallet-100,revision=revision+1,updated_at=11,updated_by='case-purchase:req-timeout' WHERE telegram_id='buyer' AND wallet>=100 AND NOT EXISTS(SELECT 1 FROM granted_cases WHERE id='shopcase_buyer_req-timeout');
INSERT OR IGNORE INTO granted_cases(id,telegram_id,case_type,status,granted_by,reason,created_at) SELECT 'shopcase_buyer_req-timeout','buyer','small','pending','shop','test',11 WHERE EXISTS(SELECT 1 FROM admin_profile_state WHERE telegram_id='buyer' AND updated_by='case-purchase:req-timeout');
INSERT INTO __assert VALUES('purchase-timeout-retry',(SELECT wallet=900 AND (SELECT COUNT(*) FROM granted_cases WHERE id='shopcase_buyer_req-timeout')=1 FROM admin_profile_state WHERE telegram_id='buyer'));

-- price changed: stale quote cannot produce an economic mutation.
INSERT INTO shop_assortment(product_id,enabled,points,updated_at) VALUES('case_small',1,200,20);
INSERT INTO admin_profile_state(telegram_id,wallet,created_at,updated_at,updated_by) VALUES('price-buyer',500,1,1,'seed');
UPDATE admin_profile_state SET wallet=wallet-100,updated_by='price-op' WHERE telegram_id='price-buyer' AND EXISTS(SELECT 1 FROM shop_assortment WHERE product_id='case_small' AND points=100);
INSERT OR IGNORE INTO granted_cases(id,telegram_id,case_type,status,granted_by,reason,created_at) SELECT 'shopcase_price-buyer_price-op','price-buyer','small','pending','shop','test',20 WHERE EXISTS(SELECT 1 FROM admin_profile_state WHERE telegram_id='price-buyer' AND updated_by='price-op');
INSERT INTO __assert VALUES('price-changed-no-mutation',(SELECT wallet=500 AND NOT EXISTS(SELECT 1 FROM granted_cases WHERE id='shopcase_price-buyer_price-op') FROM admin_profile_state WHERE telegram_id='price-buyer'));

-- granted case open -> timeout -> retry lease expiration -> one final result.
INSERT INTO granted_cases(id,telegram_id,case_type,status,granted_by,reason,created_at,opening_started_at,opening_token) VALUES('grant-retry','case-player','gold','opening','test','test',1,100,'open-req');
UPDATE granted_cases SET status='pending',opening_started_at=0,opening_token='' WHERE id='grant-retry' AND telegram_id='case-player' AND status='opening' AND opening_started_at=100 AND opening_token='open-req';
UPDATE granted_cases SET status='opening',opening_started_at=120,opening_token='open-req' WHERE id='grant-retry' AND telegram_id='case-player' AND status='pending';
UPDATE granted_cases SET status='opened',rewards_json='[{"kind":"points","amount":1}]',opened_at=121 WHERE id='grant-retry' AND telegram_id='case-player' AND status='opening' AND opening_token='open-req';
-- duplicate retry sees opened row; no second transition/reward row can be created.
UPDATE granted_cases SET status='opening' WHERE id='grant-retry' AND telegram_id='case-player' AND status='pending';
INSERT INTO __assert VALUES('case-open-retry',(SELECT status='opened' AND opening_token='open-req' FROM granted_cases WHERE id='grant-retry'));

-- reward queue full idempotency + expired lease reclaim.
INSERT OR IGNORE INTO reward_delivery_queue(operation_id,telegram_id,source_type,source_id,reward_kind,reward_id,amount,available_at,created_at,updated_at) VALUES('rq:v1:test:op-1:qplayer:points:','qplayer','test','op-1','points','',5,1,1,1);
INSERT OR IGNORE INTO reward_delivery_queue(operation_id,telegram_id,source_type,source_id,reward_kind,reward_id,amount,available_at,created_at,updated_at) VALUES('rq:v1:test:op-1:qplayer:points:','qplayer','test','op-1','points','',5,1,1,1);
INSERT INTO __assert VALUES('reward-queue-idempotency',(SELECT COUNT(*)=1 FROM reward_delivery_queue WHERE operation_id='rq:v1:test:op-1:qplayer:points:'));
UPDATE reward_delivery_queue SET status='delivering',lease_token='dead',lease_until=10 WHERE operation_id='rq:v1:test:op-1:qplayer:points:';
UPDATE reward_delivery_queue SET status='pending',lease_token='',lease_until=0,available_at=20 WHERE operation_id='rq:v1:test:op-1:qplayer:points:' AND status='delivering' AND lease_until<20;
UPDATE reward_delivery_queue SET status='delivering',attempts=attempts+1,lease_token='new-lease',lease_until=40 WHERE operation_id='rq:v1:test:op-1:qplayer:points:' AND status='pending' AND available_at<=20 AND lease_until=0;
INSERT INTO __assert VALUES('reward-lease-expiration',(SELECT status='delivering' AND lease_token='new-lease' AND attempts=1 FROM reward_delivery_queue WHERE operation_id='rq:v1:test:op-1:qplayer:points:'));

-- season claim x2: primary key makes claim idempotent.
INSERT OR IGNORE INTO season_pass_claims(season_id,telegram_id,level,lane,status,reward_json,claimed_at) VALUES('s1','season-player',5,'free','delivered','{}',1);
INSERT OR IGNORE INTO season_pass_claims(season_id,telegram_id,level,lane,status,reward_json,claimed_at) VALUES('s1','season-player',5,'free','delivered','{}',2);
INSERT INTO __assert VALUES('season-claim-x2',(SELECT COUNT(*)=1 FROM season_pass_claims WHERE season_id='s1' AND telegram_id='season-player' AND level=5 AND lane='free'));

-- stale revision: only the first compare-and-swap can commit.
INSERT INTO case_player_state(telegram_id,revision,created_at,updated_at) VALUES('cas-player',7,1,1);
UPDATE case_player_state SET revision=revision+1,updated_at=2 WHERE telegram_id='cas-player' AND revision=7;
UPDATE case_player_state SET revision=revision+1,updated_at=3 WHERE telegram_id='cas-player' AND revision=7;
INSERT INTO __assert VALUES('stale-revision',(SELECT revision=8 FROM case_player_state WHERE telegram_id='cas-player'));

DROP TABLE __assert;
