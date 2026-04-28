-- assign_class_exam_show_all
-- Soo bandhig dhammaan Class/Exam assignments ee academic year-ka la doortay.
-- Inputs : p_academic (a_y_id), p_branch (br_id)
-- Branch == 'All' → ma jiro filter branch ah; Class/Exam labadaba waxaa lagu daraa br_name (concat_ws), waxaana lagu daraa Batch.
-- Branch gaar ah → kaliya class-ka branch-ka la doortay; Batch lama soo celiyo (NULL).
-- Haddii la helo records → rows; haddii kale → 1 fallback row leh alerts.body 'notfound'.

CREATE OR REPLACE FUNCTION assign_class_exam_show_all(
    p_academic INT,
    p_branch   INT
)
RETURNS TABLE (
    "ID"     INT,
    "Class"  TEXT,
    "Exam"   TEXT,
    "Batch"  VARCHAR,
    "State"  VARCHAR,
    "Result" TEXT
)
LANGUAGE plpgsql
AS $$
DECLARE
    v_branch VARCHAR;
    v_br     INT;
BEGIN
    SELECT b.br_name INTO v_branch FROM branch b WHERE b.br_id = p_branch;

    IF v_branch = 'All' THEN

        SELECT count(ass.a_c_ex)
          INTO v_br
          FROM assign_class_exam ass,
               class             cl,
               exam              e,
               exam_reg          er,
               batch             b
         WHERE ass.er_id   = er.ex_reg_id
           AND er.ex_id    = e.ex_id
           AND ass.cl_id   = cl.cl_id
           AND ass.b_id    = b.b_id
           AND er.a_y_id   = p_academic;

        IF v_br > 0 THEN
            RETURN QUERY
            SELECT ass.a_c_ex                                  AS "ID",
                   concat_ws('  -  ', cl.class, br.br_name)    AS "Class",
                   concat_ws('  -  ', e.exam,  br.br_name)     AS "Exam",
                   b.batch_name                                AS "Batch",
                   ass.state                                   AS "State",
                   NULL::TEXT                                  AS "Result"
              FROM assign_class_exam ass,
                   class             cl,
                   exam              e,
                   exam_reg          er,
                   batch             b,
                   branch            br
             WHERE ass.er_id   = er.ex_reg_id
               AND er.ex_id    = e.ex_id
               AND ass.cl_id   = cl.cl_id
               AND ass.b_id    = b.b_id
               AND br.br_id    = cl.br_id
               AND er.a_y_id   = p_academic;
        ELSE
            RETURN QUERY
            SELECT NULL::INT      AS "ID",
                   NULL::TEXT     AS "Class",
                   NULL::TEXT     AS "Exam",
                   NULL::VARCHAR  AS "Batch",
                   NULL::VARCHAR  AS "State",
                   a.body         AS "Result"
              FROM alerts a
             WHERE a.title = 'notfound';
        END IF;

    ELSE

        SELECT count(ass.a_c_ex)
          INTO v_br
          FROM assign_class_exam ass,
               class             cl,
               exam              e,
               exam_reg          er,
               batch             b
         WHERE ass.er_id   = er.ex_reg_id
           AND er.ex_id    = e.ex_id
           AND ass.cl_id   = cl.cl_id
           AND ass.b_id    = b.b_id
           AND cl.br_id    = p_branch
           AND er.a_y_id   = p_academic;

        IF v_br > 0 THEN
            RETURN QUERY
            SELECT ass.a_c_ex             AS "ID",
                   cl.class::TEXT         AS "Class",
                   e.exam::TEXT           AS "Exam",
                   NULL::VARCHAR          AS "Batch",
                   ass.state              AS "State",
                   NULL::TEXT             AS "Result"
              FROM assign_class_exam ass,
                   class             cl,
                   exam              e,
                   exam_reg          er,
                   batch             b
             WHERE ass.er_id   = er.ex_reg_id
               AND er.ex_id    = e.ex_id
               AND ass.cl_id   = cl.cl_id
               AND ass.b_id    = b.b_id
               AND cl.br_id    = p_branch
               AND er.a_y_id   = p_academic;
        ELSE
            RETURN QUERY
            SELECT NULL::INT      AS "ID",
                   NULL::TEXT     AS "Class",
                   NULL::TEXT     AS "Exam",
                   NULL::VARCHAR  AS "Batch",
                   NULL::VARCHAR  AS "State",
                   a.body         AS "Result"
              FROM alerts a
             WHERE a.title = 'notfound';
        END IF;

    END IF;
END;
$$;
