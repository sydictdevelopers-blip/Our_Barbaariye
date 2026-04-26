-- vw_studentclass_info – PostgreSQL port of MySQL vw_studentClass_info
-- Same logic, schema-corrected, performance-tuned:
--   - Filters student_class to the target student up-front in a CTE
--   - Counts (charge / student_attendance / result) are pre-aggregated ONCE
--     in CTEs scoped to the matching std_cl_ids — not 3 scalar subqueries per row
--   - Returns 'Not found' alert row when the student has no enrollments
--
-- Schema differences from MySQL version:
--   - student.name → people.p_name  (JOIN people on s.p_id)
--   - class.name   → class.class
--
-- For BEST performance long-term, add these indexes (scans dominate when those
-- tables grow). Currently empty so they aren't critical:
--   CREATE INDEX IF NOT EXISTS idx_charge_std_cl_id     ON charge(std_cl_id);
--   CREATE INDEX IF NOT EXISTS idx_st_attendance_std_cl ON student_attendance(std_cl_id);
--   CREATE INDEX IF NOT EXISTS idx_result_std_cl_id     ON result(std_cl_id);
--   CREATE INDEX IF NOT EXISTS idx_student_class_std_id ON student_class(std_id);

CREATE OR REPLACE FUNCTION public.vw_studentclass_info(p_id INTEGER)
    RETURNS TABLE(
        result        TEXT,
        id            INTEGER,
        student       TEXT,
        class         TEXT,
        academic_name TEXT,
        state         TEXT,
        charges       BIGINT,
        attendances   BIGINT,
        results       BIGINT,
        reg_date      DATE
    )
    LANGUAGE 'plpgsql'
AS $BODY$
#variable_conflict use_column
DECLARE
    v_count BIGINT;
BEGIN
    SELECT COUNT(*) INTO v_count
    FROM student_class sc
    WHERE sc.std_id = p_id;

    IF v_count = 0 THEN
        RETURN QUERY
        SELECT COALESCE(
                  (SELECT a.body::TEXT FROM alerts a WHERE LOWER(a.title) = 'notfound' LIMIT 1),
                  'Not found'
               ),
               NULL::INT, NULL::TEXT, NULL::TEXT, NULL::TEXT, NULL::TEXT,
               NULL::BIGINT, NULL::BIGINT, NULL::BIGINT, NULL::DATE;
        RETURN;
    END IF;

    RETURN QUERY
    WITH sc AS (
        SELECT std_cl_id, std_id, cl_id, a_y_id, state, reg_date
        FROM student_class
        WHERE std_id = p_id
    ),
    cc AS (
        SELECT std_cl_id, COUNT(*) AS cnt
        FROM charge
        WHERE std_cl_id IN (SELECT std_cl_id FROM sc)
        GROUP BY std_cl_id
    ),
    ac AS (
        SELECT std_cl_id, COUNT(*) AS cnt
        FROM student_attendance
        WHERE std_cl_id IN (SELECT std_cl_id FROM sc)
        GROUP BY std_cl_id
    ),
    rc AS (
        SELECT std_cl_id, COUNT(*) AS cnt
        FROM result
        WHERE std_cl_id IN (SELECT std_cl_id FROM sc)
        GROUP BY std_cl_id
    )
    SELECT
        NULL::TEXT                  AS result,
        sc.std_cl_id                AS id,
        p.p_name::TEXT              AS student,
        cl.class::TEXT              AS class,
        ay.academic_name::TEXT      AS academic_name,
        sc.state::TEXT              AS state,
        COALESCE(cc.cnt, 0)         AS charges,
        COALESCE(ac.cnt, 0)         AS attendances,
        COALESCE(rc.cnt, 0)         AS results,
        sc.reg_date::DATE           AS reg_date
    FROM sc
    JOIN student     s  ON s.std_id  = sc.std_id
    JOIN people      p  ON p.p_id    = s.p_id
    JOIN class       cl ON cl.cl_id  = sc.cl_id
    JOIN academic_year ay ON ay.a_y_id = sc.a_y_id
    LEFT JOIN cc ON cc.std_cl_id = sc.std_cl_id
    LEFT JOIN ac ON ac.std_cl_id = sc.std_cl_id
    LEFT JOIN rc ON rc.std_cl_id = sc.std_cl_id
    ORDER BY sc.std_cl_id;
END;
$BODY$;
