import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth, db, googleProvider } from '../firebase/config';
import { signInWithPopup } from 'firebase/auth';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { useAuth } from '../contexts/AuthContext';

const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [pendingNavigation, setPendingNavigation] = useState<string | null>(null);

  // Watch for currentUser updates and navigate when ready
  useEffect(() => {
    if (currentUser && pendingNavigation) {
      console.log('✅ User authenticated, navigating to:', pendingNavigation);
      navigate(pendingNavigation);
      setPendingNavigation(null);
      setLoading(false);
    }
  }, [currentUser, pendingNavigation, navigate]);

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
        // First time login - create new user
        await setDoc(userRef, {
          id: user.uid,
          email: user.email,
          name: user.displayName,
          role: role,
          avatar: user.photoURL,
          createdAt: new Date().toISOString()
        });
        console.log('✅ New user created with role:', role);
      } else {
        // Existing user - update role if it changed
        const existingRole = userDoc.data()?.role;
        if (existingRole !== role) {
          await setDoc(userRef, {
            role: role
          }, { merge: true });
          console.log('✅ User role updated to:', role);
        }
      }

      // Clear pending role
      sessionStorage.removeItem('pendingRole');

      // Set pending navigation - the useEffect will navigate when currentUser is set
      const targetPath = role === 'teacher' ? '/teacher/dashboard' : '/student/dashboard';
      setPendingNavigation(targetPath);
      console.log('⏳ Waiting for AuthContext to update...');

    } catch (error: any) {
      console.error('Sign-in error:', error);
      setLoading(false);
      if (error.code === 'auth/popup-closed-by-user') {
        setError('Sign-in cancelled. Please try again.');
      } else if (error.code === 'auth/popup-blocked') {
        setError('Pop-up blocked. Please allow pop-ups for this site.');
      } else if (error.code === 'auth/unauthorized-domain') {
        setError('This domain is not authorized. Please contact the administrator.');
      } else {
        setError('Failed to sign in. Please check your internet connection and try again.');
      }
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'linear-gradient(135deg, #f5e8c7 0%, #e8d5a8 100%)',
      padding: '40px 20px'
    }}>
      <div style={{
        maxWidth: '500px',
        width: '100%',
        backgroundColor: 'white',
        borderRadius: '20px',
        padding: '48px',
        boxShadow: '0 20px 60px rgba(164, 124, 72, 0.3)',
        textAlign: 'center'
      }}>
        <div style={{ marginBottom: '40px' }}>
          <h1 style={{
            fontSize: '48px',
            fontWeight: '800',
            background: 'linear-gradient(135deg, #A47C48 0%, #8B6B3A 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
            marginBottom: '16px'
          }}>
            EduPortal
          </h1>
          <p style={{
            fontSize: '20px',
            color: '#A47C48',
            fontWeight: '600'
          }}>
            Adaptive Assessment Platform
          </p>
        </div>

        <h2 style={{
          fontSize: '28px',
          fontWeight: '700',
          color: '#4b2e05',
          marginBottom: '32px'
        }}>
          Sign in to continue
        </h2>

        {error && (
          <div style={{
            padding: '16px',
            backgroundColor: '#f44336',
            color: 'white',
            borderRadius: '12px',
            marginBottom: '24px',
            fontWeight: '600'
          }}>
            {error}
          </div>
        )}

        <button
          onClick={handleGoogleSignIn}
          disabled={loading}
          className="btn btn-primary"
          style={{
            fontSize: '18px',
            padding: '18px 40px',
            width: '100%',
            borderRadius: '12px',
            fontWeight: '700',
            boxShadow: '0 4px 16px rgba(164, 124, 72, 0.3)',
            transition: 'all 0.3s ease'
          }}
        >
          {loading ? 'Signing in...' : 'Sign in with Google'}
        </button>

        <p style={{
          marginTop: '24px',
          fontSize: '14px',
          color: '#4b2e05',
          opacity: 0.7
        }}>
          Click to sign in with your Google account
        </p>
      </div>
    </div>
  );
};

export default LoginPage;
