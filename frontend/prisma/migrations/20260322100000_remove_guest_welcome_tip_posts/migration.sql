-- Remove seeded guest intro posts (likes/comments cascade via FK).
DELETE FROM "posts"
WHERE "content" = 'Welcome to Mini-LinkedIn AI. You''re signed in as Guest automatically — explore the feed, create posts, and try comments.'
   OR "content" = 'Tip: use Sign in with username demo1–demo9 and an empty password to try other demo profiles.';
