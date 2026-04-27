-- ============================================================================
-- subject_activity_show — datatable list for SubjectActivity tab
-- Branch filter via activity.br_id_sp (subject_activity has no direct br_id).
-- Raises a NOT_FOUND notice when no rows match so the frontend can render an
-- alert (mirrors the performance_show() pattern).
-- ============================================================================
DROP FUNCTION IF EXISTS public.subject_activity_show(integer);
CREATE OR REPLACE FUNCTION public.subject_activity_show(p_br_id integer)
RETURNS TABLE(
  sub_act_id    integer,
  act_id        integer,
  activity_name character varying,
  subject_id    integer,
  subject_name  character varying,
  max_marks     numeric,
  state         character varying
)
LANGUAGE plpgsql
AS $function$
DECLARE
  var_branch_name TEXT;
BEGIN
  SELECT b.br_name INTO var_branch_name FROM branch b WHERE b.br_id = p_br_id;

  IF p_br_id = 0 OR var_branch_name = 'All' THEN
    RETURN QUERY
    SELECT sa.sub_act_id, sa.act_id, a.activity_name,
           sa.subject_id, s.name AS subject_name,
           sa.max_marks, sa.state
    FROM subject_activity sa
    JOIN activity a ON a.act_id = sa.act_id
    JOIN subjects s ON s.sub_id = sa.subject_id
    ORDER BY sa.sub_act_id;
  ELSE
    RETURN QUERY
    SELECT sa.sub_act_id, sa.act_id, a.activity_name,
           sa.subject_id, s.name AS subject_name,
           sa.max_marks, sa.state
    FROM subject_activity sa
    JOIN activity a ON a.act_id = sa.act_id
    JOIN subjects s ON s.sub_id = sa.subject_id
    WHERE a.br_id_sp = p_br_id
    ORDER BY sa.sub_act_id;
  END IF;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'No data found in subject_activity table'
      USING ERRCODE = 'no_data_found';
  END IF;
END;
$function$;
