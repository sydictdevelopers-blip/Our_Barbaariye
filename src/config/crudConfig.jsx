function toLabel(name) {
  return name.split('_').map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');
}

function generateCrudConfig(schema) {
  const { title, fn, endpoint, idKey = 'id', fields = [] } = schema;

  const fromRow = (row) => {
    const out = { id: row[idKey] ?? row.id };
    fields.forEach((f) => {
      // Try value, rowKey, name so both l_ty_id and l_ty_id_sp (and level_name) work from DB
      const keyCandidates = [f.value, f.rowKey, f.name].filter(Boolean);
      const keys = [...new Set([...keyCandidates, f.name])];
      let val = keys.map((k) => row[k]).find((v) => v != null);
      if (val == null) val = f.type === 'number' ? (f.default ?? 0) : (f.type === 'checkbox' ? false : (f.default ?? ''));
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
      if (f.type === 'number') out[key] = isNaN(parseFloat(val)) ? (f.default ?? 0) : parseFloat(val);
      else if (f.type === 'checkbox') out[key] = val ? '1' : '0';
      else if (f.type === 'hidden') {
        const v = (val == null || val === '') ? f.default : val;
        out[key] = (v ?? '').toString().trim();
      }
      else out[key] = (val ?? '').toString().trim();
    });
    return out;
  };

  const validate = (form) => {
    const e = {};
    fields.filter((f) => f.required).forEach((f) => {
      const v = form[f.name];
      const invalid = f.type === 'checkbox' ? v !== true : !(v ?? '').toString().trim();
      if (invalid) e[f.name] = `${toLabel(f.label || f.name)} required`;
    });
    return e;
  };

  const normalizedFields = fields.map((f) => ({
    name: f.name,
    label: f.label ?? toLabel(f.name),
    placeholder: f.placeholder ?? `e.g. ${f.name}`,
    type: f.type ?? 'text',
    options: f.options,
    optionsKey: f.optionsKey,
    value: f.value ?? f.rowKey,
    nameKey: f.nameKey ?? f.labelRowKey,
    rows: f.rows,
    default: f.default,
    ...(f.props && { props: f.props }),
  }));

  return {
    title,
    ...(fn && { fn }),
    ...(endpoint && { endpoint }),
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
      { name: 'class_sp', label: 'Class', type: 'text', required: true, rowKey: 'class', param: 'class_sp' },
      { name: 'lev_id_sp', label: 'Level ID', type: 'number', rowKey: 'lev_id', param: 'lev_id_sp', default: 0, props: { min: 0 } },
      { name: 'gr_id_sp', label: 'Grade ID', type: 'number', rowKey: 'gr_id', param: 'gr_id_sp', default: 0, props: { min: 0 } },
      { name: 'state_sp', label: 'State', type: 'select', rowKey: 'state', param: 'state_sp', options: [{ value: 'Active', label: 'Active' }, { value: 'Inactive', label: 'Inactive' }], default: 'Active' },
      { name: 'br_id_sp', label: 'Branch ID', type: 'hidden', param: 'br_id_sp', default: 1 },
      { name: 'u_br_id_sp', label: 'U Branch ID', type: 'hidden', param: 'u_br_id_sp', default: 1 },
    ],
  },
  {
    key: 'ResponsibleModal',
    title: 'Responsible Modal',
    fn: 'responsible_sp',
    idKey: 'res_id_sp',
    omitPId: true,
    omitPUsrId: true,
    idParam: 'res_id',
   
    fields: [
      { name: 'responsible_name_sp', label: 'Responsible Name', type: 'text', required: true, rowKey: 'p_id', param: 'p_id_sp' },
      { name: 'responsible_phone_sp', label: 'Responsible Phone', type: 'text', rowKey: 'phone', param: 'p_name_sp' },
      { name: 'responsible_email_sp', label: 'Responsible Email', type: 'text', rowKey: 'state', param: 'tel_sp' },
      { name: 'responsible_address_sp', label: 'Responsible Address', type: 'text', rowKey: 'responsible_address', param: 'sex_sp' },
      { name: 'responsible_city_sp', label: 'Responsible City', type: 'text', rowKey: 'responsible_city', param: 'email_sp' },
      { name: 'responsible_state_sp', label: 'Responsible State', type: 'text', rowKey: 'responsible_state', param: 'ad_id_sp' },
      { name: 'responsible_zip_sp', label: 'Responsible Zip', type: 'text', rowKey: 'responsible_zip', param: 'p_type_sp' },
      { name: 'responsible_country_sp', label: 'Responsible Country', type: 'text', rowKey: 'responsible_country', param: 'phone_sp' },
      { name: 'responsible_state_sp', label: 'Responsible State', type: 'text', rowKey: 'responsible_state', param: 'state_sp' },
      { name: 'u_br_id_sp', label: 'U Branch ID', type: 'hidden', param: 'u_br_id_sp', default: 1 },
     
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
    key: 'subject',
    title: 'Subject Form',
    fn: 'subject_sp',
    idKey: 'subject_id',
    fields: [
      { name: 'subject_name', label: 'Subject Name', type: 'text', required: true, param: 'p_name_sp' },
      { name: 'subject_code', label: 'Subject Code', type: 'text', param: 'p_code_sp' },
      { name: 'description', label: 'Description', type: 'textarea', rows: 3, param: 'p_description_sp' },
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
    key: 'Activity',
    title: 'Activity',
    fn: 'activity_sp',
    idKey: 'act_id',
    omitPId: true,
    omitPUsrId: true,
    idParam: 'act_id_sp',
    fields: [
      { name: 'activity_name_sp', label: 'Activity Name', type: 'text', required: true, rowKey: 'activity_name', param: 'activity_name_sp' },
      { name: 'description_sp', label: 'Description', type: 'textarea', rows: 3, rowKey: 'description', param: 'description_sp' },
      { name: 'state_sp', label: 'State', type: 'select', rowKey: 'state', param: 'state_sp', options: [{ value: 'Active', label: 'Active' }, { value: 'Inactive', label: 'Inactive' }], default: 'Active' },
      { name: 'br_id_sp', type: 'hidden', param: 'br_id_sp', default: 1 },
      { name: 'u_br_id_sp', type: 'hidden', param: 'u_br_id_sp', default: 1 },
    ],
  },
  {
    key: 'SubjectActivity',
    title: 'Subject Activity',
    fn: 'subject_activity_sp',
    idKey: 'sub_act_id',
    omitPId: true,
    omitPUsrId: true,
    idParam: 'sub_act_id_sp',
    fields: [
      { name: 'act_id_sp', label: 'Activity', type: 'select', required: true, optionsKey: 'activity_options', rowKey: 'act_id', param: 'act_id_sp', default: '' },
      { name: 'subject_id_sp', label: 'Subject', type: 'select', required: true, optionsKey: 'subjects', rowKey: 'subject_id', param: 'subject_id_sp', default: '' },
      { name: 'max_marks_sp', label: 'Max Marks', type: 'number', rowKey: 'max_marks', param: 'max_marks_sp', default: 100, props: { min: 0, step: 0.01 } },
      { name: 'state_sp', label: 'State', type: 'select', rowKey: 'state', param: 'state_sp', options: [{ value: 'Active', label: 'Active' }, { value: 'Inactive', label: 'Inactive' }], default: 'Active' },
    ],
  },
  {
    key: 'StudentActivityEdit',
    title: 'Student Activity Edit',
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
];

export const CRUD_CONFIG = Object.fromEntries(
  ENTITIES.map((e) => [e.key, generateCrudConfig(e)])
);
