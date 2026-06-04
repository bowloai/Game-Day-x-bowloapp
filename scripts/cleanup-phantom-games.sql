-- One-time cleanup: remove all "The Phantom" drill games before beta launch.
-- Cascading deletes on ends and bowls tables handle child records automatically.
--
-- Executed: 2026-06-04
-- Before:   SELECT COUNT(*) FROM games WHERE type = 'The Phantom'; -> 0
-- After:    SELECT COUNT(*) FROM games WHERE type = 'The Phantom'; -> 0
--
-- Run with: psql $DATABASE_URL -f scripts/cleanup-phantom-games.sql

BEGIN;

SELECT COUNT(*) AS phantom_games_before FROM games WHERE type = 'The Phantom';

DELETE FROM games WHERE type = 'The Phantom';

SELECT COUNT(*) AS phantom_games_after FROM games WHERE type = 'The Phantom';

COMMIT;
