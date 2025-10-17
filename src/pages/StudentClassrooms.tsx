import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { collection, onSnapshot } from "firebase/firestore";
import { db } from "../firebase/config";
import { useAuth } from "../contexts/AuthContext";
import Card from "../components/Card";
import JoinClassroomModal from "../components/JoinClassroomModal";

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

const StudentClassrooms: React.FC = () => {
  const { currentUser } = useAuth();
  const [isJoinModalOpen, setIsJoinModalOpen] = useState(false);
  const [classrooms, setClassrooms] = useState<Classroom[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!currentUser) return;

    const unsubscribe = onSnapshot(collection(db, 'classrooms'), (snapshot) => {
      const classroomData: Classroom[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        if (data.members && data.members.includes(currentUser.id)) {
          classroomData.push({ ...data, id: doc.id } as Classroom);
        }
      });
      setClassrooms(classroomData);
      setLoading(false);
    });

    return unsubscribe;
  }, [currentUser]);

  const handleSuccess = () => {
    // Classroom joined - real-time listener updates UI
  };

  if (loading) {
    return (
      <div className="page-content">
        <div className="container" style={{ textAlign: 'center', paddingTop: '100px' }}>
          <div style={{ fontSize: '48px' }}>⏳</div>
          <div style={{ fontSize: '18px', marginTop: '20px', color: '#4B2E05' }}>
            Loading classrooms...
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="page-content">
      <div className="container">
        <div className="flex flex-between flex-center mb-6">
          <h1 className="page-title">Joined Classrooms</h1>
          <button
            className="btn btn-primary"
            onClick={() => setIsJoinModalOpen(true)}
          >
            + Join New Classroom
          </button>
        </div>

        {classrooms.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">🏫</div>
            <h3 className="empty-state-title">No classrooms joined yet</h3>
            <p className="empty-state-subtitle">
              Join a classroom using a class code to start learning
            </p>
            <button
              className="btn btn-primary mt-4"
              onClick={() => setIsJoinModalOpen(true)}
            >
              Join Classroom
            </button>
          </div>
        ) : (
          <div className="grid grid-3 gap-6">
            {classrooms.map((classroom) => (
              <Link
                key={classroom.id}
                to={`/student/classroom/${classroom.id}/assignments`}
                className="classroom-link"
              >
                <Card
                  title={classroom.name}
                  subtitle={`${classroom.subject} • ${classroom.members.length} students`}
                  className="classroom-card"
                >
                  <div className="classroom-description">
                    {classroom.description}
                  </div>
                  <div className="classroom-footer">
                    <div className="classroom-code">
                      <span className="code-label">Class Code:</span>
                      <span className="code-value">{classroom.code}</span>
                    </div>
                    <div className="classroom-actions">
                      <button className="btn btn-secondary btn-sm">
                        View Assignments
                      </button>
                    </div>
                  </div>
                </Card>
              </Link>
            ))}
          </div>
        )}

        <JoinClassroomModal
          isOpen={isJoinModalOpen}
          onClose={() => setIsJoinModalOpen(false)}
          onSuccess={handleSuccess}
        />
      </div>
    </div>
  );
};

export default StudentClassrooms;
