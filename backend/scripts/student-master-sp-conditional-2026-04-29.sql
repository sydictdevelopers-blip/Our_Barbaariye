/**
 * student-master-sp-conditional-2026-04-29.sql
 *
 * Sentinel rows + SP rebuild ku habboon shuruuda cusub:
 *
 *   1) Ku dar 'Transfer' enroll_type-ka (haddii uusan jirin) si form-ku u
 *      muujiyo Transferred School marka uu yahay Transfer.
 *
 *   2) Ku dar 'None' bus-ka (haddii uusan jirin) — emp_id=1 oo dabiici ah,
 *      u_br_id=1, si uu u helo FK-ka. Bus-kan ayaa ku jira dropdown-ka
 *      Bus-ka. Marka 'None' la doorto, Bus Fee-gu wuu qarsoonyahay.
 *
 *   3) student_master_sp dib u dhis:
 *        - Halbeegga `std_ty_f_id_sp` (st_ty_id ee student_type_fee) ayaa
 *          la rogay (legacy-ku sidaas u shaqeyn jiray; dropdown-ku waa
 *          student_type_fee_options).
 *        - Conditional defaults oo runtime-lookup ah:
 *            • en_ty_id_sp != Transfer  → transfer_school = '0'
 *            • std_ty_f_id_sp != Free   → free_description = 'None'
 *            • bus_id_sp = None bus     → bus_fee = 0
 *        - Ka saari halbeegyada frontend-ka aanan diritaan: email_sp,
 *          b_id_sp, bar_bilaw_sp, into_xidisanyahay_sp, fee_sp, food_sp.
 *          SP-gu wuxuu si gudaha ah u buuxiyaa ('' / 1 / 'No' / 'No' / 0 / 0).
 */

-- 1) Sentinel rows -------------------------------------------------------

INSERT INTO enroll_type(type)
SELECT 'Transfer'
 WHERE NOT EXISTS (SELECT 1 FROM enroll_type WHERE lower(type) = 'transfer');

INSERT INTO bus(bus_name, emp_id, targo, u_br_id, reg_date)
SELECT 'None', 1, '', 1, now()
 WHERE NOT EXISTS (SELECT 1 FROM bus WHERE lower(bus_name) = 'none');

-- 2) Drop the previous 36-arg signature (clean-2026-04-29 revision).
DROP FUNCTION IF EXISTS public.student_master_sp(
    integer, character varying, character varying, character varying,
    integer, character varying, character varying, character varying,
    character varying, integer, integer, character varying, character varying,
    character varying, date, integer, character varying, character varying,
    character varying, character varying, character varying, character varying,
    numeric, integer, integer, integer, numeric, numeric, integer, numeric,
    integer, character varying, character varying, character varying, date,
    character varying);

-- 3) Recreate with std_ty_f_id_sp + conditional defaults (36 args + oper).

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
    std_ty_f_id_sp integer,
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
    use_reg_ts                timestamp without time zone;
    transfer_en_ty_id         INT;
    free_st_ty_id             INT;
    none_bus_id               INT;
    resolved_transfer_school  VARCHAR;
    resolved_free_description VARCHAR;
    resolved_bus_fee          NUMERIC;
BEGIN

    use_reg_ts := COALESCE(reg_date_sp::timestamp, now());

    -- Lookup sentinel ids once.
    SELECT en_ty_id INTO transfer_en_ty_id
      FROM enroll_type WHERE lower(type) = 'transfer' LIMIT 1;
    SELECT st_ty_id INTO free_st_ty_id
      FROM student_type_fee WHERE lower(type_fee) = 'free' LIMIT 1;
    SELECT bus_id INTO none_bus_id
      FROM bus WHERE lower(bus_name) = 'none' LIMIT 1;

    -- Conditional defaults (ka qaado in user-ku doorto Transfer/Free/None).
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

    /* =================== INSERT =================== */
    IF oper = 'insert' THEN

        -- Duplicate guard: ignore '' and '0' sentinels for emis_id / id_card.
        IF EXISTS (
            SELECT 1 FROM student
             WHERE (emis_id_sp IS NOT NULL AND emis_id_sp NOT IN ('', '0') AND emis_id = emis_id_sp)
                OR (id_card_sp IS NOT NULL AND id_card_sp NOT IN ('', '0') AND id_card = id_card_sp)
        ) THEN
            SELECT body INTO msg FROM alerts WHERE title = 'AlreadyInsert';
            RETURN COALESCE(msg, 'AlreadyInsert');
        END IF;

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
                '',
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
            1,                                                   -- b_id default
            0,                                                   -- fee default
            0,                                                   -- food default
            COALESCE(academic_fee_sp, 0), COALESCE(discount_sp, 0),
            bus_id_sp, resolved_bus_fee,
            std_ty_f_id_sp,
            resolved_free_description,
            COALESCE(NULLIF(resident_type_sp,''), 'Day'),
            'No',                                                -- bar_bilaw default
            'No',                                                -- into_xidisanyahay default
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
               academic_fee = COALESCE(academic_fee_sp, 0),
               discount = COALESCE(discount_sp, 0),
               bus_id = bus_id_sp,
               bus_fee = resolved_bus_fee,
               st_ty_id = std_ty_f_id_sp,
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
