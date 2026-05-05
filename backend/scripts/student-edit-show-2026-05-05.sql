-- =============================================================================
-- student_edit_show(p_std_id, p_cl_id, p_a_y_id)
--
-- Soo celiyaa HAL row oo dhammaystiran oo loogu talagalay buuxinta StudentRegister
-- form-ka marka user-ku riixo qalin-ka edit-ka shaxda ardayda.
--
-- Saddexda parameter:
--   p_std_id   - student PK
--   p_cl_id    - fasal-ka hadda lagu sii eegayo (filter context)
--   p_a_y_id   - academic year-ka context-ka
-- Saddextaan waxay si sax ah u doortaan student_class row-ga la edit-gareynayo
-- (haddii arday isku class+ay laba batch-yo ah uu jiro, midkeena la xulayo).
--
-- Performance: LANGUAGE sql + STABLE + PARALLEL SAFE → planner inline + cache.
--   1) student.std_id PK lookup    → O(log n)
--   2) student_class kompoziitka indexed (std_id + a_y_id + cl_id)
--   3) Lookup tables yaryar (PK index hits, cached).
--
-- Column names match field.rowKey / field.nameKey of CRUD_CONFIG.StudentRegister
-- (src/config/crudConfig.jsx) so the generic fromRow() helper populates the
-- form without a custom mapper.
-- =============================================================================

-- Tirtir labadii overload ee hore (haddii ay jiraan).
DROP FUNCTION IF EXISTS public.student_edit_show(integer);
DROP FUNCTION IF EXISTS public.student_edit_show(integer, integer, integer);

CREATE OR REPLACE FUNCTION public.student_edit_show(
    p_std_id  integer,
    p_cl_id   integer,
    p_a_y_id  integer
)
RETURNS TABLE (
    std_id            integer,
    emis_id           character varying,
    student_name      character varying,
    phone             character varying,
    sex               character varying,
    ad_id             integer,
    address_name      character varying,
    mothername        character varying,
    mother_phone      character varying,
    pob               character varying,
    dob               date,
    res_id            integer,
    p_name            character varying,   -- responsible name (label for res_id_sp)
    r_r_id            integer,
    relation_name     character varying,
    en_ty_id          integer,
    enroll_type       character varying,
    transfer_school   character varying,
    discount          numeric,
    st_ty_id          integer,
    type_fee_name     character varying,
    free_description  character varying,
    bus_id            integer,
    bus_name          character varying,
    bus_fee           numeric,
    orphan_status     character varying,
    disability_status character varying,
    refugee           character varying,
    register_fee      numeric,
    academic_fee      numeric,
    image             character varying,
    cl_id             integer,
    class             character varying,
    reg_date          timestamp without time zone
)
LANGUAGE sql
STABLE
PARALLEL SAFE
AS $function$
    SELECT
        s.std_id,
        s.emis_id::character varying                                           AS emis_id,
        p.p_name::character varying                                            AS student_name,
        p.tel::character varying                                               AS phone,
        p.sex::character varying                                               AS sex,
        p.ad_id,
        (ad.district || ' - ' || ad.village)::character varying                AS address_name,
        s.mothername::character varying                                        AS mothername,
        s.mother_phone::character varying                                      AS mother_phone,
        s.pob::character varying                                               AS pob,
        s.dob,
        s.res_id,
        rp.p_name::character varying                                           AS p_name,
        s.r_r_id,
        rr.relationtype::character varying                                     AS relation_name,
        s.en_ty_id,
        et.type::character varying                                             AS enroll_type,
        s.transfer_school::character varying                                   AS transfer_school,
        sc.discount,
        sc.st_ty_id,
        stf.type_fee::character varying                                        AS type_fee_name,
        sc.free_description::character varying                                 AS free_description,
        sc.bus_id,
        b.bus_name::character varying                                          AS bus_name,
        sc.bus_fee,
        s.orphan_status::character varying                                     AS orphan_status,
        s.disability_status::character varying                                 AS disability_status,
        s.refugee::character varying                                           AS refugee,
        s.register_fee,
        sc.academic_fee,
        s.image::character varying                                             AS image,
        sc.cl_id,
        cl.class::character varying                                            AS class,
        s.reg_date
    FROM public.student s
    JOIN public.people                p   ON p.p_id      = s.p_id
    JOIN public.address               ad  ON ad.add_id   = p.ad_id
    JOIN public.responsible           r   ON r.res_id    = s.res_id
    JOIN public.people                rp  ON rp.p_id     = r.p_id
    JOIN public.responsible_relation  rr  ON rr.r_r_id   = s.r_r_id
    JOIN public.enroll_type           et  ON et.en_ty_id = s.en_ty_id
    JOIN public.student_class         sc  ON sc.std_id   = s.std_id
                                          AND sc.cl_id   = p_cl_id
                                          AND sc.a_y_id  = p_a_y_id
    JOIN public.class                 cl  ON cl.cl_id    = sc.cl_id
    JOIN public.student_type_fee      stf ON stf.st_ty_id = sc.st_ty_id
    JOIN public.bus                   b   ON b.bus_id    = sc.bus_id
    WHERE s.std_id = p_std_id
    ORDER BY sc.std_cl_id DESC
    LIMIT 1;
$function$;

ALTER FUNCTION public.student_edit_show(integer, integer, integer) OWNER TO postgres;

COMMENT ON FUNCTION public.student_edit_show(integer, integer, integer) IS
'Read-only single-row fetch for the StudentRegister edit form. Filters by
std_id + cl_id + a_y_id to pick the exact student_class row being edited.
Column names match field.rowKey / field.nameKey of CRUD_CONFIG.StudentRegister
so the generic fromRow() helper populates the form without a custom mapper.';
