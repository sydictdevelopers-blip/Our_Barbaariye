-- =============================================================================
-- update_all_responsibles_one_class(p_class, p_branch, p_academic)
--   Soo bandhig liiska responsibles-ka fasalka la cayimay si gacanta loo
--   wax ka beddelo (Name / Phone One / Phone Two).
--
-- Schema notes (PostgreSQL — kala duwan MySQL-kii):
--   * `responsible` MA leh `name` ama `tel`. p_name + tel waxay ku jiraan
--     `people` (JOIN responsible.p_id → people.p_id).
--   * "Phone One" = people.tel
--   * "Phone Two" = responsible.phone
-- =============================================================================
DROP FUNCTION IF EXISTS public.update_all_responsibles_one_class(INT, INT, INT);

CREATE OR REPLACE FUNCTION public.update_all_responsibles_one_class(
    p_class    INT,
    p_branch   INT,
    p_academic INT
)
RETURNS TABLE(
    id        INTEGER,
    name      TEXT,
    phone_one TEXT,
    phone_two TEXT,
    result    TEXT
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
    WHERE s.state  = 'Active'
      AND cl.br_id = p_branch
      AND cl.cl_id = p_class
      AND sc.a_y_id = p_academic;

    IF v_count = 0 THEN
        RETURN QUERY
        SELECT NULL::INTEGER, NULL::TEXT, NULL::TEXT, NULL::TEXT,
               COALESCE(
                   (SELECT a.body::TEXT FROM alerts a WHERE LOWER(a.title) = 'notfound' LIMIT 1),
                   'No data found'
               );
    ELSE
        RETURN QUERY
        SELECT DISTINCT ON (r.res_id)
               r.res_id            AS id,
               p.p_name::TEXT      AS name,
               p.tel::TEXT         AS phone_one,
               r.phone::TEXT       AS phone_two,
               NULL::TEXT          AS result
        FROM student s
        JOIN student_class sc ON sc.std_id = s.std_id
        JOIN class cl         ON cl.cl_id   = sc.cl_id
        JOIN responsible r    ON r.res_id   = s.res_id
        JOIN people p         ON p.p_id     = r.p_id
        WHERE s.state  = 'Active'
          AND cl.br_id = p_branch
          AND cl.cl_id = p_class
          AND sc.a_y_id = p_academic
        ORDER BY r.res_id;
    END IF;
END;
$$;

ALTER FUNCTION public.update_all_responsibles_one_class(INT, INT, INT) OWNER TO postgres;


-- =============================================================================
-- update_all_responsibles_one_class_sp(p_res_id, p_full_name, p_phone_one,
--                                       p_phone_two, p_u_br_id)
--   Cusboonaysiinta hal responsible (Name/Phone1/Phone2). Hubinta amniga:
--     1) User-ka uu yahay 'Unlocked' + 'Active' (user_branch.u_br_id = p_u_br_id)
--     2) Responsible ahaata
-- =============================================================================
DROP FUNCTION IF EXISTS public.update_all_responsibles_one_class_sp(INT, VARCHAR, VARCHAR, VARCHAR, INT);

CREATE OR REPLACE FUNCTION public.update_all_responsibles_one_class_sp(
    p_res_id     INT,
    p_full_name  VARCHAR(500),
    p_phone_one  VARCHAR(100),
    p_phone_two  VARCHAR(100),
    p_u_br_id    INT
)
RETURNS TABLE(result TEXT)
LANGUAGE plpgsql
AS $$
DECLARE
    v_user_ok   BOOLEAN := FALSE;
    v_resp_p_id INT;
BEGIN
    -- 1) Hubi in user-ku uu Unlocked + Active yahay
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

    -- 2) Hubi in responsible-ka uu jiro, hel p_id-kiisa
    SELECT r.p_id INTO v_resp_p_id FROM responsible r WHERE r.res_id = p_res_id;

    IF v_resp_p_id IS NULL THEN
        RETURN QUERY
        SELECT COALESCE(
            (SELECT a.body::TEXT FROM alerts a WHERE LOWER(a.title) = 'notregupdate' LIMIT 1),
            'Record not registered'
        );
        RETURN;
    END IF;

    -- 3) Cusboonaysii — name + tel waxay ku jiraan people; phone waa responsible
    UPDATE people
       SET p_name = p_full_name,
           tel    = p_phone_one
     WHERE p_id  = v_resp_p_id;

    UPDATE responsible
       SET phone = p_phone_two
     WHERE res_id = p_res_id;

    RETURN QUERY
    SELECT COALESCE(
        (SELECT a.body::TEXT FROM alerts a WHERE LOWER(a.title) = 'update' LIMIT 1),
        'Updated successfully'
    );
END;
$$;

ALTER FUNCTION public.update_all_responsibles_one_class_sp(INT, VARCHAR, VARCHAR, VARCHAR, INT) OWNER TO postgres;
