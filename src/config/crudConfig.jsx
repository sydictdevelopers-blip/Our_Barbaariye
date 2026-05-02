function toLabel(name) {
  return name.split('_').map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');
}

const AUTH_STORAGE_KEY = 'brabaariye_user';
function getSessionUser() {
  if (typeof window === 'undefined') return null;
  try {
    const stored = window.localStorage?.getItem(AUTH_STORAGE_KEY);
    return stored ? JSON.parse(stored) : null;
  } catch {
    return null;
  }
}
export const getSessionUBrId = () => getSessionUser()?.u_br_id ?? '';
export const getSessionBrId = () => getSessionUser()?.br_id ?? '';
export const getSessionShId = () => getSessionUser()?.sh_id ?? 1;

function resolveDefault(f) {
  return typeof f.default === 'function' ? f.default() : f.default;
}

function generateCrudConfig(schema) {
  const { title, fn, endpoint, idKey = 'id', fields = [], extraValidate } = schema;

  const fromRow = (row) => {
    const out = { id: row[idKey] ?? row.id };
    fields.forEach((f) => {
      // Try value, rowKey, name so both l_ty_id and l_ty_id_sp (and level_name) work from DB
      const keyCandidates = [f.value, f.rowKey, f.name].filter(Boolean);
      const keys = [...new Set([...keyCandidates, f.name])];
      let val = keys.map((k) => row[k]).find((v) => v != null);
      if (val == null) {
        const dflt = resolveDefault(f);
        val = f.type === 'number' ? (dflt ?? 0) : (f.type === 'checkbox' ? false : (dflt ?? ''));
      }
      else if (f.type === 'checkbox') val = val === 1 || val === true || val === '1';
      else if (f.type === 'date' && val) {
        // DB returns ISO timestamp ('2025-04-30T21:00:00.000Z') or Date obj; <input type="date"> needs 'YYYY-MM-DD'
        const s = val instanceof Date ? val.toISOString() : String(val);
        val = s.slice(0, 10);
      }
      out[f.name] = val;
      const nameKey = f.nameKey ?? f.labelRowKey;
      if (f.optionsKey && nameKey && row[nameKey] != null) {
        out[`${f.name}_label`] = row[nameKey];
      }
    });
    return out;
  };

  const toParams = (form) => {
    if (endpoint) {
      return Object.fromEntries(
        fields.map((f) => [f.name, (form[f.name] ?? '').toString().trim()])
      );
    }
    const out = {};
    if (!schema.omitPId) out.p_id = form.id || form[idKey] || 0;
    if (schema.idParam) out[schema.idParam] = form.id ?? form[idKey] ?? form[schema.idParam] ?? 0;
    if (!schema.omitPUsrId) out.p_usr_id = 1;
    fields.filter((f) => !f.omitFromParams).forEach((f) => {
      const key = f.param ?? `p_${f.name}_sp`;
      const val = form[f.name];
      const dflt = resolveDefault(f);
      if (f.type === 'number') out[key] = isNaN(parseFloat(val)) ? (dflt ?? 0) : parseFloat(val);
      else if (f.type === 'checkbox') out[key] = val ? '1' : '0';
      else if (f.type === 'hidden') {
        const v = (val == null || val === '') ? dflt : val;
        out[key] = (v ?? '').toString().trim();
      }
      else out[key] = (val ?? '').toString().trim();
    });
    return out;
  };

  const validate = (form, mode = 'insert') => {
    const e = {};
    fields
      .filter((f) => {
        // Skip fields hidden by a conditional showWhen (e.g. transfer_school when en_ty_id=1).
        if (typeof f.showWhen === 'function' && !f.showWhen(form)) return false;
        if (f.required) return true;
        if (f.requiredOnMode && f.requiredOnMode === mode) return true;
        return false;
      })
      .forEach((f) => {
        const v = form[f.name];
        const invalid = f.type === 'checkbox' ? v !== true : !(v ?? '').toString().trim();
        if (invalid) {
          // If label is an i18n key (e.g. "students.registerForm.fields.fullName"),
          // store it raw so CrudModal can translate; the modal renders "<label> required".
          const labelText = (f.label && String(f.label).includes('.'))
            ? f.label
            : toLabel(f.label || f.name);
          e[f.name] = `${labelText} required`;
        }
      });
    if (typeof extraValidate === 'function') {
      Object.assign(e, extraValidate(form, mode) || {});
    }
    return e;
  };

  const normalizedFields = fields.map((f) => ({
    name: f.name,
    label: f.label ?? toLabel(f.name),
    placeholder: f.placeholder ?? `e.g. ${f.label ?? toLabel(f.name)}`,
    type: f.type ?? 'text',
    options: f.options,
    optionsKey: f.optionsKey,
    value: f.value ?? f.rowKey,
    nameKey: f.nameKey ?? f.labelRowKey,
    rows: f.rows,
    default: f.default,
    showOnMode: f.showOnMode,
    ...(typeof f.showWhen === 'function' && { showWhen: f.showWhen }),
    ...(f.dependsOn && { dependsOn: f.dependsOn }),
    ...(f.props && { props: f.props }),
  }));

  return {
    title,
    ...(fn && { fn }),
    ...(endpoint && { endpoint }),
    ...(schema.gridCols && { gridCols: schema.gridCols }),
    ...(schema.modalSize && { modalSize: schema.modalSize }),
    fromRow,
    toParams,
    validate,
    fields: normalizedFields,
  };
}

