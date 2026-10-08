-- Gate 4 teacher-review uniqueness. Never modify prior migrations.
-- Keep the earliest review when legacy/test data contains duplicates, then enforce one review per student/course pair.
DELETE FROM teacher_reviews
WHERE id NOT IN (
  SELECT MIN(id) FROM teacher_reviews GROUP BY telegram_user_id, teacher, elective
);
CREATE UNIQUE INDEX IF NOT EXISTS uq_teacher_reviews_user_course
  ON teacher_reviews(telegram_user_id, teacher, elective);
