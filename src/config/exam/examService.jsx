import { Wrench } from 'lucide-react';

export const examServiceSection = {
  id: 'ExamService',
  label: 'Exam Service',
  labelKey: 'menu.examService',
  icon: Wrench,
  path: '/ExamService',
  tabs: [
    {
      "id": "Room",
      "label": "Room",
      "labelKey": "tabs.room",
      "entityKey": "Room",
      "modalKey": "Room",
      "icon": "DoorOpen",
      "queryName": "Room",
      "hiddenColumns": ["u_br_id", "br_id"],
      "loadButtons": [
        { "id": "Room", "label": "Show Data", "labelKey": "action.showData", "icon": "Database" },
        { "id": "addNew", "label": "Add New", "labelKey": "entity.addNew", "icon": "Plus", "modalKey": "Room" }
      ]
    },
    {
      "id": "AssignStudentRoom",
      "label": "Assign Student Room",
      "labelKey": "tabs.assignStudentRoom",
      "icon": "UserPlus"
    },
    {
      "id": "ExamAttendence",
      "label": "Exam Attendance",
      "labelKey": "tabs.examAttendence",
      "icon": "ClipboardCheck"
    },
    {
      "id": "AssignTeacherRoom",
      "label": "Assign Teacher Room",
      "labelKey": "tabs.assignTeacherRoom",
      "icon": "UserCog"
    }
  ],
};
