-- supabase/seed/remark_templates.sql
-- Seed remark templates: 5 variants per primary pattern + some secondary patterns

-- PRIMARY: HIGH_ACHIEVER (headteacher)
INSERT INTO remark_templates (pattern_key, clause_slot, remark_type, gender, tone, division, variant_index, variant_text, max_chars, is_active, template_version)
VALUES
('HIGH_ACHIEVER','primary','headteacher','Any','professional_warm',NULL,1,'{{name}} has delivered an outstanding academic performance this term.',200,true,1),
('HIGH_ACHIEVER','primary','headteacher','Any','professional_warm',NULL,2,'{{name}} has shown a consistently excellent attitude and results this term.',200,true,1),
('HIGH_ACHIEVER','primary','headteacher','Any','professional_warm',NULL,3,'A very successful term for {{name}}, marked by impressive and consistent achievement.',200,true,1),
('HIGH_ACHIEVER','primary','headteacher','Any','professional_warm',NULL,4,'{{name}} continues to set a high standard in class; an excellent term overall.',200,true,1),
('HIGH_ACHIEVER','primary','headteacher','Any','professional_warm',NULL,5,'{{name}}''s academic performance this term has been outstanding; well done.',200,true,1);

-- PRIMARY: ABOVE_AVERAGE (headteacher)
INSERT INTO remark_templates (pattern_key, clause_slot, remark_type, gender, tone, division, variant_index, variant_text, max_chars, is_active, template_version)
VALUES
('ABOVE_AVERAGE','primary','headteacher','Any','professional_warm',NULL,1,'{{name}} has performed very well this term and should continue building on this strong foundation.',200,true,1),
('ABOVE_AVERAGE','primary','headteacher','Any','professional_warm',NULL,2,'{{name}} has shown solid academic progress and good potential for even greater achievement.',200,true,1),
('ABOVE_AVERAGE','primary','headteacher','Any','professional_warm',NULL,3,'A strong term for {{name}} — maintain this momentum into the next term.',200,true,1),
('ABOVE_AVERAGE','primary','headteacher','Any','professional_warm',NULL,4,'{{name}} should be proud of this term''s performance; keep up the good work.',200,true,1),
('ABOVE_AVERAGE','primary','headteacher','Any','professional_warm',NULL,5,'Consistent effort has produced good results for {{name}} this term.',200,true,1);

-- PRIMARY: AVERAGE (headteacher)
INSERT INTO remark_templates (pattern_key, clause_slot, remark_type, gender, tone, division, variant_index, variant_text, max_chars, is_active, template_version)
VALUES
('AVERAGE','primary','headteacher','Any','professional_warm',NULL,1,'{{name}} has made satisfactory progress this term and should continue working steadily.',200,true,1),
('AVERAGE','primary','headteacher','Any','professional_warm',NULL,2,'{{name}} has shown a sound level of progress, with room to build greater consistency next term.',200,true,1),
('AVERAGE','primary','headteacher','Any','professional_warm',NULL,3,'A steady term for {{name}} — continued effort will help further improvement.',200,true,1),
('AVERAGE','primary','headteacher','Any','professional_warm',NULL,4,'{{name}} has made acceptable progress; encourage regular study habits.',200,true,1),
('AVERAGE','primary','headteacher','Any','professional_warm',NULL,5,'{{name}} produced an average term; focus on consistency and revision.',200,true,1);

-- PRIMARY: BELOW_AVERAGE (headteacher)
INSERT INTO remark_templates (pattern_key, clause_slot, remark_type, gender, tone, division, variant_index, variant_text, max_chars, is_active, template_version)
VALUES
('BELOW_AVERAGE','primary','headteacher','Any','professional_warm',NULL,1,'{{name}} has faced some academic challenges this term but can make steady progress with greater consistency and support.',200,true,1),
('BELOW_AVERAGE','primary','headteacher','Any','professional_warm',NULL,2,'With focused effort, {{name}} can improve; please provide additional practice at home.',200,true,1),
('BELOW_AVERAGE','primary','headteacher','Any','professional_warm',NULL,3,'{{name}} needs encouragement to build study routines and address weak areas.',200,true,1),
('BELOW_AVERAGE','primary','headteacher','Any','professional_warm',NULL,4,'{{name}} has potential; targeted support will help improve results next term.',200,true,1),
('BELOW_AVERAGE','primary','headteacher','Any','professional_warm',NULL,5,'A supportive plan could help {{name}} make better progress next term.',200,true,1);

