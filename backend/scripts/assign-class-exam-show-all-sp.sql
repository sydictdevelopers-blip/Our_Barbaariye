-- assign_class_exam_show_all
-- Soo bandhig dhammaan Class/Exam assignments ee academic year-ka la doortay.
-- Inputs : p_academic (a_y_id), p_branch (br_id)
-- Branch == 'All' → ma jiro filter branch ah; Class/Exam labadaba waxaa lagu daraa br_name (concat_ws), waxaana lagu daraa Batch.
-- Branch gaar ah → kaliya class-ka branch-ka la doortay; Batch lama soo celiyo (NULL).
-- Haddii la helo records → rows; haddii kale → 1 fallback row leh alerts.body 'NotFound'.
-- Optimized: hal CTE kaliya ayaa la wacaa (ma jiro count + re-query).

DROP FUNCTION IF EXISTS assign_class_exam_show_all(INT, INT) CASCADE;

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
LANGUAGE sql
AS $$
    WITH p AS (
        SELECT (br_name = 'All') AS is_all
          FROM branch
         WHERE br_id = p_branch
    ),
    d AS (
        SELECT ass.a_c_ex                                                          AS id_,
               CASE WHEN p.is_all THEN concat_ws('  -  ', cl.class, br.br_name)
                    ELSE cl.class::TEXT END                                        AS class_,
               CASE WHEN p.is_all THEN concat_ws('  -  ', e.exam, br.br_name)
                    ELSE e.exam::TEXT END                                          AS exam_,
               CASE WHEN p.is_all THEN b.batch_name
                    ELSE NULL::VARCHAR END                                         AS batch_,
               ass.state                                                           AS state_
          FROM p
          CROSS JOIN assign_class_exam ass
          JOIN class    cl ON cl.cl_id     = ass.cl_id
          JOIN exam_reg er ON er.ex_reg_id = ass.er_id
          JOIN exam     e  ON e.ex_id      = er.ex_id
          JOIN batch    b  ON b.b_id       = ass.b_id
          JOIN branch   br ON br.br_id     = cl.br_id
         WHERE er.a_y_id = p_academic
           AND (p.is_all OR cl.br_id = p_branch)
    )
    SELECT id_,
           class_      AS "Class",
           exam_       AS "Exam",
           batch_      AS "Batch",
           state_      AS "State",
           NULL::TEXT  AS "Result"
      FROM d
    UNION ALL
    SELECT NULL::INT,
           NULL::TEXT,
           NULL::TEXT,
           NULL::VARCHAR,
           NULL::VARCHAR,
           (SELECT a.body FROM alerts a WHERE a.title = 'NotFound' LIMIT 1)
     WHERE NOT EXISTS (SELECT 1 FROM d);
$$;
