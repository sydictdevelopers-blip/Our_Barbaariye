import { BookMarked } from 'lucide-react';

export const manageResultSection = {
  id: 'ManageResult',
  label: 'Manage Result',
  labelKey: 'menu.manageResult',
  icon: BookMarked,
  path: '/ManageResult',
  tabs: [
    {
      "id": "Result",
      "label": "Result",
      "labelKey": "tabs.result",
      "entityKey": "Result",
      "modalKey": "Result",
      "icon": "Users",
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
      "loadButtons": [
        { "id": "ClassExamDelete", "label": "Class Exam Delete", "icon": "Database", "inDevelopment": true },
        { "id": "SubjectExamDelete", "label": "Subject Exam Delete", "icon": "Database", "inDevelopment": true },
        { "id": "Result", "label": "Show Exam", "icon": "Database" },
        { "id": "EditExam", "label": "Edit Exam", "icon": "Database", "inDevelopment": true },
        { "id": "ResultAddNew", "label": "Add New", "icon": "Plus" }
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
      "showAcademicYearSelect": true,
      "showExamSelect": true,
      "loadButtons": [
        { "id": "ApproveExam", "label": "Show Data", "icon": "Database" },
        { "id": "addNew", "label": "Add New", "icon": "Plus", "modalKey": "ApproveExam" }
      ]
    },
    {
      "id": "SingleStudentResult",
      "label": "Single Student Result",
      "labelKey": "tabs.singleStudentResult",
      "entityKey": "SingleStudentResult",
      "modalKey": "SingleStudentResult",
      "icon": "PenTool",
      "queryName": "SingleStudentResult",
      "showClassSelect": true,
      "showBatchSelect": true,
      "showAcademicYearSelect": true,
      "showExamSelect": true,
      "showStudentSelect": true,
      "loadButtons": [
        { "id": "SingleStudentResult", "label": "Show Data", "icon": "Database" },
        { "id": "addNew", "label": "Add New", "icon": "Plus", "modalKey": "SingleStudentResult" }
      ]
    },
    {
      "id": "LockedExam",
      "label": "Locked Exam",
      "labelKey": "tabs.lockedExam",
      "entityKey": "LockedExam",
      "modalKey": "LockedExam",
      "icon": "FolderPlus",
      "queryName": "LockedExam",
      "showClassSelect": true,
      "showAcademicYearSelect": true,
      "showExamSelect": true,
      "loadButtons": [
        { "id": "LockedExam", "label": "Show Data", "icon": "Database" },
        { "id": "addNew", "label": "Add New", "icon": "Plus", "modalKey": "LockedExam" }
      ]
    },
    {
      "id": "ActivityMarks",
      "label": "Activity Marks",
      "labelKey": "tabs.activityMarks",
      "entityKey": "ActivityMarks",
      "modalKey": "ActivityMarks",
      "icon": "Hourglass",
      "queryName": "ActivityMarks",
      "showClassSelect": true,
      "showBatchSelect": true,
      "showAcademicYearSelect": true,
      "loadButtons": [
        { "id": "ActivityMarks", "label": "Show Data", "icon": "Database" },
        { "id": "addNew", "label": "Add New", "icon": "Plus", "modalKey": "ActivityMarks" }
      ]
    },
    {
      "id": "AttendenceMarks",
      "label": "Attendence Marks",
      "labelKey": "tabs.attendenceMarks",
      "entityKey": "AttendenceMarks",
      "modalKey": "AttendenceMarks",
      "icon": "Hourglass",
      "queryName": "AttendenceMarks",
      "showClassSelect": true,
      "showBatchSelect": true,
      "showAcademicYearSelect": true,
      "loadButtons": [
        { "id": "AttendenceMarks", "label": "Show Data", "icon": "Database" },
        { "id": "addNew", "label": "Add New", "icon": "Plus", "modalKey": "AttendenceMarks" }
      ]
    }
  ],
};
