import {
LayoutDashboard,
  GraduationCap,
  BookOpen,
  Database,
  Plus,
  DollarSign,
  Users,
  ClipboardList,
  BookMarked,
  UserPlus,
} from 'lucide-react';

export const defaultMenuItems = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, path: '/' },
  {
    id: 'academic',
    label: 'Academic Office',
    icon: BookOpen,
    children: [
      {
        id: 'AcademicSetup',
        label: 'Academic setup',
        icon: BookMarked,
        path: '/AcademicSetup',
        tabs: [
          {
            "id": "ClassSetup",
            "label": "Class",
            "entityKey": "ClassSetup",
            "modalKey": "ClassSetup",
            "icon": "Database",
            "queryName": "ClassSetup", 
            "showAcademicYearSelect": true,
            "loadButtons": [
              { "id": "ClassSetup", "label": "Class Setup", "icon": "Database" },
              { "id": "addNew", "label": "Add new", "icon": "Plus", "modalKey": "ClassSetup" }
            ]
          },
          {
            "id": "ClassFormaster",
            "label": "Class Formaster",
            "entityKey": "ClassFormaster",
            "modalKey": "ClassFormaster",
            "icon": "Database",
            "queryName": "ClassFormaster",
            "showAcademicYearSelect": true,
            "loadButtons": [
              { "id": "ClassFormaster", "label": "Go to Academic Transfer", "icon": "Database" },
              { "id": "addNew", "label": "Add new", "icon": "Plus", "modalKey": "ClassFormaster" }
            ]
          },
          {
            "id": "SubjectsSetup",
            "label": "Subjects Setup",
            "entityKey": "SubjectsSetup",
            "modalKey": "SubjectsSetup",
            "icon": "Database",
            "queryName": "SubjectsSetup",
            "loadButtons": [
              { "id": "ClassFormaster", "label": "Class Formaster", "icon": "Database" },
              { "id": "addNew", "label": "Add new", "icon": "Plus", "modalKey": "ClassFormaster" }
            ]
          },
          {
            "id": "SubjectClassSetup",
            "label": "Subject Class Setup",
            "entityKey": "SubjectClassSetup",
            "modalKey": "SubjectClassSetup",
            "icon": "Database",
            "queryName": "SubjectClassSetup",
            "loadButtons": [
              { "id": "SubjectClassSetup", "label": "Subject Class Setup", "icon": "Database" },
              { "id": "addNew", "label": "Add new", "icon": "Plus", "modalKey": "SubjectClassSetup" }
            ]
          },
          {
            "id": "LevelSetup",
            "label": "Level Setup",
            "entityKey": "LevelSetup",
            "modalKey": "LevelSetup",
            "icon": "Database",
            "queryName": "LevelSetup",
            "loadButtons": [
              { "id": "LevelSetup", "label": "Level Setup", "icon": "Database" },
              { "id": "addNew", "label": "Add new", "icon": "Plus", "modalKey": "LevelSetup" }
            ]
          },
          {
            "id": "academicYeartab",
            "label": "Academic Year",
            "entityKey": "academicYeartab",
            "modalKey": "academicYeartab",
            "icon": "Database",
            "queryName": "academicYeartab",
            "loadButtons": [
              { "id": "academicYeartab", "label": "Academic Year", "icon": "Database" },
              { "id": "addNew", "label": "Add new", "icon": "Plus", "modalKey": "SubjectClassSetup" }
            ]
          }
        ]
        ,
      },
      {
        id: 'AcademicTransfer',
        label: 'Academic transfer',
        icon: BookMarked,
        path: '/AcademicTransfer',
        tabs: [
          {
            "id": "BranchTransfer",
            "label": "Branch",
            "entityKey": "BranchTransfer",
            "modalKey": "BranchTransfer",
            "icon": "Database",
            "queryName": "BranchTransfer",
            "loadButtons": [
              { "id": "BranchTransfer", "label": "Branch Transfer", "icon": "Database" },
              { "id": "addNew", "label": "Add new", "icon": "Plus", "modalKey": "BranchTransfer" }
            ]
          },
          {
            "id": "AcademicTransfer",
            "label": "Academic Transfer",
            "entityKey": "AcademicTransfer",
            "modalKey": "AcademicTransfer",
            "icon": "Database",
            "queryName": "AcademicTransfer",
            "loadButtons": [
              { "id": "AcademicTransfer", "label": "Academic Transfer", "icon": "Database" },
              { "id": "addNew", "label": "Add new", "icon": "Plus", "modalKey": "AcademicTransfer" }
            ]
          },
          {
            "id": "ClassTransfer",
            "label": "Class Transfer",
            "entityKey": "ClassTransfer",
            "modalKey": "ClassTransfer",
            "icon": "Database",
            "queryName": "ClassTransfer",
            "loadButtons": [
              { "id": "ClassTransfer", "label": "Class Transfer", "icon": "Database" },
              { "id": "addNew", "label": "Add new", "icon": "Plus", "modalKey": "ClassTransfer" }
            ]
          } 
        ]
        ,
      },
      {
        id: 'AcademicSaylapus',
        label: 'Academic Saylapus',
        icon: BookMarked,
        path: '/AcademicSaylapus',
        tabs: [
          {
            "id": "BranchTransfer",
            "label": "Branch",
            "entityKey": "BranchTransfer",
            "modalKey": "BranchTransfer",
            "icon": "Database",
            "queryName": "BranchTransfer",
            "loadButtons": [
              { "id": "BranchTransfer", "label": "Branch Transfer", "icon": "Database" },
              { "id": "addNew", "label": "Add new", "icon": "Plus", "modalKey": "BranchTransfer" }
            ]
          }
        ]
        ,
      },
      {
        id: 'LessonPlan',
        label: 'Lesson Plan',
        icon: BookMarked,
        path: '/LessonPlan',
        tabs: [
          {
            "id": "LessonActivityMarks",
            "label": "Lesson Activity Mark",
            "entityKey": "LessonActivityMark",
            "modalKey": "LessonActivityMark",
            "icon": "Database",
            "queryName": "LessonActivityMark",
            "loadButtons": [
              { "id": "LessonActivityMark", "label": "Lesson Activity Mark", "icon": "Database" },
              { "id": "addNew", "label": "Add new", "icon": "Plus", "modalKey": "LessonActivityMark" }
            ]
          },
          {
            "id": "LessonActivityResults",
            "label": "Lesson Activity Results",
            "entityKey": "LessonActivityResults",     
            "modalKey": "LessonActivityResults",  
            "icon": "Database",
            "queryName": "LessonActivityResults",
            "loadButtons": [
              { "id": "LessonActivityResults", "label": "Lesson Activity Results", "icon": "Database" },
              { "id": "addNew", "label": "Add new", "icon": "Plus", "modalKey": "BranchTransfer" }
            ]
          }
        ]
        ,
      },
    ],
  },
  {
    id: 'StudentsOffice',
    label: 'Students Office',    
    icon: BookOpen,
    children: [
      {
        id: 'StudentsOffice',
        label: 'Students',
        icon: BookMarked,
        path: '/StudentsOffice',
        tabs: [
          {
            "id": "Students",
            "label": "Students",      
            "entityKey": "Students",
            "modalKey": "Students",
            "icon": "Database",
            "queryName": "Students",
            "loadButtons": [
              
              { "id": "ShowStudents", "label": "Show Students", "icon": "Database" },
              { "id": "addNew", "label": "Add new", "icon": "Plus", "modalKey": "Students" },
              { "id": "Addimage", "label": "Add image", "icon": "Plus", "modalKey": "Students" },
              { "id": "EditAllResponsible", "label": "Edit All Responsible", "icon": "Plus", "modalKey": "Students" },
              { "id": "Editallemail", "label": "Edit all email", "icon": "Plus", "modalKey": "Students" },
              { "id": "IMORTEXCEL ", "label": "imort Excel file", "icon": "Plus", "modalKey": "Students" },
            ]
          },
          {
            "id": "Responsible",
            "label": "Responsible",
            "entityKey": "Responsible",
            "modalKey": "Responsible",
            "icon": "Database",
            "queryName": "Responsible",
            "loadButtons": [
              { "id": "showData_Responsible", "label": "Show Responsible", "icon": "Database" },
              { "id": "All_Responsible", "label": "All Responsible", "icon": "Plus", "modalKey": "Responsible" },
              { "id": "change_Responsible", "label": "Change Responsible", "icon": "Plus", "modalKey": "Responsible" },
              { "id": "showprentwithnostudents", "label": "Show parent with no students", "icon": "Plus", "modalKey": "Responsible" },
              { "id": "Deleteprentwithnostudents", "label": "Delete parent with no students", "icon": "Plus", "modalKey": "Responsible" },
              { "id": "Add_new_responsible", "label": "Add new responsible", "icon": "Plus", "modalKey": "Responsible" },

            ]
          },
          {
            "id": "studentstate",
            "label": "Student State",
            "entityKey": "studentstate",
            "modalKey": "studentstate",
            "icon": "Database",
            "queryName": "studentstate",
            "loadButtons": [
              { "id": "addnew", "label": "ADD NEW", "icon": "Database" },
              { "id": "mergestudent", "label": "Merge Student", "icon": "Plus", "modalKey": "studentstate" },
              { "id": "showdatastudentstate", "label": "Show data student", "icon": "Plus", "modalKey": "studentstate" },
              
            ]
          },
          {
            "id": "bus",
            "label": "Bus",
            "entityKey": "bus",
            "modalKey": "bus",
            "icon": "Database",
            "queryName": "bus",
            "loadButtons": [
              { "id": "addnew_bus", "label": "ADD NEW", "icon": "Database" },
              { "id": "showdata_bus", "label": "Show data bus", "icon": "Plus", "modalKey": "bus" },
              
            ]
          },
          {
            "id": "update school",
            "label": "Update School",
            "entityKey": "bus",
            "modalKey": "update school",
            "icon": "Database",
            "queryName": "update school",
            "loadButtons": [
               { "id": "showdata_update school", "label": "Show data update school", "icon": "Plus", "modalKey": "update school" },
              
            ]
          },
          {
            "id": "Studentinfo",
            "label": "Student info",
            "entityKey": "Studentinfo",
            "modalKey": "Studentinfo",
            "icon": "Database",
            "queryName": "Studentinfo",
            "showStudentSelect": true,
            "loadButtons": [
              { "id": "showdata_Studentinfo", "label": "Show data Studentinfo", "icon": "Plus", "modalKey": "Studentinfo" },
              
            ]
          },
        ],
      },
    ],
  },
  {
    id: 'userPrivilege',
    label: 'User Privillage',
    icon: Users,
    path: '/user-privilege',
  },
];

/** Walks menu tree, finds item by path, returns its tabs */
function findItemByPath(items, path) {
  for (const item of items) {
    if (!item) continue;
    if (item.path === path) return item;
    if (item.children) {
      const found = findItemByPath(item.children, path);
      if (found) return found;
    }
  }
  return null;
}

/** Parent menu ids that contain a child with this path (so they should be open) */
export function getOpenMenuIdsForPath(items, path) {
  const open = {};
  for (const item of items) {
    if (item.children?.some((c) => c && c.path === path)) open[item.id] = true;
  }
  return open;
}

/** Get tabs for a sidebar link by path */
export function getTabsForPath(path) {
  const item = findItemByPath(defaultMenuItems, path);
  return item?.tabs ?? [];
}
