import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';
import PsychologyIcon from '@mui/icons-material/Psychology';
import FlashOnIcon from '@mui/icons-material/FlashOn';
import BarChartIcon from '@mui/icons-material/BarChart';
import SmartToyIcon from '@mui/icons-material/SmartToy';
import LockIcon from '@mui/icons-material/Lock';

const STAGGER = 0.035;

const Typewriter: React.FC<{ text: string; delay?: number }> = ({ text, delay = 0 }) => {
  const [displayText, setDisplayText] = useState("");
  const [currentIndex, setCurrentIndex] = useState(0);
  const [hasStarted, setHasStarted] = useState(false);

  useEffect(() => {
    const startTimeout = setTimeout(() => {
      setHasStarted(true);
    }, delay);

    return () => clearTimeout(startTimeout);
  }, [delay]);

  useEffect(() => {
    if (!hasStarted) return;

    if (currentIndex < text.length) {
      const timeout = setTimeout(() => {
        setDisplayText(prev => prev + text[currentIndex]);
        setCurrentIndex(prev => prev + 1);
      }, 80);

      return () => clearTimeout(timeout);
    }
  }, [currentIndex, text, hasStarted]);

  return (
    <span>
      {displayText}
      {currentIndex < text.length && (
        <motion.span
          animate={{ opacity: [1, 0] }}
          transition={{ duration: 0.5, repeat: Infinity, repeatType: "reverse" }}
          style={{ borderRight: '3px solid #A47C48', paddingRight: '2px' }}
        >
        </motion.span>
      )}
    </span>
  );
};

const TextRoll: React.FC<{
  children: string;
  className?: string;
  center?: boolean;
}> = ({ children, className, center = false }) => {
  return (
    <motion.span
      initial="initial"
      whileHover="hovered"
      style={{
        position: 'relative',
        display: 'block',
        overflow: 'hidden',
        lineHeight: 0.75
      }}
    >
      <div>
        {children.split("").map((l, i) => {
          const delay = center
            ? STAGGER * Math.abs(i - (children.length - 1) / 2)
            : STAGGER * i;

          return (
            <motion.span
              variants={{
                initial: {
                  y: 0,
                },
                hovered: {
                  y: "-100%",
                },
              }}
              transition={{
                ease: "easeInOut",
                delay,
              }}
              style={{ display: 'inline-block' }}
              key={i}
            >
              {l}
            </motion.span>
          );
        })}
      </div>
      <div style={{ position: 'absolute', inset: 0 }}>
        {children.split("").map((l, i) => {
          const delay = center
            ? STAGGER * Math.abs(i - (children.length - 1) / 2)
            : STAGGER * i;

          return (
            <motion.span
              variants={{
                initial: {
                  y: "100%",
                },
                hovered: {
                  y: 0,
                },
              }}
              transition={{
                ease: "easeInOut",
                delay,
              }}
              style={{ display: 'inline-block' }}
              key={i}
            >
              {l}
            </motion.span>
          );
        })}
      </div>
    </motion.span>
  );
};

