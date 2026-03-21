-- Default shared account: sign in as "guest" with empty password, or use app auto-session.
DO $$
DECLARE
  uid int;
BEGIN
  IF EXISTS (SELECT 1 FROM "user_credentials" WHERE "username" = 'guest') THEN
    RETURN;
  END IF;
  INSERT INTO "users" ("name", "headline")
  VALUES (
    'Guest',
    'Default shared account — browse the feed, post, like, and comment.'
  )
  RETURNING "id" INTO uid;
  INSERT INTO "user_credentials" ("user_id", "username", "password_hash")
  VALUES (uid, 'guest', NULL);
END $$;

-- Starter posts so the feed is not empty on first load (only if there are no posts yet).
DO $$
DECLARE
  gid int;
  d1 int;
BEGIN
  IF (SELECT COUNT(*)::int FROM "posts") > 0 THEN
    RETURN;
  END IF;
  SELECT "user_id" INTO gid FROM "user_credentials" WHERE "username" = 'guest' LIMIT 1;
  IF gid IS NULL THEN
    RETURN;
  END IF;
  INSERT INTO "posts" ("user_id", "content")
  VALUES
    (
      gid,
      'Welcome to Mini-LinkedIn AI. You''re signed in as Guest automatically — explore the feed, create posts, and try comments.'
    ),
    (
      gid,
      'Tip: use Sign in with username demo1–demo9 and an empty password to try other demo profiles.'
    );
  SELECT "user_id" INTO d1 FROM "user_credentials" WHERE "username" = 'demo1' LIMIT 1;
  IF d1 IS NOT NULL AND d1 <> gid THEN
    INSERT INTO "posts" ("user_id", "content")
    VALUES (d1, 'Hello from demo1 — welcome to the feed!');
  END IF;
END $$;
