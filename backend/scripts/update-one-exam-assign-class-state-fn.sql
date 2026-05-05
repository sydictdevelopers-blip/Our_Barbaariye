-- Update_One_examAssign_Class_State (MySQL) → PostgreSQL function.
--
-- Signature 3-arg ah: (p_er_id, br_id, p_state). br_id waxaa loo dhigay si
-- mustaqbalka loogu sii kordhin karo filter dheeraad ah (e.g. join class
-- WHERE class.br_id = br_id), hadda kaliya er_id ayaa la filter-yaa sida
-- MySQL asalka ah.
--
-- Note: alerts.body waa text — body::varchar cast lagama maarmaan ah si
-- RETURNS TABLE("Result" varchar) ay u dhigantaa, haddii kale Postgres wuxuu
-- soo tuuraa "structure of query does not match function result type".

DROP FUNCTION IF EXISTS public.update_one_exam_assign_class_state(integer, varchar);
DROP FUNCTION IF EXISTS public.update_one_exam_assign_class_state(integer, text);
DROP FUNCTION IF EXISTS public.update_one_exam_assign_class_state(integer, integer, varchar);
DROP FUNCTION IF EXISTS public.update_one_exam_assign_class_state(integer, integer, text);

CREATE OR REPLACE FUNCTION public.update_one_exam_assign_class_state(
  p_er_id integer,
  br_id   integer,
  p_state varchar
)
RETURNS TABLE("Result" varchar)
LANGUAGE plpgsql
AS $$
BEGIN
  IF p_state IN ('Active', 'Inactive') THEN
    UPDATE public.assign_class_exam
       SET state = p_state
     WHERE er_id = p_er_id;

    RETURN QUERY
      SELECT a.body::varchar
        FROM public.alerts a
       WHERE a.title = 'Update';
  END IF;
END;
$$;

-- Tijaabi:
-- SELECT * FROM update_one_exam_assign_class_state(1, 1, 'Active');
-- SELECT * FROM update_one_exam_assign_class_state(1, 1, 'Inactive');
