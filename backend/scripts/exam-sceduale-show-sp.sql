-- exam_sceduale_show(a_y_id_sp, ex_id_sp, lev_id_sp, br_id_sp)
-- Soo bandhig exam_schedule-ka (Day, Class, Subject, Period, Start, End, Date)
-- ee la doortay academic + exam + level + branch.
-- 'All' branch handling: haddii session.br_name='All', branch ma filter-yo
-- (waxaa la arkaa wax kasta).

DROP FUNCTION IF EXISTS exam_sceduale_show(INT, INT, INT, INT) CASCADE;

CREATE OR REPLACE FUNCTION exam_sceduale_show(
    a_y_id_sp INT,
    ex_id_sp  INT,
    lev_id_sp INT,
    br_id_sp  INT
)
RETURNS TABLE (
    ex_s_id     INT,
    "Day"       VARCHAR,
    "Class"     VARCHAR,
    "Subject"   VARCHAR,
    "Period"    VARCHAR,
    "Start"     TIME,
    "End"       TIME,
    "ExamDate"  DATE,
    "Result"    TEXT,
    d_id        INT,
    pr_id       INT,
    sub_cl_id   INT,
    sh_id       INT,
    cl_id       INT,
    ex_r_id     INT
)
LANGUAGE plpgsql
AS $$
DECLARE
    v_branch_name VARCHAR;
BEGIN
    SELECT TRIM(br_name) INTO v_branch_name FROM branch WHERE br_id = br_id_sp;

    RETURN QUERY
    WITH d AS (
        SELECT es.ex_s_id,
               dy.day                                   AS day_name,
               cl.class                                 AS class_name,
               s.name                                   AS subj_name,
               p.period                                 AS period_name,
               es.start_time,
               es.end_time,
               es.exam_date,
               es.d_id,
               es.pr_id,
               es.sub_cl_id,
               es.sh_id,
               es.cl_id,
               es.ex_r_id
          FROM exam_schedule  es
          JOIN exam_reg       er ON er.ex_reg_id  = es.ex_r_id
          JOIN class          cl ON cl.cl_id      = es.cl_id
          JOIN day            dy ON dy.d_id       = es.d_id
          JOIN period         p  ON p.pr_id       = es.pr_id
          JOIN subject_class  sc ON sc.sub_cl_id  = es.sub_cl_id
          JOIN subjects       s  ON s.sub_id      = sc.sub_id
         WHERE er.a_y_id = a_y_id_sp
           AND er.ex_id  = ex_id_sp
           AND (lev_id_sp = 0 OR cl.lev_id = lev_id_sp)
           AND (
               v_branch_name = 'All'
               OR cl.br_id = br_id_sp
           )
    )
    SELECT d.ex_s_id, d.day_name, d.class_name, d.subj_name, d.period_name,
           d.start_time, d.end_time, d.exam_date, NULL::TEXT,
           d.d_id, d.pr_id, d.sub_cl_id, d.sh_id, d.cl_id, d.ex_r_id
      FROM d
    UNION ALL
    SELECT NULL::INT, NULL::VARCHAR, NULL::VARCHAR, NULL::VARCHAR,
           NULL::VARCHAR, NULL::TIME, NULL::TIME, NULL::DATE,
           (SELECT a.body FROM alerts a WHERE a.title = 'NotFound' LIMIT 1),
           NULL::INT, NULL::INT, NULL::INT, NULL::INT, NULL::INT, NULL::INT
     WHERE NOT EXISTS (SELECT 1 FROM d);
END;
$$;