-- PRIMARY: STRUGGLING (headteacher)
INSERT INTO remark_templates (pattern_key, clause_slot, remark_type, gender, tone, division, variant_index, variant_text, max_chars, is_active, template_version)
VALUES
('STRUGGLING','primary','headteacher','Any','professional_warm',NULL,1,'{{name}} has found some areas challenging this term. Continued support, confidence, and steady effort will help next term.',200,true,1),
('STRUGGLING','primary','headteacher','Any','professional_warm',NULL,2,'{{name}} requires extra attention and encouragement. A focused plan is recommended.',200,true,1),
('STRUGGLING','primary','headteacher','Any','professional_warm',NULL,3,'This term was difficult for {{name}}; please work with teachers to create improvement targets.',200,true,1),
('STRUGGLING','primary','headteacher','Any','professional_warm',NULL,4,'{{name}} needs consistent support and should be monitored closely next term.',200,true,1),
('STRUGGLING','primary','headteacher','Any','professional_warm',NULL,5,'{{name}} would benefit from extra practice and positive reinforcement.',200,true,1);

-- SECONDARY: IMPROVING (class teacher)
INSERT INTO remark_templates (pattern_key, clause_slot, remark_type, gender, tone, division, variant_index, variant_text, max_chars, is_active, template_version)
VALUES
('IMPROVING','secondary','class_teacher','Any','professional_warm',NULL,1,'The improvement in class standing shows determination and is worth building on next term.',200,true,1),
('IMPROVING','secondary','class_teacher','Any','professional_warm',NULL,2,'Upward progress reflects growing commitment; continue this effort.',200,true,1),
('IMPROVING','secondary','class_teacher','Any','professional_warm',NULL,3,'{{name}} is improving; with continued focus, results can get even better.',200,true,1),
('IMPROVING','secondary','class_teacher','Any','professional_warm',NULL,4,'Noticeable improvement this term — keep encouraging {{them}}.',200,true,1),
('IMPROVING','secondary','class_teacher','Any','professional_warm',NULL,5,'Improvement is evident; regular practice will sustain progress.',200,true,1);

-- SECONDARY: DECLINING (class teacher)
INSERT INTO remark_templates (pattern_key, clause_slot, remark_type, gender, tone, division, variant_index, variant_text, max_chars, is_active, template_version)
VALUES
('DECLINING','secondary','class_teacher','Any','professional_warm',NULL,1,'A renewed focus next term should help {{name}} regain momentum and make the most of {{their}} ability.',200,true,1),
('DECLINING','secondary','class_teacher','Any','professional_warm',NULL,2,'{{name}}''s position has declined; targeted revision and support are recommended.',200,true,1),
('DECLINING','secondary','class_teacher','Any','professional_warm',NULL,3,'Please encourage {{name}} to revisit key topics to recover earlier progress.',200,true,1),
('DECLINING','secondary','class_teacher','Any','professional_warm',NULL,4,'A change in study habits could help {{name}} return to previous standing.',200,true,1),
('DECLINING','secondary','class_teacher','Any','professional_warm',NULL,5,'{{name}} should focus on consistent work to halt the downward trend.',200,true,1);

-- SECONDARY: LOW_ATTENDANCE (class teacher)
INSERT INTO remark_templates (pattern_key, clause_slot, remark_type, gender, tone, division, variant_index, variant_text, max_chars, is_active, template_version)
VALUES
('LOW_ATTENDANCE','secondary','class_teacher','Any','professional_warm',NULL,1,'Improved attendance next term will help {{name}} benefit fully from classroom learning and support.',200,true,1),
('LOW_ATTENDANCE','secondary','class_teacher','Any','professional_warm',NULL,2,'Please encourage regular attendance so {{name}} can access all lessons.',200,true,1),
('LOW_ATTENDANCE','secondary','class_teacher','Any','professional_warm',NULL,3,'Low attendance has affected progress; consistent presence will help.',200,true,1),
('LOW_ATTENDANCE','secondary','class_teacher','Any','professional_warm',NULL,4,'Attendance improvement would support better engagement and outcomes.',200,true,1),
('LOW_ATTENDANCE','secondary','class_teacher','Any','professional_warm',NULL,5,'Regular attendance is important; please support {{name}} in attending school.',200,true,1);

