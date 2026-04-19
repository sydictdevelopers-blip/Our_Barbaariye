/**
 * API Queries Config - Whitelist of allowed queries
 * Keys must match: crudConfig optionsKey (dropdowns) and menuConfig queryName (datatables).
 * DB: level_type table must exist and have rows so Level Setup "Level Type" dropdown has options.
 */
const QUERIES = {
  // ---- Dropdowns (optionsKey in crudConfig) – must return value + label columns for selects ----
  level_type: 'SELECT l.l_ty_id, l.name AS level_name FROM level_type l ORDER BY l.name',
  accounts: 'SELECT * FROM accounts ORDER BY acc_id',
  gendersections: 'SELECT * FROM accounts ORDER BY acc_id',

  // ---- Datatable / entity queries (queryName in menuConfig) ----
  LevelSetup: 'SELECT * FROM levels_show(1)',
  ClassSetup: 'SELECT * FROM class',
  ClassFormaster: 'SELECT * FROM class_formaster ORDER BY 1',
  SubjectsSetup: 'SELECT * FROM subjects ORDER BY sub_id',
  SubjectClassSetup: 'SELECT * FROM subject_class ORDER BY 1',
  academicYeartab: 'select * from academic_year_show()',
  BranchTransfer: 'SELECT * FROM branch_transfer ORDER BY 1',
  AcademicTransfer: 'SELECT * FROM academic_transfer ORDER BY 1',
  ClassTransfer: 'SELECT * FROM class_transfer ORDER BY 1',
  LessonActivityMark: 'SELECT * FROM lesson_activity_mark ORDER BY 1',
  LessonActivityResults: 'SELECT * FROM lesson_activity_results ORDER BY 1',
  Students: 'SELECT * FROM students ORDER BY student_id',
  Responsible: 'SELECT * FROM responsible',
  studentstate: 'SELECT * FROM student_state ORDER BY 1',
  bus: 'SELECT * FROM bus ORDER BY 1',
  Studentinfo: 'SELECT * FROM students ORDER BY student_id',
  'update school': 'SELECT * FROM school ORDER BY 1',

  // ---- Activity Management ----
  Activity: 'SELECT * FROM activity ORDER BY act_id',
  SubjectActivity: 'SELECT sa.sub_act_id, sa.act_id, a.activity_name, sa.subject_id, s.subject_name, sa.max_marks, sa.state FROM subject_activity sa LEFT JOIN activity a ON a.act_id = sa.act_id LEFT JOIN subjects s ON s.subject_id = sa.subject_id ORDER BY sa.sub_act_id',
  StudentActivityEdit: 'SELECT sae.sta_id, sae.student_id, st.student_name, sae.sub_act_id, CONCAT(a.activity_name, \' - \', s.subject_name) AS subject_activity, sae.marks_obtained, sae.state FROM student_activity_edit sae LEFT JOIN students st ON st.student_id = sae.student_id LEFT JOIN subject_activity sa ON sa.sub_act_id = sae.sub_act_id LEFT JOIN activity a ON a.act_id = sa.act_id LEFT JOIN subjects s ON s.subject_id = sa.subject_id ORDER BY sae.sta_id',

  // ---- Dropdown option queries ----
  activity_options: 'SELECT act_id, activity_name FROM activity ORDER BY activity_name',
  subject_activity_options: 'SELECT sa.sub_act_id, CONCAT(a.activity_name, \' - \', s.subject_name) AS sub_act_name FROM subject_activity sa LEFT JOIN activity a ON a.act_id = sa.act_id LEFT JOIN subjects s ON s.subject_id = sa.subject_id ORDER BY 2',

  // Legacy / aliases
  students: 'SELECT * FROM students ORDER BY student_id',
  studentacademicyears: 'SELECT * FROM studentacademicyears ORDER BY studentacademicyear_id',
  student_classes: 'SELECT * FROM student_classes ORDER BY student_class_id',
  subjects: 'SELECT * FROM subjects ORDER BY subject_id',
  studentsubjects: 'SELECT * FROM studentsubjects ORDER BY studentsubject_id',
};

const DEFAULT_QUERY = 'accounts';

/** Returns SQL for name, or null if not whitelisted. Case-insensitive lookup. */
function getQuery(name) {
  const key = (name || '').trim().toLowerCase();
  if (!key) return null;
  const found = Object.keys(QUERIES).find((k) => k.toLowerCase() === key);
  return found ? QUERIES[found] : null;
}

function getAvailableQueries() {
  return Object.entries(QUERIES).map(([id]) => ({
    id,
    label: id.split('_').map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' '),
  }));
}

module.exports = { getQuery, getAvailableQueries, QUERIES };
