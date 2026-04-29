/* =====================================================================
   student-office-functions-2026-04-29.sql

   Hal file oo dhameystiran oo lagu kaydiyay DHAMMAAN stored procedures-ka
   loo isticmaalo Student Office UI-ga (Add New / Update / Bulk panels /
   State / Merge / Responsibles / EMIS).

   Liiska:
     1. responsible_sp                         (CRUD mas'uul)
     2. student_master_sp                      (registration: people+student+student_class+charge)
     3. student_responsible                    (bedelida mas'uulka ardayga)
     4. update_all_responsibles_one_class_sp   (bulk responsible update)
     5. update_emis_student_id_sp              (bulk EMIS / id_card update)
     6. student_state_sp                       (xaaladda ardayga: Active/Inactive + class change + charge)
     7. student_marge_sp                       (isku-darka 2 arday)

   Heshiis style:
     • All alert lookups: COALESCE((SELECT body FROM alerts WHERE lower(title)=...), '<fallback>')
     • Variable prefix: v_ (locals)
     • Param prefix: _sp (form-fields) ama p_ (positional)
     • Consistent 4-space indent.

   Idempotent: dhammaan SP-yadu DROP-IF-EXISTS + CREATE OR REPLACE — wax aan
   la jabin existing-data. Migration tool: `npm run migrate <file>`.

   Prereq data rows (sentinel): enroll_type 'Transfer', bus 'None',
   responsible_relation Soomaaliyeed (Hooyo, Aabo…). Waxay ka soo galaan
   migrations gaar ah:
     - responsible-relation-somali-2026-04-29.sql
     - student-master-sp-conditional-2026-04-29.sql (sentinel inserts)
   ===================================================================== */


/* =====================================================================
   1) responsible_sp — CRUD mas'uul
       INSERT: Helitaan/abuurid people + abuurid responsible (kaliya hadduu
                aanu hore u jirin).
       UPDATE: Cusboonaysii people + responsible.
       DELETE: Tirtir kaliya responsible-ka (people-ka kuma jiro tirtirka).
   ===================================================================== */

CREATE OR REPLACE FUNCTION public.responsible_sp(
    res_id_sp   integer,
    p_id_sp     integer,
    p_name_sp   character varying,
    tel_sp      character varying,
    phone_sp    character varying,
    sex_sp      character varying,
    ad_id_sp    integer,
    state_sp    character varying,
    u_br_id_sp  integer,
    oper        character varying)
 RETURNS character varying
 LANGUAGE plpgsql
AS $function$
DECLARE
    msg       VARCHAR;
    new_p_id  INT;
BEGIN

    IF oper = 'insert' THEN

        -- 1) People — dib u isticmaal hadduu jiro magac+tel isku mid; haddii kale insert.
        SELECT p_id INTO new_p_id
          FROM people
         WHERE lower(p_name) = lower(p_name_sp) AND tel = tel_sp
         ORDER BY p_id DESC
         LIMIT 1;

        IF new_p_id IS NULL THEN
            INSERT INTO people(p_name, tel, sex, email, ad_id, state, p_type, reg_date, u_br_id)
            VALUES (p_name_sp, tel_sp, sex_sp, '', ad_id_sp, 'Active', 'Parent', now(), u_br_id_sp)
            RETURNING p_id INTO new_p_id;
        END IF;

        -- 2) Responsible — kaliya hadduu aanan hore u jirin p_id-kaas.
        IF EXISTS (SELECT 1 FROM responsible WHERE p_id = new_p_id) THEN
            SELECT body INTO msg FROM alerts WHERE title = 'AlreadyInsert';
            RETURN COALESCE(msg, 'AlreadyInsert');
        END IF;

        INSERT INTO responsible(p_id, phone, state, u_br_id, reg_date)
        VALUES (new_p_id, phone_sp, 'Active', u_br_id_sp, now());

        SELECT body INTO msg FROM alerts WHERE title = 'Insert';
        RETURN COALESCE(msg, 'Insert');

    ELSIF oper = 'update' THEN

        IF NOT EXISTS (SELECT 1 FROM responsible WHERE res_id = res_id_sp) THEN
            SELECT body INTO msg FROM alerts WHERE title = 'NotRegUpdate';
            RETURN COALESCE(msg, 'NotRegUpdate');
        END IF;

        UPDATE people
           SET p_name = p_name_sp,
               tel    = tel_sp,
               sex    = sex_sp,
               ad_id  = ad_id_sp
         WHERE p_id = p_id_sp;

        UPDATE responsible
           SET phone   = phone_sp,
               state   = state_sp,
               u_br_id = u_br_id_sp
         WHERE res_id = res_id_sp;

        SELECT body INTO msg FROM alerts WHERE title = 'Update';
        RETURN COALESCE(msg, 'Update');

    ELSIF oper = 'delete' THEN

        IF NOT EXISTS (SELECT 1 FROM responsible WHERE res_id = res_id_sp) THEN
            SELECT body INTO msg FROM alerts WHERE title = 'NotRegUpdate';
            RETURN COALESCE(msg, 'NotRegUpdate');
        END IF;

        DELETE FROM responsible WHERE res_id = res_id_sp;

        SELECT body INTO msg FROM alerts WHERE title = 'Delete';
        RETURN COALESCE(msg, 'Delete');

    ELSE
        RETURN 'Invalid Operation';
    END IF;

END;
$function$;


/* =====================================================================
   2) student_master_sp — Registration ardayda (people + student +
       student_class [+ charge haddii register_fee>0]).

       Sentinel-aware defaults:
         • en_ty_id != 'Transfer'      → transfer_school = '0'
         • std_ty_f_id != 'Free'       → free_description = 'None'
         • bus_id     = 'None' bus     → bus_fee = 0
       Hidden defaults (frontend ma diraa): email='', b_id=1,
       bar_bilaw='No', into_xidisanyahay='No', fee=0, food=0.
   ===================================================================== */

DROP FUNCTION IF EXISTS public.student_master_sp(
    integer, character varying, character varying, character varying,
    integer, character varying, character varying, character varying,
    character varying, integer, integer, character varying, character varying,
    character varying, date, integer, character varying, character varying,
    character varying, character varying, character varying, character varying,
    numeric, integer, integer, integer, numeric, numeric, integer, numeric,
    integer, character varying, character varying, character varying, date,
    character varying);

CREATE OR REPLACE FUNCTION public.student_master_sp(
    std_id_sp                 integer,
    p_name_sp                 character varying,
    tel_sp                    character varying,
    sex_sp                    character varying,
    ad_id_sp                  integer,
    p_type_sp                 character varying,
    state_p_sp                character varying,
    emis_id_sp                character varying,
    id_card_sp                character varying,
    res_id_sp                 integer,
    r_r_id_sp                 integer,
    mothername_sp             character varying,
    mother_phone_sp           character varying,
    pob_sp                    character varying,
    dob_sp                    date,
    en_ty_id_sp               integer,
    transfer_school_sp        character varying,
    std_state_sp              character varying,
    image_sp                  character varying,
    orphan_status_sp          character varying,
    disability_status_sp      character varying,
    refugee_sp                character varying,
    register_fee_sp           numeric,
    u_br_id_sp                integer,
    cl_id_sp                  integer,
    a_y_id_sp                 integer,
    academic_fee_sp           numeric,
    discount_sp               numeric,
    bus_id_sp                 integer,
    bus_fee_sp                numeric,
    std_ty_f_id_sp            integer,
    free_description_sp       character varying,
    resident_type_sp          character varying,
    sc_state_sp               character varying,
    reg_date_sp               date,
    oper                      character varying)
 RETURNS character varying
 LANGUAGE plpgsql