/** Dhammaan entities – qaab isku mid: { key, title, fn|endpoint, idKey, fields[] } */
const ENTITIES = [
  {
    key: 'ClassSetup',
    title: 'Class Setup',
    fn: 'class_sp',
    idKey: 'cl_id',
    omitPId: true,
    omitPUsrId: true,
    idParam: 'cl_id_sp',
    fields: [
      { name: 'class_sp', label: 'Class', type: 'text', required: true, rowKey: 'class_name', param: 'class_sp' },
      { name: 'lev_id_sp', label: 'Level', type: 'select', required: true, optionsKey: 'levels', rowKey: 'lev_id', value: 'lev_id', nameKey: 'level_name', param: 'lev_id_sp', default: '' },
      { name: 'gr_id_sp', label: 'Grade', type: 'select', required: true, optionsKey: 'grades', rowKey: 'gr_id', value: 'gr_id', nameKey: 'grade_name', param: 'gr_id_sp', default: '' },
      { name: 'sh_id_sp', label: 'Shift', type: 'select', required: true, optionsKey: 'shift_options', rowKey: 'sh_id', value: 'sh_id', nameKey: 'shift_name', param: 'sh_id_sp', default: '' },
      { name: 'br_id_sp', type: 'hidden', param: 'br_id_sp', default: getSessionBrId },
      { name: 'u_br_id_sp', type: 'hidden', param: 'u_br_id_sp', default: getSessionUBrId },
    ],
  },
  {
    key: 'SubjectClassSetup',
    title: 'Subject Class Edit',
    fn: 'subject_class_sp',
    idKey: 'sub_cl_id',
    idParam: 'sub_cl_id_sp',
    omitPId: true,
    omitPUsrId: true,
    gridCols: 2,
    modalSize: 'lg',
    fields: [
      { name: 'a_y_id_sp', label: 'Academic', type: 'select', required: true, optionsKey: 'academic_options', rowKey: 'a_y_id', value: 'a_y_id', nameKey: 'academic_name', param: 'a_y_id_sp', placeholder: 'Select Academic', default: '' },
      { name: 'cl_id_sp', label: 'Class', type: 'select', required: true, optionsKey: 'class_options', rowKey: 'cl_id', value: 'cl_id', nameKey: 'class_name', param: 'cl_id_sp', placeholder: 'Select Class', default: '' },
      { name: 'sub_id_sp', label: 'Subject', type: 'select', required: true, optionsKey: 'subject_options', rowKey: 'sub_id', value: 'sub_id', nameKey: 'subject_name', param: 'sub_id_sp', placeholder: 'Select Subject', default: '' },
      { name: 'emp_id_sp', label: 'Teacher', type: 'select', required: true, optionsKey: 'employee_options', rowKey: 'emp_id', value: 'emp_id', nameKey: 'employee_name', param: 'emp_id_sp', placeholder: 'Select Teacher', default: '' },
      { name: 'no_of_period_sp', label: 'No. of Periods', type: 'number', rowKey: 'no_of_period', param: 'no_of_period_sp', default: 0, props: { min: 0 } },
      { name: 'state_sp', label: 'State', type: 'select', rowKey: 'state', param: 'state_sp', options: [{ value: 'Active', label: 'Active' }, { value: 'Inactive', label: 'Inactive' }], default: 'Active' },
      { name: 'u_br_id_sp', type: 'hidden', param: 'u_br_id_sp', default: getSessionUBrId },
    ],
  },
  {
    key: 'ClassFormaster',
    title: 'Class Formaster Form',
    fn: 'class_formaster_sp',
    idKey: 'c_f_id',
    idParam: 'c_f_id_sp',
    omitPId: true,
    omitPUsrId: true,
    gridCols: 2,
    modalSize: 'lg',
    fields: [
      { name: 'cl_id_sp', label: 'Class', type: 'select', required: true, optionsKey: 'class_options', rowKey: 'cl_id', value: 'cl_id', nameKey: 'class_name', param: 'cl_id_sp', placeholder: 'Select Class', default: '' },
      { name: 'emp_id_sp', label: 'Class Formaster', type: 'select', required: true, optionsKey: 'employee_options', rowKey: 'emp_id', value: 'emp_id', nameKey: 'person_name', param: 'emp_id_sp', placeholder: 'Select Class formaster', default: '' },
      { name: 'a_y_id_sp', label: 'Academic', type: 'select', required: true, optionsKey: 'academic_options', rowKey: 'a_y_id', value: 'a_y_id', nameKey: 'academic_name', param: 'a_y_id_sp', placeholder: 'Select Academic', default: '' },
      { name: 'std_id_sp', label: 'Class Monitor', type: 'select', required: true, optionsKey: 'student_options', dependsOn: { a_y_id: 'a_y_id_sp', cl_id: 'cl_id_sp' }, rowKey: 'std_id', value: 'std_id', nameKey: 'student_name', param: 'std_id_sp', placeholder: 'Select Class Monitor', default: '' },
      { name: 'state_sp', type: 'hidden', param: 'state_sp', default: 'Active' },
      { name: 'u_br_id_sp', type: 'hidden', param: 'u_br_id_sp', default: getSessionUBrId },
    ],
  },
  {
    key: 'ResponsibleModal',
    title: 'Responsible',
    fn: 'responsible_sp',
    idKey: 'res_id',
    omitPId: true,
    omitPUsrId: true,
    idParam: 'res_id_sp',
    gridCols: 2,
    fields: [
      { name: 'p_id_sp', type: 'hidden', param: 'p_id_sp', rowKey: 'p_id', default: 0 },
      { name: 'p_name_sp', label: 'Name', type: 'text', required: true, rowKey: 'responsible_name', param: 'p_name_sp' },
      { name: 'tel_sp', label: 'Tel', type: 'text', rowKey: 'tel', param: 'tel_sp' },
      { name: 'phone_sp', label: 'Phone', type: 'text', rowKey: 'phone', param: 'phone_sp' },
      { name: 'sex_sp', label: 'Sex', type: 'select', rowKey: 'sex', param: 'sex_sp',
        options: [{ value: 'Male', label: 'Male' }, { value: 'Female', label: 'Female' }], default: 'Male' },
      { name: 'ad_id_sp', label: 'Address', type: 'select', rowKey: 'ad_id', param: 'ad_id_sp',
        optionsKey: 'address_options', value: 'add_id', nameKey: 'address_name', default: '' },
      { name: 'state_sp', type: 'hidden', param: 'state_sp', rowKey: 'state', default: 'Active' },
      { name: 'u_br_id_sp', type: 'hidden', param: 'u_br_id_sp', default: getSessionUBrId },
    ],
  },
  {
    key: 'update school',
    title: 'Update School',
    fn: 'schools_sp',
    idKey: 'id',
    idParam: 'num',
    omitPId: true,
    omitPUsrId: true,
    gridCols: 2,
    fields: [
      { name: 'sname', label: 'School Name', type: 'text', required: true, rowKey: 'school_name', param: 'sname' },
      { name: 'reg_no', label: 'Reg No', type: 'number', required: true, rowKey: 'school_reg_no', param: 'reg_no', default: 0 },
      { name: 'user_id', type: 'hidden', param: 'user_id', default: getSessionUBrId },
    ],
  },
  {
    key: 'bus',
    title: 'Bus',
    fn: 'bus_sp',
    idKey: 'bus_id',
    omitPId: true,
    omitPUsrId: true,
    idParam: 'bus_id_sp',
    gridCols: 2,
    fields: [
      { name: 'bus_name_sp', label: 'Bus Name', type: 'text', required: true, rowKey: 'bus_name', param: 'bus_name_sp' },
      { name: 'emp_id_sp', label: 'Driver', type: 'select', required: true, optionsKey: 'employee_options',
        rowKey: 'emp_id', value: 'emp_id', nameKey: 'employee_name', param: 'emp_id_sp', placeholder: 'Select Driver', default: '' },
      { name: 'targo_sp', label: 'Plot No', type: 'text', required: true, rowKey: 'targo', param: 'targo_sp' },
      { name: 'u_br_id_sp', type: 'hidden', param: 'u_br_id_sp', default: getSessionUBrId },
    ],
  },
  {
    key: 'LevelSetup',
    title: 'Level Setup',
    fn: 'level_sp',
    idKey: 'lev_id',
    omitPId: true,
    omitPUsrId: true,
    idParam: 'lev_id_sp',
    fields: [
      { name: 'l_ty_id_sp', label: 'Level Type', type: 'select', param: 'l_ty_id_sp', optionsKey: 'level_type', value: 'l_ty_id', rowKey: 'l_ty_id', nameKey: 'level_name', default: '' },
      { name: 'level_name_sp', label: 'Level', type: 'text', required: true, rowKey: 'level', param: 'level_name_sp' },
      { name: 'fee_sp', label: 'Fee', type: 'number', rowKey: 'fee', param: 'fee_sp', default: 0, props: { min: 0, step: 0.01 } },
      { name: 'br_id_sp', label: 'Branch ID', type: 'hidden', param: 'br_id_sp', default: 1 },
      { name: 'u_br_id_sp', label: 'U Branch ID', type: 'hidden', param: 'u_br_id_sp', default: 1 },
    ],
  },
  {
    key: 'account',
    title: 'Account Form',
    fn: 'accounts_sp',
    idKey: 'acc_id',
    fields: [
      { name: 'account_name', label: 'Account No.', type: 'text', required: true, value: 'acc_name', param: 'p_name_sp' },
      { name: 'institution', label: 'Institution', type: 'text', required: true, param: 'p_institution_sp' },
      { name: 'balance', label: 'Balance', type: 'number', placeholder: '0', default: 0, param: 'p_balance_sp', props: { min: 0, step: 0.01 } },
    ],
  },
  {
    key: 'SubjectsSetup',
    title: 'Subject Form',
    fn: 'subject_sp',
    idKey: 'sub_id',
    idParam: 'sub_id_sp',
    omitPId: true,
    omitPUsrId: true,
    fields: [
      { name: 'name_sp', label: 'Subject Name', type: 'text', required: true, rowKey: 'name', param: 'name_sp' },
      { name: 'ordering_sp', label: 'Ordering', type: 'number', rowKey: 'ordering', param: 'ordering_sp', default: 0, props: { min: 0 } },
      { name: 'state_sp', label: 'State', type: 'select', rowKey: 'state', param: 'state_sp', options: [{ value: 'Active', label: 'Active' }, { value: 'Inactive', label: 'Inactive' }], default: 'Active' },
    ],
  },
  {
    key: 'student_class',
    title: 'Student Class',
    fn: 'student_classes_sp',
    idKey: 'student_class_id',
    fields: [
      { name: 'class_name', label: 'Class Name', type: 'text', required: true, param: 'p_name_sp' },
      { name: 'description', label: 'Description', type: 'textarea', rows: 3, param: 'p_description_sp' },
    ],
  },
  {
    key: 'studentsubject',
    title: 'Student Subject',
    fn: 'studentsubjects_sp',
    idKey: 'studentsubject_id',
    fields: [
      { name: 'subject_name', label: 'Subject Name', type: 'text', required: true, param: 'p_name_sp' },
      { name: 'subject_code', label: 'Subject Code', type: 'text', param: 'p_code_sp' },
    ],
  },
  {
    key: 'studentstudent',
    title: 'Student',
    fn: 'students_sp',
    idKey: 'student_id',
    fields: [
      { name: 'student_name', label: 'Student Name', type: 'text', required: true, param: 'p_name_sp' },
      { name: 'student_code', label: 'Student Code', type: 'text', param: 'p_code_sp' },
      { name: 'email', label: 'Email', type: 'text', param: 'p_email_sp' },
      { name: 'phone', label: 'Phone', type: 'text', param: 'p_phone_sp' },
    ],
  },
  {
    key: 'academicYeartab',
    title: 'Academic Year',
    fn: 'academic_year_sp',
    idKey: 'id',
    idParam: 'a_y_id_sp',
    omitPId: true,
    omitPUsrId: true,
    fields: [
      { name: 'academic_name_sp', label: 'Academic Year', type: 'text', required: true, rowKey: 'academic', param: 'academic_name_sp' },
      { name: 'started_sp', label: 'Start Date', type: 'date', rowKey: 'started', param: 'started_sp' },
      { name: 'ended_sp', label: 'End Date', type: 'date', rowKey: 'ended', param: 'ended_sp' },
      { name: 'active_sp', label: 'State', type: 'select', rowKey: 'state', param: 'active_sp', options: [{ value: 'Active', label: 'Active' }, { value: 'Inactive', label: 'Inactive' }], default: 'Active' },
      { name: 'u_br_id_sp', label: 'U Branch ID', type: 'hidden', param: 'u_br_id_sp', default: 1 },
    ],
  },
  {
    key: 'mdl_student_info',
    title: 'wa test modal info',
    fn: 'studentacademicyears_sp',
    idKey: 'studentacademicyear_id',
    fields: [
      { name: 'year_name', label: 'Year Name', type: 'text', required: true, param: 'p_name_sp' },
      { name: 'start_date', label: 'Start Date', type: 'date', param: 'p_start_date_sp' },
      { name: 'end_date', label: 'End Date', type: 'date', param: 'p_end_date_sp' },
    ],
  },
  {
    key: 'mdl_student_info11',
    title: 'wa test modal info111',
    fn: 'studentacademicyears_sp',
    idKey: 'studentacademicyear_id',
    fields: [
      { name: 'year_name', label: 'Year Name', type: 'text', required: true, param: 'p_name_sp' },
      { name: 'start_date', label: 'Start Date', type: 'date', param: 'p_start_date_sp' },
      { name: 'end_date', label: 'End Date', type: 'date', param: 'p_end_date_sp' },
      { name: 'acc_id', label: 'Account', type: 'select', optionsKey: 'accounts', param: 'p_acc_id_sp', value: 'acc_id', nameKey: 'acc_name' },
      { name: 'gender', label: 'Gender', type: 'select', optionsKey: 'gendersections', param: 'p_gender_sp', value: 'acc_id', nameKey: 'acc_name' },
      { name: 'status', label: 'Status', type: 'radio', options: [{ value: 'active', label: 'Active' }, { value: 'inactive', label: 'Inactive' }], param: 'p_status_sp' },
      { name: 'notes', label: 'Notes', type: 'textarea', rows: 4, param: 'p_notes_sp' },
      { name: 'agreed', label: 'I agree', type: 'checkbox', param: 'p_agreed_sp' },
    ],
  },
  {
    key: 'Performance',
    title: 'Performance',
    fn: 'performance_sp',
    idKey: 'per_id',
    omitPId: true,
    omitPUsrId: true,
    idParam: 'per_id_sp',
    fields: [
      { name: 'performance_name_sp', label: 'Activity Name', type: 'text', required: true, rowKey: 'performance_name', param: 'performance_name_sp' },
    ],
  },
  {
    key: 'StudentPerformance',
    title: 'Student Performance',
    fn: 'student_performance_sp',
    idKey: 'st_per_id',
    omitPId: true,
    omitPUsrId: true,
    idParam: 'st_per_id_sp',
    fields: [
      { name: 'std_cl_id_sp', label: 'Student', type: 'select', required: true, optionsKey: 'student_performance_option', rowKey: 'std_cl_id', param: 'std_cl_id_sp', default: '' },
      { name: 'per_id_sp', label: 'Performance', type: 'select', required: true, optionsKey: 'performance_options', rowKey: 'per_id', value: 'per_id', nameKey: 'performance_name', param: 'per_id_sp', default: '' },
      { name: 'rate_id_sp', label: 'Rate', type: 'select', required: true, optionsKey: 'rate_options', rowKey: 'rate_id', value: 'rate_id', nameKey: 'rate', param: 'rate_id_sp', default: '' },
      { name: 'reason_sp', label: 'Reason', type: 'textarea', rows: 3, rowKey: 'reason', param: 'reason_sp' },
      { name: 'u_br_id_sp', type: 'hidden', param: 'u_br_id_sp', default: getSessionUBrId },
      { name: 'reg_date', label: 'Reg Date', type: 'date', rowKey: 'reg_date', omitFromParams: true, default: () => new Date().toISOString().slice(0, 10) },
    ],
  },
  {
    key: 'StudentPerformanceEdit',
    title: 'Student Performance Edit',
    fn: 'student_activity_edit_sp',
    idKey: 'sta_id',
    omitPId: true,
    omitPUsrId: true,
    idParam: 'sta_id_sp',
    fields: [
      { name: 'student_id_sp', label: 'Student', type: 'select', required: true, optionsKey: 'Students', rowKey: 'student_id', param: 'student_id_sp', default: '' },
      { name: 'sub_act_id_sp', label: 'Subject Activity', type: 'select', required: true, optionsKey: 'subject_activity_options', rowKey: 'sub_act_id', param: 'sub_act_id_sp', default: '' },
      { name: 'marks_sp', label: 'Marks Obtained', type: 'number', rowKey: 'marks_obtained', param: 'marks_sp', default: 0, props: { min: 0, step: 0.01 } },
      { name: 'state_sp', label: 'State', type: 'select', rowKey: 'state', param: 'state_sp', options: [{ value: 'Active', label: 'Active' }, { value: 'Inactive', label: 'Inactive' }], default: 'Active' },
    ],
  },
  {
    key: 'Users',
    title: 'User',
    fn: 'users_sp',
    idKey: 'usr_id',
    idParam: 'usr_id_sp',
    omitPId: true,
    omitPUsrId: true,
    extraValidate: (form) => {
      const e = {};
      const pw = (form.password_sp ?? '').toString();
      const pwc = (form.password_confirm_sp ?? '').toString();
      // Had iyo goor (insert/update): password iyo confirm waa inay isle'egaadaan
      if (pw !== pwc) e.password_confirm_sp = 'Passwords do not match';
      return e;
    },
    fields: [
      { name: 'p_id_sp', label: 'Person', type: 'select', required: true, optionsKey: 'people_options', rowKey: 'p_id', value: 'p_id', nameKey: 'p_name', param: 'p_id_sp', placeholder: 'Dooro qofka...' },
      { name: 'username_sp', label: 'Username', type: 'text', required: true, rowKey: 'username', param: 'username_sp', placeholder: 'Username' },
      // Password — INSERT: required; UPDATE: si toos ah ayaa loo soo akhriyaa row.password (display-ka ayuu masking-ku qariyaa ••••)
      { name: 'password_sp', label: 'Password', type: 'password', requiredOnMode: 'insert', rowKey: 'password', param: 'password_sp', placeholder: '••••••••' },
      // Confirm Password — labada mode (insert/update) ayaa lagu muujinayaa, oo backend loogu dirin
      { name: 'password_confirm_sp', label: 'Confirm Password', type: 'password', requiredOnMode: 'insert', omitFromParams: true, rowKey: 'password', placeholder: '••••••••' },
      // br_id waa field qarsoon — waa laga buuxiyaa logged-in user-ka (ma aha dropdown)
      { name: 'br_id_sp', type: 'hidden', rowKey: 'br_id', param: 'br_id_sp', default: '' },
      // state + lock_user — kaliya UPDATE modal ayaa lagu muujiyaa
      { name: 'state_sp', label: 'State', type: 'select', rowKey: 'state', param: 'state_sp', default: 'Active', showOnMode: 'update',
        options: [{ value: 'Active', label: 'Active' }, { value: 'Inactive', label: 'Inactive' }] },
      { name: 'lock_user_sp', label: 'Lock Status', type: 'select', rowKey: 'lock_user', param: 'lock_user_sp', default: 'Unlocked', showOnMode: 'update',
        options: [{ value: 'Unlocked', label: 'Unlocked' }, { value: 'Locked', label: 'Locked' }] },
    ],
  },
  {
    key: 'mdl_people_infos',
    title: 'people section form',
    fn: 'people_sp',
    idKey: 'p_id', 
    fields: [
      { name: 'p_name_sp', label: 'name', type: 'text', required: true, param: 'p_name_sp' },
      { name: 'p_tel_sp', label: 'Phone', type: 'text', param: 'p_tel_sp' },
      { name: 'p_sex_sp', label: 'Gender', type: 'select', options: [{ value: 'male', label: 'Male' }, { value: 'female', label: 'Female' }], param: 'p_sex_sp' },
      { name: 'p_email_sp', label: 'email', type: 'text', required: true, param: 'p_email_sp' },
      { name: 'p_state_sp', label: 'State', type: 'select', options: [{ value: 'Active', label: 'Active' }, { value: 'Inactive', label: 'Inactive' }], param: 'p_state_sp' },
      { name: 'p_type_sp', label: 'Type', type: 'select', options: [{ value: 'Arday', label: 'Arday' }, { value: 'Macalin', label: 'Macalin' }], param: 'p_type_sp' },
    ],
  },

  // ---- Exam Management ----
  {
    key: 'ExamSetting',
    title: 'Exam Setting',
    fn: 'exam_siting_sp',
    idKey: 'ex_set_id',
    omitPId: true,
    omitPUsrId: true,
    idParam: 'ex_set_id_sp',
    gridCols: 2,
    fields: [
      { name: 'a_y_id_sp', label: 'Academic Year', type: 'select', required: true, optionsKey: 'academic_options', rowKey: 'a_y_id', value: 'a_y_id', nameKey: 'academic_name', param: 'a_y_id_sp', default: '' },
      { name: 'percentage_fail_pass_sp', label: 'Pass %', type: 'number', required: true, rowKey: 'percentage_fail_pass', param: 'percentage_fail_pass_sp', default: 0, props: { min: 0, max: 100, step: 0.01 } },
      { name: 'attendance_marks_sp', label: 'Attendance Marks', type: 'number', required: true, rowKey: 'attendance_marks', param: 'attendance_marks_sp', default: 0, props: { min: 0, step: 0.01 } },
      { name: 'activity_marks_sp', label: 'Activity Marks', type: 'number', required: true, rowKey: 'activity_marks', param: 'activity_marks_sp', default: 0, props: { min: 0, step: 0.01 } },
      { name: 'u_br_id_sp', type: 'hidden', param: 'u_br_id_sp', default: getSessionUBrId },
    ],
  },
  {
    key: 'Exam',
    title: 'Exam',
    fn: 'exam_sp',
    idKey: 'id',
    omitPId: true,
    omitPUsrId: true,
    idParam: 'ex_id_sp',
    fields: [
      { name: 'exam_sp_v', label: 'Exam Name', type: 'text', required: true, rowKey: 'exam', param: 'exam_sp_v' },
      { name: 'ordering_sp', label: 'Ordering', type: 'number', required: true, rowKey: 'ordering', param: 'ordering_sp', default: 1, props: { min: 1 } },
      { name: 'u_br_id_sp', type: 'hidden', param: 'u_br_id_sp', default: getSessionUBrId },
    ],
  },
  {
    key: 'ExamRegister',
    title: 'Exam Registration Form',
    fn: 'exam_reg_sp',
    idKey: 'ex_reg_id',
    omitPId: true,
    omitPUsrId: true,
    idParam: 'ex_reg_id_sp',
    gridCols: 2,
    modalSize: 'lg',
    fields: [
      { name: 'ex_id_sp', label: 'Exam', type: 'select', required: true, optionsKey: 'exam_options', rowKey: 'ex_id', value: 'ex_id', nameKey: 'exam', param: 'ex_id_sp', default: '' },
      { name: 'marks_sp', label: 'Marks', type: 'number', required: true, rowKey: 'marks', param: 'marks_sp', default: 0, props: { min: 0, step: 0.01 } },
      { name: 'attendance_marks_sp', label: 'Attendence Marks', type: 'number', required: true, rowKey: 'attendance_marks', param: 'attendance_marks_sp', default: 0, props: { min: 0, step: 0.01 } },
      { name: 'a_y_id_sp', label: 'Academic Year', type: 'select', required: true, optionsKey: 'academic_options', rowKey: 'a_y_id', value: 'a_y_id', nameKey: 'academic_name', param: 'a_y_id_sp', default: '' },
      { name: 'exam_type_sp', label: 'Type', type: 'select', required: true, rowKey: 'exam_type', param: 'exam_type_sp', options: [{ value: 'By Name', label: 'By Name' }, { value: 'By Serial', label: 'By Serial' }], default: '', placeholder: 'Select State' },
      { name: 'start_date_sp', label: 'Start Date', type: 'date', required: true, rowKey: 'start_date', param: 'start_date_sp', default: () => new Date().toISOString().slice(0, 10) },
      { name: 'end_date_sp', label: 'End Date', type: 'date', required: true, rowKey: 'end_date', param: 'end_date_sp', default: () => new Date().toISOString().slice(0, 10) },
      { name: 'deadline_sp', label: 'Exam Deadline', type: 'date', required: true, rowKey: 'deadline', param: 'deadline_sp', default: () => new Date().toISOString().slice(0, 10) },
      { name: 'exam_status_sp', type: 'hidden', param: 'exam_status_sp', default: 'Open' },
      { name: 'br_id_sp', type: 'hidden', param: 'br_id_sp', default: getSessionBrId },
      { name: 'u_br_id_sp', type: 'hidden', param: 'u_br_id_sp', default: getSessionUBrId },
    ],
  },
  {
    key: 'AssignClassExam',
    title: 'Assign Class Exam',
    fn: 'assign_class_exam_sp',
    idKey: 'a_c_ex',
    omitPId: true,
    omitPUsrId: true,
    idParam: 'a_c_e_id_sp',
    gridCols: 2,
    fields: [
      { name: 'er_id_sp', label: 'Exam Register', type: 'select', required: true, optionsKey: 'exam_reg_options', rowKey: 'er_id', value: 'ex_reg_id', nameKey: 'exam_reg_name', param: 'er_id_sp', default: '' },
      { name: 'cl_id_sp', label: 'Class', type: 'select', required: true, optionsKey: 'class_simple_options', rowKey: 'cl_id', value: 'cl_id', nameKey: 'class_name', param: 'cl_id_sp', default: '' },
      { name: 'b_id_sp', label: 'Batch', type: 'select', required: true, optionsKey: 'batch_options', rowKey: 'b_id', value: 'b_id', nameKey: 'batch_name', param: 'b_id_sp', default: '' },
      { name: 'u_br_id_sp', type: 'hidden', param: 'u_br_id_sp', default: getSessionUBrId },
    ],
  },
  // ---- Student Master Registration (people + student + student_class + charge) ----
  // Layout matches legacy modal: 3 cols, row-major. Modal uses page scroll (no inner scrollbar).
  {
    key: 'StudentRegister',
    title: 'students.registerForm.title',
    fn: 'student_master_sp',
    idKey: 'std_id',
    idParam: 'std_id_sp',
    omitPId: true,
    omitPUsrId: true,
    gridCols: 3,
    modalSize: 'xl',
    pageScroll: true,
    fields: [
      // Row 1: ID. (read-only) | EMIS NO. | Student name.
      { name: 'std_id_display',    label: 'students.registerForm.fields.id',           type: 'number', omitFromParams: true, rowKey: 'std_id', default: 0, props: { readOnly: true, disabled: true } },
      { name: 'emis_id_sp',        label: 'students.registerForm.fields.emisId',       type: 'text',                    rowKey: 'emis_id',      param: 'emis_id_sp',        default: '0' },
      { name: 'p_name_sp',         label: 'students.registerForm.fields.fullName',     type: 'text',   required: true,  rowKey: 'student_name', param: 'p_name_sp',         placeholder: 'students.registerForm.ph.fullName' },

      // Row 2: Student Phone. | Address | Sex
      { name: 'tel_sp',            label: 'students.registerForm.fields.phone',        type: 'text',   required: true,  rowKey: 'phone',        param: 'tel_sp',            placeholder: 'students.registerForm.ph.phone' },
      { name: 'ad_id_sp',          label: 'students.registerForm.fields.address',      type: 'select', required: true,  rowKey: 'ad_id',        param: 'ad_id_sp',
        optionsKey: 'address_options', value: 'add_id', nameKey: 'address_name', placeholder: 'students.registerForm.ph.address', default: '' },
      { name: 'sex_sp',            label: 'students.registerForm.fields.sex',          type: 'select', required: true,  rowKey: 'sex',          param: 'sex_sp',            default: 'Male',
        options: [{ value: 'Male', label: 'students.registerForm.opts.male' }, { value: 'Female', label: 'students.registerForm.opts.female' }] },

      // Row 3: Mother name. | Mother Phone. | POB.
      { name: 'mothername_sp',     label: 'students.registerForm.fields.motherName',   type: 'text',                    rowKey: 'mothername',   param: 'mothername_sp',     placeholder: 'students.registerForm.ph.motherName' },
      { name: 'mother_phone_sp',   label: 'students.registerForm.fields.motherPhone',  type: 'text',                    rowKey: 'mother_phone', param: 'mother_phone_sp',   placeholder: 'students.registerForm.ph.motherPhone' },
      { name: 'pob_sp',            label: 'students.registerForm.fields.pob',          type: 'text',                    rowKey: 'pob',          param: 'pob_sp',            placeholder: 'students.registerForm.ph.pob' },

      // Row 4: DOB. | Responsible (with inline + Add New) — Academic Year removed:
      // SP-ga cusub wuxuu si automatic ah u doortaa Academic Year-ka active.
      { name: 'dob_sp',            label: 'students.registerForm.fields.dob',          type: 'date',   required: true,  rowKey: 'dob',          param: 'dob_sp',            default: () => new Date().toISOString().slice(0, 10) },
      { name: 'res_id_sp',         label: 'students.registerForm.fields.responsible',  type: 'select', required: true,  rowKey: 'res_id',       param: 'res_id_sp',
        optionsKey: 'responsible_options', value: 'res_id', nameKey: 'p_name', placeholder: 'students.registerForm.ph.responsible', default: '',
        // When the searched responsible is not found, show "+ Add New" — opens
        // the ResponsibleModal CRUD pre-filled with the search text. After save
        // the parent dropdown is refetched and the new row is auto-selected.
        addNewConfigKey: 'ResponsibleModal', addNewSearchKey: 'p_name_sp' },

      // Row 5: Relation | Enrollment Type | Transferred School. (hidden unless Transfer)
      { name: 'r_r_id_sp',         label: 'students.registerForm.fields.relation',     type: 'select', required: true,  rowKey: 'r_r_id',       param: 'r_r_id_sp',
        optionsKey: 'responsible_relation_options', value: 'r_r_id', nameKey: 'relation_name', placeholder: 'students.registerForm.ph.relation', default: '' },
      { name: 'en_ty_id_sp',       label: 'students.registerForm.fields.enrollType',   type: 'select', required: true,  rowKey: 'en_ty_id',     param: 'en_ty_id_sp',
        optionsKey: 'enroll_type_options', value: 'en_ty_id', nameKey: 'enroll_type', placeholder: 'students.registerForm.ph.enrollType', default: '' },
      { name: 'transfer_school_sp', label: 'students.registerForm.fields.transferSchool', type: 'text',                  rowKey: 'transfer_school', param: 'transfer_school_sp',
        placeholder: 'students.registerForm.ph.transferSchool', default: '',
        // Show only when the picked enrollment type is "Transfer" (case-insensitive).
        showWhen: (form) => String(form.en_ty_id_sp_label ?? '').trim().toLowerCase() === 'transfer' },

      // Row 6: Discount. | Type Fee (student_type_fee) | Description (hidden unless Free)
      { name: 'discount_sp',       label: 'students.registerForm.fields.discount',     type: 'number',                  rowKey: 'discount',     param: 'discount_sp',       default: 0, props: { min: 0, step: 0.01 } },
      { name: 'std_ty_f_id_sp',    label: 'students.registerForm.fields.studentTypeFee', type: 'select', required: true, rowKey: 'st_ty_id',  param: 'std_ty_f_id_sp',
        optionsKey: 'student_type_fee_options', value: 'st_ty_id', nameKey: 'type_fee_name', placeholder: 'students.registerForm.ph.studentTypeFee', default: '' },
      { name: 'free_description_sp', label: 'students.registerForm.fields.freeDescription', type: 'select', rowKey: 'free_description', param: 'free_description_sp', default: '',
        options: [
          { value: 'Sabool',          label: 'students.registerForm.opts.sabool' },
          { value: 'Ilma Shaqaale',   label: 'students.registerForm.opts.ilmaShaqaale' },
          { value: 'Maxmuul',         label: 'students.registerForm.opts.maxmuul' },
          { value: 'Kaalin',          label: 'students.registerForm.opts.kaalin' },
        ],
        // Show only when the picked Type Fee row is "Free" (case-insensitive).
        showWhen: (form) => String(form.std_ty_f_id_sp_label ?? '').trim().toLowerCase() === 'free' },

      // Row 7: Bus | Bus Fee. (hidden when None bus picked) | Orphan
      { name: 'bus_id_sp',         label: 'students.registerForm.fields.bus',          type: 'select', required: true,  rowKey: 'bus_id',       param: 'bus_id_sp',
        optionsKey: 'bus_options', value: 'id', nameKey: 'bus_name', placeholder: 'students.registerForm.ph.bus', default: '' },
      { name: 'bus_fee_sp',        label: 'students.registerForm.fields.busFee',       type: 'number',                  rowKey: 'bus_fee',      param: 'bus_fee_sp',        default: 0, props: { min: 0, step: 0.01 },
        // Hide when the picked bus row is "None".
        showWhen: (form) => {
          const lbl = String(form.bus_id_sp_label ?? '').trim().toLowerCase();
          return lbl !== '' && lbl !== 'none';
        } },
      { name: 'orphan_status_sp',  label: 'students.registerForm.fields.orphanStatus', type: 'select',                  rowKey: 'orphan_status',     param: 'orphan_status_sp',     default: 'Not orphan',
        options: [
          { value: 'Not orphan',  label: 'students.registerForm.opts.notOrphan' },
          { value: 'No father',   label: 'students.registerForm.opts.noFather' },
          { value: 'No mother',   label: 'students.registerForm.opts.noMother' },
          { value: 'Both parent', label: 'students.registerForm.opts.bothParent' },
        ] },

      // Row 8: Disability | Refugee | Register Fee.
      { name: 'disability_status_sp', label: 'students.registerForm.fields.disabilityStatus', type: 'select',           rowKey: 'disability_status', param: 'disability_status_sp', default: 'No Disability',
        options: [
          { value: 'No Disability',     label: 'students.registerForm.opts.noDisability' },
          { value: 'Mental',            label: 'students.registerForm.opts.mental' },
          { value: 'Visual',            label: 'students.registerForm.opts.visual' },
          { value: 'Hearing',           label: 'students.registerForm.opts.hearing' },
          { value: 'Limbs (Movement)',  label: 'students.registerForm.opts.limbs' },
          { value: 'Gift/talented',     label: 'students.registerForm.opts.gifted' },
          { value: 'others',            label: 'students.registerForm.opts.others' },
        ] },
      { name: 'refugee_sp',        label: 'students.registerForm.fields.refugee',      type: 'select',                  rowKey: 'refugee',           param: 'refugee_sp',           default: 'Not Refugee',
        options: [
          { value: 'Not Refugee', label: 'students.registerForm.opts.notRefugee' },
          { value: 'IDP',         label: 'students.registerForm.opts.idp' },
          { value: 'Refugee',     label: 'students.registerForm.opts.refugee' },
        ] },
      { name: 'register_fee_sp',   label: 'students.registerForm.fields.registerFee',  type: 'number',                  rowKey: 'register_fee', param: 'register_fee_sp',   default: 0, props: { min: 0, step: 0.01 } },

      // Row 9: New academic Fee. | Image upload | Class
      { name: 'academic_fee_sp',   label: 'students.registerForm.fields.academicFee',  type: 'number',                  rowKey: 'academic_fee', param: 'academic_fee_sp',   default: 0, props: { min: 0, step: 0.01 } },
      { name: 'image_sp',          label: 'students.registerForm.fields.imageUrl',     type: 'image-upload',            rowKey: 'image',        param: 'image_sp',          default: '' },
      { name: 'cl_id_sp',          label: 'students.registerForm.fields.class',        type: 'select', required: true,  rowKey: 'cl_id',        param: 'cl_id_sp',
        optionsKey: 'class_options', value: 'cl_id', nameKey: 'class', placeholder: 'students.registerForm.ph.class', default: '' },

      // Row 10: Registeration Date.
      { name: 'reg_date_sp',       label: 'students.registerForm.fields.regDate',      type: 'date',                    rowKey: 'reg_date',     param: 'reg_date_sp',       default: () => new Date().toISOString().slice(0, 10) },

      // ===== Hidden defaults (function/database fills the rest) =====
      // SP-ga cusub wuxuu gudaha ka maamulayaa: p_type, state, std_state,
      // sc_state, resident_type, iyo a_y_id (active academic year). Sidaas
      // darteed kaliya u_br_id ayaa weli loo dirayaa session-ka.
      { name: 'u_br_id_sp',        type: 'hidden', param: 'u_br_id_sp',    default: getSessionUBrId },
    ],
  },
  {
    key: 'ExamSchedule',
    title: 'Exam Schedule',
    fn: 'exam_schedule_sp',
    idKey: 'ex_s_id',
    omitPId: true,
    omitPUsrId: true,
    idParam: 'ex_s_id_sp',
    gridCols: 2,
    modalSize: 'lg',
    fields: [
      { name: 'ex_r_id_sp', label: 'Exam Register', type: 'select', required: true, optionsKey: 'exam_reg_options', rowKey: 'ex_r_id', value: 'ex_reg_id', nameKey: 'exam_reg_name', param: 'ex_r_id_sp', default: '' },
      { name: 'cl_id_sp', label: 'Class', type: 'select', required: true, optionsKey: 'class_simple_options', rowKey: 'cl_id', value: 'cl_id', nameKey: 'class_name', param: 'cl_id_sp', default: '' },
      { name: 'sub_cl_id_sp', label: 'Subject', type: 'select', required: true, optionsKey: 'subject_class_options', dependsOn: { cl_id: 'cl_id_sp' }, rowKey: 'sub_cl_id', value: 'sub_cl_id', nameKey: 'subject_name', param: 'sub_cl_id_sp', default: '' },
      { name: 'day_id_sp', label: 'Day', type: 'select', required: true, optionsKey: 'day_options', rowKey: 'd_id', value: 'd_id', nameKey: 'day', param: 'day_id_sp', default: '' },
      { name: 'per_id_sp', label: 'Period', type: 'select', required: true, optionsKey: 'period_options', rowKey: 'pr_id', value: 'pr_id', nameKey: 'period', param: 'per_id_sp', default: '' },
      { name: 'sh_id_sp', label: 'Shift', type: 'select', required: true, optionsKey: 'shift_options', rowKey: 'sh_id', value: 'sh_id', nameKey: 'shift', param: 'sh_id_sp', default: '' },
      { name: 'exam_date_sp', label: 'Exam Date', type: 'date', required: true, rowKey: 'exam_date', param: 'exam_date_sp' },
      { name: 'start_time_sp', label: 'Start Time', type: 'time', required: true, rowKey: 'start_time', param: 'start_time_sp' },
      { name: 'end_time_sp', label: 'End Time', type: 'time', required: true, rowKey: 'end_time', param: 'end_time_sp' },
      { name: 'u_br_id_sp', type: 'hidden', param: 'u_br_id_sp', default: getSessionUBrId },
    ],
  },
  {
    key: 'Complain',
    title: 'Complain',
    fn: 'complain_sp',
    idKey: 'id',
    omitPId: true,
    omitPUsrId: true,
    idParam: 'com_id_sp',
    gridCols: 2,
    fields: [
      { name: 'name_sp',     label: 'complain.fields.name',    type: 'text',     required: true, rowKey: 'name',     param: 'name_sp' },
      { name: 'phone_sp',    label: 'complain.fields.phone',   type: 'text',     required: true, rowKey: 'phone',    param: 'phone_sp' },
      { name: 'cabasho_sp',  label: 'complain.fields.comment', type: 'textarea', required: true, rows: 4, rowKey: 'comments', param: 'cabasho_sp' },
      { name: 'reg_date_sp', label: 'complain.fields.date',    type: 'date',     required: true, rowKey: 'reg_date', param: 'reg_date_sp', default: () => new Date().toISOString().slice(0, 10) },
      // Hidden defaults — keep complain_sp signature stable. The UI only
      // collects the four user-facing fields (Name / Phone / Comment / Date).
      { name: 'comp_type_sp', type: 'hidden', param: 'comp_type_sp', default: 'Other' },
      { name: 'student_sp',   type: 'hidden', param: 'student_sp',   default: '' },
      { name: 'teacher_sp',   type: 'hidden', param: 'teacher_sp',   default: '' },
      { name: 'u_br_id_sp',   type: 'hidden', param: 'u_br_id_sp',   default: getSessionUBrId },
    ],
  },
  {
    key: 'Result',
    title: 'Result',
    fn: 'result_sp',
    idKey: 'id',
    omitPUsrId: true,
    fields: [
      { name: 'p_student', type: 'hidden', param: 'p_student', default: 0 },
      { name: 'p_exam',    type: 'hidden', param: 'p_exam',    default: 0 },
      { name: 'p_subject', type: 'hidden', param: 'p_subject', default: 0 },
      { name: 'p_mark',    type: 'hidden', param: 'p_mark',    default: '0' },
      { name: 'p_user_id', type: 'hidden', param: 'p_user_id', default: getSessionUBrId },
    ],
  },
];

export const CRUD_CONFIG = Object.fromEntries(
  ENTITIES.map((e) => [e.key, generateCrudConfig(e)])
);
