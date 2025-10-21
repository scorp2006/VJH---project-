import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth, db, googleProvider } from '../firebase/config';
import { signInWithPopup, signOut } from 'firebase/auth';
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

      const isNewUser = !userDoc.exists();

      if (isNewUser) {
        // First time login - create new user
        await setDoc(userRef, {
          id: user.uid,
          email: user.email,
          name: user.displayName,
          role: role,
          avatar: user.photoURL,
          createdAt: new Date().toISOString()
        });

        // For new users, sign out and sign back in to force AuthContext refresh
        console.log('New user created, refreshing auth state...');
        await signOut(auth);
        await new Promise(resolve => setTimeout(resolve, 300));

        // Sign in again
        const secondResult = await signInWithPopup(auth, googleProvider);
        console.log('Re-authenticated successfully');
      } else {
        // Existing user - update role if it changed
        const existingRole = userDoc.data()?.role;
        if (existingRole !== role) {
          await setDoc(userRef, {
            ...userDoc.data(),
            role: role
          }, { merge: true });

          // Role changed, also refresh
          console.log('Role updated, refreshing auth state...');
          await signOut(auth);
          await new Promise(resolve => setTimeout(resolve, 300));
          await signInWithPopup(auth, googleProvider);
        }
      }

      // Clear pending role
      sessionStorage.removeItem('pendingRole');

      // Wait a bit for AuthContext to update
      await new Promise(resolve => setTimeout(resolve, 800));

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