-- ADDITIONAL PATTERNS FROM APPENDIX B

-- VERBAL_STRONG_NUMERICAL_WEAK (secondary)
INSERT INTO remark_templates (pattern_key, clause_slot, remark_type, gender, tone, division, variant_index, variant_text, max_chars, is_active, template_version)
VALUES
('VERBAL_STRONG_NUMERICAL_WEAK','secondary','class_teacher','Any','professional_warm',NULL,1,'{{name}} shows particular strength in verbal subjects; encourage strengthening numerical skills alongside.',200,true,1),
('VERBAL_STRONG_NUMERICAL_WEAK','secondary','class_teacher','Any','professional_warm',NULL,2,'Strong verbal performance is evident; regular maths practice will help balance {{their}} profile.',200,true,1),
('VERBAL_STRONG_NUMERICAL_WEAK','secondary','class_teacher','Any','professional_warm',NULL,3,'Excellent verbal skills; consider targeted support in numerical areas to boost overall results.',200,true,1);

-- NUMERICAL_STRONG_VERBAL_WEAK (secondary)
INSERT INTO remark_templates (pattern_key, clause_slot, remark_type, gender, tone, division, variant_index, variant_text, max_chars, is_active, template_version)
VALUES
('NUMERICAL_STRONG_VERBAL_WEAK','secondary','class_teacher','Any','professional_warm',NULL,1,'{{name}} performs strongly in numerical areas; encourage development in language and verbal tasks.',200,true,1),
('NUMERICAL_STRONG_VERBAL_WEAK','secondary','class_teacher','Any','professional_warm',NULL,2,'A strong analytical ability is clear; literacy-focused activities will help {{them}} progress further.',200,true,1),
('NUMERICAL_STRONG_VERBAL_WEAK','secondary','class_teacher','Any','professional_warm',NULL,3,'Numerical strength present — balanced attention to verbal subjects will help academic breadth.',200,true,1);

-- PRACTICAL_STRONG_THEORY_WEAK (secondary)
INSERT INTO remark_templates (pattern_key, clause_slot, remark_type, gender, tone, division, variant_index, variant_text, max_chars, is_active, template_version)
VALUES
('PRACTICAL_STRONG_THEORY_WEAK','secondary','class_teacher','Any','professional_warm',NULL,1,'{{name}} excels at practical work; linking theory to hands-on activities will strengthen academic understanding.',200,true,1),
('PRACTICAL_STRONG_THEORY_WEAK','secondary','class_teacher','Any','professional_warm',NULL,2,'Practical skills are a strength; reinforce conceptual links to improve theoretical performance.',200,true,1),
('PRACTICAL_STRONG_THEORY_WEAK','secondary','class_teacher','Any','professional_warm',NULL,3,'{{name}} shows creativity and practical ability; focused theory revision will complement this talent.',200,true,1);

-- THEORY_STRONG_PRACTICAL_WEAK (secondary)
INSERT INTO remark_templates (pattern_key, clause_slot, remark_type, gender, tone, division, variant_index, variant_text, max_chars, is_active, template_version)
VALUES
('THEORY_STRONG_PRACTICAL_WEAK','secondary','class_teacher','Any','professional_warm',NULL,1,'{{name}} has strong theoretical understanding; encourage hands-on practice to translate knowledge into skills.',200,true,1),
('THEORY_STRONG_PRACTICAL_WEAK','secondary','class_teacher','Any','professional_warm',NULL,2,'Good conceptual grasp observed; include practical tasks to build confidence in applied areas.',200,true,1),
('THEORY_STRONG_PRACTICAL_WEAK','secondary','class_teacher','Any','professional_warm',NULL,3,'Theoretical strength is clear; combine with practical sessions to round out ability.',200,true,1);

