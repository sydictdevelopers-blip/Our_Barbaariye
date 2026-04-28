-- ============================================================================
-- result-btn-insert-exam-2026-04-28.sql
-- Manage Result → Result tab: btn_insert_exam (PostgreSQL).
-- Asal: MySQL proc btn_Insert_Exam(Class, Academic, Exam, Subject, batch_pr, operation).
--
-- Schema mapping (MySQL → PG):
--   exam_registration.e_r_id → exam_reg.ex_reg_id
--   exam_registration.mark   → exam_reg.marks
--   exam_registration.e_id   → exam_reg.ex_id
--   subjects.su_id           → subjects.sub_id
--   student.name             → people.p_name (via student.p_id)
--   student.gender           → people.sex
--   exam_status              → varchar (compare to '1')
--   subjects.deleted / result.deleted / er.deleted → MA jiraan PG; way ka tagaa.
--
-- Operations:
--   'std'      — Ardayda diyaarka u ah inay imtixaan helaan (lama xareyn marks).
--                Branches: exam_status='1' (by name) ama '0' (by serial number).
--   'maximum'  — Mark-ka ugu sareeya ee imtixaanka.
--   'update'   — Liiska ardayda marks-ku haray (edit-able).
--
-- Output (TABLE polymorphic):
--   id        — std_cl_id (std mode) ama r_id (update mode), NULL haddii message tahay.
--   student   — magaca ardayga ama serial number; NULL haddii message tahay.
--   marks     — string-ka marks-ka (update mode), '' haddii arday cusub.
--   gender    — jinsiga (std mode kaliya).
--   max_mark  — exam.marks (haddii lagu lifaaqo).
--   message   — fariin info/error ah haddii baahi loo qabo (e.g. "Fasalkaan Arday Kuma Jirto").
-- ============================================================================

DROP FUNCTION IF EXISTS public.btn_insert_exam(integer, integer, integer, integer, integer, varchar);
CREATE OR REPLACE FUNCTION public.btn_insert_exam(
    p_class    integer,
    p_academic integer,
    p_exam     integer,
    p_subject  integer,
    p_batch    integer,
    p_operation varchar
)
 RETURNS TABLE(
    id        integer,
    student   text,
    marks     text,
    gender    text,
    max_mark  numeric,
    message   text
 )
 LANGUAGE plpgsql
AS $function$
DECLARE
    var_exam_status varchar;
    var_mark        numeric;
    var_check       integer;
