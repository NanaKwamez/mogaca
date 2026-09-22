ALTER TABLE classes ADD COLUMN class_teacher_id UUID REFERENCES staff(id);
