-- =============================================================================
-- FUNCTION: vw_student_image(p_cls INT, p_batch INT, p_academic INT)
-- =============================================================================
-- Soo bandhig liiska ardayda fasalka/badhaha/sannad-dugsiyeedka la cayimay.
-- Haddii uusan jirin natiijo, soo celiyaa fariin laga keenay alerts table.
--
-- Schema notes (PostgreSQL — kala duwan MySQL-kii):
--   * Magaca ardayga waxaa lagu kaydiyaa `people.p_name`, JOIN ah `student.p_id`.
--   * `student` MA leh `img_id`. Image URL kaliya waxaa lagu kaydiyaa `student.image`.
--   * Haddii image-ku uusan ahayn URL https/http ah, soo celi placeholder.
-- =============================================================================

DROP FUNCTION IF EXISTS public.vw_student_image(INT, INT, INT);

CREATE OR REPLACE FUNCTION public.vw_student_image(
    p_cls      INT,
    p_batch    INT,
    p_academic INT
)
RETURNS TABLE(
    id           INTEGER,
    student_name TEXT,
    image        TEXT,
    is_default   BOOLEAN,
    result       TEXT
)
LANGUAGE plpgsql
AS $$
DECLARE
    v_count INT := 0;
BEGIN
    SELECT COUNT(s.std_id)
    INTO v_count
    FROM student s
    JOIN student_class sc ON sc.std_id = s.std_id
    WHERE sc.cl_id  = p_cls
      AND sc.a_y_id = p_academic
      AND sc.b_id   = p_batch
      AND s.state   = 'Active';

    IF v_count = 0 THEN
        RETURN QUERY
        SELECT NULL::INTEGER,
               NULL::TEXT,
               NULL::TEXT,
               NULL::BOOLEAN,
               COALESCE(
                   (SELECT a.body::TEXT FROM alerts a WHERE LOWER(a.title) = 'notfound' LIMIT 1),
                   'No students found'
               );
    ELSE
        RETURN QUERY
        SELECT DISTINCT ON (s.std_id)
               s.std_id           AS id,
               p.p_name::TEXT     AS student_name,
               CASE
                   WHEN s.image ~* '^https?://' THEN s.image::TEXT
                   ELSE NULL
               END                AS image,
               (s.image !~* '^https?://') AS is_default,
               NULL::TEXT          AS result
        FROM student s
        JOIN student_class sc ON sc.std_id = s.std_id
        JOIN people p         ON p.p_id    = s.p_id
        WHERE sc.cl_id  = p_cls
          AND sc.a_y_id = p_academic
          AND sc.b_id   = p_batch
          AND s.state   = 'Active'
        ORDER BY s.std_id;
    END IF;
END;
$$;

ALTER FUNCTION public.vw_student_image(INT, INT, INT) OWNER TO postgres;
