-- vw_std_admin_all – PostgreSQL port of the MySQL procedure with the same logic.
--
-- Schema differences from the MySQL version:
--   - branch.name           → branch.br_name
--   - student.name / .tel   → people.p_name / people.tel  (JOIN required)
--   - Returns TABLE (PG functions instead of result-set procedures)
--   - Comma-style joins replaced with explicit JOIN ... ON
--
-- Behavior preserved exactly: if the branch row's br_name is 'All',
-- return all matching students (across branches); otherwise filter by class.br_id.

CREATE OR REPLACE FUNCTION public.vw_std_admin_all(p_branch INTEGER)
    RETURNS TABLE(std_id INTEGER, name TEXT)
    LANGUAGE 'plpgsql'
AS $BODY$
DECLARE
    v_branch_name TEXT;
BEGIN
    SELECT b.br_name INTO v_branch_name
    FROM branch b
    WHERE b.br_id = p_branch;

    IF v_branch_name = 'All' THEN
        RETURN QUERY
        SELECT s.std_id,
               CONCAT_WS('  -  ', s.std_id::TEXT, p.p_name, p.tel)::TEXT AS name
        FROM student s
        JOIN people p          ON p.p_id  = s.p_id
        JOIN student_class sc  ON sc.std_id = s.std_id
        JOIN class cl          ON cl.cl_id  = sc.cl_id
        WHERE s.state = 'Active'
          AND sc.state IN ('Continue', 'Graduated')
        GROUP BY s.std_id, p.p_name, p.tel
        ORDER BY s.std_id;
    ELSE
        RETURN QUERY
        SELECT s.std_id,
               CONCAT_WS('  -  ', s.std_id::TEXT, p.p_name, p.tel)::TEXT AS name
        FROM student s
        JOIN people p          ON p.p_id  = s.p_id
        JOIN student_class sc  ON sc.std_id = s.std_id
        JOIN class cl          ON cl.cl_id  = sc.cl_id
        WHERE s.state = 'Active'
          AND sc.state IN ('Continue', 'Graduated')
          AND cl.br_id = p_branch
        GROUP BY s.std_id, p.p_name, p.tel
        ORDER BY s.std_id;
    END IF;
END;
$BODY$;
