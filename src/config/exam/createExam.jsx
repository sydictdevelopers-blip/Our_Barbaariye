import { FilePlus2 } from 'lucide-react';

export const createExamSection = {
  id: 'CreateExam',
  label: 'Create Exam',
  labelKey: 'menu.createExam',
  icon: FilePlus2,
  path: '/CreateExam',
  tabs: [
    {
      "id": "ExamSetting",
      "label": "Exam Setting",
      "labelKey": "tabs.examSetting",
      "entityKey": "ExamSetting",
      "modalKey": "ExamSetting",
      "icon": "Sliders",
      "queryName": "ExamSetting",
      "hiddenColumns": ["a_y_id"],
      "loadButtons": [
        { "id": "ExamSetting", "label": "Show Data", "labelKey": "action.showData", "icon": "Database" },
        { "id": "addNew", "label": "Add New", "labelKey": "entity.addNew", "icon": "Plus", "modalKey": "ExamSetting" }
      ]
    },
    {
      "id": "Exam",
      "label": "Exam",
      "labelKey": "tabs.exam",
      "entityKey": "Exam",
      "modalKey": "Exam",
      "icon": "FileCheck",
      "queryName": "Exam",
      "loadButtons": [
        { "id": "Exam", "label": "Show Data", "labelKey": "action.showData", "icon": "Database" },
        { "id": "addNew", "label": "Add New", "labelKey": "entity.addNew", "icon": "Plus", "modalKey": "Exam" }
      ]
    },
    {
      "id": "ExamRegister",
      "label": "Exam Register",
      "labelKey": "tabs.examRegister",
      "entityKey": "ExamRegister",
      "modalKey": "ExamRegister",
      "icon": "ClipboardList",
      "queryName": "ExamRegister",
      "showAcademicYearSelect": true,
      "hiddenColumns": ["a_y_id", "ex_id"],
      "loadButtons": [
        { "id": "ExamRegister", "label": "Show", "labelKey": "action.show", "icon": "Database" },
        { "id": "addNew", "label": "Add New", "labelKey": "entity.addNew", "icon": "Plus", "modalKey": "ExamRegister" }
      ]
    },
    {
      "id": "AssignClassExam",
      "label": "Assign Class Exam",
      "labelKey": "tabs.assignClassExam",
      "entityKey": "AssignClassExam",
      "modalKey": "AssignClassExam",
      "icon": "Layers",
      "queryName": "AssignClassExam",
      "showClassSelect": true,
      "showBatchSelect": true,
      "showAcademicYearSelect": true,
      "hiddenColumns": ["ID", "Result", "er_id", "cl_id", "b_id"],
      "hideEdit": true,
      "hideDelete": true,
      "hideAddNew": true,
      "loadButtons": [
        { "id": "AssignClassExamState", "label": "Exam State", "labelKey": "tabs.examState", "icon": "Activity", "actionModal": "ExamState" },
        { "id": "AssignClassExam", "label": "Show", "labelKey": "action.show", "icon": "Database" },
        { "id": "AssignClassExamShowAll", "label": "Show All", "labelKey": "action.showAll", "icon": "LayoutGrid", "requires": ["academic"] },
        { "id": "RemoveAssignByClass", "label": "Remove By Class", "labelKey": "tabs.removeByClass", "icon": "Trash2", "actionModal": "RemoveByClass" },
        { "id": "RemoveAssignByExam", "label": "Remove By Exam", "labelKey": "tabs.removeByExam", "icon": "Trash2", "actionModal": "RemoveByExam" }
      ]
    },
    {
      "id": "ExamSchedule",
      "label": "Exam Schedule",
      "labelKey": "tabs.examSchedule",
      "entityKey": "ExamSchedule",
      "modalKey": "ExamSchedule",
      "icon": "CalendarDays",
      "queryName": "ExamSchedule",
      "showLevelSelect": true,
      "showAcademicYearSelect": true,
      "showExamSelect": true,
      "hiddenColumns": ["ex_s_id", "d_id", "pr_id", "sub_cl_id", "sh_id", "cl_id", "ex_r_id"],
      "loadButtons": [
        { "id": "addNew", "label": "Add New", "labelKey": "entity.addNew", "icon": "Plus", "modalKey": "ExamSchedule", "isBulkAction": true, "requiresAcademic": true },
        { "id": "ExamSceduleShow", "label": "Show Data", "labelKey": "action.showData", "icon": "Database", "requires": ["academic", "exam", "level"] },
        { "id": "RemoveExamSchedule", "label": "Remove Exam Schedule", "labelKey": "tabs.removeExamSchedule", "icon": "Trash2", "actionModal": "ExamScheduleRemove", "requires": ["academic", "exam"] },
        { "id": "CopyExamSchedule", "label": "Copy", "labelKey": "action.copy", "icon": "Copy", "actionModal": "CopyExamSchedule" },
        { "id": "PrintExamSchedule", "label": "Print Exam Schedule", "labelKey": "tabs.printExamSchedule", "icon": "Printer", "actionModal": "PrintExamSchedule" }
      ]
    }
  ],
};
