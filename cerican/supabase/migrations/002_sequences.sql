CREATE TABLE IF NOT EXISTS id_sequences (
  school_id     UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  seq_type      TEXT NOT NULL CHECK (seq_type IN ('student', 'staff')),
  current_value INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (school_id, seq_type)
);

CREATE OR REPLACE FUNCTION allocate_next_id(
  p_school_id UUID,
  p_seq_type  TEXT
) RETURNS INTEGER AS $$
DECLARE
  next_val INTEGER;
BEGIN
  SELECT current_value + 1 INTO next_val
  FROM id_sequences
  WHERE school_id = p_school_id AND seq_type = p_seq_type
  FOR UPDATE;

  UPDATE id_sequences
  SET current_value = next_val
  WHERE school_id = p_school_id AND seq_type = p_seq_type;

  RETURN next_val;
END;
$$ LANGUAGE plpgsql;
