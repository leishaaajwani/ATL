import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import { PageLoader } from './components/ui/LoadingSpinner'
import Landing          from './pages/Landing'
import Login            from './pages/Login'
import Onboarding       from './pages/Onboarding'
import StudentDashboard from './pages/StudentDashboard'
import TeacherDashboard from './pages/TeacherDashboard'
import ReflectionEntry  from './pages/ReflectionEntry'
import Analytics        from './pages/Analytics'
import ApprovalReview   from './pages/ApprovalReview'
import StudentsPage     from './pages/StudentsPage'

function RequireAuth({ children }) {
  const { user, loading, needsOnboarding } = useAuth()
  if (loading) return <PageLoader />
  if (!user) return <Navigate to="/login" replace />
  if (needsOnboarding) return <Navigate to="/onboarding" replace />
  return children
}

function RequireRole({ role, children }) {
  const { userDoc, loading } = useAuth()
  if (loading || !userDoc) return <PageLoader />
  if (userDoc.role !== role) {
    return <Navigate to={userDoc.role === 'teacher' ? '/teacher' : '/dashboard'} replace />
  }
  return children
}

function AppRoutes() {
  const { user, userDoc, loading } = useAuth()
  if (loading) return <PageLoader />

  return (
    <Routes>
      {/* Public */}
      <Route path="/"           element={<Landing />} />
      <Route path="/login"      element={<Login />} />
      <Route path="/onboarding" element={<Onboarding />} />

      {/* Student */}
      <Route path="/dashboard" element={
        <RequireAuth><RequireRole role="student"><StudentDashboard /></RequireRole></RequireAuth>
      } />
      <Route path="/reflect" element={
        <RequireAuth><RequireRole role="student"><ReflectionEntry /></RequireRole></RequireAuth>
      } />

      {/* Teacher */}
      <Route path="/teacher" element={
        <RequireAuth><RequireRole role="teacher"><TeacherDashboard /></RequireRole></RequireAuth>
      } />
      <Route path="/approvals" element={
        <RequireAuth><RequireRole role="teacher"><ApprovalReview /></RequireRole></RequireAuth>
      } />
      <Route path="/students" element={
        <RequireAuth><RequireRole role="teacher"><StudentsPage /></RequireRole></RequireAuth>
      } />

      {/* Shared */}
      <Route path="/analytics" element={<RequireAuth><Analytics /></RequireAuth>} />

      {/* Fallback */}
      <Route path="*" element={
        user && userDoc
          ? <Navigate to={userDoc.role === 'teacher' ? '/teacher' : '/dashboard'} replace />
          : <Navigate to="/" replace />
      } />
    </Routes>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
        <Toaster
          position="top-right"
          toastOptions={{
            style: {
              borderRadius: '12px',
              fontSize: '13px',
              fontFamily: 'Inter, system-ui, sans-serif',
              boxShadow: '0 4px 12px rgb(0 0 0 / 0.08)',
            },
            success: { iconTheme: { primary: '#22c55e', secondary: '#fff' } },
            error:   { iconTheme: { primary: '#ef4444', secondary: '#fff' } },
          }}
        />
      </AuthProvider>
    </BrowserRouter>
  )
}
