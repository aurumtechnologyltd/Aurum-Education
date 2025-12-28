import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from '@/hooks/useAuth'
import { ThemeProvider } from '@/components/providers/ThemeProvider'
import { ErrorBoundary } from '@/components/ui/error-boundary'
import { ThemeInitializer } from '@/components/providers/ThemeInitializer'
import { ProtectedRoute } from '@/components/ProtectedRoute'
import { AppLayout } from '@/components/layout/AppLayout'
import { Toaster } from '@/components/ui/sonner'

// Pages
import Landing from '@/pages/Landing'
import Login from '@/pages/Login'
import Signup from '@/pages/Signup'
import Pricing from '@/pages/Pricing'
import SetupSemester from '@/pages/SetupSemester'
import Dashboard from '@/pages/Dashboard'
import CourseDetail from '@/pages/CourseDetail'
import CalendarPage from '@/pages/Calendar'
import ProfileSettings from '@/pages/ProfileSettings'
import SemesterSettings from '@/pages/SemesterSettings'
import StudyPlan from '@/pages/StudyPlan'
import BillingSettings from '@/pages/BillingSettings'

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider>
        <BrowserRouter>
          <AuthProvider>
          <ThemeInitializer />
          <Routes>
          {/* Public routes */}
          <Route path="/" element={<Landing />} />
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/pricing" element={<Pricing />} />
          
          {/* Setup route (requires auth but no semester) */}
          <Route
            path="/setup"
            element={
              <ProtectedRoute>
                <SetupSemester />
              </ProtectedRoute>
            }
          />

          {/* Protected routes with layout */}
          <Route
            element={
              <ProtectedRoute>
                <AppLayout />
              </ProtectedRoute>
            }
          >
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/dashboard/settings/billing" element={<BillingSettings />} />
            <Route path="/study-plan" element={<StudyPlan />} />
            <Route path="/course/:courseId" element={<CourseDetail />} />
            <Route path="/calendar" element={<CalendarPage />} />
            <Route path="/semester-settings" element={<SemesterSettings />} />
            <Route path="/profile-settings" element={<ProfileSettings />} />
            <Route path="/settings" element={<Navigate to="/profile-settings" replace />} />
          </Route>
          </Routes>
          <Toaster position="bottom-right" />
          </AuthProvider>
        </BrowserRouter>
      </ThemeProvider>
    </ErrorBoundary>
  )
}

export default App
