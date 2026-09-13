-- Schema Contract V2.
--
-- This migration intentionally does NOT recreate missing player tables, indexes
-- or revision triggers. V2 turns those objects into a deploy-time contract so a
-- damaged/restored D1 fails closed instead of being silently reconstructed as an
-- empty partial schema by player traffic.
--
-- Any Production D1 that cannot satisfy the V2 contract must be inspected first
-- and repaired with a dedicated migration/recovery plan for the missing objects.

INSERT INTO zefirok_schema_contract(contract_key,contract_version,migration_name,updated_at,updated_by)
VALUES('main',2,'0090_schema_contract_v2.sql',unixepoch(),'migration-0090')
ON CONFLICT(contract_key) DO UPDATE SET
  contract_version = CASE WHEN zefirok_schema_contract.contract_version < excluded.contract_version THEN excluded.contract_version ELSE zefirok_schema_contract.contract_version END,
  migration_name = excluded.migration_name,
  updated_at = excluded.updated_at,
  updated_by = excluded.updated_by;
