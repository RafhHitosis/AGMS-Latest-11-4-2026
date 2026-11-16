ALTER TABLE app_config
  ALTER COLUMN app_title SET DEFAULT 'AGMS',
  ALTER COLUMN app_subtitle SET DEFAULT 'Choose a year level and section to manage attendance and grades';

UPDATE app_config
SET app_title = CASE
      WHEN app_title IN ('Attendance & Grading System', 'Attendance System') THEN 'AGMS'
      ELSE app_title
    END,
    app_subtitle = CASE
      WHEN app_subtitle = 'Choose a year level and section to manage attendance'
        THEN 'Choose a year level and section to manage attendance and grades'
      ELSE app_subtitle
    END,
    updated_at = NOW()
WHERE app_title IN ('Attendance & Grading System', 'Attendance System')
   OR app_subtitle = 'Choose a year level and section to manage attendance';
