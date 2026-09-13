-- Latest-schema integration assertions. This fixture intentionally targets the
-- newest migrations so check-d1-integration cannot silently stop at 0088 again.
CREATE TABLE __schema_contract_assert(label TEXT PRIMARY KEY,ok INTEGER NOT NULL CHECK(ok=1));

INSERT INTO __schema_contract_assert VALUES(
  'schema-contract-v2-marker',
  (SELECT contract_version>=2 AND migration_name='0090_schema_contract_v2.sql'
   FROM zefirok_schema_contract WHERE contract_key='main')
);

INSERT INTO __schema_contract_assert VALUES(
  'seasonal-case-open-request-column',
  (SELECT COUNT(*)=1 FROM pragma_table_info('season_pass_case_grants') WHERE name='open_request_id')
);
INSERT INTO __schema_contract_assert VALUES(
  'seasonal-case-open-request-index',
  (SELECT COUNT(*)=1 FROM sqlite_schema WHERE type='index' AND name='idx_season_pass_case_grants_request')
);

-- Expanded account revision coverage from platform hardening must survive the
-- full migration chain. 110 is the canonical count for this release.
INSERT INTO __schema_contract_assert VALUES(
  'account-revision-trigger-coverage',
  (SELECT COUNT(*)>=110 FROM sqlite_schema WHERE type='trigger' AND name LIKE 'trg_account_revision_%')
);

DROP TABLE __schema_contract_assert;
