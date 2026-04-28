-- ============================================================================
-- result-insert-one-2026-04-28.sql
-- Result tab → GENERATE button: ku xareyn marks ardayga (result table).
-- /api/bulk endpoint-ka ayaa ku waca tan forEach step ah.
-- ============================================================================

DROP FUNCTION IF EXISTS public.result_insert_one(integer, integer, integer, numeric, integer);
CREATE OR REPLACE FUNCTION public.result_insert_one(
    p_std_cl_id integer,
    p_e_r_id    integer,
    p_su_id     integer,
    p_marks     numeric,
    p_u_br_id   integer
)
 RETURNS TABLE(r_id integer)
 LANGUAGE plpgsql
AS $function$
DECLARE
    new_id integer;
BEGIN
    INSERT INTO result (std_cl_id, e_r_id, su_id, marks, activity, approve, lock, reg_date, u_br_id)
    VALUES (p_std_cl_id, p_e_r_id, p_su_id, p_marks, 0, 'Pending', 'No', NOW(), p_u_br_id)
    RETURNING result.r_id INTO new_id;

    RETURN QUERY SELECT new_id;
END;
$function$;
