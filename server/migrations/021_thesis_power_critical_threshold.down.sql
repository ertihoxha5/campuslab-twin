UPDATE sensors sensor
INNER JOIN laboratories laboratory
  ON laboratory.id = sensor.laboratory_id
 AND laboratory.university_id = sensor.university_id
INNER JOIN universities university
  ON university.id = sensor.university_id
SET sensor.critical_max = 6999.9999
WHERE university.acronym = 'UBT'
  AND laboratory.code = 'LAB-AUT-01'
  AND sensor.code = 'CLT-THESIS-POWER'
  AND sensor.sensor_type = 'power'
  AND sensor.warning_max = 5000
  AND sensor.critical_max = 6000;
