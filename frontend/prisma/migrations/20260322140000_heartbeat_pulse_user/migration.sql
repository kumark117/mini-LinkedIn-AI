-- Service account: minute "pulse" posts (ASCII ETX prefix in content). Login: HeartBeat + empty password.
DO $$
DECLARE
  uid int;
BEGIN
  IF EXISTS (SELECT 1 FROM "user_credentials" WHERE "username" = 'HeartBeat') THEN
    RETURN;
  END IF;
  INSERT INTO "users" ("name", "headline")
  VALUES (
    'HeartBeat',
    'Server time pulse — one public post every wall-clock minute (dummy login: HeartBeat, empty password).'
  )
  RETURNING "id" INTO uid;
  INSERT INTO "user_credentials" ("user_id", "username", "password_hash")
  VALUES (uid, 'HeartBeat', NULL);
END $$;