AS $function$
DECLARE
    msg                       VARCHAR;
    new_p_id                  INT;
    new_std_id                INT;
    new_std_cl_id             INT;
    use_reg_ts                timestamp without time zone;
    transfer_en_ty_id         INT;
    free_st_ty_id             INT;
    none_bus_id               INT;
    resolved_transfer_school  VARCHAR;
    resolved_free_description VARCHAR;
    resolved_bus_fee          NUMERIC;
BEGIN

    use_reg_ts := COALESCE(reg_date_sp::timestamp, now());

    -- Lookup sentinel ids (one-shot).
    SELECT en_ty_id INTO transfer_en_ty_id
      FROM enroll_type WHERE lower(type) = 'transfer' LIMIT 1;
    SELECT st_ty_id  INTO free_st_ty_id
      FROM student_type_fee WHERE lower(type_fee) = 'free' LIMIT 1;
    SELECT bus_id    INTO none_bus_id
      FROM bus WHERE lower(bus_name) = 'none' LIMIT 1;

    -- Conditional resolutions.
    IF transfer_en_ty_id IS NOT NULL AND en_ty_id_sp = transfer_en_ty_id THEN
        resolved_transfer_school := COALESCE(NULLIF(transfer_school_sp, ''), '0');
    ELSE
        resolved_transfer_school := '0';
    END IF;

    IF free_st_ty_id IS NOT NULL AND std_ty_f_id_sp = free_st_ty_id THEN
        resolved_free_description := COALESCE(NULLIF(free_description_sp, ''), 'None');
    ELSE
        resolved_free_description := 'None';
    END IF;

    IF none_bus_id IS NOT NULL AND bus_id_sp = none_bus_id THEN
        resolved_bus_fee := 0;
    ELSE
        resolved_bus_fee := COALESCE(bus_fee_sp, 0);
    END IF;

    /* -------- INSERT -------- */
    IF oper = 'insert' THEN

        -- Duplicate guard ('' iyo '0' waa sentinel "no EMIS / no ID-card yet").
        IF EXISTS (
            SELECT 1 FROM student
             WHERE (emis_id_sp IS NOT NULL AND emis_id_sp NOT IN ('', '0') AND emis_id = emis_id_sp)
                OR (id_card_sp IS NOT NULL AND id_card_sp NOT IN ('', '0') AND id_card = id_card_sp)
        ) THEN
            SELECT body INTO msg FROM alerts WHERE title = 'AlreadyInsert';
            RETURN COALESCE(msg, 'AlreadyInsert');
        END IF;

        -- People — reuse on name+tel match, else insert.
        SELECT p_id INTO new_p_id FROM people
         WHERE lower(p_name) = lower(p_name_sp) AND tel = tel_sp
         ORDER BY p_id DESC LIMIT 1;

        IF new_p_id IS NULL THEN
            INSERT INTO people(p_name, tel, sex, email, ad_id, state, p_type, reg_date, u_br_id)
            VALUES (
                p_name_sp, tel_sp, sex_sp,
                '',
                ad_id_sp,
                COALESCE(NULLIF(state_p_sp,''), 'Active'),
                COALESCE(NULLIF(p_type_sp,''),  'Student'),
                use_reg_ts, u_br_id_sp
            ) RETURNING p_id INTO new_p_id;
        END IF;

        INSERT INTO student(
            emis_id, id_card, p_id, res_id, r_r_id,
            mothername, mother_phone, pob, dob, en_ty_id,
            transfer_school, state, image, orphan_status,
            disability_status, refugee, register_fee,
            u_br_id, reg_date
        ) VALUES (
            emis_id_sp, id_card_sp, new_p_id, res_id_sp, r_r_id_sp,
            mothername_sp, mother_phone_sp, pob_sp, dob_sp, en_ty_id_sp,
            resolved_transfer_school,
            COALESCE(NULLIF(std_state_sp,''), 'Active'),
            COALESCE(image_sp, ''),
            orphan_status_sp,
            disability_status_sp, refugee_sp, register_fee_sp,
            u_br_id_sp, use_reg_ts
        ) RETURNING std_id INTO new_std_id;

        INSERT INTO student_class(
            std_id, cl_id, a_y_id, b_id, fee, food, academic_fee,
            discount, bus_id, bus_fee, st_ty_id, free_description,
            resident_type, bar_bilaw, into_xidisanyahay, state,
            u_br_id, reg_date
        ) VALUES (
            new_std_id, cl_id_sp, a_y_id_sp,
            1,                                                  -- b_id default
            0, 0,                                               -- fee, food default
            COALESCE(academic_fee_sp, 0), COALESCE(discount_sp, 0),
            bus_id_sp, resolved_bus_fee,
            std_ty_f_id_sp,
            resolved_free_description,
            COALESCE(NULLIF(resident_type_sp,''), 'Day'),
            'No',                                               -- bar_bilaw default
            'No',                                               -- into_xidisanyahay default
            COALESCE(NULLIF(sc_state_sp,''), 'Continue'),
            u_br_id_sp, use_reg_ts
        ) RETURNING std_cl_id INTO new_std_cl_id;

        IF COALESCE(register_fee_sp, 0) > 0 THEN
            INSERT INTO charge(std_cl_id, amount, discount, reason, state, reg_date, u_br_id)
            VALUES (new_std_cl_id, register_fee_sp, 0, 'Registration fee', 'Pending', use_reg_ts, u_br_id_sp);
        END IF;

        SELECT body INTO msg FROM alerts WHERE title = 'Insert';
        RETURN COALESCE(msg, 'Insert');

    /* -------- UPDATE -------- */
    ELSIF oper = 'update' THEN

        SELECT s.p_id INTO new_p_id FROM student s WHERE s.std_id = std_id_sp;
        IF new_p_id IS NULL THEN
            SELECT body INTO msg FROM alerts WHERE title = 'NotRegUpdate';
            RETURN COALESCE(msg, 'NotRegUpdate');
        END IF;

        UPDATE people
           SET p_name = p_name_sp,
               tel    = tel_sp,
               sex    = sex_sp,
               ad_id  = ad_id_sp,
               p_type = COALESCE(NULLIF(p_type_sp,''), 'Student')
         WHERE p_id = new_p_id;

        UPDATE student
           SET emis_id           = emis_id_sp,
               id_card           = id_card_sp,
               res_id            = res_id_sp,
               r_r_id            = r_r_id_sp,
               mothername        = mothername_sp,
               mother_phone      = mother_phone_sp,
               pob               = pob_sp,
               dob               = dob_sp,
               en_ty_id          = en_ty_id_sp,
               transfer_school   = resolved_transfer_school,
               image             = COALESCE(image_sp, ''),
               orphan_status     = orphan_status_sp,
               disability_status = disability_status_sp,
               refugee           = refugee_sp,
               register_fee      = register_fee_sp
         WHERE std_id = std_id_sp;

        -- Cusboonaysii student_class-ka ugu dambeeyay (fasal-beddel waa la ogol yahay).
        UPDATE student_class
           SET cl_id            = cl_id_sp,
               a_y_id           = a_y_id_sp,
               academic_fee     = COALESCE(academic_fee_sp, 0),
               discount         = COALESCE(discount_sp, 0),
               bus_id           = bus_id_sp,
               bus_fee          = resolved_bus_fee,
               st_ty_id         = std_ty_f_id_sp,
               free_description = resolved_free_description,
               resident_type    = COALESCE(NULLIF(resident_type_sp,''), 'Day'),
               u_br_id          = u_br_id_sp
         WHERE std_cl_id = (
            SELECT std_cl_id FROM student_class
             WHERE std_id = std_id_sp
             ORDER BY std_cl_id DESC LIMIT 1
         );

        SELECT body INTO msg FROM alerts WHERE title = 'Update';
        RETURN COALESCE(msg, 'Update');

    /* -------- DELETE -------- */
    ELSIF oper = 'delete' THEN

        SELECT s.p_id INTO new_p_id FROM student s WHERE s.std_id = std_id_sp;
        IF new_p_id IS NULL THEN
            SELECT body INTO msg FROM alerts WHERE title = 'NotRegDelete';
            RETURN COALESCE(msg, 'NotRegDelete');
        END IF;

        DELETE FROM student_class WHERE std_id = std_id_sp;
        DELETE FROM student       WHERE std_id = std_id_sp;
        DELETE FROM people        WHERE p_id   = new_p_id;

        SELECT body INTO msg FROM alerts WHERE title = 'Delete';
        RETURN COALESCE(msg, 'Delete');

    ELSE
        RETURN 'Invalid Operation';
    END IF;

