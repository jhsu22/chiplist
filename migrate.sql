-- Run once against existing databases:
--   npm run db:migrate          (local)
--   npm run db:migrate:remote   (production)

ALTER TABLE sessions ADD COLUMN status TEXT NOT NULL DEFAULT 'approved';

-- Assign strawby as leader of SoCal Hanime
UPDATE groups
SET owner_id = (
    SELECT u.id
    FROM users u
    JOIN players p ON p.user_id = u.id
    WHERE LOWER(p.name) = 'strawby'
    LIMIT 1
)
WHERE LOWER(name) = 'socal hanime'
  AND owner_id IS NULL;
