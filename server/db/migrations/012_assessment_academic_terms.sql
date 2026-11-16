ALTER TABLE assessments
  DROP CONSTRAINT IF EXISTS assessments_term_check;

ALTER TABLE assessments
  ADD CONSTRAINT assessments_term_check
  CHECK (term IN ('prelim', 'midterm', 'pre_final', 'finals', 'semestral'));