END;
$function$;


/* =====================================================================
   3) student_responsible — bedelida mas'uulka ardayga (show / update)

       'show'   → soo celi xog ku saabsan responsible + ardayda kuxiran
       'update' → bedel student.res_id = p_waalid for std_id=p_num.
   ===================================================================== */

CREATE OR REPLACE FUNCTION public.student_responsible(
    p_num        integer,
    p_waalid     integer,
    p_operation  character varying,
    p_user_id    integer)
 RETURNS TABLE(result text, id integer, student text, responsible text, phone1 text, phone2 text)
 LANGUAGE plpgsql
AS $function$
DECLARE
    v_res_count INT := 0;
BEGIN
    -- Hubi user-ku unlocked + active yahay; haddii kale soo celi alert.
    IF NOT EXISTS (
        SELECT 1
          FROM users u
          JOIN user_branch ub ON u.usr_id = ub.usr_id
         WHERE u.lock_user = 'Unlocked'
           AND u.state     = 'Active'
           AND ub.u_br_id  = p_user_id
    ) THEN
        RETURN QUERY
        SELECT COALESCE(
                   (SELECT a.body::TEXT FROM alerts a WHERE LOWER(a.title) = 'userlock' LIMIT 1),
                   'User is locked'
               )::TEXT,
               NULL::INT, NULL::TEXT, NULL::TEXT, NULL::TEXT, NULL::TEXT;
        RETURN;
    END IF;

    -- Hubi in mas'uulkan uu jiro oo aanu hadda ku xidhnayn arday Active+Continue ah.
    SELECT COUNT(r.res_id) INTO v_res_count
      FROM responsible r
     WHERE r.res_id = p_waalid
       AND r.res_id NOT IN (
           SELECT s.res_id
             FROM student s
             JOIN student_class sc ON s.std_id = sc.std_id
            WHERE s.state = 'Active' AND sc.state = 'Continue'
       );

    CASE
        WHEN p_operation = 'show' THEN
            IF v_res_count > 0 THEN
                RETURN QUERY
                SELECT COALESCE(
                           (SELECT a.body::TEXT FROM alerts a WHERE LOWER(a.title) = 'notfound' LIMIT 1),
                           'Not found'
                       )::TEXT,
                       NULL::INT, NULL::TEXT, NULL::TEXT, NULL::TEXT, NULL::TEXT;
            ELSE
                RETURN QUERY
                SELECT NULL::TEXT       AS result,
                       r.res_id          AS id,
                       sp.p_name::TEXT   AS student,
                       rp.p_name::TEXT   AS responsible,
                       rp.tel::TEXT      AS phone1,
                       r.phone::TEXT     AS phone2
                  FROM student s
                  JOIN student_class sc ON s.std_id = sc.std_id
                  JOIN responsible r    ON r.res_id = s.res_id
                  LEFT JOIN people sp   ON sp.p_id = s.p_id
                  LEFT JOIN people rp   ON rp.p_id = r.p_id
                 WHERE s.state  = 'Active'
                   AND sc.state = 'Continue'
                   AND r.res_id = p_waalid;
            END IF;

        WHEN p_operation = 'update' THEN
            UPDATE student SET res_id = p_waalid WHERE std_id = p_num;
            RETURN QUERY
            SELECT COALESCE(
                       (SELECT a.body::TEXT FROM alerts a WHERE LOWER(a.title) = 'update' LIMIT 1),
                       'Update successful'
                   )::TEXT,
                   NULL::INT, NULL::TEXT, NULL::TEXT, NULL::TEXT, NULL::TEXT;

        ELSE
            RETURN QUERY
            SELECT 'Invalid operation'::TEXT,
                   NULL::INT, NULL::TEXT, NULL::TEXT, NULL::TEXT, NULL::TEXT;
    END CASE;
END;
$function$;


/* =====================================================================
   4) update_all_responsibles_one_class_sp — bulk update responsible
       Wuxuu cusboonaysiiyaa magaca/telephone-yada hal mas'uul ah.
       Magaca + tel → people, second-phone → responsible.phone.
   ===================================================================== */

CREATE OR REPLACE FUNCTION public.update_all_responsibles_one_class_sp(
    p_res_id      integer,
    p_full_name   character varying,
    p_phone_one   character varying,
    p_phone_two   character varying,
    p_u_br_id     integer)
 RETURNS TABLE(result text)
 LANGUAGE plpgsql
AS $function$
DECLARE
    v_resp_p_id INT;
BEGIN
    -- 1) Hubi user-ka.
    IF NOT EXISTS (
        SELECT 1
          FROM users u
          JOIN user_branch ub ON ub.usr_id = u.usr_id
         WHERE u.lock_user = 'Unlocked'
           AND u.state     = 'Active'
           AND ub.u_br_id  = p_u_br_id
    ) THEN
        RETURN QUERY
        SELECT COALESCE(
                   (SELECT a.body::TEXT FROM alerts a WHERE LOWER(a.title) = 'userlock' LIMIT 1),
                   'User is locked'
               );
        RETURN;
    END IF;

    -- 2) Hubi mas'uulka oo soo qaad p_id-kiisa.
    SELECT r.p_id INTO v_resp_p_id FROM responsible r WHERE r.res_id = p_res_id;
    IF v_resp_p_id IS NULL THEN
        RETURN QUERY
        SELECT COALESCE(
                   (SELECT a.body::TEXT FROM alerts a WHERE LOWER(a.title) = 'notregupdate' LIMIT 1),
                   'Record not registered'
               );
        RETURN;
    END IF;

    -- 3) Cusboonaysii.
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
$function$;


/* =====================================================================
   5) update_emis_student_id_sp — bulk update EMIS / id_card field.
   ===================================================================== */

CREATE OR REPLACE FUNCTION public.update_emis_student_id_sp(
    p_std_id    integer,
    p_id_card   character varying,
    p_u_br_id   integer)
 RETURNS TABLE(result text)
 LANGUAGE plpgsql
AS $function$
BEGIN
    -- 1) Hubi user-ka.
    IF NOT EXISTS (
        SELECT 1
          FROM users u
          JOIN user_branch ub ON ub.usr_id = u.usr_id
         WHERE u.lock_user = 'Unlocked'
           AND u.state     = 'Active'
           AND ub.u_br_id  = p_u_br_id
    ) THEN
        RETURN QUERY
        SELECT COALESCE(
                   (SELECT a.body::TEXT FROM alerts a WHERE LOWER(a.title) = 'userlock' LIMIT 1),
                   'User is locked'
               );
        RETURN;
    END IF;

    -- 2) Hubi student-ka.
    IF NOT EXISTS (SELECT 1 FROM student s WHERE s.std_id = p_std_id) THEN
        RETURN QUERY
        SELECT COALESCE(
                   (SELECT a.body::TEXT FROM alerts a WHERE LOWER(a.title) = 'notregupdate' LIMIT 1),
                   'Record not registered'
               );
        RETURN;
    END IF;

    -- 3) Cusboonaysii id_card.
    UPDATE student
       SET id_card = p_id_card
     WHERE std_id  = p_std_id;

    RETURN QUERY
    SELECT COALESCE(
               (SELECT a.body::TEXT FROM alerts a WHERE LOWER(a.title) = 'update' LIMIT 1),
               'Updated successfully'
           );