const LandingPage: React.FC = () => {
  const navigate = useNavigate();

  const handleRoleSelection = (role: "teacher" | "student") => {
    sessionStorage.setItem('pendingRole', role);
    navigate("/login");
  };

  // Animation variants
  const fadeInUp = {
    hidden: { opacity: 0, y: 60 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.6 }
    }
  };

  const staggerContainer = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.15
      }
    }
  };

  const scaleIn = {
    hidden: { scale: 0.8, opacity: 0 },
    visible: {
      scale: 1,
      opacity: 1,
      transition: { duration: 0.5 }
    }
  };

  const slideInLeft = {
    hidden: { x: -100, opacity: 0 },
    visible: {
      x: 0,
      opacity: 1,
      transition: { duration: 0.6 }
    }
  };

  const slideInRight = {
    hidden: { x: 100, opacity: 0 },
    visible: {
      x: 0,
      opacity: 1,
      transition: { duration: 0.6 }
    }
  };

  return (
    <div className="landing-page">
      {/* Hero Section */}
      <motion.div
        className="hero-section"
        initial="hidden"
        animate="visible"
        variants={staggerContainer}
      >
        <div className="hero-content">
          <motion.div
            variants={fadeInUp}
            style={{
              fontSize: '64px',
              fontWeight: '800',
              letterSpacing: '-1px',
              cursor: 'pointer',
              marginBottom: '16px',
              color: '#A47C48'
            }}
          >
            <TextRoll center>EduPortal</TextRoll>
          </motion.div>
          <motion.div
            variants={fadeInUp}
            style={{
              fontSize: '32px',
              fontWeight: '600',
              color: '#a47c48',
              cursor: 'pointer',
              marginBottom: '24px'
            }}
          >
            <TextRoll center>Adaptive Assessment Platform</TextRoll>
          </motion.div>
          <motion.p
            className="hero-description"
            variants={fadeInUp}
          >
            Transform education with AI-powered adaptive assessments that personalize learning in real-time using Bloom's Taxonomy
          </motion.p>
          <motion.div
            className="hero-buttons"
            variants={fadeInUp}
          >
            <motion.button
              className="btn btn-primary btn-large"
              onClick={() => handleRoleSelection("teacher")}
              whileHover={{ scale: 1.05, boxShadow: "0 10px 30px rgba(164, 124, 72, 0.4)" }}
              whileTap={{ scale: 0.98 }}
              transition={{ type: "spring", stiffness: 400, damping: 17 }}
            >
              Login as Teacher
            </motion.button>
            <motion.button
              className="btn btn-secondary btn-large"
              onClick={() => handleRoleSelection("student")}
              whileHover={{ scale: 1.05, boxShadow: "0 10px 30px rgba(164, 124, 72, 0.3)" }}
              whileTap={{ scale: 0.98 }}
              transition={{ type: "spring", stiffness: 400, damping: 17 }}
            >
              Login as Student
            </motion.button>
          </motion.div>
        </div>
      </motion.div>

      {/* Features Section */}
      <motion.div
        className="features-section"
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: "-100px" }}
        variants={staggerContainer}
      >
        <motion.h2
          className="features-title"
          variants={fadeInUp}
        >
          <Typewriter text="Why Choose EduPortal?" delay={800} />
        </motion.h2>
        <motion.div
          className="features-grid"
          variants={staggerContainer}
        >
          {[
            { icon: <EmojiEventsIcon style={{ fontSize: '48px', color: '#A47C48' }} />, title: "Adaptive Learning", desc: "Questions dynamically adjust based on student performance, ensuring optimal challenge levels" },
            { icon: <PsychologyIcon style={{ fontSize: '48px', color: '#A47C48' }} />, title: "Bloom's Taxonomy", desc: "Assess cognitive skills across Remember, Understand, and Apply levels for comprehensive evaluation" },
            { icon: <FlashOnIcon style={{ fontSize: '48px', color: '#A47C48' }} />, title: "Real-Time Analytics", desc: "Instant insights into student performance with AI-powered recommendations for improvement" },
            { icon: <BarChartIcon style={{ fontSize: '48px', color: '#A47C48' }} />, title: "Smart Reporting", desc: "Comprehensive dashboards showing class-wide trends and individual student progress" },
            { icon: <SmartToyIcon style={{ fontSize: '48px', color: '#A47C48' }} />, title: "AI-Powered Insights", desc: "Personalized feedback generated using advanced language models from Hugging Face" },
            { icon: <LockIcon style={{ fontSize: '48px', color: '#A47C48' }} />, title: "Secure & Free", desc: "Built on Firebase with Google Authentication - reliable, scalable, and completely free" }
          ].map((feature, index) => (
            <motion.div
              key={index}
              className="feature-card"
              variants={scaleIn}
              whileHover={{
                y: -12,
                boxShadow: "0 20px 60px rgba(164, 124, 72, 0.35)",
                transition: { duration: 0.3 }
              }}
            >
              <motion.div
                className="feature-icon-large"
                whileHover={{ rotate: [0, -10, 10, -10, 0], scale: 1.1 }}
                transition={{ duration: 0.5 }}
              >
                {feature.icon}
              </motion.div>
              <h3>{feature.title}</h3>
              <p>{feature.desc}</p>
            </motion.div>
          ))}
        </motion.div>
      </motion.div>

      {/* How It Works Section */}
      <motion.div
        className="how-it-works-section"
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: "-100px" }}
        variants={staggerContainer}
      >
        <motion.h2
          className="section-title"
          variants={fadeInUp}
        >
          How It Works
        </motion.h2>
        <motion.div
          className="steps-container"
          variants={staggerContainer}
        >
          {[
            { num: "1", title: "Create Classroom", desc: "Teachers create classrooms and generate unique join codes for students", dir: slideInLeft },
            { num: "2", title: "Build Assessment", desc: "Create adaptive assessments with questions tagged by difficulty and Bloom level", dir: slideInRight },
            { num: "3", title: "Students Take Exam", desc: "Questions adapt in real-time based on correctness and response speed", dir: slideInLeft },
            { num: "4", title: "AI Analysis", desc: "Get personalized insights and recommendations powered by AI", dir: slideInRight }
          ].map((step, index) => (
            <React.Fragment key={index}>
              <motion.div
                className="step-card"
                variants={step.dir}
                whileHover={{
                  scale: 1.08,
                  y: -8,
                  boxShadow: "0 15px 50px rgba(164, 124, 72, 0.35)",
                  transition: { duration: 0.3 }
                }}
              >
                <motion.div
                  className="step-number"
                  whileHover={{ scale: 1.2, rotate: 360 }}
                  transition={{ duration: 0.6 }}
                >
                  {step.num}
                </motion.div>
                <h3>{step.title}</h3>
                <p>{step.desc}</p>
              </motion.div>
              {index < 3 && (
                <motion.div
                  className="step-arrow"
                  initial={{ opacity: 0, scale: 0.5 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.3 + (index * 0.2), duration: 0.4 }}
                >
                  →
                </motion.div>
              )}
            </React.Fragment>
          ))}
        </motion.div>
      </motion.div>

      {/* Footer */}
      <motion.div
        className="landing-footer"
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 0.8 }}
      >
        <motion.p
          initial={{ y: 20, opacity: 0 }}
          whileInView={{ y: 0, opacity: 1 }}
          viewport={{ once: true }}
          transition={{ delay: 0.2 }}
        >
          Built with React + Firebase + Hugging Face AI
        </motion.p>
        <motion.p
          style={{ marginTop: '8px', fontSize: '14px', opacity: 0.7 }}
          initial={{ y: 20, opacity: 0 }}
          whileInView={{ y: 0, opacity: 0.7 }}
          viewport={{ once: true }}
          transition={{ delay: 0.3 }}
        >
          Transforming education through adaptive technology
        </motion.p>
      </motion.div>
    </div>
  );
};

export default LandingPage;
