/**
 * student-master-sp-clean-2026-04-29.sql
 *
 * Re-arrange `public.student_master_sp` according to the new requirements:
 *
 *   • Remove parameters that the form no longer sends:
 *       email_sp, b_id_sp, bar_bilaw_sp, into_xidisanyahay_sp, fee_sp, food_sp.
 *     The function fills these with sensible defaults internally
 *       (email='', b_id=1, bar_bilaw='No', into_xidisanyahay='No', fee=0, food=0).
 *
 *   • Replace `std_ty_f_id_sp` with `t_f_id_sp` — the form picks a row from
 *     `type_fee` (Type Fee select). The SP looks up an active `student_type_fee`
 *     row that matches `t_f_id_sp` and stores its `st_ty_id` in `student_class`.
 *     If no row matches, falls back to `st_ty_id = 1`.
 *
 *   • When `en_ty_id_sp = 1` (New Student) the form hides Transferred School;
 *     SP forces `student.transfer_school = 'N/A'`. Otherwise it stores the
 *     value the user typed (or 'N/A' if blank).
 *
 *   • When `t_f_id_sp = 1` (regular student) the form hides Description; SP
 *     forces `student_class.free_description = 'None'`. Otherwise it stores
 *     the value the user picked (Sabool / Ilma Shaqaale / Maxmuul / Kaalin).
 *
 *   • `bus_fee_sp` is hidden in the form when `bus_id_sp = 1`; SP just
 *     stores whatever the form sends (0 in that case).
 *
 *   • Insert / update / delete logic preserved (alerts, charge insert when
 *     register_fee > 0, latest student_class targeting on update).
 */

-- Drop the previous 42-arg signature.
DROP FUNCTION IF EXISTS public.student_master_sp(
    integer, character varying, character varying, character varying,
    character varying, integer, character varying, character varying,
    character varying, character varying, integer, integer,
    character varying, character varying, character varying, date,
    integer, character varying, character varying, character varying,
    character varying, character varying, character varying, numeric,
    integer, integer, integer, integer, numeric, numeric, numeric,
    numeric, integer, numeric, integer, character varying, character varying,
    character varying, character varying, character varying, date, character varying);

CREATE OR REPLACE FUNCTION public.student_master_sp(
    std_id_sp integer,
    p_name_sp character varying,
    tel_sp character varying,
    sex_sp character varying,
    ad_id_sp integer,
    p_type_sp character varying,
    state_p_sp character varying,
    emis_id_sp character varying,
    id_card_sp character varying,
    res_id_sp integer,
    r_r_id_sp integer,
    mothername_sp character varying,
    mother_phone_sp character varying,
    pob_sp character varying,
    dob_sp date,
    en_ty_id_sp integer,
    transfer_school_sp character varying,
    std_state_sp character varying,
    image_sp character varying,
    orphan_status_sp character varying,
    disability_status_sp character varying,
    refugee_sp character varying,
    register_fee_sp numeric,
    u_br_id_sp integer,
    cl_id_sp integer,
    a_y_id_sp integer,
    academic_fee_sp numeric,
    discount_sp numeric,
    bus_id_sp integer,
    bus_fee_sp numeric,
    t_f_id_sp integer,
    free_description_sp character varying,
    resident_type_sp character varying,
    sc_state_sp character varying,
    reg_date_sp date,
    oper character varying)
 RETURNS character varying
 LANGUAGE plpgsql
AS $function$
DECLARE
    msg                       VARCHAR;
    new_p_id                  INT;
    new_std_id                INT;
    new_std_cl_id             INT;
    new_st_ty_id              INT;
    use_reg_ts                timestamp without time zone;
    resolved_transfer_school  VARCHAR;
    resolved_free_description VARCHAR;
