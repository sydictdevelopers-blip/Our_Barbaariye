require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: process.env.DB_PORT || 5432,
});

const initSQL = `
CREATE TABLE IF NOT EXISTS accounts (
  id SERIAL PRIMARY KEY,
  account_name VARCHAR(255) NOT NULL,
  institution VARCHAR(255) NOT NULL,
  balance DECIMAL(15, 2) DEFAULT 0
);

-- Subjects table (if not exists)
CREATE TABLE IF NOT EXISTS subjects (
  subject_id SERIAL PRIMARY KEY,
  subject_name VARCHAR(255) NOT NULL,
  subject_code VARCHAR(50),
  description TEXT
);

-- Students table (if not exists)
CREATE TABLE IF NOT EXISTS students (
  student_id SERIAL PRIMARY KEY,
  student_name VARCHAR(255) NOT NULL,
  student_code VARCHAR(50),
  email VARCHAR(255),
  phone VARCHAR(50)
);

-- Insert sample subjects only if table is empty
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM subjects LIMIT 1) THEN
    INSERT INTO subjects (subject_name, subject_code, description) VALUES
      ('Mathematics', 'MATH101', 'Basic mathematics'),
      ('English', 'ENG101', 'English language'),
      ('Science', 'SCI101', 'General science'),
      ('History', 'HIS101', 'World history'),
      ('Computer Science', 'CS101', 'Introduction to programming');
  END IF;
END $$;

-- people table and people_sp
CREATE TABLE IF NOT EXISTS people (
  people_id SERIAL PRIMARY KEY,
  p_name_sp VARCHAR(255),
  p_tel_sp VARCHAR(50),
  p_sex_sp VARCHAR(20),
  p_email_sp VARCHAR(255),
  p_state_sp VARCHAR(50),
  p_type_sp VARCHAR(50)
);

DROP FUNCTION IF EXISTS people_sp(INT, VARCHAR, VARCHAR, VARCHAR, VARCHAR, VARCHAR, VARCHAR, VARCHAR);
CREATE OR REPLACE FUNCTION people_sp(
  p_id INT,
  p_name_sp VARCHAR,
  p_tel_sp VARCHAR,
  p_sex_sp VARCHAR,
  p_email_sp VARCHAR,
  p_state_sp VARCHAR,
  p_type_sp VARCHAR,
  p_operation VARCHAR
) RETURNS VARCHAR AS $$
BEGIN
  IF p_operation = 'insert' THEN
    INSERT INTO people (p_name_sp, p_tel_sp, p_sex_sp, p_email_sp, p_state_sp, p_type_sp)
    VALUES (NULLIF(TRIM(p_name_sp), ''), NULLIF(TRIM(p_tel_sp), ''), NULLIF(TRIM(p_sex_sp), ''),
            NULLIF(TRIM(p_email_sp), ''), NULLIF(TRIM(p_state_sp), ''), NULLIF(TRIM(p_type_sp), ''));
    RETURN 'inserted';
  ELSIF p_operation = 'update' AND p_id > 0 THEN
    UPDATE people SET
      p_name_sp = NULLIF(TRIM(p_name_sp), ''),
      p_tel_sp = NULLIF(TRIM(p_tel_sp), ''),
      p_sex_sp = NULLIF(TRIM(p_sex_sp), ''),
      p_email_sp = NULLIF(TRIM(p_email_sp), ''),
      p_state_sp = NULLIF(TRIM(p_state_sp), ''),
      p_type_sp = NULLIF(TRIM(p_type_sp), '')
    WHERE people_id = p_id;
    RETURN 'updated';
  ELSIF p_operation = 'delete' AND p_id > 0 THEN
    DELETE FROM people WHERE people_id = p_id;
    RETURN 'deleted';
  END IF;
  RETURN 'success';
END;
$$ LANGUAGE plpgsql;

-- students_sp for insert/update/delete via /api/all
DROP FUNCTION IF EXISTS students_sp(INT, VARCHAR, VARCHAR, VARCHAR, VARCHAR, INT, VARCHAR);
CREATE OR REPLACE FUNCTION students_sp(p_id INT, p_name_sp VARCHAR, p_code_sp VARCHAR, p_email_sp VARCHAR, p_phone_sp VARCHAR, p_usr_id INT, p_operation VARCHAR)
RETURNS VARCHAR AS $$
BEGIN
  IF p_operation = 'insert' THEN
    INSERT INTO students (student_name, student_code, email, phone) VALUES (p_name_sp, NULLIF(TRIM(p_code_sp), ''), NULLIF(TRIM(p_email_sp), ''), NULLIF(TRIM(p_phone_sp), ''));
    RETURN 'inserted';
  ELSIF p_operation = 'update' AND p_id > 0 THEN
    UPDATE students SET student_name = p_name_sp, student_code = NULLIF(TRIM(p_code_sp), ''), email = NULLIF(TRIM(p_email_sp), ''), phone = NULLIF(TRIM(p_phone_sp), '') WHERE student_id = p_id;
    RETURN 'updated';
  ELSIF p_operation = 'delete' AND p_id > 0 THEN
    DELETE FROM students WHERE student_id = p_id;
    RETURN 'deleted';
  END IF;
  RETURN 'success';
END;
$$ LANGUAGE plpgsql;

-- ===================== ACTIVITY MANAGEMENT =====================

-- Activity table
CREATE TABLE IF NOT EXISTS activity (
  act_id SERIAL PRIMARY KEY,
  activity_name VARCHAR(255) NOT NULL,
  description TEXT,
  state VARCHAR(50) DEFAULT 'Active',
  br_id_sp INT DEFAULT 1,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Subject Activity table (links activities to subjects)
CREATE TABLE IF NOT EXISTS subject_activity (
  sub_act_id SERIAL PRIMARY KEY,
  act_id INT REFERENCES activity(act_id) ON DELETE CASCADE,
  subject_id INT,
  max_marks NUMERIC(10,2) DEFAULT 100,
  state VARCHAR(50) DEFAULT 'Active',
  created_at TIMESTAMP DEFAULT NOW()
);

-- Student Activity Edit table (student marks per subject activity)
CREATE TABLE IF NOT EXISTS student_activity_edit (
  sta_id SERIAL PRIMARY KEY,
  student_id INT,
  sub_act_id INT REFERENCES subject_activity(sub_act_id) ON DELETE CASCADE,
  marks_obtained NUMERIC(10,2) DEFAULT 0,
  state VARCHAR(50) DEFAULT 'Active',
  created_at TIMESTAMP DEFAULT NOW()
);

-- activity_sp: Insert / Update / Delete activity rows
DROP FUNCTION IF EXISTS activity_sp(INT, VARCHAR, VARCHAR, VARCHAR, INT, INT, VARCHAR);
CREATE OR REPLACE FUNCTION activity_sp(
  act_id_sp    INT,
  activity_name_sp VARCHAR,
  description_sp   VARCHAR,
  state_sp         VARCHAR,
  br_id_sp         INT,
  u_br_id_sp       INT,
  oper             VARCHAR
) RETURNS VARCHAR AS $$
BEGIN
  IF oper = 'I' THEN
    INSERT INTO activity (activity_name, description, state, br_id_sp)
    VALUES (
      NULLIF(TRIM(activity_name_sp), ''),
      NULLIF(TRIM(description_sp), ''),
      COALESCE(NULLIF(TRIM(state_sp), ''), 'Active'),
      COALESCE(br_id_sp, 1)
    );
    RETURN 'inserted';
  ELSIF oper = 'U' AND act_id_sp > 0 THEN
    UPDATE activity SET
      activity_name = NULLIF(TRIM(activity_name_sp), ''),
      description   = NULLIF(TRIM(description_sp), ''),
      state         = COALESCE(NULLIF(TRIM(state_sp), ''), 'Active')
    WHERE act_id = act_id_sp;
    RETURN 'updated';
  ELSIF oper = 'D' AND act_id_sp > 0 THEN
    DELETE FROM activity WHERE act_id = act_id_sp;
    RETURN 'deleted';
  END IF;
  RETURN 'success';
END;
$$ LANGUAGE plpgsql;

-- subject_activity_sp: Insert / Update / Delete subject_activity rows
DROP FUNCTION IF EXISTS subject_activity_sp(INT, INT, INT, NUMERIC, VARCHAR, VARCHAR);
CREATE OR REPLACE FUNCTION subject_activity_sp(
  sub_act_id_sp INT,
  act_id_sp     INT,
  subject_id_sp INT,
  max_marks_sp  NUMERIC,
  state_sp      VARCHAR,
  oper          VARCHAR
) RETURNS VARCHAR AS $$
BEGIN
  IF oper = 'I' THEN
    INSERT INTO subject_activity (act_id, subject_id, max_marks, state)
    VALUES (
      act_id_sp,
      subject_id_sp,
      COALESCE(max_marks_sp, 100),
      COALESCE(NULLIF(TRIM(state_sp), ''), 'Active')
    );
    RETURN 'inserted';
  ELSIF oper = 'U' AND sub_act_id_sp > 0 THEN
    UPDATE subject_activity SET
      act_id     = act_id_sp,
      subject_id = subject_id_sp,
      max_marks  = COALESCE(max_marks_sp, 100),
      state      = COALESCE(NULLIF(TRIM(state_sp), ''), 'Active')
    WHERE sub_act_id = sub_act_id_sp;
    RETURN 'updated';
  ELSIF oper = 'D' AND sub_act_id_sp > 0 THEN
    DELETE FROM subject_activity WHERE sub_act_id = sub_act_id_sp;
    RETURN 'deleted';
  END IF;
  RETURN 'success';
END;
$$ LANGUAGE plpgsql;

-- student_activity_edit_sp: Insert / Update / Delete student_activity_edit rows
DROP FUNCTION IF EXISTS student_activity_edit_sp(INT, INT, INT, NUMERIC, VARCHAR, VARCHAR);
CREATE OR REPLACE FUNCTION student_activity_edit_sp(
  sta_id_sp      INT,
  student_id_sp  INT,
  sub_act_id_sp  INT,
  marks_sp       NUMERIC,
  state_sp       VARCHAR,
  oper           VARCHAR
) RETURNS VARCHAR AS $$
BEGIN
  IF oper = 'I' THEN
    INSERT INTO student_activity_edit (student_id, sub_act_id, marks_obtained, state)
    VALUES (
      student_id_sp,
      sub_act_id_sp,
      COALESCE(marks_sp, 0),
      COALESCE(NULLIF(TRIM(state_sp), ''), 'Active')
    );
    RETURN 'inserted';
  ELSIF oper = 'U' AND sta_id_sp > 0 THEN
    UPDATE student_activity_edit SET
      student_id     = student_id_sp,
      sub_act_id     = sub_act_id_sp,
      marks_obtained = COALESCE(marks_sp, 0),
      state          = COALESCE(NULLIF(TRIM(state_sp), ''), 'Active')
    WHERE sta_id = sta_id_sp;
    RETURN 'updated';
  ELSIF oper = 'D' AND sta_id_sp > 0 THEN
    DELETE FROM student_activity_edit WHERE sta_id = sta_id_sp;
    RETURN 'deleted';
  END IF;
  RETURN 'success';
END;
$$ LANGUAGE plpgsql;

-- ===================== END ACTIVITY MANAGEMENT =====================

-- Insert sample data only if table is empty
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM accounts LIMIT 1) THEN
    INSERT INTO accounts (account_name, institution, balance) VALUES
      ('General Fund', 'Central Academy', 125000),
      ('Sports Department', 'Central Academy', 45000),
      ('Library Fund', 'Eastside School', 32500),
      ('Science Lab', 'Westfield Institute', 78500),
      ('Scholarship Fund', 'Central Academy', 156000);
  END IF;
END $$;
`;

async function init() {
  try {
    await pool.query(initSQL);
    console.log('Database initialized successfully!');
  } catch (err) {
    console.error('Init error:', err.message);
  } finally {
    await pool.end();
  }
}

init();
