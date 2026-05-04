-- ============================================================================
-- levels_show — fix: levels created at the "All" branch should appear in
-- every specific branch's level dropdown. Previously only levels with
-- l.br_id = p_branch_id were returned, hiding "dugsi sare" (br_id=1=All)
-- from branch=2 sessions.
-- ============================================================================
CREATE OR REPLACE FUNCTION public.levels_show(p_branch_id integer)
RETURNS TABLE(
    lev_id     integer,
    l_ty_id    integer,
    level      character varying,
    fee        numeric,
    level_name character varying
)
LANGUAGE plpgsql
AS $function$
DECLARE
    var_branch_name TEXT;
BEGIN
    SELECT b.br_name INTO var_branch_name FROM branch b WHERE b.br_id = p_branch_id;

    IF var_branch_name ILIKE 'all' THEN
        RETURN QUERY
        SELECT l.lev_id, l.l_ty_id, l.level, l.fee, lt.name
          FROM levels l
          JOIN level_type lt ON lt.l_ty_id = l.l_ty_id
         ORDER BY l.lev_id;
    ELSE
        -- Show levels owned by this branch OR by the "All" branch (so global
        -- levels created once at the All branch are visible everywhere).
        RETURN QUERY
        SELECT l.lev_id, l.l_ty_id, l.level, l.fee, lt.name
          FROM levels l
          JOIN level_type lt ON lt.l_ty_id = l.l_ty_id
          JOIN branch     br ON br.br_id   = l.br_id
         WHERE l.br_id = p_branch_id
            OR TRIM(br.br_name) ILIKE 'all'
         ORDER BY l.lev_id;
    END IF;
END;
$function$;

ALTER FUNCTION public.levels_show(integer) OWNER TO postgres;
