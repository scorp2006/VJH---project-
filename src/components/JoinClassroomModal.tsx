import React, { useState } from 'react';
import { db } from '../firebase/config';
import { collection, query, where, getDocs, updateDoc, arrayUnion } from 'firebase/firestore';
import { useAuth } from '../contexts/AuthContext';

interface JoinClassroomModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const JoinClassroomModal: React.FC<JoinClassroomModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const { currentUser } = useAuth();
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;

    setLoading(true);
    setError('');

    try {
      const classroomsRef = collection(db, 'classrooms');
      const q = query(classroomsRef, where('code', '==', code.toUpperCase()));
      const snapshot = await getDocs(q);

      if (snapshot.empty) {
        setError('Invalid classroom code. Please check and try again.');
        setLoading(false);
        return;
      }

      const classroomDoc = snapshot.docs[0];
      await updateDoc(classroomDoc.ref, {
        members: arrayUnion(currentUser.id)
      });

      setCode('');
      onSuccess();
      onClose();
    } catch (err: any) {
      console.error('Error joining classroom:', err);
      setError('Failed to join classroom. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">Join Classroom</h2>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>

        {error && (
          <div style={{
            padding: '12px',
            backgroundColor: '#f44336',
            color: 'white',
            borderRadius: '8px',
            marginBottom: '16px'
          }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Classroom Code</label>
            <input
              type="text"
              className="form-input"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder="Enter 6-character code"
              maxLength={6}
              style={{ textTransform: 'uppercase', fontSize: '18px', letterSpacing: '2px' }}
              required
            />
            <small className="form-help">Ask your teacher for the classroom code</small>
          </div>

          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? 'Joining...' : 'Join Classroom'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default JoinClassroomModal;
