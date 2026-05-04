CREATE OR REPLACE FUNCTION public.vw_responsible(p_branch integer)
RETURNS TABLE(
    result      text,
    id          integer,
    responsible text,
    phone1      text,
    phone2      text
)
LANGUAGE plpgsql
STABLE
AS $function$
DECLARE
    v_branch_name TEXT;
BEGIN
    SELECT b.br_name
      INTO v_branch_name
      FROM branch b
     WHERE b.br_id = p_branch;

    IF v_branch_name = 'All' THEN
        RETURN QUERY
        SELECT NULL::text         AS result,
               r.res_id           AS id,
               rp.p_name::text    AS responsible,
               rp.tel::text       AS phone1,
               r.phone::text      AS phone2
          FROM responsible r
          LEFT JOIN people rp ON rp.p_id = r.p_id
         WHERE EXISTS (
               SELECT 1
                 FROM student s
                 JOIN student_class sc ON sc.std_id = s.std_id
                WHERE s.res_id = r.res_id
                  AND s.state  = 'Active'
                  AND sc.state = 'Continue'
         );
    ELSE
        RETURN QUERY
        SELECT NULL::text         AS result,
               r.res_id           AS id,
               rp.p_name::text    AS responsible,
               rp.tel::text       AS phone1,
               r.phone::text      AS phone2
          FROM responsible r
          LEFT JOIN people rp ON rp.p_id = r.p_id
         WHERE EXISTS (
               SELECT 1
                 FROM student s
                 JOIN student_class sc ON sc.std_id = s.std_id
                 JOIN class c           ON c.cl_id  = sc.cl_id
                WHERE s.res_id = r.res_id
                  AND s.state  = 'Active'
                  AND sc.state = 'Continue'
                  AND c.br_id  = p_branch
         );
    END IF;

    IF NOT FOUND THEN
        RETURN QUERY
        SELECT COALESCE(
                   (SELECT a.body::text
                      FROM alerts a
                     WHERE LOWER(a.title) = 'notfound'
                     LIMIT 1),
                   'Not found'
               )::text,
               NULL::int, NULL::text, NULL::text, NULL::text;
    END IF;
END;
$function$;