END;
$function$;


/* =====================================================================
   6) student_state_sp — bedelida xaaladda ardayga (Active / Inactive).

       Inactive  → student.state='Inactive' + student_state row.
       Active    → student.state='Active'  + student_state row + (haddii
                    aan academic la siin year-ka firfircoon current),
                    sameey class transfer (Passed/Failed) + insert
                    student_class cusub. Hadii la doortay 'Charged' ama
                    'Full Payment', insert charge (+ receipt for full).

       Wax laga nadiifiyay: INSERT INTO student_class oo laba jeer la
       saxay (Passed iyo Failed) hadda waa hal block oo CASE leh.
   ===================================================================== */

CREATE OR REPLACE FUNCTION public.student_state_sp(
    ids            integer,
    clas           integer,
    academic       integer,
    reason         character varying,
    oper_fee       character varying,
    fee_amount     numeric,
    account_pr     character varying,
    to_class       character varying,
    description_sp text,
    date_sp        date,
    user_id        integer)
 RETURNS TABLE(result text)
 LANGUAGE plpgsql
AS $function$
DECLARE
    v_a_y_id_active     INT;
    v_std_cl_id         INT;
    v_a_y_id            INT;
    v_std_id            INT;
    v_sc_id             INT;
    v_charge_last       INT;
    v_amounts           DECIMAL(65,3);
    v_to_class_int      INT;
    v_target_cl_id      INT;
    v_pass_or_fail      VARCHAR;
    v_fee               NUMERIC;
    v_food              NUMERIC;
    v_academic_fee      NUMERIC;
    v_discount          NUMERIC;
    v_bus_id            INT;
    v_bus_fee           NUMERIC;
    v_st_ty_id          INT;
    v_free_description  TEXT;
    v_resident_type     VARCHAR;
    v_bar_bilaw         VARCHAR;
    v_into_xidisanyahay VARCHAR;
BEGIN
    -- 1) Hubi user-ka.
    IF NOT EXISTS (
        SELECT 1
          FROM users u
          JOIN user_branch ub ON u.usr_id = ub.usr_id
         WHERE u.lock_user = 'Unlocked'
           AND u.state     = 'Active'
           AND ub.u_br_id  = user_id
    ) THEN
        RETURN QUERY SELECT body::TEXT FROM alerts WHERE title = 'Userlock';
        RETURN;
    END IF;

    -- 2) Hel year-ka firfircoon iyo student_class-ka ugu dambeeyay.
    SELECT ac.a_y_id INTO v_a_y_id_active
      FROM academic_year ac
     WHERE ac.state = 'Active'
     ORDER BY ac.a_y_id DESC
     LIMIT 1;

    SELECT s.std_cl_id, s.a_y_id, s.std_id
      INTO v_std_cl_id, v_a_y_id, v_std_id
      FROM student_class s
     WHERE s.std_id = ids
     ORDER BY s.std_cl_id DESC
     LIMIT 1;

    SELECT fee, food, academic_fee, discount, bus_id, bus_fee,
           st_ty_id, free_description, resident_type, bar_bilaw, into_xidisanyahay
      INTO v_fee, v_food, v_academic_fee, v_discount, v_bus_id, v_bus_fee,
           v_st_ty_id, v_free_description, v_resident_type, v_bar_bilaw, v_into_xidisanyahay
      FROM student_class
     WHERE std_id = ids AND state = 'Continue'
     ORDER BY std_cl_id DESC
     LIMIT 1;

    /* -------- INACTIVATE -------- */
    IF reason = 'Inactive' THEN
        IF NOT EXISTS (SELECT 1 FROM student s WHERE s.std_id = v_std_id AND s.state = 'Active') THEN
            RETURN QUERY SELECT 'This student is Already Inactive'::TEXT;
            RETURN;
        END IF;

        UPDATE student SET state = reason WHERE std_id = ids;

        INSERT INTO student_state(std_cl_id, state, description, u_br_id, reg_date)
        VALUES (v_std_cl_id, reason, description_sp, user_id, date_sp);

        RETURN QUERY SELECT body::TEXT FROM alerts WHERE title = 'Update';
        RETURN;
    END IF;

    /* -------- REACTIVATE (ka soo nooleysii Inactive) -------- */
    IF reason = 'Active' THEN
        IF NOT EXISTS (SELECT 1 FROM student s WHERE s.std_id = v_std_id AND s.state = 'Inactive') THEN
            RETURN QUERY SELECT 'This student is Already Active'::TEXT;
            RETURN;
        END IF;

        IF v_std_id <> ids OR v_a_y_id <> academic THEN
            -- Mismatch — soo celi update alert (legacy fall-through).
            RETURN QUERY SELECT body::TEXT FROM alerts WHERE title = 'Update';
            RETURN;
        END IF;

        UPDATE student SET state = reason WHERE std_id = ids;

        INSERT INTO student_state(std_cl_id, state, description, u_br_id, reg_date)
        VALUES (v_std_cl_id, reason, description_sp, user_id, date_sp);

        -- Hadii year-ka aan firfircoonayn (= year hore), kala saar Passed/Failed
        -- oo abuur student_class cusub year-ka firfircoon.
        IF v_a_y_id_active IS NOT NULL AND v_a_y_id_active <> academic THEN
            IF COALESCE(BTRIM(to_class), '') <> '' AND to_class ~ '^[0-9]+$' THEN
                v_to_class_int := to_class::INT;
                v_target_cl_id := v_to_class_int;
                v_pass_or_fail := 'Passed';
            ELSE
                v_target_cl_id := clas;
                v_pass_or_fail := 'Failed';
            END IF;

            UPDATE student_class
               SET cl_id = clas, a_y_id = academic, state = v_pass_or_fail
             WHERE std_cl_id = v_std_cl_id;

            INSERT INTO student_class (
                std_id, cl_id, a_y_id, b_id,
                fee, food, academic_fee, discount,
                bus_id, bus_fee, st_ty_id, free_description,
                resident_type, bar_bilaw, into_xidisanyahay,
                state, u_br_id, reg_date
            ) VALUES (
                ids, v_target_cl_id, v_a_y_id_active, 1,
                COALESCE(v_fee, 0), COALESCE(v_food, 0),
                COALESCE(v_academic_fee, 0), COALESCE(v_discount, 0),
                v_bus_id, COALESCE(v_bus_fee, 0),
                COALESCE(v_st_ty_id, 0), COALESCE(v_free_description, 'N/A'),
                COALESCE(v_resident_type, 'Resident'),
                COALESCE(v_bar_bilaw, CURRENT_DATE::TEXT),
                COALESCE(v_into_xidisanyahay, 'None'),
                'Continue', user_id, CURRENT_DATE
            );
        END IF;

        -- Hubi student_class-ka hadda firfircoon (post-reactivate).
        SELECT sc.std_cl_id, sc.a_y_id INTO v_sc_id, v_a_y_id
          FROM student_class sc
          JOIN student s ON s.std_id = sc.std_id
         WHERE s.state  = 'Active'
           AND sc.state = 'Continue'
           AND sc.std_id = ids
         ORDER BY sc.std_cl_id DESC
         LIMIT 1;

        -- Charge handling for Inactive-fee.
        IF oper_fee IN ('Charged', 'Full Payment') AND fee_amount > 0 THEN
            INSERT INTO charge(std_cl_id, amount, discount, reason, state, reg_date, u_br_id)
            VALUES (v_sc_id, fee_amount, 0, 'Inactive fee', 'Active', CURRENT_DATE, user_id);

            -- Full Payment ku dar receipt-ka qabashada lacagta.
            IF oper_fee = 'Full Payment' THEN
                SELECT ch.ch_id, ch.amount INTO v_charge_last, v_amounts
                  FROM charge ch
                 WHERE ch.std_cl_id = v_sc_id AND ch.reason = 'Inactive fee'
                 ORDER BY ch.ch_id DESC
                 LIMIT 1;

                INSERT INTO receipt(ch_id, amount, acc_id, phone, balance_text, reg_date, u_br_id)
                VALUES (v_charge_last, v_amounts, NULLIF(account_pr, '')::INT, '', '', CURRENT_DATE, user_id);
            END IF;
        END IF;

        RETURN QUERY SELECT body::TEXT FROM alerts WHERE title = 'Update';
        RETURN;
    END IF;

    -- Fall-through (operations kale): soo celi update alert.
    RETURN QUERY SELECT body::TEXT FROM alerts WHERE title = 'Update';
