-- Pre-registered demo users demo1..demo9 (NULL password_hash = empty password at login).
DO $$
DECLARE
  i int;
  uid int;
  uname text;
BEGIN
  FOR i IN 1..9 LOOP
    uname := 'demo' || i::text;
    IF EXISTS (SELECT 1 FROM "user_credentials" WHERE "username" = uname) THEN
      CONTINUE;
    END IF;
    INSERT INTO "users" ("name", "headline")
    VALUES ('Demo ' || i::text, 'Pre-registered demo (no password)')
    RETURNING "id" INTO uid;
    INSERT INTO "user_credentials" ("user_id", "username", "password_hash")
    VALUES (uid, uname, NULL);
  END LOOP;
END $$;
