import { BookMarked } from 'lucide-react';

export const examSettingSection = {
  id: 'ExamSetting',
  label: 'Exam Setting',
  labelKey: 'menu.examSetting',
  icon: BookMarked,
  path: '/ExamSetting',
  tabs: [
    {
      "id": "QuestionsTable",
      "label": "Questions Table",
      "labelKey": "tabs.questionsTable",
      "icon": "Users"
    },
    {
      "id": "ExamInstruction",
      "label": "Exam Instruction",
      "labelKey": "tabs.examInstruction",
      "entityKey": "ExamInstruction",
      "modalKey": "ExamInstruction",
      "icon": "ClipboardCheck",
      "queryName": "ExamInstruction",
      "loadButtons": [
        { "id": "addNew", "label": "ADD NEW", "labelKey": "entity.addNew", "icon": "Plus", "modalKey": "ExamInstruction" },
        { "id": "ExamInstruction", "label": "SHOW DATA", "labelKey": "entity.showData", "icon": "Database" }
      ]
    },
    {
      "id": "GenerateExam",
      "label": "Generate Exam",
      "labelKey": "tabs.generateExam",
      "entityKey": "GenerateExam",
      "modalKey": "GenerateExam",
      "icon": "PenTool",
      "queryName": "GenerateExam",
      "loadButtons": [
        { "id": "addNew", "label": "ADD NEW", "labelKey": "entity.addNew", "icon": "Plus", "modalKey": "GenerateExam" },
        { "id": "GenerateExam", "label": "SHOW DATA", "labelKey": "entity.showData", "icon": "Database" }
      ]
    },
    {
      "id": "CreateOnlineExam",
      "label": "Create Online Exam",
      "labelKey": "tabs.createOnlineExam",
      "entityKey": "CreateOnlineExam",
      "modalKey": "CreateOnlineExam",
      "icon": "FolderPlus",
      "queryName": "CreateOnlineExam",
      "loadButtons": [
        { "id": "addNew", "label": "ADD NEW", "labelKey": "entity.addNew", "icon": "Plus", "modalKey": "CreateOnlineExam" },
        { "id": "CreateOnlineExam", "label": "SHOW DATA", "labelKey": "entity.showData", "icon": "Database" }
      ]
    },
    {
      "id": "ExamCopy",
      "label": "Exam Copy",
      "labelKey": "tabs.examCopy",
      "entityKey": "ExamCopy",
      "modalKey": "ExamCopy",
      "icon": "Hourglass",
      "queryName": "ExamCopy",
      "loadButtons": [
        { "id": "addNew", "label": "ADD NEW", "labelKey": "entity.addNew", "icon": "Plus", "modalKey": "ExamCopy" },
        { "id": "ExamCopy", "label": "SHOW DATA", "labelKey": "entity.showData", "icon": "Database" }
      ]
    }
  ],
};
