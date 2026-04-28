-- ============================================================================
-- students-show-2026-04-27.sql
-- Functions ee Students Tab "Show" workflow (PostgreSQL).
--
-- Asalka MySQL: vw_all_classes, vw_student.
-- Logic-da PG ayaa loo turjumay si uu ula jaanqaado schema-da PG (people p_id,
-- users.usr_id, branch.br_name, academic_year.state, iwm).
--
-- 1) vw_all_classes(p_search, p_limit, p_offset, p_branch_id)
--      - Branch-aware class dropdown (Select2 lazy: search/limit/offset).
--      - Branch.br_name='All' (ama p_branch_id=0)  → muuji DHAMMAAN classes;
--                                                     name = "<class>  -  <branch>"
--      - Else → kaliya classes-ka branch-ka (name = "<class>")
--      - ORDER BY cl.gr_id DESC (grade-desc), sida MySQL "order by grade desc".
--
-- 2) vw_batch_by_class(p_cl_id)
--      - Batches-ka student_class.b_id ee ah class p_cl_id, sannadka active-ka.
--
-- 3) vw_student(p_cl_id, p_a_y_id, p_b_id, p_oper)
--      - Operation 'show' kaliya (sida user-ku codsaday).
--      - Returns: std_id, id_card, student_name, phone, sex, district,
--                 responsible_name, type, m_phone, relation, discount, reg_date, username.
--      - Hadii aan students laga helin (cl_id+a_y_id), wuxuu soo celiyaa empty set.
-- ============================================================================


-- ----------------------------------------------------------------------------
-- 1) vw_all_classes
-- ----------------------------------------------------------------------------
DROP FUNCTION IF EXISTS public.vw_all_classes(text, integer, integer, integer);
CREATE OR REPLACE FUNCTION public.vw_all_classes(
    p_search    text    DEFAULT '',
    p_limit     integer DEFAULT 25,
    p_offset    integer DEFAULT 0,
    p_branch_id integer DEFAULT 0
)
 RETURNS TABLE(cl_id integer, class character varying)
 LANGUAGE plpgsql
AS $function$
DECLARE
    var_branch_name TEXT;
    var_pattern     TEXT;
BEGIN
    SELECT b.br_name INTO var_branch_name FROM branch b WHERE b.br_id = p_branch_id;
    var_pattern := '%' || COALESCE(p_search, '') || '%';

    IF p_branch_id = 0 OR var_branch_name = 'All' THEN
        RETURN QUERY
        SELECT
            cl.cl_id,
            (cl.class || '  -  ' || br.br_name)::character varying AS class
        FROM class cl
        JOIN branch br ON br.br_id  = cl.br_id
        JOIN levels l  ON l.lev_id  = cl.lev_id
        WHERE (COALESCE(p_search,'') = ''
               OR cl.class    ILIKE var_pattern
               OR br.br_name  ILIKE var_pattern)
        ORDER BY cl.gr_id DESC, cl.class ASC
        LIMIT  p_limit
        OFFSET p_offset;
    ELSE
        RETURN QUERY
        SELECT cl.cl_id, cl.class
        FROM class cl
        JOIN levels l ON l.lev_id = cl.lev_id
        WHERE cl.br_id = p_branch_id
          AND (COALESCE(p_search,'') = '' OR cl.class ILIKE var_pattern)
        ORDER BY cl.gr_id DESC, cl.class ASC
        LIMIT  p_limit
        OFFSET p_offset;
    END IF;
END;
$function$;


-- ----------------------------------------------------------------------------
-- 2) vw_batch_by_class — batches present in student_class for active academic year
-- ----------------------------------------------------------------------------
DROP FUNCTION IF EXISTS public.vw_batch_by_class(integer);
CREATE OR REPLACE FUNCTION public.vw_batch_by_class(p_cl_id integer)
 RETURNS TABLE(b_id integer, batch_name character varying)
 LANGUAGE plpgsql
AS $function$
BEGIN
    RETURN QUERY
    SELECT DISTINCT b.b_id, b.batch_name
    FROM student_class sc
    JOIN academic_year a ON a.a_y_id = sc.a_y_id
    JOIN batch         b ON b.b_id   = sc.b_id
    WHERE a.state  = 'Active'
      AND sc.cl_id = p_cl_id
    ORDER BY b.batch_name;
END;
$function$;


-- ----------------------------------------------------------------------------
-- 3) vw_student — Show button (oper='show' kaliya)
-- ----------------------------------------------------------------------------
DROP FUNCTION IF EXISTS public.vw_student(integer, integer, integer, character varying);
CREATE OR REPLACE FUNCTION public.vw_student(
    p_cl_id  integer,
    p_a_y_id integer,
    p_b_id   integer,
    p_oper   character varying DEFAULT 'show'
)
 RETURNS TABLE(
    std_id           integer,
    id_card          character varying,
    student_name     character varying,
    phone            character varying,
    sex              character varying,
    district         character varying,
    responsible_name character varying,
    type             character varying,
    m_phone          character varying,
    relation         character varying,
    discount         numeric,
    reg_date         timestamp without time zone,
    username         character varying
 )
 LANGUAGE plpgsql
AS $function$
DECLARE
    var_count integer;
BEGIN
    -- Hubi inay students jiraan (sida MySQL @ep counter)
    SELECT COUNT(s.std_id) INTO var_count
    FROM student s
    JOIN student_class sc ON sc.std_id = s.std_id
    WHERE s.state = 'Active'
      AND sc.cl_id  = p_cl_id
      AND sc.a_y_id = p_a_y_id;

    IF var_count = 0 THEN
        RETURN; -- empty result set (frontend wuxuu muujin doonaa "No data")
    END IF;

    IF p_oper = 'show' THEN
        -- Schema-da PG: phone/sex/address waxa la helaa via people, relation via
        -- responsible_relation, type via student_class.st_ty_id → student_type_fee,
        -- discount via student_class (ma aha student).
        RETURN QUERY
        SELECT
            s.std_id,
            s.id_card::character varying,
            p.p_name::character varying              AS student_name,
            p.tel::character varying                 AS phone,
            p.sex::character varying                 AS sex,
            ad.district::character varying           AS district,
            pr.p_name::character varying             AS responsible_name,
            sf.type_fee::character varying           AS type,
            pr.tel::character varying                AS m_phone,
            rr.relationtype::character varying       AS relation,
            sc.discount::numeric                     AS discount,
            s.reg_date,
            u.username::character varying            AS username
        FROM student s
        JOIN people                p   ON p.p_id      = s.p_id
        JOIN address               ad  ON ad.add_id   = p.ad_id
        JOIN student_class         sc  ON sc.std_id   = s.std_id
        JOIN class                 cl  ON cl.cl_id    = sc.cl_id
        JOIN responsible           r   ON r.res_id    = s.res_id
        JOIN people                pr  ON pr.p_id     = r.p_id
        JOIN responsible_relation  rr  ON rr.r_r_id   = s.r_r_id
        JOIN student_type_fee      sf  ON sf.st_ty_id = sc.st_ty_id
        JOIN user_branch           ub  ON ub.u_br_id  = s.u_br_id
        JOIN users                 u   ON u.usr_id    = ub.usr_id
        WHERE s.state    = 'Active'
          AND sc.cl_id   = p_cl_id
          AND sc.a_y_id  = p_a_y_id
          AND sc.b_id    = p_b_id
        ORDER BY p.p_name ASC;
    END IF;
END;
$function$;
