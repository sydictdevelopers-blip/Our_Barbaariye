import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { Provider, useSelector, useDispatch } from 'react-redux';
import { useTranslation } from 'react-i18next';
import { store } from './store/store';
import Layout from './components/layout/Layout';
import Dashboard from './utility/Dashboard';
import LoginPage from './utility/LoginPage';
import UserPrivilegePage from './utility/UserPrivilegePage';
import AcademicSetup from './utility/pages/academicfolder/AcademicSetup';
import StudentofficeTabs from './utility/pages/studentFolder/studentofficeTabs';
import ComplainManagementPage from './utility/pages/complainfolder/ComplainManagementPage';
import MeetingMinutesPage from './utility/pages/meetingfolder/MeetingMinutesPage';
import ModuleVideosPage from './utility/pages/ModuleVideosPage';
import { switchBranch, setUserBranches } from './slices/uiSlice';
import { fetchUserBranches } from './services/api';
function DarkModeInit() {
  const darkMode = useSelector((state) => state.ui.darkMode);
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);
  return null;
}

// Mirrors the active i18n language onto <html dir>/<html lang> so the whole
// document flips to RTL for Arabic and LTR for Latin scripts (so/en).
// Tailwind's dir-aware utilities (and any author CSS that reads dir=rtl) react
// to this single attribute, so layout flipping requires no per-component work.
const RTL_LANGS = new Set(['ar', 'fa', 'he', 'ur']);
function LangDirInit() {
  const { i18n } = useTranslation();
  useEffect(() => {
    const apply = (lng) => {
      const code = String(lng || 'so').toLowerCase().split('-')[0];
      const dir = RTL_LANGS.has(code) ? 'rtl' : 'ltr';
      document.documentElement.setAttribute('lang', code);
      document.documentElement.setAttribute('dir', dir);
    };
    apply(i18n.language);
    i18n.on('languageChanged', apply);
    return () => i18n.off('languageChanged', apply);
  }, [i18n]);
  return null;
}

/** Guarantee user has a br_id; if missing, fetch first branch and persist.
 *  Also caches the full branch list in Redux so other components (e.g.
 *  read-only "All branch" gating) can resolve br_name without re-fetching. */
function BranchGuard() {
  const user = useSelector((state) => state.ui.user);
  const dispatch = useDispatch();
  useEffect(() => {
    if (!user?.usr_id) return;
    fetchUserBranches().then((resp) => {
      const branches = resp?.branches || [];
      if (branches.length) dispatch(setUserBranches(branches));
      if (user.br_id == null) {
        const first = branches[0];
        if (first?.br_id != null) {
          // eslint-disable-next-line no-console
          console.warn('[BranchGuard] user logged in without br_id — auto-assigning', first.br_id);
          dispatch(switchBranch(first.br_id)).catch(() => {});
        }
      }
    });
  }, [user?.usr_id, user?.br_id, dispatch]);
  return null;
}

function ProtectedRoute({ children }) {
  const user = useSelector((state) => state.ui.user);
  const location = useLocation();
  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }
  return children;
}

function PublicRoute({ children }) {
  const user = useSelector((state) => state.ui.user);
  if (user) {
    return <Navigate to="/" replace />;
  }
  return children;
}

function AppContent() {
  return (
    <>
      <DarkModeInit />
      <LangDirInit />
      <BranchGuard />
      <Routes>
        <Route path="/login" element={<PublicRoute><LoginPage /></PublicRoute>} />
        <Route
          path="/*"
          element={
            <ProtectedRoute>
              <Layout>
                <Routes>
                  <Route path="/" element={<Dashboard />} />
                  <Route path="/AcademicSetup" element={<AcademicSetup />} />
                   <Route path="/AcademicTransfer" element={<AcademicSetup />} />
                  <Route path="/AcademicSaylapus" element={<AcademicSetup />} />
                  <Route path="/LessonPlan" element={<AcademicSetup />} />
                  <Route path="/StudentSetup" element={<AcademicSetup />} />
                  <Route path="/classes" element={<AcademicSetup />} />
                  <Route path="/student_register" element={<AcademicSetup />} />
                  <Route path="/people_section" element={<AcademicSetup />} />
                  <Route path="/student_attendence" element={<AcademicSetup />} />
                  <Route path="/student_marks" element={<AcademicSetup />} />
                  <Route path="/StudentsOffice" element={<StudentofficeTabs />} />
                  <Route path="/ActivityManagement" element={<AcademicSetup />} />
                  <Route path="/ComplainManagement" element={<ComplainManagementPage />} />
                  <Route path="/MeetingMinutes" element={<MeetingMinutesPage />} />
                  <Route path="/CreateExam" element={<AcademicSetup />} />
                  <Route path="/ExamService" element={<AcademicSetup />} />
                  <Route path="/ExamSetting" element={<AcademicSetup />} />
                  <Route path="/ExamSetup" element={<AcademicSetup />} />
                  <Route path="/CreateExam" element={<AcademicSetup />} />
                  <Route path="/ExamService" element={<AcademicSetup />} />
                  <Route path="/ManageResult" element={<AcademicSetup />} />
                  <Route path="/AppUsers" element={<AcademicSetup />} />
                  <Route path="/user-privilege" element={<UserPrivilegePage />} />
                  <Route path="/module-videos" element={<ModuleVideosPage />} />
                  <Route path="*" element={<Navigate to="/" replace />}/>
                </Routes>
              </Layout>
            </ProtectedRoute>
          }
        />
      </Routes>
    </>
  );
}

export default function App() {
  return (
    <Provider store={store}>
      <BrowserRouter basename="/frontend">
        <AppContent />
      </BrowserRouter>
    </Provider>
  );
}
