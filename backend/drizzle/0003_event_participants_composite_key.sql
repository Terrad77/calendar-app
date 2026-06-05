DELETE FROM event_participants
WHERE id NOT IN (
  SELECT MIN(id)
  FROM event_participants
  GROUP BY event_id, user_id
);

ALTER TABLE "event_participants" DROP CONSTRAINT IF EXISTS "event_participants_pkey";
ALTER TABLE "event_participants"
  ADD CONSTRAINT "event_participants_event_id_user_id_pk" PRIMARY KEY ("event_id", "user_id");