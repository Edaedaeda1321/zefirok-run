-- Economy v3 production rebase + Alex case balance v2.
-- Only exact legacy built-in prices are rebased; different owner-custom prices are preserved.

UPDATE skin_prices SET points=50000,treats=0,coffee=100,version=MAX(version,5),updated_at=unixepoch(),updated_by='economy-v3-rebase' WHERE skin_id='barista' AND points=100000 AND treats=0 AND coffee=400;
UPDATE skin_prices SET points=100000,treats=120,coffee=0,version=MAX(version,5),updated_at=unixepoch(),updated_by='economy-v3-rebase' WHERE skin_id='strawberry' AND points=180000 AND treats=400 AND coffee=0;
UPDATE skin_prices SET points=150000,treats=180,coffee=0,version=MAX(version,5),updated_at=unixepoch(),updated_by='economy-v3-rebase' WHERE skin_id='bee' AND points=350000 AND treats=650 AND coffee=0;
UPDATE skin_prices SET points=200000,treats=0,coffee=200,version=MAX(version,5),updated_at=unixepoch(),updated_by='economy-v3-rebase' WHERE skin_id='sailor' AND points=650000 AND treats=0 AND coffee=650;
UPDATE skin_prices SET points=250000,treats=250,coffee=250,version=MAX(version,5),updated_at=unixepoch(),updated_by='economy-v3-rebase' WHERE skin_id='princess' AND points=1300000 AND treats=850 AND coffee=850;
UPDATE skin_prices SET points=300000,treats=350,coffee=350,version=MAX(version,5),updated_at=unixepoch(),updated_by='economy-v3-rebase' WHERE skin_id='angel' AND points=2400000 AND treats=1000 AND coffee=1000;
UPDATE skin_prices SET points=350000,treats=500,coffee=500,version=MAX(version,5),updated_at=unixepoch(),updated_by='economy-v3-rebase' WHERE skin_id='alex' AND points=3000000 AND treats=1500 AND coffee=1500;

UPDATE shop_assortment SET points=5000,treats=20,coffee=20,updated_at=unixepoch(),updated_by='economy-v3-rebase' WHERE product_id='case-small' AND points=10000 AND treats=100 AND coffee=100;
UPDATE shop_assortment SET points=10000,treats=35,coffee=35,updated_at=unixepoch(),updated_by='economy-v3-rebase' WHERE product_id='case-sweet' AND points=10000 AND treats=100 AND coffee=100;
UPDATE shop_assortment SET points=20000,treats=60,coffee=60,updated_at=unixepoch(),updated_by='economy-v3-rebase' WHERE product_id='case-gold' AND points=10000 AND treats=100 AND coffee=100;
UPDATE shop_assortment SET points=50000,treats=100,coffee=100,updated_at=unixepoch(),updated_by='economy-v3-rebase' WHERE product_id='case-mythic' AND points=300000 AND treats=350 AND coffee=350;
UPDATE shop_assortment SET points=200000,treats=350,coffee=350,updated_at=unixepoch(),updated_by='economy-v3-rebase' WHERE product_id='case-legendary' AND points=600000 AND treats=600 AND coffee=600;
UPDATE shop_assortment SET points=25000,treats=50,coffee=50,updated_at=unixepoch(),updated_by='economy-v3-rebase' WHERE product_id='case-alex' AND points=100000 AND treats=75 AND coffee=75;

UPDATE liveops_case_configs
SET chances_json=json_set(CASE WHEN json_valid(chances_json) THEN chances_json ELSE '{}' END,'$.skin',10,'$.trail',15,'$.frame',12,'$.avatar',13,'$.points',16.666667,'$.treats',16.666667,'$.coffee',16.666667,'$.booster',0,'$.epicCosmetic',0,'$.mythicCosmetic',0,'$.legendaryCosmetic',0,'$.music',0,'$.physical',0),updated_at=unixepoch(),updated_by='alex-balance-v2'
WHERE case_id='alex' AND (((ABS(CAST(COALESCE(json_extract(chances_json,'$.skin'),-999) AS REAL)-10)<0.0001) AND (ABS(CAST(COALESCE(json_extract(chances_json,'$.trail'),-999) AS REAL)-15)<0.0001) AND (ABS(CAST(COALESCE(json_extract(chances_json,'$.frame'),-999) AS REAL)-12)<0.0001) AND (ABS(CAST(COALESCE(json_extract(chances_json,'$.avatar'),-999) AS REAL)-0.15)<0.0001)) OR ((ABS(CAST(COALESCE(json_extract(chances_json,'$.skin'),-999) AS REAL)-0.12)<0.0001) AND (ABS(CAST(COALESCE(json_extract(chances_json,'$.trail'),-999) AS REAL)-0.15)<0.0001) AND (ABS(CAST(COALESCE(json_extract(chances_json,'$.frame'),-999) AS REAL)-0.15)<0.0001) AND (ABS(CAST(COALESCE(json_extract(chances_json,'$.avatar'),-999) AS REAL)-0.15)<0.0001)));
