import { BookMarked } from 'lucide-react';

export const examServiceSection = {
  id: 'ExamService',
  label: 'Exam Service',
  labelKey: 'menu.examService',
  icon: BookMarked,
  path: '/ExamService',
  tabs: [
    {
      "id": "Room",
      "label": "Room",
      "labelKey": "tabs.room",
      "entityKey": "Room",
      "modalKey": "Room",
      "icon": "Users",
      "queryName": "Room",
      "hiddenColumns": ["u_br_id", "br_id"],
      "loadButtons": [
        { "id": "Room", "label": "SHOW DATA", "labelKey": "entity.showData", "icon": "Database" },
        { "id": "addNew", "label": "ADD NEW", "labelKey": "entity.addNew", "icon": "Plus", "modalKey": "Room" }
      ]
    },
    {
      "id": "AssignStudentRoom",
      "label": "Assign Student Room",
      "labelKey": "tabs.assignStudentRoom",
      "icon": "Timer"
    },
    {
      "id": "ExamAttendence",
      "label": "Exam Attendence",
      "labelKey": "tabs.examAttendence",
      "icon": "PenTool"
    },
    {
      "id": "AssignTeacherRoom",
      "label": "Assign Teacher Room",
      "labelKey": "tabs.assignTeacherRoom",
      "icon": "FolderPlus"
    }
  ],
};
