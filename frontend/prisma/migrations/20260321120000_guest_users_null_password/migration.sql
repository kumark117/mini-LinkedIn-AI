-- Target database: "mini-linkedin-AI" (set DATABASE_URL accordingly).
-- Create the DB once if needed:  CREATE DATABASE "mini-linkedin-AI";

-- Allow guest/demo accounts without a stored password hash.
ALTER TABLE "user_credentials" ALTER COLUMN "password_hash" DROP NOT NULL;

-- guest1..guest20: login with empty password (handled in /api/auth/login).
DO $$
DECLARE
  i int;
  uid int;
BEGIN
  IF EXISTS (SELECT 1 FROM "user_credentials" WHERE "username" = 'guest1') THEN
    RETURN;
  END IF;
  FOR i IN 1..20 LOOP
    INSERT INTO "users" ("name", "headline")
    VALUES ('Guest ' || i, 'Guest demo account')
    RETURNING "id" INTO uid;
    INSERT INTO "user_credentials" ("user_id", "username", "password_hash")
    VALUES (uid, 'guest' || i, NULL);
  END LOOP;
END $$;
