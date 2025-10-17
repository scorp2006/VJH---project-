import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth, db, googleProvider } from '../firebase/config';
import { signInWithPopup } from 'firebase/auth';
import { doc, setDoc, getDoc } from 'firebase/firestore';

const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleGoogleSignIn = async () => {
    setLoading(true);
    setError('');

    try {
      const result = await signInWithPopup(auth, googleProvider);
      const user = result.user;

      // Get pending role from sessionStorage
      const role = sessionStorage.getItem('pendingRole') || 'student';

      // Create/update user document in Firestore
      const userRef = doc(db, 'users', user.uid);
      const userDoc = await getDoc(userRef);

      if (!userDoc.exists()) {
        await setDoc(userRef, {
          id: user.uid,
          email: user.email,
          name: user.displayName,
          role: role,
          avatar: user.photoURL,
          createdAt: new Date().toISOString()
        });
      }

      // Clear pending role
      sessionStorage.removeItem('pendingRole');

      // Redirect to dashboard
      if (role === 'teacher') {
        navigate('/teacher/dashboard');
      } else {
        navigate('/student/dashboard');
      }
    } catch (error: any) {
      console.error('Sign-in error:', error);
      setError('Failed to sign in. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="landing-page">
      <div className="landing-container">
        <div className="landing-header">
          <h1 className="landing-title">EduPortal</h1>
          <p className="landing-subtitle">Adaptive Assessment Platform</p>
        </div>

        <div className="role-selection">
          <h2 className="selection-title">Sign in to continue</h2>

          {error && (
            <div style={{
              padding: '12px',
              backgroundColor: '#f44336',
              color: 'white',
              borderRadius: '8px',
              marginBottom: '20px'
            }}>
              {error}
            </div>
          )}

          <button
            onClick={handleGoogleSignIn}
            disabled={loading}
            className="btn btn-primary"
            style={{ fontSize: '16px', padding: '16px 32px' }}
          >
            {loading ? 'Signing in...' : '🔐 Sign in with Google'}
          </button>

          <p style={{ marginTop: '20px', fontSize: '14px', opacity: 0.7 }}>
            Click to sign in with your Google account
          </p>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