END;
$function$;


/* =====================================================================
   7) student_marge_sp — isku-darka 2 arday duplicate ah.

       Hubi in labada arday ay isla heer (gr_id) ku jiraan; haddii sax
       tahay, wareeji student_class.std_id ka FROM student → TO student
       oo tirtir FROM student-ka asalka ah.
   ===================================================================== */

CREATE OR REPLACE FUNCTION public.student_marge_sp(
    p_std_frm integer,
    p_std_to  integer)
 RETURNS TABLE(result text)
 LANGUAGE plpgsql
AS $function$
DECLARE
    v_match_count INT := 0;
BEGIN
    -- Hubi in heer (gr_id) FROM student-ka uu ku jiro classes-ka TO student-ka.
    SELECT COUNT(*) INTO v_match_count
      FROM student s
      JOIN student_class sc ON sc.std_id = s.std_id
      JOIN class c          ON c.cl_id   = sc.cl_id
     WHERE s.state = 'Active'
       AND sc.state = 'Continue'
       AND s.std_id = p_std_frm
       AND c.gr_id IN (
           SELECT c2.gr_id
             FROM student s2
             JOIN student_class sc2 ON sc2.std_id = s2.std_id
             JOIN class c2          ON c2.cl_id   = sc2.cl_id
            WHERE s2.state = 'Active'
              AND sc2.state = 'Continue'
              AND s2.std_id = p_std_to
       );

    IF v_match_count <= 0 THEN
        RETURN QUERY
        SELECT COALESCE(
                   (SELECT a.body::TEXT FROM alerts a WHERE LOWER(a.title) = 'notregupdate' LIMIT 1),
                   'Cannot merge — students are in different grades'
               );
        RETURN;
    END IF;

    UPDATE student_class SET std_id = p_std_to WHERE std_id = p_std_frm;
    DELETE FROM student WHERE std_id = p_std_frm;

    RETURN QUERY
    SELECT COALESCE(
               (SELECT a.body::TEXT FROM alerts a WHERE LOWER(a.title) = 'update' LIMIT 1),
               'Merge completed successfully'
           );
END;
$function$;


/* =========================================================================
   ===========================  PART B  ====================================
   SELECT-functions (listings + dropdown sources) ee Student Office.

       Listings (paneelada xogta tusaya):
         8.  vw_student                          (StudentsTab main grid)
         9.  vw_student_image                    (StudentImagesPanel)
         10. vw_student_state                    (StudentStateTab grid)
         11. vw_studentclass_info                (StudentInfoTab right pane)
         12. studentinfo_show                    (StudentInfoTab paginated grid)
         13. studentinfo_duplicates_show         (StudentInfoTab "Duplicates" tab)
         14. update_all_responsibles_one_class   (ResponsiblesPanel listing)
         15. update_emis_idcardlist              (EmisPanel listing)

       Dropdown sources (Select2 lazy loaders):
         16. responsible_options_show
         17. all_student_options_show
         18. all_students_options_show
         19. vw_all_classes                      (class_options)
         20. vw_batch_by_class                   (batch_options when cl_id set)
         21. vw_bus                              (raw branch buses; +'None' UNION
                                                   wraps it inside dropdowns.js)
         22. vw_std_admin_all                    (std_admin_all_options)

   Note: dropdowns kale ee Student Office (academic_options, address_options,
   account_options, enroll_type_options, student_type_fee_options,
   responsible_relation_options, type_fee_options) waxay yihiin SELECT toos
   ah oo ku jira `backend/config/queries/dropdowns.js` — function ahaan ma
   jiraan PG-da, sidaa darteed lagama keenin halkaan.
   ========================================================================= */


/* ====== 8) vw_student — StudentsTab main grid ====== */

CREATE OR REPLACE FUNCTION public.vw_student(
    p_cl_id   integer,
    p_a_y_id  integer,
    p_b_id    integer,
    p_oper    character varying DEFAULT 'show'::character varying)
 RETURNS TABLE(
    std_id integer, id_card character varying, student_name character varying,
    phone character varying, sex character varying, district character varying,
    responsible_name character varying, type character varying,
    m_phone character varying, relation character varying,
    discount numeric, reg_date timestamp without time zone,
    username character varying)
 LANGUAGE plpgsql
AS $function$
DECLARE
    v_count INTEGER;
BEGIN
    SELECT COUNT(s.std_id) INTO v_count
      FROM student s
      JOIN student_class sc ON sc.std_id = s.std_id
     WHERE s.state    = 'Active'
       AND sc.cl_id   = p_cl_id
       AND sc.a_y_id  = p_a_y_id;

    IF v_count = 0 THEN
        RETURN; -- empty set; frontend tusaya "No data"
    END IF;

    IF p_oper = 'show' THEN
        RETURN QUERY
        SELECT s.std_id,
               s.id_card::character varying,
               p.p_name::character varying        AS student_name,
               p.tel::character varying           AS phone,
               p.sex::character varying           AS sex,
               ad.district::character varying     AS district,
               pr.p_name::character varying       AS responsible_name,
               sf.type_fee::character varying     AS type,
               pr.tel::character varying          AS m_phone,
               rr.relationtype::character varying AS relation,
               sc.discount::numeric               AS discount,
               s.reg_date,
               u.username::character varying      AS username
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


/* ====== 9) vw_student_image — StudentImagesPanel ====== */

CREATE OR REPLACE FUNCTION public.vw_student_image(
    p_cls       integer,
    p_batch     integer,
    p_academic  integer)
 RETURNS TABLE(id integer, student_name text, image text, is_default boolean, result text)
 LANGUAGE plpgsql
AS $function$
DECLARE
    v_count INT := 0;
BEGIN
    SELECT COUNT(s.std_id) INTO v_count
      FROM student s
      JOIN student_class sc ON sc.std_id = s.std_id
     WHERE sc.cl_id  = p_cls
       AND sc.a_y_id = p_academic
       AND sc.b_id   = p_batch
       AND s.state   = 'Active';

    IF v_count = 0 THEN
        RETURN QUERY
        SELECT NULL::INTEGER, NULL::TEXT, NULL::TEXT, NULL::BOOLEAN,
               COALESCE(
                   (SELECT a.body::TEXT FROM alerts a WHERE LOWER(a.title) = 'notfound' LIMIT 1),
                   'No students found'
               );
        RETURN;
    END IF;

    RETURN QUERY
    SELECT DISTINCT ON (s.std_id)
           s.std_id            AS id,
           p.p_name::TEXT      AS student_name,
           CASE WHEN s.image ~* '^https?://' THEN s.image::TEXT ELSE NULL END AS image,
           (s.image !~* '^https?://')        AS is_default,
           NULL::TEXT          AS result
      FROM student s
      JOIN student_class sc ON sc.std_id = s.std_id
      JOIN people p         ON p.p_id    = s.p_id
     WHERE sc.cl_id  = p_cls
       AND sc.a_y_id = p_academic
       AND sc.b_id   = p_batch
       AND s.state   = 'Active'
     ORDER BY s.std_id;
