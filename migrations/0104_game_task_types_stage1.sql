-- Game Task Hub stage 1: extensible task parameters for richer server-authoritative goals.
-- New task trigger types read progress from existing authoritative run ledger data.
ALTER TABLE automation_chains
ADD COLUMN task_params_json TEXT NOT NULL DEFAULT '{}';
