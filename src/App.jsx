import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { AuthProvider, useAuth, homeFor } from './contexts/AuthContext'
import { PageLoader } from './components/ui/LoadingSpinner'
import DevUserSwitcher from './components/DevUserSwitcher'
import NotOnRoster     from './pages/NotOnRoster'
import Landing         from './pages/Landing'
import Login           from './pages/Login'
import Setup           from './pages/Setup'
import AdminPage       from './pages/AdminPage'
import StudentDashboard from './pages/StudentDashboard'
import TeacherDashboard from './pages/TeacherDashboard'
import ReflectionEntry from './pages/ReflectionEntry'
import Analytics       from './pages/Analytics'
import ApprovalReview  from './pages/ApprovalReview'
import StudentsPage    from './pages/StudentsPage'
import UnitPlanning    from './pages/UnitPlanning'
import ReportsPage     from './pages/ReportsPage'

function RequireAuth({ children, allow }) {
  const { user, profile, loading, rejection, needsSetup } = useAuth()

  if (loading) return <PageLoader />
  if (!user) return <Navigate to="/login" replace />
  // Signed in with Google but not on the roster. Tell them, do not loop.
  if (rejection) return <NotOnRoster />
  if (!profile) return <PageLoader />

  if (needsSetup && profile.role !== 'admin') return <Navigate to="/setup" replace />
  if (allow && !allow.includes(profile.role)) {
    return <Navigate to={homeFor(profile.role)} replace />
  }
  return children
}

function AppRoutes() {
  const { user, profile, loading, rejection } = useAuth()
  if (loading) return <PageLoader />

  const teacher = ['teacher']
  const student = ['student']

  return (
    <Routes>
      <Route path="/"      element={<Landing />} />
      <Route path="/login" element={<Login />} />

      {/* Setup sits outside RequireAuth's needsSetup redirect, or it loops. */}
      <Route path="/setup" element={
        !user ? <Navigate to="/login" replace />
        : rejection ? <NotOnRoster />
        : !profile ? <PageLoader />
        : <Setup />
      } />

      <Route path="/admin"     element={<RequireAuth allow={['admin']}><AdminPage /></RequireAuth>} />

      <Route path="/dashboard" element={<RequireAuth allow={student}><StudentDashboard /></RequireAuth>} />
      <Route path="/reflect"   element={<RequireAuth allow={student}><ReflectionEntry /></RequireAuth>} />

      <Route path="/teacher"   element={<RequireAuth allow={teacher}><TeacherDashboard /></RequireAuth>} />
      <Route path="/approvals" element={<RequireAuth allow={teacher}><ApprovalReview /></RequireAuth>} />
      <Route path="/students"  element={<RequireAuth allow={teacher}><StudentsPage /></RequireAuth>} />
      <Route path="/units"     element={<RequireAuth allow={teacher}><UnitPlanning /></RequireAuth>} />
      <Route path="/reports"   element={<RequireAuth allow={teacher}><ReportsPage /></RequireAuth>} />

      <Route path="/analytics" element={<RequireAuth><Analytics /></RequireAuth>} />

      <Route path="*" element={
        <Navigate to={user && profile ? homeFor(profile.role) : '/'} replace />
      } />
    </Routes>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
        <DevUserSwitcher />
        <Toaster
          position="top-right"
          toastOptions={{
            style: {
              borderRadius: '12px',
              fontSize: '13px',
              fontFamily: 'Inter, system-ui, sans-serif',
              boxShadow: '0 4px 12px rgb(10 30 67 / 0.1)',
            },
            success: { iconTheme: { primary: '#10b981', secondary: '#fff' } },
            error:   { iconTheme: { primary: '#e11d48', secondary: '#fff' } },
          }}
        />
      </AuthProvider>
    </BrowserRouter>
  )
}