END;
$function$;


/* ====== 10) vw_student_state — StudentStateTab grid (Inactive students) ====== */

CREATE OR REPLACE FUNCTION public.vw_student_state(p_branch integer)
 RETURNS TABLE(result text, id integer, student text, state text, reg_date date, username text)
 LANGUAGE plpgsql
AS $function$
DECLARE
    v_branch_name TEXT;
    v_count       BIGINT := 0;
    v_branch_all  BOOLEAN;
BEGIN
    SELECT b.br_name INTO v_branch_name FROM branch b WHERE b.br_id = p_branch;
    v_branch_all := (v_branch_name = 'All');

    -- Tirinta hal mar ah (la wadaago labada branch).
    IF v_branch_all THEN
        SELECT COUNT(DISTINCT s.std_id) INTO v_count
          FROM student s
          JOIN student_class sc ON sc.std_id = s.std_id
          JOIN user_branch   ub ON ub.u_br_id = s.u_br_id
         WHERE sc.state = 'Continue' AND s.state = 'Inactive';
    ELSE
        SELECT COUNT(DISTINCT s.std_id) INTO v_count
          FROM student s
          JOIN student_class sc ON sc.std_id = s.std_id
          JOIN user_branch   ub ON ub.u_br_id = s.u_br_id
          JOIN class         cl ON cl.cl_id   = sc.cl_id
         WHERE ub.br_id = p_branch
           AND sc.state = 'Continue'
           AND s.state  = 'Inactive';
    END IF;

    IF v_count = 0 THEN
        RETURN QUERY
        SELECT COALESCE(
                   (SELECT a.body::TEXT FROM alerts a WHERE LOWER(a.title) = 'notfound' LIMIT 1),
                   'Not found'
               ),
               NULL::INT, NULL::TEXT, NULL::TEXT, NULL::DATE, NULL::TEXT;
        RETURN;
    END IF;

    -- Soo celi rows-ka (filtered by branch unless 'All').
    RETURN QUERY
    SELECT DISTINCT ON (s.std_id)
           NULL::TEXT          AS result,
           s.std_id            AS id,
           p.p_name::TEXT      AS student,
           s.state::TEXT       AS state,
           s.reg_date::DATE    AS reg_date,
           u.username::TEXT    AS username
      FROM student s
      JOIN student_class sc ON sc.std_id = s.std_id
      JOIN user_branch   ub ON ub.u_br_id = s.u_br_id
      JOIN users         u  ON u.usr_id   = ub.usr_id
      LEFT JOIN people   p  ON p.p_id     = s.p_id
     WHERE sc.state = 'Continue'
       AND s.state  = 'Inactive'
       AND (v_branch_all OR ub.br_id = p_branch)
     ORDER BY s.std_id DESC;
END;
$function$;


/* ====== 11) vw_studentclass_info — StudentInfoTab right pane ====== */

CREATE OR REPLACE FUNCTION public.vw_studentclass_info(p_id integer)
 RETURNS TABLE(
    result text, id integer, student text, class text,
    academic_name text, state text,
    charges bigint, attendances bigint, results bigint, reg_date date)
 LANGUAGE plpgsql
AS $function$
#variable_conflict use_column
DECLARE
    v_count BIGINT;
BEGIN
    SELECT COUNT(*) INTO v_count FROM student_class sc WHERE sc.std_id = p_id;

    IF v_count = 0 THEN
        RETURN QUERY
        SELECT COALESCE(
                   (SELECT a.body::TEXT FROM alerts a WHERE LOWER(a.title) = 'notfound' LIMIT 1),
                   'Not found'
               ),
               NULL::INT, NULL::TEXT, NULL::TEXT, NULL::TEXT, NULL::TEXT,
               NULL::BIGINT, NULL::BIGINT, NULL::BIGINT, NULL::DATE;
        RETURN;
    END IF;

    RETURN QUERY
    WITH sc AS (
        SELECT std_cl_id, std_id, cl_id, a_y_id, state, reg_date
          FROM student_class
         WHERE std_id = p_id
    ),
    cc AS (
        SELECT std_cl_id, COUNT(*) AS cnt
          FROM charge
         WHERE std_cl_id IN (SELECT std_cl_id FROM sc)
         GROUP BY std_cl_id
    ),
    ac AS (
        SELECT std_cl_id, COUNT(*) AS cnt
          FROM student_attendance
         WHERE std_cl_id IN (SELECT std_cl_id FROM sc)
         GROUP BY std_cl_id
    ),
    rc AS (
        SELECT std_cl_id, COUNT(*) AS cnt
          FROM result
         WHERE std_cl_id IN (SELECT std_cl_id FROM sc)
         GROUP BY std_cl_id
    )
    SELECT NULL::TEXT             AS result,
           sc.std_cl_id           AS id,
           p.p_name::TEXT         AS student,
           cl.class::TEXT         AS class,
           ay.academic_name::TEXT AS academic_name,
           sc.state::TEXT         AS state,
           COALESCE(cc.cnt, 0)    AS charges,
           COALESCE(ac.cnt, 0)    AS attendances,
           COALESCE(rc.cnt, 0)    AS results,
           sc.reg_date::DATE      AS reg_date
      FROM sc
      JOIN student       s  ON s.std_id  = sc.std_id
      JOIN people        p  ON p.p_id    = s.p_id
      JOIN class         cl ON cl.cl_id  = sc.cl_id
      JOIN academic_year ay ON ay.a_y_id = sc.a_y_id
      LEFT JOIN cc ON cc.std_cl_id = sc.std_cl_id
      LEFT JOIN ac ON ac.std_cl_id = sc.std_cl_id
      LEFT JOIN rc ON rc.std_cl_id = sc.std_cl_id
     ORDER BY sc.std_cl_id;
END;
$function$;


/* ====== 12) studentinfo_show — StudentInfoTab paginated grid ====== */

CREATE OR REPLACE FUNCTION public.studentinfo_show(
    p_std_id    integer DEFAULT 0,
    p_search    text    DEFAULT ''::text,
    p_limit     integer DEFAULT 10,
    p_offset    integer DEFAULT 0,
    p_branch_id integer DEFAULT 0)
 RETURNS TABLE(
    std_id integer, student_name character varying, emis_id character varying,
    id_card character varying, tel character varying, sex character varying,
    dob date, mothername character varying, mother_phone character varying,
    state character varying, total_count bigint)
 LANGUAGE plpgsql
AS $function$
DECLARE
    v_branch_name TEXT;
    v_pattern     TEXT;
    v_has_search  BOOLEAN;
    v_branch_all  BOOLEAN;
BEGIN
    SELECT b.br_name INTO v_branch_name FROM branch b WHERE b.br_id = p_branch_id;
    v_pattern    := '%' || COALESCE(p_search, '') || '%';
    v_has_search := COALESCE(p_search,'') <> '';
    v_branch_all := (p_branch_id = 0 OR v_branch_name = 'All');

    -- Single-row by id (search/limit/branch ignored).
    IF p_std_id > 0 THEN
        RETURN QUERY
        SELECT s.std_id,
               p.p_name AS student_name,
               s.emis_id, s.id_card, p.tel, p.sex, s.dob,
               s.mothername, s.mother_phone, p.state,
               1::bigint AS total_count
          FROM student s
          JOIN people p ON p.p_id = s.p_id
         WHERE s.std_id = p_std_id;
        RETURN;
    END IF;

    -- Paginated list with optional branch + search; total_count via window.
    RETURN QUERY
    SELECT s.std_id,
           p.p_name AS student_name,
           s.emis_id, s.id_card, p.tel, p.sex, s.dob,
           s.mothername, s.mother_phone, p.state,
           COUNT(*) OVER () AS total_count
      FROM student s
      JOIN people      p  ON p.p_id    = s.p_id
      JOIN user_branch ub ON ub.u_br_id = s.u_br_id
     WHERE (v_branch_all OR ub.br_id = p_branch_id)
       AND (NOT v_has_search
            OR p.p_name      ILIKE v_pattern
            OR s.emis_id     ILIKE v_pattern
            OR s.id_card     ILIKE v_pattern
            OR p.tel         ILIKE v_pattern
            OR s.mother_phone ILIKE v_pattern)
     ORDER BY p.p_name
     LIMIT  p_limit
     OFFSET p_offset;