-- STRONG_CLASSWORK_WEAK_EXAMS (secondary)
INSERT INTO remark_templates (pattern_key, clause_slot, remark_type, gender, tone, division, variant_index, variant_text, max_chars, is_active, template_version)
VALUES
('STRONG_CLASSWORK_WEAK_EXAMS','secondary','class_teacher','Any','professional_warm',NULL,1,'Classwork shows effort and progress; focus on exam technique to reflect this in assessments.',200,true,1),
('STRONG_CLASSWORK_WEAK_EXAMS','secondary','class_teacher','Any','professional_warm',NULL,2,'Consistent classwork is positive; targeted exam practice will help convert this to exam success.',200,true,1),
('STRONG_CLASSWORK_WEAK_EXAMS','secondary','class_teacher','Any','professional_warm',NULL,3,'Encourage timed practice and past-paper work so {{name}} can demonstrate knowledge in exams.',200,true,1);

-- WEAK_CLASSWORK_STRONG_EXAMS (secondary)
INSERT INTO remark_templates (pattern_key, clause_slot, remark_type, gender, tone, division, variant_index, variant_text, max_chars, is_active, template_version)
VALUES
('WEAK_CLASSWORK_STRONG_EXAMS','secondary','class_teacher','Any','professional_warm',NULL,1,'Exam performance is strong; develop regular class engagement to support steady progress.',200,true,1),
('WEAK_CLASSWORK_STRONG_EXAMS','secondary','class_teacher','Any','professional_warm',NULL,2,'Good exam results suggest potential; consistent classwork will make this success more reliable.',200,true,1),
('WEAK_CLASSWORK_STRONG_EXAMS','secondary','class_teacher','Any','professional_warm',NULL,3,'Encourage daily practice and participation to align classwork with exam capability.',200,true,1);

-- CONSISTENT (secondary)
INSERT INTO remark_templates (pattern_key, clause_slot, remark_type, gender, tone, division, variant_index, variant_text, max_chars, is_active, template_version)
VALUES
('CONSISTENT','secondary','class_teacher','Any','professional_warm',NULL,1,'{{name}} shows a consistent performance across assessments; this balance is commendable.',200,true,1),
('CONSISTENT','secondary','class_teacher','Any','professional_warm',NULL,2,'A steady and even performance characterizes {{name}}''s work — continue this approach.',200,true,1);

-- INCONSISTENT (secondary)
INSERT INTO remark_templates (pattern_key, clause_slot, remark_type, gender, tone, division, variant_index, variant_text, max_chars, is_active, template_version)
VALUES
('INCONSISTENT','secondary','class_teacher','Any','professional_warm',NULL,1,'There is some inconsistency in {{name}}''s results; aim for steadier effort across topics.',200,true,1),
('INCONSISTENT','secondary','class_teacher','Any','professional_warm',NULL,2,'Peaks and troughs are present in {{name}}''s work; regular revision will reduce variability.',200,true,1);

-- STABLE (secondary)
INSERT INTO remark_templates (pattern_key, clause_slot, remark_type, gender, tone, division, variant_index, variant_text, max_chars, is_active, template_version)
VALUES
('STABLE','secondary','class_teacher','Any','professional_warm',NULL,1,'Performance is stable compared to last term; maintain the steady progress.',200,true,1),
('STABLE','secondary','class_teacher','Any','professional_warm',NULL,2,'{{name}} has a stable standing; small improvements will yield significant gains.',200,true,1);

-- EXCELLENT_ATTENDANCE (secondary)
INSERT INTO remark_templates (pattern_key, clause_slot, remark_type, gender, tone, division, variant_index, variant_text, max_chars, is_active, template_version)
VALUES
('EXCELLENT_ATTENDANCE','secondary','class_teacher','Any','professional_warm',NULL,1,'{{name}} has excellent attendance — a strong foundation for learning and success.',200,true,1),
('EXCELLENT_ATTENDANCE','secondary','class_teacher','Any','professional_warm',NULL,2,'Outstanding attendance this term; this commitment supports continued progress.',200,true,1);

-- Note: This seed file provides expanded coverage for Appendix B patterns but is not exhaustive. Add or adjust templates per school tone and division requirements.
