import React, { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import Card from "../components/Card";
import CreateAssessmentModal from "../components/CreateAssessmentModal";
import { db } from "../firebase/config";
import { doc, getDoc, collection, query, where, getDocs, onSnapshot, updateDoc } from "firebase/firestore";

interface Classroom {
  id: string;
  name: string;
  subject: string;
  description: string;
  code: string;
  teacherId: string;
  members: string[];
  createdAt: any;
}

interface Student {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  joinedAt?: string;
}

interface Assessment {
  id: string;
  title: string;
  description: string;
  duration: number;
  status: 'draft' | 'published' | 'closed';
  questions: any[];
  createdAt: any;
  publishedAt: any;
}

const ClassroomDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [activeTab, setActiveTab] = useState("assignments");
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [classroom, setClassroom] = useState<Classroom | null>(null);
  const [students, setStudents] = useState<Student[]>([]);
  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch classroom data from Firebase
  useEffect(() => {
    const fetchClassroom = async () => {
      if (!id) return;

      try {
        const classroomDoc = await getDoc(doc(db, 'classrooms', id));

        if (classroomDoc.exists()) {
          const classroomData = { ...classroomDoc.data(), id: classroomDoc.id } as Classroom;
          setClassroom(classroomData);

          // Fetch student details if there are members
          if (classroomData.members && classroomData.members.length > 0) {
            const studentsData: Student[] = [];
            for (const memberId of classroomData.members) {
              const studentDoc = await getDoc(doc(db, 'users', memberId));
              if (studentDoc.exists()) {
                studentsData.push({ ...studentDoc.data(), id: studentDoc.id } as Student);
              }
            }
            setStudents(studentsData);
          }
        } else {
          setClassroom(null);
        }
      } catch (error) {
        console.error('Error fetching classroom:', error);
        setClassroom(null);
      } finally {
        setLoading(false);
      }
    };

    fetchClassroom();
  }, [id]);

  // Fetch assessments for this classroom
  useEffect(() => {
    if (!id) return;

    const q = query(
      collection(db, 'assessments'),
      where('classroomId', '==', id)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const assessmentData: Assessment[] = [];
      snapshot.forEach((doc) => {
        assessmentData.push({ ...doc.data(), id: doc.id } as Assessment);
      });
      setAssessments(assessmentData);
    });

    return unsubscribe;
  }, [id]);

  const handlePublishAssessment = async (assessmentId: string) => {
    try {
      await updateDoc(doc(db, 'assessments', assessmentId), {
        status: 'published',
        publishedAt: new Date()
      });
    } catch (error) {
      console.error('Error publishing assessment:', error);
    }
  };

  const handleSuccess = () => {
    // Assessment created - real-time listener will update UI
  };

  if (loading) {
    return (
      <div className="page-content">
        <div className="container" style={{ textAlign: 'center', paddingTop: '100px' }}>
          <div style={{ fontSize: '48px' }}>⏳</div>
          <div style={{ fontSize: '18px', marginTop: '20px', color: '#4B2E05' }}>
            Loading classroom...
          </div>
        </div>
      </div>
    );
  }

  if (!classroom) {
    return (
      <div className="page-content">
        <div className="container">
          <div className="error-state">
            <h2>Classroom not found</h2>
            <p>The classroom you're looking for doesn't exist.</p>
          </div>
        </div>
      </div>
    );
  }

  // Analytics data
  const performanceData = [
    { name: "Excellent (90-100)", value: 12, color: "#4CAF50" },
    { name: "Good (80-89)", value: 8, color: "#8BC34A" },
    { name: "Average (70-79)", value: 6, color: "#FFC107" },
    { name: "Below Average (<70)", value: 2, color: "#FF5722" },
  ];

  const assessmentStatusData = [
    {
      name: "Published",
      value: assessments.filter((a) => a.status === "published").length,
      color: "#4CAF50",
    },
    {
      name: "Draft",
      value: assessments.filter((a) => a.status === "draft").length,
      color: "#FFC107",
    },
    {
      name: "Closed",
      value: assessments.filter((a) => a.status === "closed").length,
      color: "#F44336",
    },
  ];

  return (
    <div className="page-content">
      <div className="container">
        <div className="classroom-header">
          <div className="classroom-info">
            <h1 className="page-title">{classroom.name}</h1>
            <p className="classroom-subtitle">{classroom.subject}</p>
            <p className="classroom-description">{classroom.description}</p>
          </div>
          <div className="classroom-stats">
            <div className="stat-item">
              <span className="stat-label">Students</span>
              <span className="stat-value">{classroom.members.length}</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">Assessments</span>
              <span className="stat-value">{assessments.length}</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">Class Code</span>
              <span className="stat-value">{classroom.code}</span>
            </div>
          </div>
        </div>

        <div className="tabs">
          <button
            className={`tab ${activeTab === "assignments" ? "active" : ""}`}
            onClick={() => setActiveTab("assignments")}
          >
            Assignments
          </button>
          <button
            className={`tab ${activeTab === "students" ? "active" : ""}`}
            onClick={() => setActiveTab("students")}
          >
            Students
          </button>
          <button
            className={`tab ${activeTab === "analytics" ? "active" : ""}`}
            onClick={() => setActiveTab("analytics")}
          >
            Analytics
          </button>
        </div>

        <div className="tab-content">
          {activeTab === "assignments" && (
            <div>
              <div className="flex flex-between flex-center mb-6">
                <h3>Assessments</h3>
                <button
                  className="btn btn-primary"
                  onClick={() => setIsCreateModalOpen(true)}
                >
                  + Create Assessment
                </button>
              </div>

              {assessments.length === 0 ? (
                <div className="empty-state">
                  <div className="empty-state-icon">📝</div>
                  <h3 className="empty-state-title">No assessments yet</h3>
                  <p className="empty-state-subtitle">
                    Create your first adaptive assessment to start evaluating students
                  </p>
                  <button
                    className="btn btn-primary mt-4"
                    onClick={() => setIsCreateModalOpen(true)}
                  >
                    Create Assessment
                  </button>
                </div>
              ) : (
                <div className="grid grid-2 gap-6">
                  {assessments.map((assessment) => (
                    <Card
                      key={assessment.id}
                      title={assessment.title}
                      subtitle={`${assessment.questions.length} Questions • ${assessment.duration} minutes`}
                    >
                      <div className="assignment-description">
                        {assessment.description}
                      </div>
                      <div className="assignment-footer">
                        <span
                          className={`status ${
                            assessment.status === 'published' ? 'status-completed' :
                            assessment.status === 'closed' ? 'status-overdue' :
                            'status-pending'
                          }`}
                        >
                          {assessment.status.toUpperCase()}
                        </span>
                        <span className="assignment-date">
                          Created{" "}
                          {assessment.createdAt?.toDate?.()?.toLocaleDateString() || 'Just now'}
                        </span>
                      </div>
                      {assessment.status === 'draft' && (
                        <button
                          className="btn btn-primary"
                          style={{ width: '100%', marginTop: '12px' }}
                          onClick={() => handlePublishAssessment(assessment.id)}
                        >
                          Publish Assessment
                        </button>
                      )}
                    </Card>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === "students" && (
            <div>
              <h3 className="mb-6">Students ({students.length})</h3>
              {students.length === 0 ? (
                <div className="empty-state">
                  <div className="empty-state-icon">👥</div>
                  <h3 className="empty-state-title">No students yet</h3>
                  <p className="empty-state-subtitle">
                    Students will appear here once they join using the class code
                  </p>
                </div>
              ) : (
                <div className="grid grid-3 gap-4">
                  {students.map((student) => (
                    <Card
                      key={student.id}
                      title={student.name}
                      subtitle={student.email}
                    >
                      <div className="student-stats">
                        <div className="student-stat">
                          <span className="stat-label">Role</span>
                          <span className="stat-value">Student</span>
                        </div>
                        <div className="student-stat">
                          <span className="stat-label">Status</span>
                          <span className="stat-value">Active</span>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === "analytics" && (
            <div className="grid grid-2 gap-6">
              <div className="chart-container">
                <h3 className="chart-title">
                  Student Performance Distribution
                </h3>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={performanceData}
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      dataKey="value"
                      label={({ name, value }) => `${name}: ${value}`}
                    >
                      {performanceData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              <div className="chart-container">
                <h3 className="chart-title">Assessment Status</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={assessmentStatusData}
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      dataKey="value"
                      label={({ name, value }) => `${name}: ${value}`}
                    >
                      {assessmentStatusData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}
        </div>

        {/* Create Assessment Modal */}
        <CreateAssessmentModal
          isOpen={isCreateModalOpen}
          onClose={() => setIsCreateModalOpen(false)}
          onSuccess={handleSuccess}
          classroomId={id!}
        />
      </div>
    </div>
  );
};

export default ClassroomDetails;