END;
$function$;


/* ====== 13) studentinfo_duplicates_show — duplicates listing ====== */

CREATE OR REPLACE FUNCTION public.studentinfo_duplicates_show()
 RETURNS TABLE(
    std_id integer, student_name character varying, emis_id character varying,
    id_card character varying, tel character varying, sex character varying,
    dup_count bigint)
 LANGUAGE plpgsql
AS $function$
BEGIN
    RETURN QUERY
    SELECT s.std_id,
           p.p_name AS student_name,
           s.emis_id, s.id_card, p.tel, p.sex,
           COUNT(*) OVER (PARTITION BY p.p_name) AS dup_count
      FROM student s
      JOIN people p ON p.p_id = s.p_id
     WHERE p.p_name IN (
           SELECT p2.p_name
             FROM student s2
             JOIN people p2 ON p2.p_id = s2.p_id
             GROUP BY p2.p_name
            HAVING COUNT(*) > 1
       )
     ORDER BY p.p_name;
END;
$function$;


/* ====== 14) update_all_responsibles_one_class — bulk responsible listing ====== */

CREATE OR REPLACE FUNCTION public.update_all_responsibles_one_class(
    p_class    integer,
    p_branch   integer,
    p_academic integer)
 RETURNS TABLE(id integer, name text, phone_one text, phone_two text, result text)
 LANGUAGE plpgsql
AS $function$
DECLARE
    v_count INT := 0;
BEGIN
    SELECT COUNT(sc.std_cl_id) INTO v_count
      FROM student s
      JOIN student_class sc ON sc.std_id = s.std_id
      JOIN class         cl ON cl.cl_id   = sc.cl_id
     WHERE s.state    = 'Active'
       AND cl.br_id   = p_branch
       AND cl.cl_id   = p_class
       AND sc.a_y_id  = p_academic;

    IF v_count = 0 THEN
        RETURN QUERY
        SELECT NULL::INTEGER, NULL::TEXT, NULL::TEXT, NULL::TEXT,
               COALESCE(
                   (SELECT a.body::TEXT FROM alerts a WHERE LOWER(a.title) = 'notfound' LIMIT 1),
                   'No data found'
               );
        RETURN;
    END IF;

    RETURN QUERY
    SELECT DISTINCT ON (r.res_id)
           r.res_id            AS id,
           p.p_name::TEXT      AS name,
           p.tel::TEXT         AS phone_one,
           r.phone::TEXT       AS phone_two,
           NULL::TEXT          AS result
      FROM student s
      JOIN student_class sc ON sc.std_id = s.std_id
      JOIN class         cl ON cl.cl_id   = sc.cl_id
      JOIN responsible   r  ON r.res_id   = s.res_id
      JOIN people        p  ON p.p_id     = r.p_id
     WHERE s.state    = 'Active'
       AND cl.br_id   = p_branch
       AND cl.cl_id   = p_class
       AND sc.a_y_id  = p_academic
     ORDER BY r.res_id;
END;
$function$;


/* ====== 15) update_emis_idcardlist — bulk EMIS listing ====== */

CREATE OR REPLACE FUNCTION public.update_emis_idcardlist(
    p_class    integer,
    p_branch   integer,
    p_academic integer)
 RETURNS TABLE(id integer, id_card text, student_name text, result text)
 LANGUAGE plpgsql
AS $function$
DECLARE
    v_count INT := 0;
BEGIN
    SELECT COUNT(sc.std_cl_id) INTO v_count
      FROM student s
      JOIN student_class sc ON sc.std_id = s.std_id
      JOIN class         cl ON cl.cl_id   = sc.cl_id
     WHERE s.state    = 'Active'
       AND cl.br_id   = p_branch
       AND cl.cl_id   = p_class
       AND sc.a_y_id  = p_academic;

    IF v_count = 0 THEN
        RETURN QUERY
        SELECT NULL::INTEGER, NULL::TEXT, NULL::TEXT,
               COALESCE(
                   (SELECT a.body::TEXT FROM alerts a WHERE LOWER(a.title) = 'notfound' LIMIT 1),
                   'No data found'
               );
        RETURN;
    END IF;

    RETURN QUERY
    SELECT DISTINCT ON (s.std_id)
           s.std_id                         AS id,
           COALESCE(s.id_card, '')::TEXT    AS id_card,
           p.p_name::TEXT                   AS student_name,
           NULL::TEXT                       AS result
      FROM student s
      JOIN student_class sc ON sc.std_id = s.std_id
      JOIN class         cl ON cl.cl_id   = sc.cl_id
      JOIN people        p  ON p.p_id     = s.p_id
     WHERE s.state    = 'Active'
       AND cl.br_id   = p_branch
       AND cl.cl_id   = p_class
       AND sc.a_y_id  = p_academic
     ORDER BY s.std_id;
END;
$function$;


/* ====== 16) responsible_options_show — Select2 source ====== */

CREATE OR REPLACE FUNCTION public.responsible_options_show(
    p_search    text    DEFAULT ''::text,
    p_limit     integer DEFAULT 25,
    p_offset    integer DEFAULT 0,
    p_branch_id integer DEFAULT 0)
 RETURNS TABLE(res_id integer, p_name character varying)
 LANGUAGE plpgsql
AS $function$
DECLARE
    v_branch_name TEXT;
    v_pattern     TEXT;
BEGIN
    SELECT b.br_name INTO v_branch_name FROM branch b WHERE b.br_id = p_branch_id;
    v_pattern := '%' || COALESCE(p_search, '') || '%';

    IF p_branch_id = 0 OR v_branch_name = 'All' THEN
        RETURN QUERY
        SELECT r.res_id, p.p_name
          FROM responsible r
          JOIN people p ON p.p_id = r.p_id
         WHERE (COALESCE(p_search,'') = '' OR p.p_name ILIKE v_pattern)
         ORDER BY p.p_name
         LIMIT  p_limit
         OFFSET p_offset;
    ELSE
        RETURN QUERY
        SELECT DISTINCT r.res_id, p.p_name
          FROM responsible    r
          JOIN people         p  ON p.p_id    = r.p_id
          JOIN user_branch    ub ON ub.u_br_id = r.u_br_id
         WHERE ub.br_id = p_branch_id
           AND (COALESCE(p_search,'') = '' OR p.p_name ILIKE v_pattern)
         ORDER BY p.p_name
         LIMIT  p_limit
         OFFSET p_offset;
    END IF;
END;
$function$;


/* ====== 17) all_student_options_show — Active+Continue students only ====== */

CREATE OR REPLACE FUNCTION public.all_student_options_show(
    p_search    text    DEFAULT ''::text,
    p_limit     integer DEFAULT 25,
    p_offset    integer DEFAULT 0,
    p_branch_id integer DEFAULT 0)
 RETURNS TABLE(std_id integer, p_name character varying)
 LANGUAGE plpgsql
AS $function$
DECLARE
    v_branch_name TEXT;
    v_pattern     TEXT;
    v_branch_all  BOOLEAN;
