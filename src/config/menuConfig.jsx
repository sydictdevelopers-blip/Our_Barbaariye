import {
  LayoutDashboard,
  BookOpen,
  Users,
  ClipboardList,
  BookMarked,
  Video,
  FileCheck,
} from 'lucide-react';
import { createExamSection } from './exam/createExam';
import { examServiceSection } from './exam/examService';
import { examSettingSection } from './exam/examSetting';
import { manageResultSection } from './exam/manageResult';
import { appUsersSection } from './exam/appUsers';

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
              { "id": "allResponsible", "label": "ALL", "icon": "Database" },
              { "id": "change_Responsible", "label": "CHANGE", "icon": "Plus", "isBulkAction": true },
              { "id": "showprentwithnostudents", "label": "SHOW PARENT WITH NO STUDENTS", "icon": "Database" },
              { "id": "Deleteprentwithnostudents", "label": "DELETE PARENT WITH NO STUDENTS", "icon": "Plus", "deleteAction": "del_responsible_with_no_std_spv", "previewQueryId": "showprentwithnostudents" },
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
            "hiddenColumns": ["emp_id", "u_br_id"],
            "loadButtons": [
              { "id": "bus", "label": "Show Bus", "icon": "Database" },
              { "id": "addNew", "label": "Add new", "icon": "Plus", "modalKey": "bus" }
            ]
          },
          {
            "id": "update school",
            "label": "Update School",
            "entityKey": "update school",
            "modalKey": "update school",
            "icon": "Database",
            "queryName": "update school",
            "hideDelete": true,
            "hideAddNew": true,
            "loadButtons": [
              { "id": "update school", "label": "Show Schools", "icon": "Database" }
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
            "id": "Performance",
            "label": "Performance",
            "entityKey": "Performance",
            "modalKey": "Performance",
            "icon": "Database",
            "queryName": "Performance",
            "loadButtons": [
              { "id": "Performance", "label": "Show Data", "icon": "Database" },
              { "id": "addNew", "label": "Add New", "icon": "Plus", "modalKey": "Performance" }
            ]
          },
          {
            "id": "StudentPerformance",
            "label": "Student Performance",
            "entityKey": "StudentPerformance",
            "modalKey": "StudentPerformance",
            "icon": "Database",
            "queryName": "StudentPerformance",
            "showStudentSelect": true,
            "studentOptionsQuery": "student_performance",
            "hideEdit": true,
            "loadButtons": [
              { "id": "StudentPerformance", "label": "Show Data", "icon": "Database" },
              { "id": "addNew", "label": "Add New", "icon": "Plus", "modalKey": "StudentPerformance" }
            ]
          },
          {
            "id": "StudentPerformanceEdit",
            "label": "Student Performance Edit",
            "entityKey": "StudentPerformanceEdit",
            "modalKey": "StudentPerformanceEdit",
            "icon": "Database",
            "queryName": "StudentPerformanceEdit",
            "loadButtons": [
              { "id": "StudentPerformanceEdit", "label": "Show Data", "icon": "Database" },
              { "id": "addNew", "label": "Add New", "icon": "Plus", "modalKey": "StudentPerformanceEdit" }
            ]
          }
        ],
      },
    ],
  },
  {
    id: 'ExamManagement',
    label: 'Exam Management',
    labelKey: 'menu.examManagement',
    icon: FileCheck,
    children: [
      createExamSection,
      examServiceSection,
      examSettingSection,
      manageResultSection,
      appUsersSection,
    ],
    icon: ClipboardList,
    children: [
      {
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
              { "id": "addNew", "label": "Add New", "icon": "Plus", "modalKey": "AssignClassExam" },
              { "id": "GenerateAssignClassExam", "label": "Generate", "icon": "Database", "inDevelopment": true },
              { "id": "AssignClassExamState", "label": "Exam State", "icon": "Database", "inDevelopment": true },
              { "id": "AssignClassExam", "label": "Show", "icon": "Database" },
              { "id": "AssignClassExamShowAll", "label": "Show All", "icon": "Database", "inDevelopment": true },
              { "id": "RemoveAssignByClass", "label": "Remove By Class", "icon": "Database", "inDevelopment": true },
              { "id": "RemoveAssignByExam", "label": "Remove By Exam", "icon": "Database", "inDevelopment": true }
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
        ]
      },
      {
        id: 'ExamService',
        label: 'Exam Service',
        labelKey: 'menu.examService',
        icon: BookMarked,
        path: '/ExamService',
        tabs: []
      },
      {
        id: 'ExamSetup',
        label: 'Exam Setting',
        labelKey: 'menu.examSetting',
        icon: BookMarked,
        path: '/ExamSetup',
        tabs: []
      },
      {
        id: 'ManageResult',
        label: 'Manage Result',
        labelKey: 'menu.manageResult',
        icon: BookMarked,
        path: '/ManageResult',
        tabs: []
      },
      {
        id: 'AppUsers',
        label: 'App Users',
        labelKey: 'menu.appUsers',
        icon: BookMarked,
        path: '/AppUsers',
        tabs: []
      }
    ]
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
