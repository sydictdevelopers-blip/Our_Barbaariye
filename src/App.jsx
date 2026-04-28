import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { Provider, useSelector, useDispatch } from 'react-redux';
import { store } from './store/store';
import Layout from './components/layout/Layout';
import Dashboard from './utility/Dashboard';
import LoginPage from './utility/LoginPage';
import UserPrivilegePage from './utility/UserPrivilegePage';
import AcademicSetup from './utility/pages/academicfolder/AcademicSetup';
import StudentofficeTabs from './utility/pages/studentFolder/studentofficeTabs';
import ModuleVideosPage from './utility/pages/ModuleVideosPage';
import { setBranch } from './slices/uiSlice';
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

/** Guarantee user has a br_id; if missing, fetch first branch and persist. */
function BranchGuard() {
  const user = useSelector((state) => state.ui.user);
  const dispatch = useDispatch();
  useEffect(() => {
    if (!user || user.br_id != null) return;
    if (!user.usr_id) return;
    fetchUserBranches(user.usr_id).then((resp) => {
      const first = resp?.branches?.[0];
      if (first?.br_id != null) {
        // eslint-disable-next-line no-console
        console.warn('[BranchGuard] user logged in without br_id — auto-assigning', first.br_id);
        dispatch(setBranch(first.br_id));
      }
    });
  }, [user, dispatch]);
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
