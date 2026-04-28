-- =============================================================================
-- FUNCTION: student_marge_sp(p_std_frm INT, p_std_to INT)
-- =============================================================================
-- Habraac: Student-ka FROM (std_frm) ku biiriyo student-ka TO (std_to)
--   marka ay dhowr xaaladood la galmoodaan:
--     1) Labadooduba waa Active (s.state = 'Active')
--     2) Labadoodaba sc.state = 'Continue'
--     3) Heerka fasalka (class.gr_id) ee FROM student waa in uu ku jiro
--        liiska heerarka (gr_id) ee TO student.
-- Haddii la ansaxiyo: student_class records-ka FROM-ga waxaa loo wareejiyaa
--   TO-ga, ka dibna FROM student waa la tirtiraa.
-- Soo celisaa qoraal `result` ah laga keenay alerts table.
-- =============================================================================

DROP FUNCTION IF EXISTS public.student_marge_sp(INT, INT);

CREATE OR REPLACE FUNCTION public.student_marge_sp(
    p_std_frm INT,
    p_std_to  INT
)
RETURNS TABLE(result TEXT)
LANGUAGE plpgsql
AS $$
DECLARE
    v_match_count INT := 0;
BEGIN
    -- Tiri inta heerar (gr_id) FROM student-ka uu ku jiro classes-ka TO student-ka.
    SELECT COUNT(*)
    INTO v_match_count
    FROM student s
    JOIN student_class sc ON sc.std_id = s.std_id
    JOIN class c          ON c.cl_id   = sc.cl_id
    WHERE s.state = 'Active'
      AND sc.state = 'Continue'
      AND s.std_id = p_std_frm
      AND c.gr_id IN (
          SELECT c2.gr_id
          FROM student s2
          JOIN student_class sc2 ON sc2.std_id = s2.std_id
          JOIN class c2          ON c2.cl_id   = sc2.cl_id
          WHERE s2.state = 'Active'
            AND sc2.state = 'Continue'
            AND s2.std_id = p_std_to
      );

    IF v_match_count > 0 THEN
        UPDATE student_class
           SET std_id = p_std_to
         WHERE std_id = p_std_frm;

        DELETE FROM student
         WHERE std_id = p_std_frm;

        RETURN QUERY
        SELECT COALESCE(
            (SELECT a.body::TEXT FROM alerts a WHERE LOWER(a.title) = 'update' LIMIT 1),
            'Merge completed successfully'
        );
    ELSE
        RETURN QUERY
        SELECT COALESCE(
            (SELECT a.body::TEXT FROM alerts a WHERE LOWER(a.title) = 'notregupdate' LIMIT 1),
            'Cannot merge — students are in different grades'
        );
    END IF;
END;
$$;

ALTER FUNCTION public.student_marge_sp(INT, INT) OWNER TO postgres;
