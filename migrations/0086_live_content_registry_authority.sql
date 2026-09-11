-- Live Content authority v2.
-- live_content_registry_state becomes the authoritative runtime state.
-- live_content_release_rules remains a compatibility shadow for old tooling only.

ALTER TABLE live_content_registry_state
ADD COLUMN content_season_id TEXT NOT NULL DEFAULT '';

ALTER TABLE live_content_registry_state
ADD COLUMN ever_released INTEGER NOT NULL DEFAULT 0;

INSERT OR IGNORE INTO live_content_registry_state(
  item_kind,item_id,status,release_at,routes_json,updated_at,updated_by,content_season_id,ever_released
)
SELECT
  item_kind,
  item_id,
  CASE WHEN released=1 THEN 'open' ELSE 'hidden' END,
  0,
  '{}',
  updated_at,
  updated_by,
  content_season_id,
  CASE WHEN released=1 OR ever_released=1 THEN 1 ELSE 0 END
FROM live_content_release_rules;

UPDATE live_content_registry_state
SET
  content_season_id = CASE
    WHEN content_season_id<>'' THEN content_season_id
    ELSE COALESCE((
      SELECT r.content_season_id
      FROM live_content_release_rules r
      WHERE r.item_kind=live_content_registry_state.item_kind
        AND r.item_id=live_content_registry_state.item_id
      LIMIT 1
    ),'')
  END,
  ever_released = CASE
    WHEN status='open' OR ever_released=1 OR COALESCE((
      SELECT r.ever_released
      FROM live_content_release_rules r
      WHERE r.item_kind=live_content_registry_state.item_kind
        AND r.item_id=live_content_registry_state.item_id
      LIMIT 1
    ),0)=1 THEN 1 ELSE 0 END;


-- Backfill routing into the authoritative registry so runtime reads no longer
-- depend on live_content_release_rules. Invalid legacy JSON fails closed to {}.
UPDATE live_content_registry_state
SET routes_json = (
  SELECT json_object(
    'version', 1,
    'routes', json_object(
      CASE WHEN r.destination_type IN ('native','case','seasonal_case','shop','season_pass','story','event','manual')
        THEN r.destination_type ELSE 'manual' END,
      json_patch(
        CASE WHEN json_valid(r.destination_config_json)=1 THEN r.destination_config_json ELSE '{}' END,
        CASE
          WHEN r.destination_type IN ('case','seasonal_case','season_pass') THEN json_object('enabled',json('true'),'destinationId',r.destination_id)
          ELSE json_object('enabled',json('true'))
        END
      )
    )
  )
  FROM live_content_release_rules r
  WHERE r.item_kind=live_content_registry_state.item_kind
    AND r.item_id=live_content_registry_state.item_id
)
WHERE (routes_json='' OR routes_json='{}' OR json_valid(routes_json)=0)
  AND EXISTS (
    SELECT 1 FROM live_content_release_rules r
    WHERE r.item_kind=live_content_registry_state.item_kind
      AND r.item_id=live_content_registry_state.item_id
  );

-- Reconcile the compatibility shadow from the new authority. Routes stay in
-- registry_state.routes_json; the legacy destination fields are retained only
-- for backward-compatible fallback reads.
UPDATE live_content_release_rules
SET
  content_season_id = COALESCE((
    SELECT s.content_season_id
    FROM live_content_registry_state s
    WHERE s.item_kind=live_content_release_rules.item_kind
      AND s.item_id=live_content_release_rules.item_id
    LIMIT 1
  ), content_season_id),
  released = CASE WHEN COALESCE((
    SELECT s.status
    FROM live_content_registry_state s
    WHERE s.item_kind=live_content_release_rules.item_kind
      AND s.item_id=live_content_release_rules.item_id
    LIMIT 1
  ), 'hidden')='open' THEN 1 ELSE 0 END,
  ever_released = CASE WHEN ever_released=1 OR COALESCE((
    SELECT s.ever_released
    FROM live_content_registry_state s
    WHERE s.item_kind=live_content_release_rules.item_kind
      AND s.item_id=live_content_release_rules.item_id
    LIMIT 1
  ),0)=1 THEN 1 ELSE 0 END,
  updated_at = MAX(updated_at, COALESCE((
    SELECT s.updated_at
    FROM live_content_registry_state s
    WHERE s.item_kind=live_content_release_rules.item_kind
      AND s.item_id=live_content_release_rules.item_id
    LIMIT 1
  ),0)),
  updated_by = CASE WHEN COALESCE((
    SELECT s.updated_at
    FROM live_content_registry_state s
    WHERE s.item_kind=live_content_release_rules.item_kind
      AND s.item_id=live_content_release_rules.item_id
    LIMIT 1
  ),0) >= updated_at THEN COALESCE((
    SELECT s.updated_by
    FROM live_content_registry_state s
    WHERE s.item_kind=live_content_release_rules.item_kind
      AND s.item_id=live_content_release_rules.item_id
    LIMIT 1
  ), updated_by) ELSE updated_by END
WHERE EXISTS (
  SELECT 1 FROM live_content_registry_state s
  WHERE s.item_kind=live_content_release_rules.item_kind
    AND s.item_id=live_content_release_rules.item_id
);

CREATE INDEX IF NOT EXISTS idx_live_content_registry_season
ON live_content_registry_state(content_season_id,status,release_at);
