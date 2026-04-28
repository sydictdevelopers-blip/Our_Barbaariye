-- =============================================================================
-- update-emis-2026-04-28.sql
-- EMIS / ID-card maamulka ardayda fasalka:
--   1) update_emis_idcardlist(p_class, p_branch, p_academic)
--        → soo bandhig liiska ardayda fasalka iyo ID-card-yadooda hadda jira.
--   2) update_emis_student_id_sp(p_std_id, p_id_card, p_u_br_id)
--        → cusboonaysiinta hal ardey ID-card cusub.
--
-- Asalka MySQL: kala duwan PostgreSQL ee project-kan:
--   * MySQL: s.ID_card    → PG: student.id_card
--   * MySQL: s.name       → PG: people.p_name (JOIN via student.p_id → people.p_id)
--   * MySQL: User_id      → PG: u_br_id (user_branch.u_br_id) — sida update_all_responsibles_one_class_sp
--
-- Database: barbaariye_demo_v10_25_april  (schema: public)
-- =============================================================================


-- ----------------------------------------------------------------------------
-- 1) update_emis_idcardlist
--      List students of (class, branch, academic) so user can edit their ID_card.
-- ----------------------------------------------------------------------------
DROP FUNCTION IF EXISTS public.update_emis_idcardlist(INT, INT, INT);

CREATE OR REPLACE FUNCTION public.update_emis_idcardlist(
    p_class    INT,
    p_branch   INT,
    p_academic INT
)
RETURNS TABLE(
    id           INTEGER,
    id_card      TEXT,
    student_name TEXT,
    result       TEXT
)
LANGUAGE plpgsql
AS $$
DECLARE
    v_count INT := 0;
BEGIN
    SELECT COUNT(sc.std_cl_id)
    INTO v_count
    FROM student s
    JOIN student_class sc ON sc.std_id = s.std_id
    JOIN class cl         ON cl.cl_id   = sc.cl_id
    WHERE s.state   = 'Active'
      AND cl.br_id  = p_branch
      AND cl.cl_id  = p_class
      AND sc.a_y_id = p_academic;

    IF v_count = 0 THEN
        RETURN QUERY
        SELECT NULL::INTEGER,
               NULL::TEXT,
               NULL::TEXT,
               COALESCE(
                   (SELECT a.body::TEXT FROM alerts a WHERE LOWER(a.title) = 'notfound' LIMIT 1),
                   'No data found'
               );
    ELSE
        RETURN QUERY
        SELECT DISTINCT ON (s.std_id)
               s.std_id           AS id,
               COALESCE(s.id_card, '')::TEXT AS id_card,
               p.p_name::TEXT     AS student_name,
               NULL::TEXT          AS result
        FROM student s
        JOIN student_class sc ON sc.std_id = s.std_id
        JOIN class cl         ON cl.cl_id   = sc.cl_id
        JOIN people p         ON p.p_id     = s.p_id
        WHERE s.state   = 'Active'
          AND cl.br_id  = p_branch
          AND cl.cl_id  = p_class
          AND sc.a_y_id = p_academic
        ORDER BY s.std_id;
    END IF;
END;
$$;

ALTER FUNCTION public.update_emis_idcardlist(INT, INT, INT) OWNER TO postgres;


-- ----------------------------------------------------------------------------
-- 2) update_emis_student_id_sp
--      Update a single student's id_card. Security gating mirrors
--      update_all_responsibles_one_class_sp:
--        * The user must be Unlocked + Active (user_branch.u_br_id = p_u_br_id)
--        * Student must exist
-- ----------------------------------------------------------------------------
DROP FUNCTION IF EXISTS public.update_emis_student_id_sp(INT, VARCHAR, INT);

CREATE OR REPLACE FUNCTION public.update_emis_student_id_sp(
    p_std_id   INT,
    p_id_card  VARCHAR(50),
    p_u_br_id  INT
)
RETURNS TABLE(result TEXT)
LANGUAGE plpgsql
AS $$
DECLARE
    v_user_ok BOOLEAN := FALSE;
BEGIN
    -- 1) Hubi in user-ku Unlocked + Active yahay
    SELECT EXISTS(
        SELECT 1
        FROM users u
        JOIN user_branch ub ON ub.usr_id = u.usr_id
        WHERE u.lock_user = 'Unlocked'
          AND u.state     = 'Active'
          AND ub.u_br_id  = p_u_br_id
    )
    INTO v_user_ok;

    IF NOT v_user_ok THEN
        RETURN QUERY
        SELECT COALESCE(
            (SELECT a.body::TEXT FROM alerts a WHERE LOWER(a.title) = 'userlock' LIMIT 1),
            'User is locked'
        );
        RETURN;
    END IF;

    -- 2) Hubi in ardeyga uu jiro
    IF NOT EXISTS (SELECT 1 FROM student s WHERE s.std_id = p_std_id) THEN
        RETURN QUERY
        SELECT COALESCE(
            (SELECT a.body::TEXT FROM alerts a WHERE LOWER(a.title) = 'notregupdate' LIMIT 1),
            'Record not registered'
        );
        RETURN;
    END IF;

    -- 3) Cusboonaysiinta id_card-ka
    UPDATE student
       SET id_card = p_id_card
     WHERE std_id  = p_std_id;

    RETURN QUERY
    SELECT COALESCE(
        (SELECT a.body::TEXT FROM alerts a WHERE LOWER(a.title) = 'update' LIMIT 1),
        'Updated successfully'
    );
END;
$$;

ALTER FUNCTION public.update_emis_student_id_sp(INT, VARCHAR, INT) OWNER TO postgres;
