import { BarChart3 } from 'lucide-react';

export const manageResultSection = {
  id: 'ManageResult',
  label: 'Manage Result',
  labelKey: 'menu.manageResult',
  icon: BarChart3,
  path: '/ManageResult',
  tabs: [
    {
      "id": "Result",
      "label": "Result",
      "labelKey": "tabs.result",
      "entityKey": "Result",
      "modalKey": "Result",
      "icon": "BarChart3",
      "queryName": "Result",
      "showClassSelect": true,
      "showBatchSelect": true,
      "showAcademicYearSelect": true,
      "showSubjectSelect": true,
      "showExamSelect": true,
      "academicYearOptionsQuery": "result_academic_options",
      "subjectOptionsQuery": "result_subject_options",
      "examOptionsQuery": "result_exam_options",
      "hiddenColumns": ["gender", "max_mark", "message", "cl_id", "b_id", "a_y_id", "sub_id", "ex_id"],
      "hideEdit": true,
      "hideAddNew": true,
      "loadButtons": [
        {
          "id": "ClassExamDelete",
          "label": "Class Exam Delete",
          "labelKey": "manageResult.classExamDelete",
          "icon": "Trash2",
          "deleteAction": "class_exam_delete_sp",
          "confirmText": "Tani waxay tirtirtaa imtixaanka oo dhan ee fasalka. Sii wad?"
        },
        {
          "id": "SubjectExamDelete",
          "label": "Subject Exam Delete",
          "labelKey": "manageResult.subjectExamDelete",
          "icon": "Trash2",
          "deleteAction": "subject_exam_delete_sp",
          "withSubject": true,
          "confirmText": "Tani waxay tirtirtaa keliya maaddada doorashada. Sii wad?"
        },
        { "id": "Result",       "label": "Show Exam", "labelKey": "manageResult.showExam", "icon": "Database" },
        { "id": "EditExam",     "label": "Edit Exam", "labelKey": "manageResult.editExam", "icon": "Pencil" },
        { "id": "ResultAddNew", "label": "Add New",   "labelKey": "entity.addNew",         "icon": "Plus" }
      ]
    },
    {
      "id": "ApproveExam",
      "label": "Approve Exam",
      "labelKey": "tabs.approveExam",
      "entityKey": "ApproveExam",
      "modalKey": "ApproveExam",
      "icon": "ClipboardCheck",
      "queryName": "ApproveExam",
      "showClassSelect": true,
      "hiddenColumns": ["cl_id"],
      "hideAddNew": true,
      "loadButtons": [
        {
          "id": "ApproveByClass",
          "label": "Approve By Class",
          "labelKey": "manageResult.approveByClass",
          "icon": "CheckCircle",
          "bulkAction": "approve",
          "requiresClass": true,
          "confirmText": "Tani waxay ansixisaa dhammaan saxnaaynta sugaya ee fasalka. Sii wad?"
        },
        {
          "id": "ApproveAll",
          "label": "Approve All",
          "labelKey": "manageResult.approveAll",
          "icon": "CheckCheck",
          "bulkAction": "approve",
          "confirmText": "Tani waxay ansixisaa DHAMMAAN saxnaaynta sugaya ee fasalada oo dhan. Sii wad?"
        },
        {
          "id": "CancelAll",
          "label": "Cancel All",
          "labelKey": "manageResult.cancelAll",
          "icon": "XCircle",
          "bulkAction": "cancel",
          "confirmText": "Tani waxay tirtirtaa DHAMMAAN saxnaaynta sugaya. Sii wad?"
        },
        { "id": "ApproveExam", "label": "Show Data All", "labelKey": "manageResult.showDataAll", "icon": "LayoutGrid", "skipFilterValidation": true }
      ]
    },
    {
      "id": "SingleStudentResult",
      "label": "Single Student Result",
      "labelKey": "tabs.singleStudentResult",
      "entityKey": "SingleStudentResult",
      "modalKey": "SingleStudentResult",
      "icon": "User",
      "queryName": "SingleStudentResult",
      "showClassSelect": true,
      "showBatchSelect": true,
      "showAcademicYearSelect": true,
      "showExamSelect": true,
      "showStudentSelect": true,
      "loadButtons": [
        { "id": "SingleStudentResult", "label": "Show Data", "labelKey": "action.showData", "icon": "Database" },
        { "id": "addNew", "label": "Add New", "labelKey": "entity.addNew", "icon": "Plus", "modalKey": "SingleStudentResult" }
      ]
    },
    {
      "id": "LockedExam",
      "label": "Locked Exam",
      "labelKey": "tabs.lockedExam",
      "entityKey": "LockedExam",
      "modalKey": "LockedExam",
      "icon": "Lock",
      "queryName": "LockedExam",
      "showClassSelect": true,
      "showAcademicYearSelect": true,
      "showExamSelect": true,
      "loadButtons": [
        { "id": "LockedExam", "label": "Show Data", "labelKey": "action.showData", "icon": "Database" },
        { "id": "addNew", "label": "Add New", "labelKey": "entity.addNew", "icon": "Plus", "modalKey": "LockedExam" }
      ]
    },
    {
      "id": "ActivityMarks",
      "label": "Activity Marks",
      "labelKey": "tabs.activityMarks",
      "entityKey": "ActivityMarks",
      "modalKey": "ActivityMarks",
      "icon": "Activity",
      "queryName": "ActivityMarks",
      "showClassSelect": true,
      "showBatchSelect": true,
      "showAcademicYearSelect": true,
      "loadButtons": [
        { "id": "ActivityMarks", "label": "Show Data", "labelKey": "action.showData", "icon": "Database" },
        { "id": "addNew", "label": "Add New", "labelKey": "entity.addNew", "icon": "Plus", "modalKey": "ActivityMarks" }
      ]
    },
    {
      "id": "AttendenceMarks",
      "label": "Attendance Marks",
      "labelKey": "tabs.attendenceMarks",
      "entityKey": "AttendenceMarks",
      "modalKey": "AttendenceMarks",
      "icon": "ClipboardCheck",
      "queryName": "AttendenceMarks",
      "showClassSelect": true,
      "showBatchSelect": true,
      "showAcademicYearSelect": true,
      "loadButtons": [
        { "id": "AttendenceMarks", "label": "Show Data", "labelKey": "action.showData", "icon": "Database" },
        { "id": "addNew", "label": "Add New", "labelKey": "entity.addNew", "icon": "Plus", "modalKey": "AttendenceMarks" }
      ]
    }
  ],
};
