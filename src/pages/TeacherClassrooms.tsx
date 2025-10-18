import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { collection, query, where, getDocs, onSnapshot } from "firebase/firestore";
import { db } from "../firebase/config";
import { useAuth } from "../contexts/AuthContext";
import Card from "../components/Card";
import CreateClassroomModal from "../components/CreateClassroomModal";
import HourglassEmptyIcon from '@mui/icons-material/HourglassEmpty';
import SchoolIcon from '@mui/icons-material/School';

interface Classroom {
  id: string;
  name: string;
  subject: string;
  description: string;
  code: string;
  members: string[];
  createdAt: any;
}

const TeacherClassrooms: React.FC = () => {
  const { currentUser } = useAuth();
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [classrooms, setClassrooms] = useState<Classroom[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!currentUser) return;

    const q = query(
      collection(db, 'classrooms'),
      where('teacherId', '==', currentUser.id)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const classroomData: Classroom[] = [];
      snapshot.forEach((doc) => {
        classroomData.push({ ...doc.data(), id: doc.id } as Classroom);
      });
      setClassrooms(classroomData);
      setLoading(false);
    });

    return unsubscribe;
  }, [currentUser]);

  const handleSuccess = () => {
    // Classroom created successfully - real-time listener will update UI
  };

  if (loading) {
    return (
      <div className="page-content">
        <div className="container" style={{ textAlign: 'center', paddingTop: '100px' }}>
          <div style={{ marginTop: '20px' }}>
            <HourglassEmptyIcon style={{ fontSize: '64px', color: '#A47C48' }} />
          </div>
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
          <h1 className="page-title">My Classrooms</h1>
          <button
            className="btn btn-primary"
            onClick={() => setIsCreateModalOpen(true)}
          >
            + Create New Classroom
          </button>
        </div>

        {classrooms.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">
              <SchoolIcon style={{ fontSize: '64px', color: '#A47C48' }} />
            </div>
            <h3 className="empty-state-title">No classrooms yet</h3>
            <p className="empty-state-subtitle">
              Create your first classroom to get started with teaching
            </p>
            <button
              className="btn btn-primary mt-4"
              onClick={() => setIsCreateModalOpen(true)}
            >
              Create Classroom
            </button>
          </div>
        ) : (
          <div className="grid grid-3 gap-6">
            {classrooms.map((classroom) => (
              <Link
                key={classroom.id}
                to={`/teacher/classroom/${classroom.id}`}
                className="classroom-link"
              >
                <Card
                  title={classroom.name}
                  subtitle={`${classroom.subject} • ${classroom.members.length} students`}
                >
                  <div className="classroom-description">
                    {classroom.description}
                  </div>
                  <div className="classroom-footer">
                    <div className="classroom-code">
                      <span className="code-label">Class Code:</span>
                      <span className="code-value">{classroom.code}</span>
                    </div>
                    <div className="classroom-date">
                      Created{" "}
                      {classroom.createdAt?.toDate?.()?.toLocaleDateString() || 'Just now'}
                    </div>
                  </div>
                </Card>
              </Link>
            ))}
          </div>
        )}

        <CreateClassroomModal
          isOpen={isCreateModalOpen}
          onClose={() => setIsCreateModalOpen(false)}
          onSuccess={handleSuccess}
        />
      </div>
    </div>
  );
};

export default TeacherClassrooms;