BEGIN

    -- 1) Default reg-date → now() haddii la siiyo NULL.
    use_reg_ts := COALESCE(reg_date_sp::timestamp, now());

    -- 2) Map t_f_id → student_type_fee.st_ty_id (xulo Active-ka ugu yar discount-ka).
    SELECT stf.st_ty_id INTO new_st_ty_id
      FROM student_type_fee stf
     WHERE stf.t_f_id = t_f_id_sp
       AND lower(stf.state) = 'active'
     ORDER BY stf.discount ASC, stf.st_ty_id ASC
     LIMIT 1;
    IF new_st_ty_id IS NULL THEN
        SELECT stf.st_ty_id INTO new_st_ty_id
          FROM student_type_fee stf
         WHERE stf.t_f_id = t_f_id_sp
         ORDER BY stf.st_ty_id ASC
         LIMIT 1;
    END IF;
    IF new_st_ty_id IS NULL THEN
        new_st_ty_id := 1;
    END IF;

    -- 3) Conditional defaults driven by en_ty_id / t_f_id.
    IF en_ty_id_sp = 1 THEN
        resolved_transfer_school := 'N/A';
    ELSE
        resolved_transfer_school := COALESCE(NULLIF(transfer_school_sp, ''), 'N/A');
    END IF;

    IF t_f_id_sp = 1 THEN
        resolved_free_description := 'None';
    ELSE
        resolved_free_description := COALESCE(NULLIF(free_description_sp, ''), 'None');
    END IF;

    /* =================== INSERT =================== */
    IF oper = 'insert' THEN

        -- Duplicate guard: ignore sentinel placeholder values ('' and '0' = "no EMIS / no ID card yet").
        IF EXISTS (
            SELECT 1 FROM student
             WHERE (emis_id_sp IS NOT NULL AND emis_id_sp NOT IN ('', '0') AND emis_id = emis_id_sp)
                OR (id_card_sp IS NOT NULL AND id_card_sp NOT IN ('', '0') AND id_card = id_card_sp)
        ) THEN
            SELECT body INTO msg FROM alerts WHERE title = 'AlreadyInsert';
            RETURN COALESCE(msg, 'AlreadyInsert');
        END IF;

        -- People: dib u isticmaal haddii uu jiro magac+tel isku mid; haddii kale insert.
        IF EXISTS (
            SELECT 1 FROM people
             WHERE lower(p_name) = lower(p_name_sp) AND tel = tel_sp
        ) THEN
            SELECT p_id INTO new_p_id FROM people
             WHERE lower(p_name) = lower(p_name_sp) AND tel = tel_sp
             ORDER BY p_id DESC LIMIT 1;
        ELSE
            INSERT INTO people(p_name, tel, sex, email, ad_id, state, p_type, reg_date, u_br_id)
            VALUES (
                p_name_sp,
                tel_sp,
                sex_sp,
                '',                                                 -- email default
                ad_id_sp,
                COALESCE(NULLIF(state_p_sp,''), 'Active'),
                COALESCE(NULLIF(p_type_sp,''),  'Student'),
                use_reg_ts,
                u_br_id_sp
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
            1,                                                       -- b_id default
            0,                                                       -- fee default
            0,                                                       -- food default
            COALESCE(academic_fee_sp, 0), COALESCE(discount_sp, 0),
            bus_id_sp, COALESCE(bus_fee_sp, 0),
            new_st_ty_id,
            resolved_free_description,
            COALESCE(NULLIF(resident_type_sp,''), 'Day'),
            'No',                                                    -- bar_bilaw default
            'No',                                                    -- into_xidisanyahay default
            COALESCE(NULLIF(sc_state_sp,''), 'Continue'),
            u_br_id_sp, use_reg_ts
        ) RETURNING std_cl_id INTO new_std_cl_id;

        IF COALESCE(register_fee_sp, 0) > 0 THEN
            INSERT INTO charge(std_cl_id, amount, discount, reason, state, reg_date, u_br_id)
            VALUES (new_std_cl_id, register_fee_sp, 0, 'Registration fee', 'Pending', use_reg_ts, u_br_id_sp);
        END IF;

        SELECT body INTO msg FROM alerts WHERE title = 'Insert';
        RETURN COALESCE(msg, 'Insert');

    /* =================== UPDATE =================== */
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
           SET emis_id = emis_id_sp,
               id_card = id_card_sp,
               res_id = res_id_sp,
               r_r_id = r_r_id_sp,
               mothername = mothername_sp,
               mother_phone = mother_phone_sp,
               pob = pob_sp,
               dob = dob_sp,
               en_ty_id = en_ty_id_sp,
               transfer_school = resolved_transfer_school,
               image = COALESCE(image_sp, ''),
               orphan_status = orphan_status_sp,
               disability_status = disability_status_sp,
               refugee = refugee_sp,
               register_fee = register_fee_sp
         WHERE std_id = std_id_sp;

        UPDATE student_class
           SET cl_id = cl_id_sp,
               a_y_id = a_y_id_sp,
               -- b_id, fee, food, bar_bilaw, into_xidisanyahay: keep existing values
               academic_fee = COALESCE(academic_fee_sp, 0),
               discount = COALESCE(discount_sp, 0),
               bus_id = bus_id_sp,
               bus_fee = COALESCE(bus_fee_sp, 0),
               st_ty_id = new_st_ty_id,
               free_description = resolved_free_description,
               resident_type = COALESCE(NULLIF(resident_type_sp,''), 'Day'),
               u_br_id = u_br_id_sp
         WHERE std_cl_id = (
            SELECT std_cl_id FROM student_class
             WHERE std_id = std_id_sp
             ORDER BY std_cl_id DESC LIMIT 1
         );

        SELECT body INTO msg FROM alerts WHERE title = 'Update';
        RETURN COALESCE(msg, 'Update');

    /* =================== DELETE =================== */
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
