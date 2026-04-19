import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

/* ──────────────────────────────────────────────────────────────
   ALL TRANSLATIONS LIVE HERE — ONE FILE, EASY TO ACCESS
   ──────────────────────────────────────────────────────────────
   Usage in any component:

     import { useTranslation } from 'react-i18next';
     const { t, i18n } = useTranslation();
     <h1>{t('login.title')}</h1>
     i18n.changeLanguage('en');

   To add a new key: just add it to every language below.
   To add a new language: add another block at the bottom and
   include it in the `LANGUAGES` array.
   ────────────────────────────────────────────────────────────── */

export const LANGUAGES = [
  { code: 'so', label: 'Soomaali', flag: 'SO' },
  { code: 'en', label: 'English',  flag: 'EN' },
  { code: 'ar', label: 'العربية',  flag: 'AR' },
  
];

const resources = {
  /* ───────────── SOOMAALI ───────────── */
  so: {
    translation: {
      common: {
        appName: 'Barbaariye',
        save: 'Kaydi',
        cancel: 'Jooji',
        delete: 'Tirtir',
        edit: 'Wax-ka-bedel',
        add: 'Ku dar',
        search: 'Raadi',
        loading: 'Waa la rarayaa...',
        yes: 'Haa',
        no: 'Maya',
        confirm: 'Xaqiiji',
        close: 'Xir',
        actions: 'Tallaabooyin',
      },
      login: {
        welcome: 'Soo dhawoow',
        subtitle: 'Maanta ku soo dhawoow maamulka Barbaariye.',
        instruction: 'Geli xogtaada si aad ugu gasho bogga.',
        signIn: 'Sign In',
        signInDesc: 'Geli username-ka iyo password-ka si aad ugu gasho',
        username: 'Username',
        password: 'Password',
        loading: 'Waa la galayaa...',
        errors: {
          username: 'Fadlan geli username-ka',
          password: 'Fadlan geli password-ka',
        },
      },
      branch: {
        title: 'Dooro Xafiis',
        subtitle: 'Akoonkaagu wuxuu leeyahay xafiisyo badan. Dooro kii aad rabto.',
        select: 'Geli',
        loading: 'Xafiisyada waa la rarayaa...',
        error: 'Xafiisyada lama soo qaadi karin',
      },
      footer: {
        about: 'Naga Hadal',
        blog: 'Maqaalaha',
        licenses: 'Liisanka',
        rights: 'made with',
        slogan: 'oo ah shabakad ka wanaagsan.',
      },
      sidebar: {
        dashboard: 'Bogga Hore',
        academic: 'Waxbarasho',
        students: 'Ardayda',
        users: 'Isticmaalayaasha',
        settings: 'Dejinta',
        logout: 'Ka bax',
      },
      menu: {
        dashboard: 'Bogga Hore',
        academic: 'Xafiiska Waxbarashada',
        academicSetup: 'Diyaarinta Waxbarashada',
        academicTransfer: 'Wareejinta Waxbarashada',
        academicSaylapus: 'Manhajka Waxbarashada',
        lessonPlan: 'Qorshaha Casharka',
        studentsOffice: 'Xafiiska Ardayda',
        students: 'Ardayda',
        activityManagement: 'Maaraynta Dhaqdhaqaaqa',
        activity: 'Dhaqdhaqaaqa',
        userPrivilege: 'Xuquuqda Isticmaalaha',
      },
      entity: {
        addNew: 'Ku dar cusub',
        add: 'Ku dar',
        selectAcademic: 'Dooro Sanadka Waxbarasho',
        noLoaded: 'Xog ma la shubin',
        loadHint: 'Riix badhanka sare si aad u shubto ama u darto cusub',
        showData: 'Muuji xogta',
        search: 'Raadi...',
      },
      tabs: {
        class: 'Fasal',
        classSetup: 'Diyaarinta Fasallada',
        classFormaster: 'Macalinka Fasalka',
        subjectsSetup: 'Diyaarinta Maaddooyinka',
        subjectClassSetup: 'Diyaarinta Maaddo-Fasal',
        levelSetup: 'Diyaarinta Heerka',
        academicYear: 'Sanad Waxbarasho',
      },
      navbar: {
        searchPlaceholder: 'Raadi...',
        openMenu: 'Fur liiska',
        toggleDark: 'Bedel Dark/Light',
        notifications: 'Ogeysiisyada',
        profile: 'Profile-ka',
        logout: 'Ka bax',
        language: 'Luuqadda',
      },
      greeting: {
        morning: 'Subax wanaagsan',
        afternoon: 'Galab wanaagsan',
        evening: 'Fiid wanaagsan',
        admin: 'Maamule',
      },
      dashboard: {
        overview: 'Guud-mar Dashboard-ka',
        todayLine: "Waxan waa wixii maanta ka dhacay Nidaamka Barbaariye.",
        cards: {
          students: 'Ardayda',
          graduated: 'Qalin-jabiyay',
          free: 'Bilaash',
          employees: 'Shaqaalaha',
          inactive: 'Aan Firfircoonayn',
        },
        charts: {
          studentsByGrade: 'Ardayda Fasallada',
          maleFemaleTotal: 'Lab / Dheddig / Wadarta',
          enrollmentTrend: 'Isdiiwaangalinta',
          gradeDistribution: 'Qaybinta Fasallada',
          male: 'Lab',
          female: 'Dheddig',
          total: 'Wadarta',
          primary: 'Hoose',
          middle: 'Dhexe',
          high: 'Sare',
        },
        activity: {
          title: 'Dhaqdhaqaaq Dhowaan',
          viewAll: 'Arag dhammaan',
        },
        events: {
          title: 'Dhacdooyinka Soo Socda',
          calendar: 'Jadwal',
        },
        tabs: {
          admission: 'Qorista',
          finance: 'Maaliyadda',
          attendance: 'Xaadirinta',
          activity: 'Dhaqdhaqaaqa',
          academic: 'Waxbarasho',
        },
        tabContent: 'Caddeynta {{tab}} waa la muujin doonaa halkan.',
      },
    },
  },

  /* ───────────── ENGLISH ───────────── */
  en: {
    translation: {
      common: {
        appName: 'Barbaariye',
        save: 'Save',
        cancel: 'Cancel',
        delete: 'Delete',
        edit: 'Edit',
        add: 'Add',
        search: 'Search',
        loading: 'Loading...',
        yes: 'Yes',
        no: 'No',
        confirm: 'Confirm',
        close: 'Close',
        actions: 'Actions',
      },
      login: {
        welcome: 'Welcome',
        subtitle: 'Welcome to the Barbaariye admin portal.',
        instruction: 'Enter your credentials to access the system.',
        signIn: 'Sign In',
        signInDesc: 'Enter your username and password to log in',
        username: 'Username',
        password: 'Password',
        loading: 'Signing in...',
        errors: {
          username: 'Please enter your username',
          password: 'Please enter your password',
        },
      },
      branch: {
        title: 'Select Branch',
        subtitle: 'Your account has multiple branches. Choose the one you want to enter.',
        select: 'Enter',
        loading: 'Loading branches...',
        error: 'Could not load branches',
      },
      footer: {
        about: 'About Us',
        blog: 'Blog',
        licenses: 'Licenses',
        rights: 'made with',
        slogan: 'for a better web.',
      },
      sidebar: {
        dashboard: 'Dashboard',
        academic: 'Academic',
        students: 'Students',
        users: 'Users',
        settings: 'Settings',
        logout: 'Logout',
      },
      menu: {
        dashboard: 'Dashboard',
        academic: 'Academic Office',
        academicSetup: 'Academic Setup',
        academicTransfer: 'Academic Transfer',
        academicSaylapus: 'Academic Syllabus',
        lessonPlan: 'Lesson Plan',
        studentsOffice: 'Students Office',
        students: 'Students',
        activityManagement: 'Activity Management',
        activity: 'Activity',
        userPrivilege: 'User Privileges',
      },
      entity: {
        addNew: 'Add new',
        add: 'Add',
        selectAcademic: 'Select Academic',
        noLoaded: 'No data loaded',
        loadHint: 'Click a button above to load or Add to create',
        showData: 'Show Data',
        search: 'Search...',
      },
      tabs: {
        class: 'Class',
        classSetup: 'Class Setup',
        classFormaster: 'Class Formaster',
        subjectsSetup: 'Subjects Setup',
        subjectClassSetup: 'Subject Class Setup',
        levelSetup: 'Level Setup',
        academicYear: 'Academic Year',
      },
      navbar: {
        searchPlaceholder: 'Search...',
        openMenu: 'Open menu',
        toggleDark: 'Toggle dark mode',
        notifications: 'Notifications',
        profile: 'Profile',
        logout: 'Logout',
        language: 'Language',
      },
      greeting: {
        morning: 'Good morning',
        afternoon: 'Good afternoon',
        evening: 'Good evening',
        admin: 'Admin',
      },
      dashboard: {
        overview: 'Dashboard Overview',
        todayLine: "Here's what's happening at Barbaariye System today.",
        cards: {
          students: 'Students',
          graduated: 'Graduated',
          free: 'Free',
          employees: 'Employees',
          inactive: 'Inactive',
        },
        charts: {
          studentsByGrade: 'Students by Grade',
          maleFemaleTotal: 'Male / Female / Total',
          enrollmentTrend: 'Enrollment Trend',
          gradeDistribution: 'Grade Distribution',
          male: 'Male',
          female: 'Female',
          total: 'Total',
          primary: 'Primary',
          middle: 'Middle',
          high: 'High',
        },
        activity: {
          title: 'Recent Activity',
          viewAll: 'View all',
        },
        events: {
          title: 'Upcoming Events',
          calendar: 'Calendar',
        },
        tabs: {
          admission: 'Admission',
          finance: 'Finance',
          attendance: 'Attendance',
          activity: 'Activity',
          academic: 'Academic',
        },
        tabContent: 'Content for {{tab}} will appear here.',
      },
    },
  },

  /* ───────────── ARABIC ───────────── */
  ar: {
    translation: {
      common: {
        appName: 'بربارية',
        save: 'حفظ',
        cancel: 'إلغاء',
        delete: 'حذف',
        edit: 'تعديل',
        add: 'إضافة',
        search: 'بحث',
        loading: 'جارٍ التحميل...',
        yes: 'نعم',
        no: 'لا',
        confirm: 'تأكيد',
        close: 'إغلاق',
        actions: 'الإجراءات',
      },
      login: {
        welcome: 'مرحباً',
        subtitle: 'مرحباً بك في لوحة إدارة بربارية.',
        instruction: 'أدخل بياناتك للوصول إلى النظام.',
        signIn: 'تسجيل الدخول',
        signInDesc: 'أدخل اسم المستخدم وكلمة المرور لتسجيل الدخول',
        username: 'اسم المستخدم',
        password: 'كلمة المرور',
        loading: 'جارٍ تسجيل الدخول...',
        errors: {
          username: 'الرجاء إدخال اسم المستخدم',
          password: 'الرجاء إدخال كلمة المرور',
        },
      },
      branch: {
        title: 'اختر الفرع',
        subtitle: 'حسابك يحتوي على عدة فروع. اختر الفرع الذي تريد الدخول إليه.',
        select: 'دخول',
        loading: 'جارٍ تحميل الفروع...',
        error: 'تعذّر تحميل الفروع',
      },
      footer: {
        about: 'من نحن',
        blog: 'المدونة',
        licenses: 'التراخيص',
        rights: 'صُنع بـ',
        slogan: 'من أجل ويب أفضل.',
      },
      sidebar: {
        dashboard: 'الرئيسية',
        academic: 'الأكاديمية',
        students: 'الطلاب',
        users: 'المستخدمون',
        settings: 'الإعدادات',
        logout: 'تسجيل الخروج',
      },
      menu: {
        dashboard: 'الرئيسية',
        academic: 'المكتب الأكاديمي',
        academicSetup: 'الإعداد الأكاديمي',
        academicTransfer: 'النقل الأكاديمي',
        academicSaylapus: 'المنهج الدراسي',
        lessonPlan: 'خطة الدرس',
        studentsOffice: 'مكتب الطلاب',
        students: 'الطلاب',
        activityManagement: 'إدارة الأنشطة',
        activity: 'النشاط',
        userPrivilege: 'صلاحيات المستخدم',
      },
      entity: {
        addNew: 'إضافة جديد',
        add: 'إضافة',
        selectAcademic: 'اختر السنة الدراسية',
        noLoaded: 'لا توجد بيانات محملة',
        loadHint: 'اضغط زرًا أعلاه للتحميل أو إضافة للإنشاء',
        showData: 'عرض البيانات',
        search: 'بحث...',
      },
      tabs: {
        class: 'الصف',
        classSetup: 'إعداد الصف',
        classFormaster: 'مدرّس الصف',
        subjectsSetup: 'إعداد المواد',
        subjectClassSetup: 'مادة/صف',
        levelSetup: 'إعداد المستوى',
        academicYear: 'السنة الدراسية',
      },
      navbar: {
        searchPlaceholder: 'بحث...',
        openMenu: 'فتح القائمة',
        toggleDark: 'تبديل الوضع الداكن',
        notifications: 'الإشعارات',
        profile: 'الملف الشخصي',
        logout: 'تسجيل الخروج',
        language: 'اللغة',
      },
      greeting: {
        morning: 'صباح الخير',
        afternoon: 'مساء الخير',
        evening: 'مساء الخير',
        admin: 'المشرف',
      },
      dashboard: {
        overview: 'نظرة عامة على لوحة التحكم',
        todayLine: 'إليك ما يحدث في نظام بربارية اليوم.',
        cards: {
          students: 'الطلاب',
          graduated: 'الخريجون',
          free: 'مجاني',
          employees: 'الموظفون',
          inactive: 'غير نشط',
        },
        charts: {
          studentsByGrade: 'الطلاب حسب الصف',
          maleFemaleTotal: 'ذكور / إناث / المجموع',
          enrollmentTrend: 'اتجاه التسجيل',
          gradeDistribution: 'توزيع الصفوف',
          male: 'ذكور',
          female: 'إناث',
          total: 'المجموع',
          primary: 'ابتدائي',
          middle: 'متوسط',
          high: 'ثانوي',
        },
        activity: {
          title: 'النشاط الأخير',
          viewAll: 'عرض الكل',
        },
        events: {
          title: 'الأحداث القادمة',
          calendar: 'التقويم',
        },
        tabs: {
          admission: 'القبول',
          finance: 'المالية',
          attendance: 'الحضور',
          activity: 'النشاط',
          academic: 'الأكاديمية',
        },
        tabContent: 'سيظهر محتوى {{tab}} هنا.',
      },
    },
  },
  
};

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: 'so',
    supportedLngs: LANGUAGES.map((l) => l.code),
    interpolation: { escapeValue: false },
    detection: {
      order: ['localStorage', 'navigator'],
      caches: ['localStorage'],
      lookupLocalStorage: 'app_lang',
    },
  });

// keep <html dir="..."> in sync for RTL languages
const applyDir = (lng) => {
  const isRtl = lng === 'ar';
  document.documentElement.setAttribute('dir', isRtl ? 'rtl' : 'ltr');
  document.documentElement.setAttribute('lang', lng);
};
applyDir(i18n.language);
i18n.on('languageChanged', applyDir);

export default i18n;
