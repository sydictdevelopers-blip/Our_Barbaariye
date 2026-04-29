import { BookMarked } from 'lucide-react';

export const createExamSection = {
  id: 'CreateExam',
  label: 'Create Exam',
  labelKey: 'menu.createExam',
  icon: BookMarked,
  path: '/CreateExam',
  tabs: [
    {
      "id": "ExamSetting",
      "label": "Exam Setting",
      "entityKey": "ExamSetting",
      "modalKey": "ExamSetting",
      "icon": "Database",
      "queryName": "ExamSetting",
      "loadButtons": [
        { "id": "ExamSetting", "label": "Show Data", "icon": "Database" },
        { "id": "addNew", "label": "Add New", "icon": "Plus", "modalKey": "ExamSetting" }
      ]
    },
    {
      "id": "Exam",
      "label": "Exam",
      "entityKey": "Exam",
      "modalKey": "Exam",
      "icon": "Database",
      "queryName": "Exam",
      "loadButtons": [
        { "id": "Exam", "label": "Show Data", "icon": "Database" },
        { "id": "addNew", "label": "Add New", "icon": "Plus", "modalKey": "Exam" }
      ]
    },
    {
      "id": "ExamRegister",
      "label": "Exam Register",
      "entityKey": "ExamRegister",
      "modalKey": "ExamRegister",
      "icon": "Database",
      "queryName": "ExamRegister",
      "showAcademicYearSelect": true,
      "hiddenColumns": ["a_y_id", "ex_id"],
      "loadButtons": [
        { "id": "ExamRegister", "label": "Show", "icon": "Database" },
        { "id": "addNew", "label": "Add New", "icon": "Plus", "modalKey": "ExamRegister" }
      ]
    },
    {
      "id": "AssignClassExam",
      "label": "Assign Class Exam",
      "entityKey": "AssignClassExam",
      "modalKey": "AssignClassExam",
      "icon": "Database",
      "queryName": "AssignClassExam",
      "showClassSelect": true,
      "showBatchSelect": true,
      "showAcademicYearSelect": true,
      "hiddenColumns": ["ID", "Result", "er_id", "cl_id", "b_id"],
      "loadButtons": [
        { "id": "addNew", "label": "Add New", "icon": "Plus", "modalKey": "AssignClassExam", "isBulkAction": true, "requiresAcademic": true },
        { "id": "GenerateAssignClassExam", "label": "Generate", "icon": "Database", "actionModal": "GenerateExam" },
        { "id": "AssignClassExamState", "label": "Exam State", "icon": "Database", "actionModal": "ExamState" },
        { "id": "AssignClassExam", "label": "Show", "icon": "Database" },
        { "id": "AssignClassExamShowAll", "label": "Show All", "icon": "Database", "requires": ["academic"] },
        { "id": "RemoveAssignByClass", "label": "Remove By Class", "icon": "Database", "actionModal": "RemoveByClass" },
        { "id": "RemoveAssignByExam", "label": "Remove By Exam", "icon": "Database", "actionModal": "RemoveByExam" }
      ]
    },
    {
      "id": "ExamSchedule",
      "label": "Exam Schedule",
      "entityKey": "ExamSchedule",
      "modalKey": "ExamSchedule",
      "icon": "Database",
      "queryName": "ExamSchedule",
      "showLevelSelect": true,
      "showAcademicYearSelect": true,
      "showExamSelect": true,
      "hiddenColumns": ["ex_s_id", "d_id", "pr_id", "sub_cl_id", "sh_id", "cl_id", "ex_r_id"],
      "loadButtons": [
        { "id": "addNew", "label": "Add New", "icon": "Plus", "modalKey": "ExamSchedule" },
        { "id": "ExamSchedule", "label": "Show Data", "icon": "Database" },
        { "id": "RemoveExamSchedule", "label": "Remove Exam Schedule", "icon": "Database", "inDevelopment": true },
        { "id": "CopyExamSchedule", "label": "Copy", "icon": "Database", "inDevelopment": true },
        { "id": "PrintExamSchedule", "label": "Print Exam Schedule", "icon": "Database", "inDevelopment": true }
      ]
    }
  ],
};
