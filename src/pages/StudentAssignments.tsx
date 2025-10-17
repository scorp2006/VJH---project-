import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Legend,
} from "recharts";
import Card from "../components/Card";
import Modal from "../components/Modal";
import { db } from "../firebase/config";
import { doc, getDoc, collection, query, where, onSnapshot } from "firebase/firestore";

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

interface Assessment {
  id: string;
  title: string;
  description: string;
  duration: number;
  questions: any[];
  status: 'draft' | 'published' | 'closed';
  createdAt: any;
  publishedAt: any;
}

const StudentAssignments: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [classroom, setClassroom] = useState<Classroom | null>(null);
  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("assessments");
  const [isSubmitModalOpen, setIsSubmitModalOpen] = useState(false);
  const [selectedAssignment, setSelectedAssignment] = useState<string | null>(
    null
  );
  const [submission, setSubmission] = useState({
    content: "",
    file: null as File | null,
  });

  // Fetch classroom data from Firebase
  useEffect(() => {
    const fetchClassroom = async () => {
      if (!id) return;

      try {
        const classroomDoc = await getDoc(doc(db, 'classrooms', id));

        if (classroomDoc.exists()) {
          setClassroom({ ...classroomDoc.data(), id: classroomDoc.id } as Classroom);
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

  // Fetch published assessments for this classroom
  useEffect(() => {
    if (!id) return;

    const q = query(
      collection(db, 'assessments'),
      where('classroomId', '==', id),
      where('status', '==', 'published')
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

  const handleStartAssessment = (assessmentId: string) => {
    navigate(`/student/exam/${assessmentId}`);
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

  const getAssignmentStatus = (assignmentId: string) => {
    // Will implement with Firebase in next phase
    return "pending";
  };

  const getAssignmentScore = (assignmentId: string) => {
    // Will implement with Firebase in next phase
    return undefined;
  };

  const handleSubmitAssignment = (assignmentId: string) => {
    setSelectedAssignment(assignmentId);
    setIsSubmitModalOpen(true);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    setSubmission((prev) => ({ ...prev, file }));
  };

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setSubmission((prev) => ({ ...prev, content: e.target.value }));
  };

  const handleSubmit = () => {
    console.log("Submitting assignment:", {
      assignmentId: selectedAssignment,
      submission,
    });

    setSubmission({ content: "", file: null });
    setSelectedAssignment(null);
    setIsSubmitModalOpen(false);
  };

  const isOverdue = (deadline: string) => {
    return new Date(deadline) < new Date();
  };

  // Sample analytics data (will be replaced with real Firebase data later)
  const bloomLevelData = [
    { name: "Remember", attempted: 5, correct: 4, percentage: 80, color: "#4CAF50" },
    { name: "Understand", attempted: 4, correct: 3, percentage: 75, color: "#2196F3" },
    { name: "Apply", attempted: 3, correct: 2, percentage: 67, color: "#FF9800" },
  ];

  const difficultyData = [
    { name: "Easy", value: 5, color: "#4CAF50" },
    { name: "Medium", value: 3, color: "#FFC107" },
    { name: "Hard", value: 2, color: "#FF5722" },
  ];

  const performanceMetrics = {
    totalAssessments: 3,
    averageScore: 75,
    totalQuestionsAttempted: 12,
    correctAnswers: 9,
    averageTimePerQuestion: 45, // seconds
  };

  return (
    <div className="page-content">
      <div className="container">
        <div className="classroom-header">
          <div className="classroom-info">
            <h1 className="page-title">{classroom.name}</h1>
            <p className="classroom-subtitle">{classroom.subject}</p>
            <p className="classroom-description">{classroom.description}</p>
          </div>
        </div>

        <div className="tabs">
          <button
            className={`tab ${activeTab === "assessments" ? "active" : ""}`}
            onClick={() => setActiveTab("assessments")}
          >
            Assessments
          </button>
          <button
            className={`tab ${activeTab === "analytics" ? "active" : ""}`}
            onClick={() => setActiveTab("analytics")}
          >
            My Analytics
          </button>
        </div>

        <div className="tab-content">
          {activeTab === "assessments" && (
            <div className="assignments-section">
              <h2 className="section-title">Assessments</h2>

          {assessments.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">📝</div>
              <h3 className="empty-state-title">No assessments yet</h3>
              <p className="empty-state-subtitle">
                Your teacher hasn't published any adaptive assessments for this class yet.
              </p>
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

                  <div className="assignment-footer" style={{ marginTop: '16px' }}>
                    <span className="status status-completed">
                      PUBLISHED
                    </span>
                    <span className="assignment-date">
                      Published{" "}
                      {assessment.publishedAt?.toDate?.()?.toLocaleDateString() || 'Recently'}
                    </span>
                  </div>

                  <button
                    className="btn btn-primary"
                    style={{ width: '100%', marginTop: '16px' }}
                    onClick={() => handleStartAssessment(assessment.id)}
                  >
                    Start Assessment
                  </button>
                </Card>
              ))}
            </div>
          )}
            </div>
          )}

          {activeTab === "analytics" && (
            <div>
              <h2 className="section-title mb-6">My Performance Analytics</h2>

              {/* Performance Overview Cards */}
              <div className="grid grid-4 gap-4 mb-6">
                <Card title="Total Assessments" subtitle="Completed">
                  <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#4B2E05' }}>
                    {performanceMetrics.totalAssessments}
                  </div>
                </Card>
                <Card title="Average Score" subtitle="Overall">
                  <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#4CAF50' }}>
                    {performanceMetrics.averageScore}%
                  </div>
                </Card>
                <Card title="Questions Attempted" subtitle="Total">
                  <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#2196F3' }}>
                    {performanceMetrics.totalQuestionsAttempted}
                  </div>
                </Card>
                <Card title="Accuracy Rate" subtitle="Correct/Total">
                  <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#FF9800' }}>
                    {Math.round((performanceMetrics.correctAnswers / performanceMetrics.totalQuestionsAttempted) * 100)}%
                  </div>
                </Card>
              </div>

              {/* Charts */}
              <div className="grid grid-2 gap-6 mb-6">
                {/* Bloom's Taxonomy Performance */}
                <div className="chart-container">
                  <h3 className="chart-title">Performance by Bloom's Taxonomy Level</h3>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={bloomLevelData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="attempted" fill="#A47C48" name="Attempted" />
                      <Bar dataKey="correct" fill="#4CAF50" name="Correct" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                {/* Difficulty Distribution */}
                <div className="chart-container">
                  <h3 className="chart-title">Questions by Difficulty Level</h3>
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={difficultyData}
                        cx="50%"
                        cy="50%"
                        outerRadius={80}
                        dataKey="value"
                        label={({ name, value }) => `${name}: ${value}`}
                      >
                        {difficultyData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Bloom Level Details Table */}
              <div className="chart-container">
                <h3 className="chart-title">Detailed Bloom's Taxonomy Breakdown</h3>
                <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '20px' }}>
                  <thead>
                    <tr style={{ borderBottom: '2px solid #A47C48' }}>
                      <th style={{ padding: '12px', textAlign: 'left' }}>Level</th>
                      <th style={{ padding: '12px', textAlign: 'center' }}>Attempted</th>
                      <th style={{ padding: '12px', textAlign: 'center' }}>Correct</th>
                      <th style={{ padding: '12px', textAlign: 'center' }}>Accuracy</th>
                    </tr>
                  </thead>
                  <tbody>
                    {bloomLevelData.map((level, index) => (
                      <tr key={index} style={{ borderBottom: '1px solid #E8D4B0' }}>
                        <td style={{ padding: '12px' }}>{level.name}</td>
                        <td style={{ padding: '12px', textAlign: 'center' }}>{level.attempted}</td>
                        <td style={{ padding: '12px', textAlign: 'center' }}>{level.correct}</td>
                        <td style={{ padding: '12px', textAlign: 'center' }}>
                          <span style={{
                            color: level.percentage >= 75 ? '#4CAF50' : level.percentage >= 60 ? '#FFC107' : '#FF5722',
                            fontWeight: 'bold'
                          }}>
                            {level.percentage}%
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* AI Insights (Placeholder) */}
              <div className="chart-container" style={{ marginTop: '24px' }}>
                <h3 className="chart-title">AI-Powered Insights</h3>
                <div style={{ padding: '20px', backgroundColor: '#F5E8C7', borderRadius: '8px', marginTop: '12px' }}>
                  <p style={{ fontSize: '14px', lineHeight: '1.6', color: '#4B2E05' }}>
                    <strong>📊 Performance Summary:</strong> You're showing strong performance in Remember-level questions (80% accuracy).
                    Consider focusing more practice on Apply-level questions to strengthen your problem-solving skills.
                  </p>
                  <p style={{ fontSize: '14px', lineHeight: '1.6', color: '#4B2E05', marginTop: '12px' }}>
                    <strong>💡 Recommendation:</strong> Your average time per question is 45 seconds, which is within the optimal range.
                    Keep maintaining this pace while working on accuracy in higher-level cognitive tasks.
                  </p>
                  <p style={{ fontSize: '14px', lineHeight: '1.6', color: '#6B6B6B', marginTop: '12px', fontStyle: 'italic' }}>
                    Note: AI-powered insights will be generated using Hugging Face API after completing assessments.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Submit Assignment Modal */}
        <Modal
          isOpen={isSubmitModalOpen}
          onClose={() => setIsSubmitModalOpen(false)}
          title="Submit Assignment"
        >
          <div className="form-group">
            <label className="form-label" htmlFor="content">
              Your Response
            </label>
            <textarea
              id="content"
              name="content"
              className="form-textarea"
              value={submission.content}
              onChange={handleTextChange}
              placeholder="Write your response here..."
              rows={6}
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="file">
              Upload File (Optional)
            </label>
            <input
              type="file"
              id="file"
              name="file"
              className="form-input"
              onChange={handleFileChange}
              accept=".pdf,.doc,.docx,.txt,.zip,.rar"
            />
            <small className="form-help">
              Supported formats: PDF, Word, Text, ZIP, RAR
            </small>
          </div>

          <div className="submission-info">
            <div className="info-item">
              <span className="info-icon">⚠️</span>
              <div className="info-content">
                <div className="info-title">Important</div>
                <div className="info-text">
                  Make sure to review your submission before submitting. You
                  cannot edit your submission after it's been submitted.
                </div>
              </div>
            </div>
          </div>

          <div className="modal-footer">
            <button
              className="btn btn-secondary"
              onClick={() => setIsSubmitModalOpen(false)}
            >
              Cancel
            </button>
            <button
              className="btn btn-primary"
              onClick={handleSubmit}
              disabled={!submission.content && !submission.file}
            >
              Submit Assignment
            </button>
          </div>
        </Modal>
      </div>
    </div>
  );
};

export default StudentAssignments;