BEGIN
    SELECT er.exam_status, er.marks INTO var_exam_status, var_mark
    FROM exam_reg er
    WHERE er.ex_reg_id = p_exam;

    -- ========================================================================
    -- 'std' — soo bandhig ardayda marks-ku waayey
    -- ========================================================================
    IF p_operation = 'std' THEN
        SELECT COUNT(sc.std_cl_id) INTO var_check
        FROM student s
        JOIN student_class sc ON sc.std_id = s.std_id
        JOIN class cl         ON cl.cl_id  = sc.cl_id
        WHERE sc.a_y_id = p_academic
          AND cl.cl_id  = p_class
          AND sc.b_id   = p_batch
          AND s.state   = 'Active'
          AND sc.state IN ('Passed','Continue','Graduated')
          AND sc.std_cl_id NOT IN (
              SELECT r.std_cl_id
              FROM result r
              JOIN exam_reg er2 ON er2.ex_reg_id = r.e_r_id
              WHERE er2.a_y_id = p_academic
                AND r.e_r_id   = p_exam
                AND r.su_id    = p_subject
          );

        IF var_check = 0 THEN
            -- Hubi haddii fasalku maada hore u xareeyey
            IF EXISTS (
                SELECT 1
                FROM assign_student_room asr
                JOIN student_class sc ON sc.std_cl_id = asr.std_cl_id
                JOIN class c          ON c.cl_id      = sc.cl_id
                WHERE c.cl_id = p_class
                GROUP BY c.cl_id
            ) THEN
                RETURN QUERY SELECT NULL::int, NULL::text, NULL::text, NULL::text, NULL::numeric,
                                    'Fasalkaan Maadadaan Waa Loo soo xareeye Marhore ama Fadlan Waxa kuu dooran iska hubi!'::text;
            ELSE
                RETURN QUERY SELECT NULL::int, NULL::text, NULL::text, NULL::text, NULL::numeric,
                                    'Fasalkaan Arday Kuma Jirto!'::text;
            END IF;
            RETURN;
        END IF;

        IF var_exam_status = '1' THEN
            -- BY NAME
            RETURN QUERY
            SELECT sc.std_cl_id,
                   p.p_name::text          AS student,
                   ''::text                AS marks,
                   p.sex::text             AS gender,
                   var_mark                AS max_mark,
                   NULL::text              AS message
            FROM student s
            JOIN people        p  ON p.p_id      = s.p_id
            JOIN student_class sc ON sc.std_id   = s.std_id
            JOIN class         cl ON cl.cl_id    = sc.cl_id
            WHERE sc.a_y_id = p_academic
              AND cl.cl_id  = p_class
              AND sc.b_id   = p_batch
              AND s.state   = 'Active'
              AND sc.state IN ('Passed','Continue','Graduated')
              AND sc.std_cl_id NOT IN (
                  SELECT r.std_cl_id
                  FROM result r
                  JOIN exam_reg er2 ON er2.ex_reg_id = r.e_r_id
                  WHERE er2.a_y_id = p_academic
                    AND r.e_r_id   = p_exam
                    AND r.su_id    = p_subject
              )
            GROUP BY sc.std_cl_id, p.p_name, p.sex
            ORDER BY UPPER(p.p_name) ASC;
        ELSE
            -- BY SERIAL NUMBER
            IF EXISTS (
                SELECT 1
                FROM assign_student_room asr
                JOIN student_class sc ON sc.std_cl_id = asr.std_cl_id
                JOIN class c          ON c.cl_id      = sc.cl_id
                WHERE asr.std_cl_id IN (
                    SELECT sc2.std_cl_id
                    FROM student_class sc2
                    WHERE sc2.cl_id  = p_class
                      AND sc2.a_y_id = p_academic
                      AND sc2.b_id   = p_batch
                  )
                  AND asr.e_r_id = p_exam
            ) THEN
                IF EXISTS (
                    SELECT 1
                    FROM student s
                    JOIN student_class sc ON sc.std_id    = s.std_id
                    JOIN class cl         ON cl.cl_id     = sc.cl_id
                    JOIN assign_student_room asr ON asr.std_cl_id = sc.std_cl_id
                    WHERE sc.a_y_id = p_academic
                      AND cl.cl_id  = p_class
                      AND sc.b_id   = p_batch
                      AND s.state   = 'Active'
                      AND sc.state IN ('Passed','Continue','Graduated')
                      AND asr.e_r_id = p_exam
                      AND (asr.serial_num IS NULL OR asr.serial_num = 0)
                      AND sc.std_cl_id NOT IN (
                          SELECT r.std_cl_id
                          FROM result r
                          JOIN exam_reg er2 ON er2.ex_reg_id = r.e_r_id
                          WHERE er2.a_y_id = p_academic
                            AND r.e_r_id   = p_exam
                            AND r.su_id    = p_subject
                      )
                ) THEN
                    RETURN QUERY SELECT NULL::int, NULL::text, NULL::text, NULL::text, NULL::numeric,
                                        'Fadlan Serial Number Usamee Class kaan Serial Number Uma Sameesno!'::text;
                ELSE
                    RETURN QUERY
                    SELECT sc.std_cl_id,
                           asr.serial_num::text  AS student,
                           ''::text              AS marks,
                           p.sex::text           AS gender,
                           var_mark              AS max_mark,
                           NULL::text            AS message
                    FROM student s
                    JOIN people              p  ON p.p_id        = s.p_id
                    JOIN student_class       sc ON sc.std_id     = s.std_id
                    JOIN class               cl ON cl.cl_id      = sc.cl_id
                    JOIN assign_student_room asr ON asr.std_cl_id = sc.std_cl_id
                    WHERE sc.a_y_id = p_academic
                      AND cl.cl_id  = p_class
                      AND sc.b_id   = p_batch
                      AND s.state   = 'Active'
                      AND sc.state IN ('Passed','Continue','Graduated')
                      AND asr.e_r_id = p_exam
                      AND sc.std_cl_id NOT IN (
                          SELECT r.std_cl_id
                          FROM result r
                          JOIN exam_reg er2 ON er2.ex_reg_id = r.e_r_id
                          WHERE er2.a_y_id = p_academic
                            AND r.e_r_id   = p_exam
                            AND r.su_id    = p_subject
                      )
                    ORDER BY asr.serial_num;
                END IF;
            ELSE
                RETURN QUERY SELECT NULL::int, NULL::text, NULL::text, NULL::text, NULL::numeric,
                                    'Imtixaanka Dooran Waa By Serial Ee Fasalkaan Isku Qas Usamee ama By Name Ka Dhig Imtixaanka!'::text;
            END IF;
        END IF;
        RETURN;
    END IF;

    -- ========================================================================
    -- 'maximum' — mark-ka ugu sareeya
    -- ========================================================================
    IF p_operation = 'maximum' THEN
        RETURN QUERY
        SELECT NULL::int, NULL::text, NULL::text, NULL::text, er.marks, NULL::text
        FROM exam_reg er
        JOIN exam     e ON e.ex_id = er.ex_id
        WHERE er.ex_reg_id = p_exam
          AND er.a_y_id    = p_academic
        GROUP BY er.marks, e.ex_id;
        RETURN;
    END IF;

    -- ========================================================================
    -- 'update' — liiska ardayda marks-ku haray (edit-able)
    -- ========================================================================
    IF p_operation = 'update' THEN
        SELECT COUNT(r.r_id) INTO var_check
        FROM student s
        JOIN student_class sc ON sc.std_id     = s.std_id
        JOIN result        r  ON r.std_cl_id   = sc.std_cl_id
        JOIN subjects      su ON su.sub_id     = r.su_id
        JOIN exam_reg      er ON er.ex_reg_id  = r.e_r_id
        WHERE sc.cl_id  = p_class
          AND su.sub_id = p_subject
          AND er.ex_reg_id = p_exam
          AND er.a_y_id = p_academic
          AND sc.a_y_id = p_academic
          AND s.state   = 'Active'
          AND sc.b_id   = p_batch;

        IF var_check > 0 THEN
            IF var_exam_status = '1' THEN
                RETURN QUERY
                SELECT r.r_id,
                       p.p_name::text         AS student,
                       r.marks::text          AS marks,
                       NULL::text             AS gender,
                       var_mark               AS max_mark,
                       NULL::text             AS message
                FROM student s
                JOIN people        p  ON p.p_id      = s.p_id
                JOIN student_class sc ON sc.std_id   = s.std_id
                JOIN result        r  ON r.std_cl_id = sc.std_cl_id
                JOIN subjects      su ON su.sub_id   = r.su_id
                JOIN exam_reg      er ON er.ex_reg_id = r.e_r_id
                WHERE sc.cl_id  = p_class
                  AND su.sub_id = p_subject
                  AND er.ex_reg_id = p_exam
                  AND er.a_y_id = p_academic
                  AND sc.a_y_id = p_academic
                  AND s.state   = 'Active'
                  AND sc.b_id   = p_batch
                ORDER BY UPPER(p.p_name);
            ELSE
                RETURN QUERY
                SELECT r.r_id,
                       asr.serial_num::text   AS student,
                       r.marks::text          AS marks,
                       NULL::text             AS gender,
                       var_mark               AS max_mark,
                       NULL::text             AS message
                FROM student s
                JOIN people              p   ON p.p_id        = s.p_id
                JOIN student_class       sc  ON sc.std_id     = s.std_id
                JOIN result              r   ON r.std_cl_id   = sc.std_cl_id
                JOIN subjects            su  ON su.sub_id     = r.su_id
                JOIN exam_reg            er  ON er.ex_reg_id  = r.e_r_id
                JOIN assign_student_room asr ON asr.std_cl_id = sc.std_cl_id
                WHERE sc.cl_id  = p_class
                  AND su.sub_id = p_subject
                  AND er.ex_reg_id = p_exam
                  AND er.a_y_id = p_academic
                  AND sc.a_y_id = p_academic
                  AND s.state   = 'Active'
                  AND sc.b_id   = p_batch
                  AND asr.serial_num IS NOT NULL
                  AND asr.serial_num <> 0
                ORDER BY asr.serial_num;
            END IF;
        ELSE
            RETURN QUERY
            SELECT NULL::int, NULL::text, NULL::text, NULL::text, NULL::numeric, COALESCE(a.body, 'Lama helin')::text
            FROM (SELECT 1) x
            LEFT JOIN alerts a ON a.title = 'notfound'
            LIMIT 1;
        END IF;
        RETURN;
    END IF;
END;
$function$;
