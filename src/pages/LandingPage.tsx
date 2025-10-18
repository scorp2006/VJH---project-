import React from "react";
import { useNavigate } from "react-router-dom";
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';
import PsychologyIcon from '@mui/icons-material/Psychology';
import FlashOnIcon from '@mui/icons-material/FlashOn';
import BarChartIcon from '@mui/icons-material/BarChart';
import SmartToyIcon from '@mui/icons-material/SmartToy';
import LockIcon from '@mui/icons-material/Lock';

const LandingPage: React.FC = () => {
  const navigate = useNavigate();

  const handleRoleSelection = (role: "teacher" | "student") => {
    sessionStorage.setItem('pendingRole', role);
    navigate("/login");
  };

  return (
    <div className="landing-page">
      {/* Hero Section */}
      <div className="hero-section">
        <div className="hero-content">
          <h1 className="hero-title">EduPortal</h1>
          <h2 className="hero-subtitle">Adaptive Assessment Platform</h2>
          <p className="hero-description">
            Transform education with AI-powered adaptive assessments that personalize learning in real-time using Bloom's Taxonomy
          </p>
          <div className="hero-buttons">
            <button
              className="btn btn-primary btn-large"
              onClick={() => handleRoleSelection("teacher")}
            >
              Login as Teacher
            </button>
            <button
              className="btn btn-secondary btn-large"
              onClick={() => handleRoleSelection("student")}
            >
              Login as Student
            </button>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className="features-section">
        <h2 className="features-title">Why Choose EduPortal?</h2>
        <div className="features-grid">
          <div className="feature-card">
            <div className="feature-icon-large">
              <EmojiEventsIcon style={{ fontSize: '48px', color: '#A47C48' }} />
            </div>
            <h3>Adaptive Learning</h3>
            <p>Questions dynamically adjust based on student performance, ensuring optimal challenge levels</p>
          </div>
          <div className="feature-card">
            <div className="feature-icon-large">
              <PsychologyIcon style={{ fontSize: '48px', color: '#A47C48' }} />
            </div>
            <h3>Bloom's Taxonomy</h3>
            <p>Assess cognitive skills across Remember, Understand, and Apply levels for comprehensive evaluation</p>
          </div>
          <div className="feature-card">
            <div className="feature-icon-large">
              <FlashOnIcon style={{ fontSize: '48px', color: '#A47C48' }} />
            </div>
            <h3>Real-Time Analytics</h3>
            <p>Instant insights into student performance with AI-powered recommendations for improvement</p>
          </div>
          <div className="feature-card">
            <div className="feature-icon-large">
              <BarChartIcon style={{ fontSize: '48px', color: '#A47C48' }} />
            </div>
            <h3>Smart Reporting</h3>
            <p>Comprehensive dashboards showing class-wide trends and individual student progress</p>
          </div>
          <div className="feature-card">
            <div className="feature-icon-large">
              <SmartToyIcon style={{ fontSize: '48px', color: '#A47C48' }} />
            </div>
            <h3>AI-Powered Insights</h3>
            <p>Personalized feedback generated using advanced language models from Hugging Face</p>
          </div>
          <div className="feature-card">
            <div className="feature-icon-large">
              <LockIcon style={{ fontSize: '48px', color: '#A47C48' }} />
            </div>
            <h3>Secure & Free</h3>
            <p>Built on Firebase with Google Authentication - reliable, scalable, and completely free</p>
          </div>
        </div>
      </div>

      {/* How It Works Section */}
      <div className="how-it-works-section">
        <h2 className="section-title">How It Works</h2>
        <div className="steps-container">
          <div className="step-card">
            <div className="step-number">1</div>
            <h3>Create Classroom</h3>
            <p>Teachers create classrooms and generate unique join codes for students</p>
          </div>
          <div className="step-arrow">→</div>
          <div className="step-card">
            <div className="step-number">2</div>
            <h3>Build Assessment</h3>
            <p>Create adaptive assessments with questions tagged by difficulty and Bloom level</p>
          </div>
          <div className="step-arrow">→</div>
          <div className="step-card">
            <div className="step-number">3</div>
            <h3>Students Take Exam</h3>
            <p>Questions adapt in real-time based on correctness and response speed</p>
          </div>
          <div className="step-arrow">→</div>
          <div className="step-card">
            <div className="step-number">4</div>
            <h3>AI Analysis</h3>
            <p>Get personalized insights and recommendations powered by AI</p>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="landing-footer">
        <p>Built with React + Firebase + Hugging Face AI</p>
        <p style={{ marginTop: '8px', fontSize: '14px', opacity: 0.7 }}>
          Transforming education through adaptive technology
        </p>
      </div>
    </div>
  );
};

export default LandingPage;
