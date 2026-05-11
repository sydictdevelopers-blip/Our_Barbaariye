import {
  LayoutDashboard,
  BookOpen,
  GraduationCap,
  Activity,
  ShieldCheck,
  Video,
  FileCheck,
  MessageSquare,
  CalendarClock,
  Settings2,
  ArrowLeftRight,
  BookMarked,
  ListChecks,
  UserCog,
  CalendarDays,
  Plane,
  ClipboardCheck,
  Users,
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
        label: 'Academic Setup',
        labelKey: 'menu.academicSetup',
        icon: Settings2,
        path: '/AcademicSetup',
        tabs: [
          {
            "id": "ClassSetup",
            "label": "Class",
            "labelKey": "tabs.class",
            "entityKey": "ClassSetup",
            "modalKey": "ClassSetup",
            "icon": "GraduationCap",
            "queryName": "ClassSetup",
            "hiddenColumns": ["lev_id", "gr_id", "sh_id", "br_id", "u_br_id"],
            "loadButtons": [
              { "id": "ClassSetup", "label": "Show Data", "labelKey": "action.showData", "icon": "Database" },
              { "id": "addNew", "label": "Add New", "labelKey": "entity.addNew", "icon": "Plus", "modalKey": "ClassSetup" }
            ]
          },
          {
            "id": "ClassFormaster",
            "label": "Class Formaster",
            "labelKey": "tabs.classFormaster",
            "entityKey": "ClassFormaster",
            "modalKey": "ClassFormaster",
            "icon": "Users",
            "queryName": "ClassFormaster",
            "showAcademicYearSelect": true,
            "hiddenColumns": ["cl_id", "emp_id", "std_id", "a_y_id", "state", "academic_name"],
            "loadButtons": [
              { "id": "ClassFormaster", "label": "Show Data", "labelKey": "action.showData", "icon": "Database" },
              { "id": "addNew", "label": "Add New", "labelKey": "entity.addNew", "icon": "Plus", "modalKey": "ClassFormaster" }
            ]
          },
          {
            "id": "SubjectsSetup",
            "label": "Subjects Setup",
            "labelKey": "tabs.subjectsSetup",
            "entityKey": "SubjectsSetup",
            "modalKey": "SubjectsSetup",
            "icon": "BookMarked",
            "queryName": "SubjectsSetup",
            "loadButtons": [
              { "id": "SubjectsSetup", "label": "Show Data", "labelKey": "action.showData", "icon": "Database" },
              { "id": "addNew", "label": "Add New", "labelKey": "entity.addNew", "icon": "Plus", "modalKey": "SubjectsSetup" }
            ]
          },
          {
            "id": "SubjectClassSetup",
            "label": "Subject Class Setup",
            "labelKey": "tabs.subjectClassSetup",
            "entityKey": "SubjectClassSetup",
            "modalKey": "SubjectClassSetup",
            "icon": "BookOpen",
            "queryName": "SubjectClassSetup",
            "showAcademicYearSelect": true,
            "showClassSelect": true,
            "hiddenColumns": ["cl_id", "sub_id", "emp_id", "u_br_id", "a_y_id", "academic_name"],
            "loadButtons": [
              { "id": "SubjectClassSetup", "label": "Show Data", "labelKey": "action.showData", "icon": "Database" },
              { "id": "addNew", "label": "Add New", "labelKey": "entity.addNew", "icon": "Plus", "modalKey": "SubjectClassSetup", "isBulkAction": true }
            ]
          },
          {
            "id": "LevelSetup",
            "label": "Level Setup",
            "labelKey": "tabs.levelSetup",
            "entityKey": "LevelSetup",
            "modalKey": "LevelSetup",
            "icon": "Layers",
            "queryName": "LevelSetup",
            "hiddenColumns": ["l_ty_id"],
            "loadButtons": [
              { "id": "LevelSetup", "label": "Show Data", "labelKey": "action.showData", "icon": "Database" },
              { "id": "addNew", "label": "Add New", "labelKey": "entity.addNew", "icon": "Plus", "modalKey": "LevelSetup" }
            ]
          },
          {
            "id": "academicYeartab",
            "label": "Academic Year",
            "labelKey": "tabs.academicYear",
            "entityKey": "academicYeartab",
            "modalKey": "academicYeartab",
            "icon": "CalendarDays",
            "queryName": "academicYeartab",
            "loadButtons": [
              { "id": "academicYeartab", "label": "Show Data", "labelKey": "action.showData", "icon": "Database" },
              { "id": "addNew", "label": "Add New", "labelKey": "entity.addNew", "icon": "Plus", "modalKey": "academicYeartab" }
            ]
          }
        ]
        ,
      },
      {
        id: 'AcademicTransfer',
        label: 'Academic Transfer',
        labelKey: 'menu.academicTransfer',
        icon: ArrowLeftRight,
        path: '/AcademicTransfer',
        tabs: [
          {
            "id": "BranchTransfer",
            "label": "Branch Transfer",
            "labelKey": "tabs.branchTransfer",
            "entityKey": "BranchTransfer",
            "modalKey": "BranchTransfer",
            "icon": "Building2",
            "queryName": "BranchTransfer",
            "loadButtons": [
              { "id": "BranchTransfer", "label": "Show Data", "labelKey": "action.showData", "icon": "Database" },
              { "id": "addNew", "label": "Add New", "labelKey": "entity.addNew", "icon": "Plus", "modalKey": "BranchTransfer" }
            ]
          },
          {
            "id": "AcademicTransfer",
            "label": "Academic Transfer",
            "labelKey": "tabs.academicTransfer",
            "entityKey": "AcademicTransfer",
            "modalKey": "AcademicTransfer",
            "icon": "ArrowLeftRight",
            "queryName": "AcademicTransfer",
            "loadButtons": [
              { "id": "AcademicTransfer", "label": "Show Data", "labelKey": "action.showData", "icon": "Database" },
              { "id": "addNew", "label": "Add New", "labelKey": "entity.addNew", "icon": "Plus", "modalKey": "AcademicTransfer" }
            ]
          },
          {
            "id": "ClassTransfer",
            "label": "Class Transfer",
            "labelKey": "tabs.classTransfer",
            "entityKey": "ClassTransfer",
            "modalKey": "ClassTransfer",
            "icon": "Layers",
            "queryName": "ClassTransfer",
            "loadButtons": [
              { "id": "ClassTransfer", "label": "Show Data", "labelKey": "action.showData", "icon": "Database" },
              { "id": "addNew", "label": "Add New", "labelKey": "entity.addNew", "icon": "Plus", "modalKey": "ClassTransfer" }
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
            "labelKey": "tabs.teacherSyllabus",
            "icon": "BookOpen"
          }
        ]
        ,
      },
      {
        id: 'LessonPlan',
        label: 'Lesson Plan',
        labelKey: 'menu.lessonPlan',
        icon: ListChecks,
        path: '/LessonPlan',
        tabs: [
          {
            "id": "LessonActivityMarks",
            "label": "Lesson Activity Marks",
            "labelKey": "tabs.lessonActivityMarks",
            "entityKey": "LessonActivityMark",
            "modalKey": "LessonActivityMark",
            "icon": "BarChart3",
            "queryName": "LessonActivityMark",
            "loadButtons": [
              { "id": "LessonActivityMark", "label": "Show Data", "labelKey": "action.showData", "icon": "Database" },
              { "id": "addNew", "label": "Add New", "labelKey": "entity.addNew", "icon": "Plus", "modalKey": "LessonActivityMark" }
            ]
          },
          {
            "id": "LessonActivityResults",
            "label": "Lesson Activity Results",
            "labelKey": "tabs.lessonActivityResults",
            "entityKey": "LessonActivityResults",
            "modalKey": "LessonActivityResults",
            "icon": "ClipboardCheck",
            "queryName": "LessonActivityResults",
            "loadButtons": [
              { "id": "LessonActivityResults", "label": "Show Data", "labelKey": "action.showData", "icon": "Database" },
              { "id": "addNew", "label": "Add New", "labelKey": "entity.addNew", "icon": "Plus", "modalKey": "LessonActivityResults" }
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
    icon: GraduationCap,
    children: [
      {
        id: 'StudentsOffice',
        label: 'Students',
        labelKey: 'menu.students',
        icon: GraduationCap,
        path: '/StudentsOffice',
        tabs: [
          {
            "id": "Students",
            "label": "Students",
            "labelKey": "tabs.students",
            "entityKey": "Students",
            "modalKey": "Students",
            "icon": "GraduationCap",
            "queryName": "Students",
            "loadButtons": [
              { "id": "ShowStudents", "label": "Show Data", "labelKey": "action.showData", "icon": "Database" },
              { "id": "addNew", "label": "Add New", "labelKey": "entity.addNew", "icon": "Plus", "modalKey": "Students" },
              { "id": "Addimage", "label": "Add Image", "labelKey": "students.addImage", "icon": "Image", "modalKey": "Students" },
              { "id": "EditAllResponsible", "label": "Edit All Responsible", "labelKey": "students.editAllResponsibles", "icon": "Users", "modalKey": "Students" },
              { "id": "Editallemail", "label": "Edit All Email", "labelKey": "students.editAllEmail", "icon": "Mail", "modalKey": "Students" },
              { "id": "ImportExcel", "label": "Import Excel", "labelKey": "students.importExcel", "icon": "Upload", "modalKey": "Students" }
            ]
          },
          {
            "id": "Responsible",
            "label": "Responsible",
            "labelKey": "tabs.responsible",
            "entityKey": "Responsible",
            "modalKey": "ResponsibleModal",
            "icon": "UserCheck",
            "queryName": "Responsible",
            "showResponsibleSelect": true,
            "hiddenColumns": ["state"],
            "loadButtons": [
              { "id": "StudentResponsible", "label": "Show Data", "labelKey": "action.showData", "icon": "Database", "viewOnly": true },
              { "id": "allResponsible", "label": "All", "labelKey": "responsible.all", "icon": "LayoutGrid" },
              { "id": "change_Responsible", "label": "Change", "labelKey": "responsible.change", "icon": "RefreshCw", "isBulkAction": true },
              { "id": "showprentwithnostudents", "label": "Show Parent With No Students", "labelKey": "responsible.showParentWithNoStudents", "icon": "UserX" },
              { "id": "Deleteprentwithnostudents", "label": "Delete Parent With No Students", "labelKey": "responsible.deleteParentWithNoStudents", "icon": "Trash2", "deleteAction": "del_responsible_with_no_std_spv", "previewQueryId": "showprentwithnostudents" },
              { "id": "Add_new_responsible", "label": "Add New", "labelKey": "entity.addNew", "icon": "Plus", "modalKey": "ResponsibleModal" }
            ]
          },
          {
            "id": "studentstate",
            "label": "Student State",
            "labelKey": "tabs.studentState",
            "entityKey": "studentstate",
            "modalKey": "studentstate",
            "icon": "Activity",
            "queryName": "studentstate",
            "loadButtons": [
              { "id": "showdatastudentstate", "label": "Show Data", "labelKey": "action.showData", "icon": "Database" },
              { "id": "addnew", "label": "Add New", "labelKey": "entity.addNew", "icon": "Plus" },
              { "id": "mergestudent", "label": "Merge Student", "labelKey": "studentStateTab.mergeStudent", "icon": "GitMerge", "modalKey": "studentstate" }
            ]
          },
          {
            "id": "bus",
            "label": "Bus",
            "labelKey": "tabs.bus",
            "entityKey": "bus",
            "modalKey": "bus",
            "icon": "Bus",
            "queryName": "bus",
            "hiddenColumns": ["emp_id", "u_br_id"],
            "loadButtons": [
              { "id": "bus", "label": "Show Data", "labelKey": "action.showData", "icon": "Database" },
              { "id": "addNew", "label": "Add New", "labelKey": "entity.addNew", "icon": "Plus", "modalKey": "bus" }
            ]
          },
          {
            "id": "update school",
            "label": "Update School",
            "labelKey": "tabs.updateSchool",
            "entityKey": "update school",
            "modalKey": "update school",
            "icon": "Building2",
            "queryName": "update school",
            "hideDelete": true,
            "hideAddNew": true,
            "loadButtons": [
              { "id": "update school", "label": "Show Data", "labelKey": "action.showData", "icon": "Database" }
            ]
          },
          {
            "id": "Studentinfo",
            "label": "Student Info",
            "labelKey": "tabs.studentInfo",
            "entityKey": "Studentinfo",
            "modalKey": "Studentinfo",
            "icon": "User",
            "queryName": "Studentinfo",
            "showStudentSelect": true,
            "loadButtons": [
              { "id": "showdata_Studentinfo", "label": "Show Data", "labelKey": "action.showData", "icon": "Eye", "modalKey": "Studentinfo" }
            ]
          }
        ],
      },
    ],
  },
  {
    id: 'HRM',
    label: 'HRM',
    labelKey: 'menu.hrm',
    icon: UserCog,
    children: [
      {
        id: 'EmployeeOffice',
        label: 'Employee',
        labelKey: 'menu.employeeOffice',
        icon: UserCog,
        path: '/EmployeeOffice',
        tabs: [
          {
            id: 'Employees',
            label: 'Employee',
            labelKey: 'tabs.employees',
            entityKey: 'Employees',
            modalKey: 'Employees',
            icon: 'UserCog',
            queryName: 'Employees',
            // emp_id muujiyay (waa muhiim si user-ku u arko); p_id/sh_id/j_id/tt_id-da raw FK ah ayaa la qariyay
            hiddenColumns: ['p_id', 'sh_id', 'j_id', 'tt_id', 'br_id', 'u_br_id', 'ad_id', 'image'],
            loadButtons: [
              { id: 'Employees', label: 'Show Data', labelKey: 'action.showData', icon: 'Database' },
              { id: 'addNew', label: 'Add New Employee', labelKey: 'hrm.employees.addNew', icon: 'Plus', modalKey: 'Employees' },
            ],
          },
          {
            id: 'Jobs',
            label: 'Jobs',
            labelKey: 'tabs.jobs',
            entityKey: 'Jobs',
            modalKey: 'Jobs',
            icon: 'BookMarked',
            queryName: 'Jobs',
            hiddenColumns: [],
            loadButtons: [
              { id: 'Jobs', label: 'Show Data', labelKey: 'action.showData', icon: 'Database' },
              { id: 'addNew', label: 'Add New Job', labelKey: 'hrm.jobs.addNew', icon: 'Plus', modalKey: 'Jobs' },
            ],
          },
          {
            id: 'TeacherStates',
            label: 'Teacher State',
            labelKey: 'tabs.teacherStates',
            entityKey: 'TeacherStates',
            modalKey: 'TeacherStates',
            icon: 'ListChecks',
            queryName: 'TeacherStates',
            hiddenColumns: ['emp_id'],
            // teacher_state_sp ku jira DB-da wuxuu kaliya maamulaa 'insert'.
            // Update/Delete looga baahna, sidaa darteed actions-ka safka ayaa
            // la qariyay si row-ku la-ma-bedeli-karo u muuqdo.
            hideEdit: true,
            hideDelete: true,
            loadButtons: [
              { id: 'TeacherStates', label: 'Show Data', labelKey: 'action.showData', icon: 'Database' },
              { id: 'addNew', label: 'Add New State', labelKey: 'hrm.teacherStates.addNew', icon: 'Plus', modalKey: 'TeacherStates' },
            ],
          },
        ],
      },
      {
        id: 'EmployeeSchedule',
        label: 'Employee Schedule',
        labelKey: 'menu.employeeSchedule',
        icon: CalendarDays,
        path: '/EmployeeSchedule',
      },
      {
        id: 'EmployeeVocation',
        label: 'Employee Vocation',
        labelKey: 'menu.employeeVocation',
        icon: Plane,
        path: '/EmployeeVocation',
      },
    ],
  },
  {
    id: 'ActivityManagement',
    label: 'Activity Management',
    labelKey: 'menu.activityManagement',
    icon: Activity,
    children: [
      {
        id: 'ActivityManagement',
        label: 'Activity',
        labelKey: 'menu.activity',
        icon: Activity,
        path: '/ActivityManagement',
        tabs: [
          {
            "id": "Performance",
            "label": "Performance",
            "labelKey": "tabs.performance",
            "entityKey": "Performance",
            "modalKey": "Performance",
            "icon": "Activity",
            "queryName": "Performance",
            "loadButtons": [
              { "id": "Performance", "label": "Show Data", "labelKey": "action.showData", "icon": "Database" },
              { "id": "addNew", "label": "Add New", "labelKey": "entity.addNew", "icon": "Plus", "modalKey": "Performance" }
            ]
          },
          {
            "id": "StudentPerformance",
            "label": "Student Performance",
            "labelKey": "tabs.studentPerformance",
            "entityKey": "StudentPerformance",
            "modalKey": "StudentPerformance",
            "icon": "BarChart3",
            "queryName": "StudentPerformance",
            "showStudentSelect": true,
            "studentOptionsQuery": "StudentPerformance_body_query",
            "hideEdit": true,
            "loadButtons": [
              { "id": "StudentPerformance", "label": "Show Data", "labelKey": "action.showData", "icon": "Database" },
              { "id": "addNew", "label": "Add New", "labelKey": "entity.addNew", "icon": "Plus", "modalKey": "StudentPerformance" }
            ]
          },
          {
            "id": "StudentPerformanceEdit",
            "label": "Student Performance Edit",
            "labelKey": "tabs.studentPerformanceEdit",
            "icon": "Pencil"
          }
        ],
      },
    ],
  },
  {
    id: 'ComplainManagement',
    label: 'Complaint Management',
    labelKey: 'menu.complainManagement',
    icon: MessageSquare,
    path: '/ComplainManagement',
    tabs: [
      {
        id: 'Complain',
        label: 'Complain',
        labelKey: 'tabs.complain',
        entityKey: 'Complain',
        modalKey: 'Complain',
        icon: 'MessageSquare',
        queryName: 'Complain',
        hiddenColumns: ['username'],
        loadButtons: [
          { id: 'Complain', label: 'Show Data', labelKey: 'action.showData', icon: 'Database' },
          { id: 'addNew',   label: 'Add New',  labelKey: 'entity.addNew',   icon: 'Plus', modalKey: 'Complain' },
        ],
      },
      {
        id: 'ComplainDone',
        label: 'Complaint Done',
        labelKey: 'tabs.complainDone',
        icon: 'CheckCircle2',
      },
    ],
  },
  {
    id: 'AttendanceManagement',
    label: 'Attendance Management',
    labelKey: 'menu.attendanceManagement',
    icon: ClipboardCheck,
    children: [
      {
        id: 'StudentAttendance',
        label: 'Student',
        labelKey: 'menu.studentAttendance',
        icon: GraduationCap,
        path: '/student_attendence',
        tabs: [
          {
            id: 'StudentAttendance',
            label: 'Student Attendance',
            labelKey: 'tabs.studentAttendance',
            icon: 'Users',
          },
          {
            id: 'StudentAbsents',
            label: 'Student Absents',
            labelKey: 'tabs.studentAbsents',
            icon: 'Clock',
          },
          {
            id: 'AttendanceEdit',
            label: 'Attendance Edit',
            labelKey: 'tabs.attendanceEdit',
            icon: 'Pencil',
          },
        ],
      },
      {
        id: 'EmployeeAttendance',
        label: 'Employee',
        labelKey: 'menu.employeeAttendance',
        icon: Users,
        path: '/employee_attendence',
        tabs: [],
      },
    ],
  },
  {
    id: 'MeetingMinutes',
    label: 'Meeting Minutes',
    labelKey: 'menu.meetingMinutes',
    icon: CalendarClock,
    path: '/MeetingMinutes',
    tabs: [
      {
        id: 'MeetingMinutes',
        label: 'Meeting Minutes',
        labelKey: 'tabs.meetingMinutes',
        icon: 'CalendarClock',
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
  },
  {
    id: 'userPrivilege',
    label: 'User Privilege',
    labelKey: 'menu.userPrivilege',
    icon: ShieldCheck,
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
