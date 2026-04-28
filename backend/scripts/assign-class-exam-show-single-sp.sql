-- assign_class_exam_show_single
-- SHOW button-ka tab-ka "Assign Class Exam"
-- Inputs: p_class (cl_id), p_b_idsp (b_id), p_academic (a_y_id), p_branch (br_id)
-- Branch == 'All' → ma jiro filter branch ah; haddii kale, kaliya class-ka branch-ka la doortay.
-- Haddii la helo records, returns rows; haddii kale, returns 1 fallback row leh alerts.body 'notfound'.

CREATE OR REPLACE FUNCTION assign_class_exam_show_single(
    p_class    INT,
    p_b_idsp   INT,
    p_academic INT,
    p_branch   INT
)
RETURNS TABLE (
    "ID"     INT,
    "Class"  VARCHAR,
    "Exam"   VARCHAR,
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
         WHERE ass.er_id    = er.ex_reg_id
           AND er.ex_id     = e.ex_id
           AND ass.cl_id    = cl.cl_id
           AND ass.b_id     = b.b_id
           AND er.a_y_id    = p_academic
           AND b.b_id       = p_b_idsp
           AND ass.cl_id    = p_class;

        IF v_br > 0 THEN
            RETURN QUERY
            SELECT ass.a_c_ex            AS "ID",
                   cl.class              AS "Class",
                   e.exam                AS "Exam",
                   ass.state             AS "State",
                   NULL::TEXT            AS "Result"
              FROM assign_class_exam ass,
                   class             cl,
                   exam              e,
                   exam_reg          er,
                   batch             b
             WHERE ass.er_id  = er.ex_reg_id
               AND er.ex_id   = e.ex_id
               AND ass.cl_id  = cl.cl_id
               AND ass.b_id   = b.b_id
               AND er.a_y_id  = p_academic
               AND b.b_id     = p_b_idsp
               AND ass.cl_id  = p_class;
        ELSE
            RETURN QUERY
            SELECT NULL::INT       AS "ID",
                   NULL::VARCHAR   AS "Class",
                   NULL::VARCHAR   AS "Exam",
                   NULL::VARCHAR   AS "State",
                   a.body          AS "Result"
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
         WHERE ass.er_id    = er.ex_reg_id
           AND er.ex_id     = e.ex_id
           AND ass.cl_id    = cl.cl_id
           AND ass.b_id     = b.b_id
           AND cl.br_id     = p_branch
           AND er.a_y_id    = p_academic
           AND b.b_id       = p_b_idsp
           AND ass.cl_id    = p_class;

        IF v_br > 0 THEN
            RETURN QUERY
            SELECT ass.a_c_ex            AS "ID",
                   cl.class              AS "Class",
                   e.exam                AS "Exam",
                   ass.state             AS "State",
                   NULL::TEXT            AS "Result"
              FROM assign_class_exam ass,
                   class             cl,
                   exam              e,
                   exam_reg          er,
                   batch             b
             WHERE ass.er_id  = er.ex_reg_id
               AND er.ex_id   = e.ex_id
               AND ass.cl_id  = cl.cl_id
               AND ass.b_id   = b.b_id
               AND cl.br_id   = p_branch
               AND er.a_y_id  = p_academic
               AND b.b_id     = p_b_idsp
               AND ass.cl_id  = p_class;
        ELSE
            RETURN QUERY
            SELECT NULL::INT       AS "ID",
                   NULL::VARCHAR   AS "Class",
                   NULL::VARCHAR   AS "Exam",
                   NULL::VARCHAR   AS "State",
                   a.body          AS "Result"
              FROM alerts a
             WHERE a.title = 'notfound';
        END IF;

    END IF;
END;
$$;
