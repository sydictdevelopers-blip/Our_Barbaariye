-- add_assing_class_exam_show
-- "Add new" form-ka tab-ka "Assign Class Exam":
-- liiska (class - batch) ee ardayga ku jiro academic-ka la doortay
-- iyo branch-ka la doortay.
-- Inputs: a_y_id_sp (academic), br_id_sp (branch)
-- Haddii la helo records, returns rows; haddii kale, returns 1 fallback row leh alerts.body 'NotFound'.
-- Optimized: hal CTE kaliya ayaa la wacaa (ma jiro count + re-query).

DROP FUNCTION IF EXISTS add_assing_class_exam_show(INT, INT) CASCADE;

CREATE OR REPLACE FUNCTION add_assing_class_exam_show(
    a_y_id_sp INT,
    br_id_sp  INT
)
RETURNS TABLE (
    cl_id    INT,
    "Class"  TEXT,
    "Exam"   VARCHAR,
    b_id     INT,
    "Result" TEXT
)
LANGUAGE sql
AS $$
    WITH d AS (
        SELECT c.cl_id,
               concat_ws(' - ', c.class, b.batch_name) AS class_label,
               sc.b_id
          FROM student_class sc
          JOIN class c ON c.cl_id = sc.cl_id
          JOIN batch b ON b.b_id  = sc.b_id
         WHERE sc.a_y_id = a_y_id_sp
           AND c.br_id   = br_id_sp
         GROUP BY c.cl_id, c.class, sc.b_id, b.batch_name
    )
    SELECT d.cl_id,
           d.class_label   AS "Class",
           ''::VARCHAR     AS "Exam",
           d.b_id,
           NULL::TEXT      AS "Result"
      FROM d
    UNION ALL
    SELECT NULL::INT,
           NULL::TEXT,
           NULL::VARCHAR,
           NULL::INT,
           (SELECT a.body FROM alerts a WHERE a.title = 'NotFound' LIMIT 1)
     WHERE NOT EXISTS (SELECT 1 FROM d);
$$;
