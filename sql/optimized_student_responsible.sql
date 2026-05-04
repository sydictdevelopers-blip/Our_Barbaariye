CREATE OR REPLACE FUNCTION public.student_responsible(
    p_num       integer,
    p_waalid    integer,
    p_operation character varying,
    p_user_id   integer
)
RETURNS TABLE(
    result      text,
    id          integer,
    student     text,
    responsible text,
    phone1      text,
    phone2      text
)
LANGUAGE plpgsql
AS $function$
DECLARE
    v_has_active_link BOOLEAN;
    v_resp_exists     BOOLEAN;
BEGIN
    IF NOT EXISTS (
        SELECT 1
          FROM user_branch ub
          JOIN users u ON u.usr_id = ub.usr_id
         WHERE ub.u_br_id  = p_user_id
           AND u.lock_user = 'Unlocked'
           AND u.state     = 'Active'
    ) THEN
        RETURN QUERY
        SELECT COALESCE(
                   (SELECT a.body::text
                      FROM alerts a
                     WHERE LOWER(a.title) = 'userlock'
                     LIMIT 1),
                   'User is locked'
               )::text,
               NULL::int, NULL::text, NULL::text, NULL::text, NULL::text;
        RETURN;
    END IF;

    SELECT EXISTS (SELECT 1 FROM responsible r WHERE r.res_id = p_waalid)
      INTO v_resp_exists;

    SELECT EXISTS (
        SELECT 1
          FROM student s
          JOIN student_class sc ON sc.std_id = s.std_id
         WHERE s.res_id  = p_waalid
           AND s.state   = 'Active'
           AND sc.state  = 'Continue'
    ) INTO v_has_active_link;

    CASE
        WHEN p_operation = 'show' THEN
            IF v_resp_exists AND NOT v_has_active_link THEN
                RETURN QUERY
                SELECT COALESCE(
                           (SELECT a.body::text
                              FROM alerts a
                             WHERE LOWER(a.title) = 'notfound'
                             LIMIT 1),
                           'Not found'
                       )::text,
                       NULL::int, NULL::text, NULL::text, NULL::text, NULL::text;
            ELSE
                RETURN QUERY
                SELECT NULL::text         AS result,
                       r.res_id           AS id,
                       sp.p_name::text    AS student,
                       rp.p_name::text    AS responsible,
                       rp.tel::text       AS phone1,
                       r.phone::text      AS phone2
                  FROM responsible r
                  JOIN student s
                       ON s.res_id = r.res_id
                      AND s.state  = 'Active'
                  JOIN student_class sc
                       ON sc.std_id = s.std_id
                      AND sc.state  = 'Continue'
                  LEFT JOIN people sp ON sp.p_id = s.p_id
                  LEFT JOIN people rp ON rp.p_id = r.p_id
                 WHERE r.res_id = p_waalid;
            END IF;

        WHEN p_operation = 'update' THEN
            UPDATE student
               SET res_id = p_waalid
             WHERE std_id = p_num;

            RETURN QUERY
            SELECT COALESCE(
                       (SELECT a.body::text
                          FROM alerts a
                         WHERE LOWER(a.title) = 'update'
                         LIMIT 1),
                       'Update successful'
                   )::text,
                   NULL::int, NULL::text, NULL::text, NULL::text, NULL::text;

        ELSE
            RETURN QUERY
            SELECT 'Invalid operation'::text,
                   NULL::int, NULL::text, NULL::text, NULL::text, NULL::text;
    END CASE;
END;
$function$;
