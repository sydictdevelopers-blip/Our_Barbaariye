import { Sliders } from 'lucide-react';

export const examSettingSection = {
  id: 'ExamSetting',
  label: 'Exam Setting',
  labelKey: 'menu.examSetting',
  icon: Sliders,
  path: '/ExamSetting',
  tabs: [
    {
      "id": "QuestionsTable",
      "label": "Questions Table",
      "labelKey": "tabs.questionsTable",
      "icon": "HelpCircle"
    },
    {
      "id": "ExamInstruction",
      "label": "Exam Instruction",
      "labelKey": "tabs.examInstruction",
      "entityKey": "ExamInstruction",
      "modalKey": "ExamInstruction",
      "icon": "Info",
      "queryName": "ExamInstruction",
      "loadButtons": [
        { "id": "ExamInstruction", "label": "Show Data", "labelKey": "action.showData", "icon": "Database" },
        { "id": "addNew", "label": "Add New", "labelKey": "entity.addNew", "icon": "Plus", "modalKey": "ExamInstruction" }
      ]
    },
    {
      "id": "GenerateExam",
      "label": "Generate Exam",
      "labelKey": "tabs.generateExam",
      "entityKey": "GenerateExam",
      "modalKey": "GenerateExam",
      "icon": "Sparkles",
      "queryName": "GenerateExam",
      "loadButtons": [
        { "id": "GenerateExam", "label": "Show Data", "labelKey": "action.showData", "icon": "Database" },
        { "id": "addNew", "label": "Add New", "labelKey": "entity.addNew", "icon": "Plus", "modalKey": "GenerateExam" }
      ]
    },
    {
      "id": "CreateOnlineExam",
      "label": "Create Online Exam",
      "labelKey": "tabs.createOnlineExam",
      "entityKey": "CreateOnlineExam",
      "modalKey": "CreateOnlineExam",
      "icon": "Globe",
      "queryName": "CreateOnlineExam",
      "loadButtons": [
        { "id": "CreateOnlineExam", "label": "Show Data", "labelKey": "action.showData", "icon": "Database" },
        { "id": "addNew", "label": "Add New", "labelKey": "entity.addNew", "icon": "Plus", "modalKey": "CreateOnlineExam" }
      ]
    },
    {
      "id": "ExamCopy",
      "label": "Exam Copy",
      "labelKey": "tabs.examCopy",
      "entityKey": "ExamCopy",
      "modalKey": "ExamCopy",
      "icon": "Copy",
      "queryName": "ExamCopy",
      "loadButtons": [
        { "id": "ExamCopy", "label": "Show Data", "labelKey": "action.showData", "icon": "Database" },
        { "id": "addNew", "label": "Add New", "labelKey": "entity.addNew", "icon": "Plus", "modalKey": "ExamCopy" }
      ]
    }
  ],
};
