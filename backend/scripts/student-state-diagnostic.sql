-- ============================================================================
-- DIAGNOSTIC: Why is fn_student_state returning empty?
-- Halkan ku run-ka mid mid si aad u garato meesha xog-keenu ka taagan tahay.
-- ============================================================================

-- 1) Function-ku ma jiraa?
\df fn_student_state

-- 2) Branch-yada oo dhan iyo aqoonsigooda
SELECT br_id, br_name FROM public.branch ORDER BY br_id;

-- 3) Tirada ardayda guud
SELECT COUNT(*) AS total_students FROM public.student;

-- 4) Tirada ardayda iyo state kasta (case-sensitive sida ay ku qoran tahay)
SELECT state, COUNT(*) AS qty
  FROM public.student
 GROUP BY state
 ORDER BY qty DESC;

-- 5) Tirada student_class iyo state-yadooda
SELECT state, COUNT(*) AS qty
  FROM public.student_class
 GROUP BY state
 ORDER BY qty DESC;

-- 6) Heli students 'Inactive' + student_class 'Continue' (case-insensitive)
SELECT COUNT(*) AS matching_rows
  FROM public.student        s
  JOIN public.student_class  sc ON sc.std_id = s.std_id
 WHERE TRIM(sc.state) ILIKE 'continue'
   AND TRIM(s.state)  ILIKE 'inactive';

-- 7) Tijaabi function-ka p_br_id kala duwan
-- (badal 1 br_id-gaaga dhabta ah)
SELECT * FROM public.fn_student_state(1);

-- 8) Haddii aad rabto inaad arrgto sample row, baal hubin shuruudaha
SELECT s.std_id, p.p_name, s.state AS student_state, sc.state AS sc_state, ub.br_id, u.username
  FROM public.student        s
  JOIN public.people         p  ON p.p_id     = s.p_id
  JOIN public.student_class  sc ON sc.std_id  = s.std_id
  JOIN public.user_branch    ub ON ub.u_br_id = s.u_br_id
  LEFT JOIN public.users     u  ON u.usr_id   = ub.usr_id
 ORDER BY s.std_id DESC
 LIMIT 20;
