-- ═══════════════════════════════════════════════════════════════════
-- USERS_SP v2 — writes password_hash, no longer touches plaintext password
-- ═══════════════════════════════════════════════════════════════════
-- Important: password_sp is expected to be a *bcrypt hash* (the Node side
-- hashes any caller-supplied plaintext before invoking this SP). On UPDATE,
-- empty password_sp means "leave hash unchanged".
-- ═══════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.users_sp(
    usr_id_sp     VARCHAR,
    p_id_sp       VARCHAR,
    username_sp   VARCHAR,
    password_sp   VARCHAR,
    br_id_sp      VARCHAR,
    state_sp      VARCHAR,
    lock_user_sp  VARCHAR,
    oper          VARCHAR
)
RETURNS VARCHAR
LANGUAGE plpgsql
AS $function$
DECLARE
    msg             VARCHAR;
    new_usr_id      INTEGER;
    v_usr_id        INTEGER := NULLIF(usr_id_sp, '')::INTEGER;
    v_p_id          INTEGER := NULLIF(p_id_sp, '')::INTEGER;
    v_br_id         INTEGER := NULLIF(br_id_sp, '')::INTEGER;
    v_otp           VARCHAR := '';
    v_authkey       VARCHAR := '';
    v_expired_date  DATE    := CURRENT_DATE;
BEGIN

    /* ====================== INSERT ====================== */
    IF oper = 'insert' THEN
        IF EXISTS (
            SELECT 1 FROM users
            WHERE lower(username) = lower(username_sp)
              AND p_id = v_p_id
        ) THEN
            SELECT body INTO msg FROM alerts WHERE title = 'AlreadyInsert';
        ELSE
            INSERT INTO users (
                usr_id, p_id, username, password_hash,
                otp, authkey, lock_user, state,
                expired_date, reg_date
            ) VALUES (
                DEFAULT, v_p_id, username_sp, password_sp,
                v_otp, v_authkey,
                'Unlocked', 'Active',
                v_expired_date, now()
            )
            RETURNING usr_id INTO new_usr_id;

            INSERT INTO user_branch (
                u_br_id, usr_id, br_id,
                lock_user, state, user_type, reg_date, privalage
            ) VALUES (
                DEFAULT, new_usr_id, v_br_id,
                'Unlocked', 'Active',
                'Admin', now(), NULL
            );

            SELECT body INTO msg FROM alerts WHERE title = 'Insert';
        END IF;

    /* ====================== UPDATE ====================== */
    ELSIF oper = 'update' THEN
        IF v_usr_id IS NULL THEN
            RETURN 'Missing user id';
        END IF;

        IF EXISTS (SELECT 1 FROM users WHERE usr_id = v_usr_id) THEN
            IF EXISTS (
                SELECT 1 FROM users
                WHERE lower(username) = lower(username_sp)
                  AND usr_id <> v_usr_id
            ) THEN
                SELECT body INTO msg FROM alerts WHERE title = 'AlreadyInsert';
                RETURN msg;
            END IF;

            UPDATE users
            SET p_id          = COALESCE(v_p_id, p_id),
                username      = username_sp,
                password_hash = COALESCE(NULLIF(password_sp, ''), password_hash),
                state         = COALESCE(NULLIF(state_sp, ''), state),
                lock_user     = COALESCE(NULLIF(lock_user_sp, ''), lock_user)
            WHERE usr_id = v_usr_id;

            UPDATE user_branch
            SET state     = COALESCE(NULLIF(state_sp, ''), state),
                lock_user = COALESCE(NULLIF(lock_user_sp, ''), lock_user)
            WHERE usr_id = v_usr_id;

            SELECT body INTO msg FROM alerts WHERE title = 'Update';
        ELSE
            SELECT body INTO msg FROM alerts WHERE title = 'NotRegUpdate';
        END IF;

    /* ====================== DELETE ====================== */
    ELSIF oper = 'delete' THEN
        IF v_usr_id IS NULL THEN
            RETURN 'Missing user id';
        END IF;

        IF EXISTS (SELECT 1 FROM users WHERE usr_id = v_usr_id) THEN
            DELETE FROM user_branch WHERE usr_id = v_usr_id;
            DELETE FROM users       WHERE usr_id = v_usr_id;
            SELECT body INTO msg FROM alerts WHERE title = 'Delete';
        ELSE
            SELECT body INTO msg FROM alerts WHERE title = 'NotRegUpdate';
        END IF;

    ELSE
        msg := 'Invalid Operation';
    END IF;

    RETURN msg;
END;
$function$;

ALTER FUNCTION public.users_sp(VARCHAR, VARCHAR, VARCHAR, VARCHAR, VARCHAR, VARCHAR, VARCHAR, VARCHAR) OWNER TO postgres;
