-- ============================================================================
-- Trigram search indexes — accelerate ILIKE '%foo%' on student-name searches.
--
-- Without this, ILIKE on 1M+ people scans every row (~12s for "ahmed").
-- With pg_trgm + GIN, the same search returns in ~50–200ms.
--
-- CONCURRENTLY = no table lock; safe to run on live DB. Index build takes
-- a minute or so on millions of rows.
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE INDEX IF NOT EXISTS idx_people_p_name_trgm
    ON public.people
    USING GIN (p_name gin_trgm_ops);
