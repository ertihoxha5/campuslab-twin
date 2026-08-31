INSERT INTO simulation_scenarios (
  university_id,
  laboratory_id,
  name,
  scenario_type,
  description,
  configuration_json,
  seed_value,
  status,
  created_by_user_id
)
SELECT
  laboratory.university_id,
  laboratory.id,
  CONCAT('Skenari bazë — ', laboratory.name),
  'temperature_rise',
  'Skenar fillestar për gjenerimin dhe testimin e telemetrisë së laboratorit.',
  JSON_OBJECT(),
  laboratory.id * 1000,
  'active',
  administrator.user_id
FROM laboratories laboratory
INNER JOIN (
  SELECT university_id, MIN(id) AS user_id
  FROM users
  WHERE status = 'active'
  GROUP BY university_id
) administrator
  ON administrator.university_id = laboratory.university_id
WHERE laboratory.deleted_at IS NULL
  AND NOT EXISTS (
    SELECT 1
    FROM simulation_scenarios scenario
    WHERE scenario.university_id = laboratory.university_id
      AND scenario.laboratory_id = laboratory.id
  );
