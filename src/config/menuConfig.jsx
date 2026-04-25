import {
  LayoutDashboard,
  BookOpen,
  Users,
  ClipboardList,
  BookMarked,
  Video,
} from 'lucide-react';

export const defaultMenuItems = [
  { id: 'dashboard', label: 'Dashboard', labelKey: 'menu.dashboard', icon: LayoutDashboard, path: '/' },
  {
    id: 'academic',
    label: 'Academic Office',
    labelKey: 'menu.academic',
    icon: BookOpen,
    children: [
      {
        id: 'AcademicSetup',
        label: 'Academic setup',
        labelKey: 'menu.academicSetup',
        icon: BookMarked,
        path: '/AcademicSetup',
        tabs: [
          {
            "id": "ClassSetup",
            "label": "Class",
            "labelKey": "tabs.class",
            "entityKey": "ClassSetup",
            "modalKey": "ClassSetup",
            "icon": "Database",
            "queryName": "ClassSetup",
            "hiddenColumns": ["lev_id", "gr_id", "sh_id", "br_id", "u_br_id"],
            "loadButtons": [
              { "id": "ClassSetup", "label": "Class Setup", "labelKey": "tabs.classSetup", "icon": "Database" },
              { "id": "addNew", "label": "Add new", "labelKey": "entity.addNew", "icon": "Plus", "modalKey": "ClassSetup" }
            ]
          },
          {
            "id": "ClassFormaster",
            "label": "Class Formaster",
            "labelKey": "tabs.classFormaster",
            "entityKey": "ClassFormaster",
            "modalKey": "ClassFormaster",
            "icon": "Database",
            "queryName": "ClassFormaster",
            "showAcademicYearSelect": true,
            "hiddenColumns": ["cl_id", "emp_id", "std_id", "a_y_id", "state", "academic_name"],
            "loadButtons": [
              { "id": "ClassFormaster", "label": "Go to Academic Transfer", "labelKey": "tabs.classFormaster", "icon": "Database" },
              { "id": "addNew", "label": "Add new", "labelKey": "entity.addNew", "icon": "Plus", "modalKey": "ClassFormaster" }
            ]
          },
          {
            "id": "SubjectsSetup",
            "label": "Subjects Setup",
            "labelKey": "tabs.subjectsSetup",
            "entityKey": "SubjectsSetup",
            "modalKey": "SubjectsSetup",
            "icon": "Database",
            "queryName": "SubjectsSetup",
            "loadButtons": [
              { "id": "SubjectsSetup", "label": "Show Subjects", "labelKey": "tabs.subjectsSetup", "icon": "Database" },
              { "id": "addNew", "label": "Add new", "labelKey": "entity.addNew", "icon": "Plus", "modalKey": "SubjectsSetup" }
            ]
          },
          {
            "id": "SubjectClassSetup",
            "label": "Subject Class Setup",
            "labelKey": "tabs.subjectClassSetup",
            "entityKey": "SubjectClassSetup",
            "modalKey": "SubjectClassSetup",
            "icon": "Database",
            "queryName": "SubjectClassSetup",
            "showAcademicYearSelect": true,
            "showClassSelect": true,
            "hiddenColumns": ["cl_id", "sub_id", "emp_id", "u_br_id", "a_y_id", "academic_name"],
            "loadButtons": [
              { "id": "SubjectClassSetup", "label": "Subject Class Setup", "labelKey": "tabs.subjectClassSetup", "icon": "Database" },
              { "id": "addNew", "label": "Add new", "labelKey": "entity.addNew", "icon": "Plus", "isBulkAction": true }
            ]
          },
          {
            "id": "LevelSetup",
            "label": "Level Setup",
            "labelKey": "tabs.levelSetup",
            "entityKey": "LevelSetup",
            "modalKey": "LevelSetup",
            "icon": "Database",
            "queryName": "LevelSetup",
            "hiddenColumns": ["l_ty_id"],
            "loadButtons": [
              { "id": "LevelSetup", "label": "Level Setup", "labelKey": "tabs.levelSetup", "icon": "Database" },
              { "id": "addNew", "label": "Add new", "labelKey": "entity.addNew", "icon": "Plus", "modalKey": "LevelSetup" }
            ]
          },
          {
            "id": "academicYeartab",
            "label": "Academic Year",
            "labelKey": "tabs.academicYear",
            "entityKey": "academicYeartab",
            "modalKey": "academicYeartab",
            "icon": "Database",
            "queryName": "academicYeartab",
            "loadButtons": [
              { "id": "academicYeartab", "label": "Academic Year", "labelKey": "tabs.academicYear", "icon": "Database" },
              { "id": "addNew", "label": "Add new", "labelKey": "entity.addNew", "icon": "Plus", "modalKey": "academicYeartab" }
            ]
          }
        ]
        ,
      },
      {
        id: 'AcademicTransfer',
        label: 'Academic transfer',
        labelKey: 'menu.academicTransfer',
        icon: BookMarked,
        path: '/AcademicTransfer',
        tabs: [
          {
            "id": "BranchTransfer",
            "label": "Branch Transfer",
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
        label: 'Academic Syllabus',
        labelKey: 'menu.academicSaylapus',
        icon: BookMarked,
        path: '/AcademicSaylapus',
        tabs: [
          {
            "id": "TeacherSyllabus",
            "label": "Teacher Syllabus",
            "icon": "Database"
          }
        ]
        ,
      },
      {
        id: 'LessonPlan',
        label: 'Lesson Plan',
        labelKey: 'menu.lessonPlan',
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
              { "id": "addNew", "label": "Add new", "icon": "Plus", "modalKey": "LessonActivityResults" }
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
    labelKey: 'menu.studentsOffice',
    icon: BookOpen,
    children: [
      {
        id: 'StudentsOffice',
        label: 'Students',
        labelKey: 'menu.students',
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
            "modalKey": "ResponsibleModal",
            "icon": "Database",
            "queryName": "Responsible",
            "showResponsibleSelect": true,
            "hiddenColumns": ["state"],
            "loadButtons": [
              { "id": "StudentResponsible", "label": "SHOW DATA", "icon": "Database" },
              { "id": "Responsible", "label": "ALL", "icon": "Database" },
              { "id": "change_Responsible", "label": "CHANGE", "icon": "Plus", "isBulkAction": true },
              { "id": "showprentwithnostudents", "label": "SHOW PARENT WITH NO STUDENTS", "icon": "Database" },
              { "id": "Deleteprentwithnostudents", "label": "DELETE PARENT WITH NO STUDENTS", "icon": "Plus", "modalKey": "Responsible" },
              { "id": "Add_new_responsible", "label": "ADD NEW", "icon": "Plus", "modalKey": "ResponsibleModal" }
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
            "entityKey": "update school",
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
    id: 'ActivityManagement',
    label: 'Activity Management',
    labelKey: 'menu.activityManagement',
    icon: ClipboardList,
    children: [
      {
        id: 'ActivityManagement',
        label: 'Activity',
        labelKey: 'menu.activity',
        icon: BookMarked,
        path: '/ActivityManagement',
        tabs: [
          {
            "id": "Activity",
            "label": "Activity",
            "entityKey": "Activity",
            "modalKey": "Activity",
            "icon": "Database",
            "queryName": "Activity",
            "loadButtons": [
              { "id": "Activity", "label": "Show Data", "icon": "Database" },
              { "id": "addNew", "label": "Add New", "icon": "Plus", "modalKey": "Activity" }
            ]
          },
          {
            "id": "SubjectActivity",
            "label": "Subject Activity",
            "entityKey": "SubjectActivity",
            "modalKey": "SubjectActivity",
            "icon": "Database",
            "queryName": "SubjectActivity",
            "loadButtons": [
              { "id": "SubjectActivity", "label": "Show Data", "icon": "Database" },
              { "id": "addNew", "label": "Add New", "icon": "Plus", "modalKey": "SubjectActivity" }
            ]
          },
          {
            "id": "StudentActivityEdit",
            "label": "Student Activity Edit",
            "entityKey": "StudentActivityEdit",
            "modalKey": "StudentActivityEdit",
            "icon": "Database",
            "queryName": "StudentActivityEdit",
            "loadButtons": [
              { "id": "StudentActivityEdit", "label": "Show Data", "icon": "Database" },
              { "id": "addNew", "label": "Add New", "icon": "Plus", "modalKey": "StudentActivityEdit" }
            ]
          }
        ],
      },
    ],
  },
  {
    id: 'userPrivilege',
    label: 'User Privillage',
    labelKey: 'menu.userPrivilege',
    icon: Users,
    path: '/user-privilege',
  },
  {
    id: 'moduleVideos',
    label: 'Module Videos',
    labelKey: 'menu.moduleVideos',
    icon: Video,
    path: '/module-videos',
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
