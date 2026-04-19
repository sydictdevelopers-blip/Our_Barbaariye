import { useEffect, useRef } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { Provider, useSelector } from 'react-redux';
import { store } from './store/store';
import Layout from './components/layout/Layout';
import Dashboard from './utility/Dashboard';
import LoginPage from './utility/LoginPage';
import UserPrivilegePage from './utility/UserPrivilegePage';
import AcademicSetup from './utility/pages/academicfolder/AcademicSetup';
import StudentofficeTabs from './utility/pages/studentFolder/studentofficeTabs';
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

function RefreshToDashboard() {
  const navigate = useNavigate();
  const location = useLocation();
  const didRun = useRef(false);
  useEffect(() => {
    if (didRun.current) return;
    try {
      const nav = performance.getEntriesByType?.('navigation')?.[0];
      const isReload = nav?.type === 'reload';
      const isLogin = location.pathname === '/login' || location.pathname.startsWith('/login');
      if (isReload && location.pathname !== '/' && !isLogin) {
        didRun.current = true;
        navigate('/', { replace: true });
      }
    } catch (_) {}
  }, [location.pathname, navigate]);
  return null;
}

function AppContent() {
  return (
    <>
      <DarkModeInit />
      <RefreshToDashboard />
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
                  <Route path="/user-privilege" element={<UserPrivilegePage />} />
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