BEGIN
    SELECT b.br_name INTO v_branch_name FROM branch b WHERE b.br_id = p_branch_id;
    v_pattern    := '%' || COALESCE(p_search, '') || '%';
    v_branch_all := (p_branch_id = 0 OR v_branch_name = 'All');

    RETURN QUERY
    SELECT DISTINCT s.std_id, p.p_name
      FROM student s
      JOIN people        p  ON p.p_id    = s.p_id
      JOIN student_class sc ON sc.std_id = s.std_id
      LEFT JOIN user_branch ub ON ub.u_br_id = s.u_br_id
     WHERE s.state  = 'Active'
       AND sc.state = 'Continue'
       AND (v_branch_all OR ub.br_id = p_branch_id)
       AND (COALESCE(p_search,'') = '' OR p.p_name ILIKE v_pattern)
     ORDER BY p.p_name
     LIMIT  p_limit
     OFFSET p_offset;
END;
$function$;


/* ====== 18) all_students_options_show — every student (including inactive) ====== */

CREATE OR REPLACE FUNCTION public.all_students_options_show(
    p_search    text    DEFAULT ''::text,
    p_limit     integer DEFAULT 25,
    p_offset    integer DEFAULT 0,
    p_branch_id integer DEFAULT 0)
 RETURNS TABLE(std_id integer, p_name character varying)
 LANGUAGE plpgsql
AS $function$
DECLARE
    v_branch_name TEXT;
    v_pattern     TEXT;
    v_branch_all  BOOLEAN;
BEGIN
    SELECT b.br_name INTO v_branch_name FROM branch b WHERE b.br_id = p_branch_id;
    v_pattern    := '%' || COALESCE(p_search, '') || '%';
    v_branch_all := (p_branch_id = 0 OR v_branch_name = 'All');

    RETURN QUERY
    SELECT s.std_id, p.p_name
      FROM student s
      JOIN people p ON p.p_id = s.p_id
      LEFT JOIN user_branch ub ON ub.u_br_id = s.u_br_id
     WHERE (v_branch_all OR ub.br_id = p_branch_id)
       AND (COALESCE(p_search,'') = '' OR p.p_name ILIKE v_pattern)
     ORDER BY p.p_name
     LIMIT  p_limit
     OFFSET p_offset;
END;
$function$;


/* ====== 19) vw_all_classes — class_options dropdown source ====== */

CREATE OR REPLACE FUNCTION public.vw_all_classes(
    p_search    text    DEFAULT ''::text,
    p_limit     integer DEFAULT 25,
    p_offset    integer DEFAULT 0,
    p_branch_id integer DEFAULT 0)
 RETURNS TABLE(cl_id integer, class character varying)
 LANGUAGE plpgsql
AS $function$
DECLARE
    v_branch_name TEXT;
    v_pattern     TEXT;
BEGIN
    SELECT b.br_name INTO v_branch_name FROM branch b WHERE b.br_id = p_branch_id;
    v_pattern := '%' || COALESCE(p_search, '') || '%';

    IF p_branch_id = 0 OR v_branch_name = 'All' THEN
        RETURN QUERY
        SELECT cl.cl_id,
               (cl.class || '  -  ' || br.br_name)::character varying AS class
          FROM class cl
          JOIN branch br ON br.br_id  = cl.br_id
          JOIN levels l  ON l.lev_id  = cl.lev_id
         WHERE (COALESCE(p_search,'') = ''
                OR cl.class    ILIKE v_pattern
                OR br.br_name  ILIKE v_pattern)
         ORDER BY cl.gr_id DESC, cl.class ASC
         LIMIT  p_limit
         OFFSET p_offset;
    ELSE
        RETURN QUERY
        SELECT cl.cl_id, cl.class
          FROM class cl
          JOIN levels l ON l.lev_id = cl.lev_id
         WHERE cl.br_id = p_branch_id
           AND (COALESCE(p_search,'') = '' OR cl.class ILIKE v_pattern)
         ORDER BY cl.gr_id DESC, cl.class ASC
         LIMIT  p_limit
         OFFSET p_offset;
    END IF;
END;
$function$;


/* ====== 20) vw_batch_by_class — batches available for one class ====== */

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


/* ====== 21) vw_bus — branch buses (raw; bus_options layer prepends 'None') ====== */

CREATE OR REPLACE FUNCTION public.vw_bus(p_branch integer)
 RETURNS TABLE(
    result text, id integer, bus_name text, driver_name text,
    phone text, plot_no text, reg_date timestamp without time zone,
    username text)
 LANGUAGE plpgsql
AS $function$
DECLARE
    v_branch_name TEXT;
    v_count       BIGINT := 0;
    v_branch_all  BOOLEAN;
BEGIN
    SELECT b.br_name INTO v_branch_name FROM branch b WHERE b.br_id = p_branch;
    v_branch_all := (v_branch_name = 'All');

    IF v_branch_all THEN
        SELECT COUNT(b.bus_id) INTO v_count
          FROM bus b
          JOIN user_branch ub ON b.u_br_id = ub.u_br_id
          JOIN users       u  ON u.usr_id  = ub.usr_id;
    ELSE
        SELECT COUNT(b.bus_id) INTO v_count
          FROM bus b
          JOIN user_branch ub ON b.u_br_id = ub.u_br_id
          JOIN users       u  ON u.usr_id  = ub.usr_id
         WHERE ub.br_id = p_branch;
    END IF;

    IF v_count = 0 THEN
        RETURN QUERY
        SELECT COALESCE(
                   (SELECT a.body::TEXT FROM alerts a WHERE LOWER(a.title) = 'notfound' LIMIT 1),
                   'Not found'
               ),
               NULL::INT, NULL::TEXT, NULL::TEXT, NULL::TEXT, NULL::TEXT, NULL::TIMESTAMP, NULL::TEXT;
        RETURN;
    END IF;

    RETURN QUERY
    SELECT NULL::TEXT             AS result,
           b.bus_id               AS id,
           b.bus_name::TEXT       AS bus_name,
           p.p_name::TEXT         AS driver_name,
           p.tel::TEXT            AS phone,
           b.targo::TEXT          AS plot_no,
           b.reg_date             AS reg_date,
           u.username::TEXT       AS username
      FROM bus b
      JOIN user_branch ub ON b.u_br_id = ub.u_br_id
      JOIN users       u  ON u.usr_id  = ub.usr_id
      LEFT JOIN employee e ON e.emp_id = b.emp_id
      LEFT JOIN people   p ON p.p_id   = e.p_id
     WHERE (v_branch_all OR ub.br_id = p_branch)
     ORDER BY b.bus_id;
END;
$function$;


/* ====== 22) vw_std_admin_all — std_admin_all_options source for StudentInfoTab ====== */

CREATE OR REPLACE FUNCTION public.vw_std_admin_all(p_branch integer)
 RETURNS TABLE(std_id integer, name text)
 LANGUAGE plpgsql
AS $function$
DECLARE
    v_branch_name TEXT;
    v_branch_all  BOOLEAN;
BEGIN
    SELECT b.br_name INTO v_branch_name FROM branch b WHERE b.br_id = p_branch;
    v_branch_all := (v_branch_name = 'All');

    RETURN QUERY
    SELECT s.std_id,
           CONCAT_WS('  -  ', s.std_id::TEXT, p.p_name, p.tel)::TEXT AS name
      FROM student s
      JOIN people        p  ON p.p_id    = s.p_id
      JOIN student_class sc ON sc.std_id = s.std_id
      JOIN class         cl ON cl.cl_id  = sc.cl_id
     WHERE s.state = 'Active'
       AND sc.state IN ('Continue', 'Graduated')
       AND (v_branch_all OR cl.br_id = p_branch)
     GROUP BY s.std_id, p.p_name, p.tel
     ORDER BY s.std_id;
END;
$function$;
