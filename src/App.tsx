import React, { useState } from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import Sidebar from "./components/Sidebar";
import TopBar from "./components/TopBar";
import LandingPage from "./pages/LandingPage";
import LoginPage from "./pages/LoginPage";
import TeacherDashboard from "./pages/TeacherDashboard";
import TeacherClassrooms from "./pages/TeacherClassrooms";
import TeacherAnalytics from "./pages/TeacherAnalytics";
import ClassroomDetails from "./pages/ClassroomDetails";
import StudentAnalytics from "./pages/StudentAnalytics";
import StudentDashboard from "./pages/StudentDashboard";
import StudentClassrooms from "./pages/StudentClassrooms";
import StudentAssignments from "./pages/StudentAssignments";
import StudentExamInterface from "./pages/StudentExamInterface";
import StudentResultsPage from "./pages/StudentResultsPage";
import SubmissionHistory from "./pages/SubmissionHistory";

function AppContent() {
  const { currentUser, loading } = useAuth();
  const [userRole, setUserRole] = useState<"teacher" | "student">(
    currentUser?.role || "student"
  );

  if (loading) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
        backgroundColor: '#F5E8C7'
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '48px', marginBottom: '20px' }}>🎓</div>
          <div style={{ fontSize: '24px', color: '#4B2E05' }}>Loading EduPortal...</div>
        </div>
      </div>
    );
  }

  const getPageTitle = (pathname: string): string => {
    const titleMap: { [key: string]: string } = {
      "/teacher/dashboard": "Teacher Dashboard",
      "/teacher/classrooms": "My Classrooms",
      "/teacher/analytics": "Analytics",
      "/student/dashboard": "Student Dashboard",
      "/student/classrooms": "Joined Classrooms",
      "/student/submissions": "Submission History",
    };

    // Handle dynamic routes
    if (pathname.includes("/teacher/classroom/")) {
      return "Classroom Details";
    }
    if (pathname.includes("/student/classroom/")) {
      return "Classroom Assessments";
    }
    if (pathname.includes("/student/exam/")) {
      return "Assessment";
    }

    return titleMap[pathname] || "EduPortal";
  };

  if (!currentUser) {
    return (
      <Router>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Router>
    );
  }

  return (
    <Router>
      <div className="App">
        <Sidebar userRole={currentUser.role as "teacher" | "student"} />

        <Routes>
          {/* Teacher Routes */}
          <Route
            path="/teacher/dashboard"
            element={
              <>
                <TopBar
                  title={getPageTitle("/teacher/dashboard")}
                  userRole={currentUser.role as "teacher" | "student"}
                  userName={currentUser.name}
                />
                <TeacherDashboard />
              </>
            }
          />

          <Route
            path="/teacher/classrooms"
            element={
              <>
                <TopBar
                  title={getPageTitle("/teacher/classrooms")}
                  userRole={currentUser.role as "teacher" | "student"}
                  userName={currentUser.name}
                />
                <TeacherClassrooms />
              </>
            }
          />

          <Route
            path="/teacher/analytics"
            element={
              <>
                <TopBar
                  title={getPageTitle("/teacher/analytics")}
                  userRole={currentUser.role as "teacher" | "student"}
                  userName={currentUser.name}
                />
                <TeacherAnalytics />
              </>
            }
          />

          <Route
            path="/teacher/classroom/:id"
            element={
              <>
                <TopBar
                  title={getPageTitle("/teacher/classroom/")}
                  userRole={currentUser.role as "teacher" | "student"}
                  userName={currentUser.name}
                />
                <ClassroomDetails />
              </>
            }
          />

          <Route
            path="/teacher/classroom/:classroomId/student/:studentId"
            element={
              <>
                <TopBar
                  title="Student Analytics"
                  userRole={currentUser.role as "teacher" | "student"}
                  userName={currentUser.name}
                />
                <StudentAnalytics />
              </>
            }
          />

          {/* Student Routes */}
          <Route
            path="/student/dashboard"
            element={
              <>
                <TopBar
                  title={getPageTitle("/student/dashboard")}
                  userRole={currentUser.role as "teacher" | "student"}
                  userName={currentUser.name}
                />
                <StudentDashboard />
              </>
            }
          />

          <Route
            path="/student/classrooms"
            element={
              <>
                <TopBar
                  title={getPageTitle("/student/classrooms")}
                  userRole={currentUser.role as "teacher" | "student"}
                  userName={currentUser.name}
                />
                <StudentClassrooms />
              </>
            }
          />

          <Route
            path="/student/classroom/:id/assessments"
            element={
              <>
                <TopBar
                  title={getPageTitle("/student/classroom/")}
                  userRole={currentUser.role as "teacher" | "student"}
                  userName={currentUser.name}
                />
                <StudentAssignments />
              </>
            }
          />

          <Route
            path="/student/exam/:assessmentId"
            element={<StudentExamInterface />}
          />

          <Route
            path="/student/results/:submissionId"
            element={
              <>
                <TopBar
                  title="Assessment Results"
                  userRole={currentUser.role as "teacher" | "student"}
                  userName={currentUser.name}
                />
                <StudentResultsPage />
              </>
            }
          />

          <Route
            path="/student/submissions"
            element={
              <>
                <TopBar
                  title={getPageTitle("/student/submissions")}
                  userRole={currentUser.role as "teacher" | "student"}
                  userName={currentUser.name}
                />
                <SubmissionHistory />
              </>
            }
          />

          {/* Default redirects */}
          <Route
            path="/"
            element={
              <Navigate
                to={
                  currentUser.role === "teacher"
                    ? "/teacher/dashboard"
                    : "/student/dashboard"
                }
                replace
              />
            }
          />

          {/* Fallback route */}
          <Route
            path="*"
            element={
              <Navigate
                to={
                  currentUser.role === "teacher"
                    ? "/teacher/dashboard"
                    : "/student/dashboard"
                }
                replace
              />
            }
          />
        </Routes>
      </div>
    </Router>
  );
}

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;
