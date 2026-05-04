-- ============================================================================
-- exam_schedule_pivot — pivot exam_schedule rows by day so each period
-- becomes a column. Used by the "Print Exam Schedule" report
-- (Day Info | Period-1 | Duration | Period-2 | Duration | ...).
--
-- PostgreSQL port of the legacy MySQL `exam_scheduale_pivoit` SP.
-- Differences vs MySQL:
--   * MySQL had `es.su_id` and `es.lev_id` directly on exam_sceduale; PG has
--     no such columns — subject + level are derived via subject_class → class.
--   * MySQL used dynamic SQL (GROUP_CONCAT + EXECUTE). PG uses hard-coded
--     period columns (1..6) — period table has 6 rows, that covers all cases.
--     Frontend hides empty period columns when rendering the report.
--
-- Args:
--   p_lev_id   integer — level id
--   p_ex_r_id  integer — exam_reg id
--   p_br_id    integer — branch id (filter exam_schedule rows to that branch's
--                        classes; "All" branch should be expanded by the caller
--                        if it wants to span all branches)
-- Returns one row per (day, exam_date) with up to 6 period slots.
-- When no schedule exists for the (level, exam_reg, branch) combo, returns
-- a single NotFound row sourced from `alerts.body WHERE title='NotFound'`
-- with day_info = the message and exam_date = NULL (the frontend uses the
-- NULL exam_date as the "empty state" marker).
-- ============================================================================
DROP FUNCTION IF EXISTS public.exam_schedule_pivot(integer, integer);
DROP FUNCTION IF EXISTS public.exam_schedule_pivot(integer, integer, integer);

CREATE OR REPLACE FUNCTION public.exam_schedule_pivot(
    p_lev_id  integer,
    p_ex_r_id integer,
    p_br_id   integer
)
RETURNS TABLE(
    day_info   text,
    exam_date  date,
    period_1   text, duration_1 text,
    period_2   text, duration_2 text,
    period_3   text, duration_3 text,
    period_4   text, duration_4 text,
    period_5   text, duration_5 text,
    period_6   text, duration_6 text
)
LANGUAGE sql
STABLE
PARALLEL SAFE
AS $function$
    WITH base AS (
        SELECT
            d.day                                               AS day,
            es.exam_date                                        AS exam_date,
            es.pr_id                                            AS pr_id,
            s.name                                              AS subject,
            (es.start_time::text || ' - ' || es.end_time::text) AS duration
          FROM exam_schedule es
          JOIN day            d  ON d.d_id       = es.d_id
          JOIN subject_class  sc ON sc.sub_cl_id = es.sub_cl_id
          JOIN subjects       s  ON s.sub_id     = sc.sub_id
          JOIN class          c  ON c.cl_id      = sc.cl_id
         WHERE c.lev_id   = p_lev_id
           AND c.br_id    = p_br_id
           AND es.ex_r_id = p_ex_r_id
    ),
    pivoted AS (
        SELECT
            (b.day::text || ' - ' || b.exam_date::text)             AS day_info,
            b.exam_date,
            MAX(CASE WHEN b.pr_id = 1 THEN b.subject  END)::text    AS period_1,
            MAX(CASE WHEN b.pr_id = 1 THEN b.duration END)::text    AS duration_1,
            MAX(CASE WHEN b.pr_id = 2 THEN b.subject  END)::text    AS period_2,
            MAX(CASE WHEN b.pr_id = 2 THEN b.duration END)::text    AS duration_2,
            MAX(CASE WHEN b.pr_id = 3 THEN b.subject  END)::text    AS period_3,
            MAX(CASE WHEN b.pr_id = 3 THEN b.duration END)::text    AS duration_3,
            MAX(CASE WHEN b.pr_id = 4 THEN b.subject  END)::text    AS period_4,
            MAX(CASE WHEN b.pr_id = 4 THEN b.duration END)::text    AS duration_4,
            MAX(CASE WHEN b.pr_id = 5 THEN b.subject  END)::text    AS period_5,
            MAX(CASE WHEN b.pr_id = 5 THEN b.duration END)::text    AS duration_5,
            MAX(CASE WHEN b.pr_id = 6 THEN b.subject  END)::text    AS period_6,
            MAX(CASE WHEN b.pr_id = 6 THEN b.duration END)::text    AS duration_6
          FROM base b
         GROUP BY b.day, b.exam_date
    )
    SELECT * FROM pivoted
    UNION ALL
    SELECT * FROM (
        SELECT a.body::text  AS day_info,
               NULL::date     AS exam_date,
               NULL::text, NULL::text, NULL::text, NULL::text,
               NULL::text, NULL::text, NULL::text, NULL::text,
               NULL::text, NULL::text, NULL::text, NULL::text
          FROM alerts a
         WHERE a.title = 'NotFound'
           AND NOT EXISTS (SELECT 1 FROM pivoted)
         LIMIT 1
    ) notfound
    ORDER BY exam_date NULLS LAST;
$function$;

ALTER FUNCTION public.exam_schedule_pivot(integer, integer, integer) OWNER TO postgres;
