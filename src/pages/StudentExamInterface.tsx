import React, { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { db } from "../firebase/config";
import { doc, getDoc, collection, addDoc, Timestamp } from "firebase/firestore";
import Modal from "../components/Modal";
import { RaschAdaptiveEngine } from "../services/raschModelService";

interface Question {
  id: string;
  text: string;
  options: string[];
  correctAnswer: string;
  bloomLevel: 1 | 2 | 3;
  difficulty: 'easy' | 'medium' | 'hard';
  concept: string;
  timeEstimate: number;
}

interface Assessment {
  id: string;
  title: string;
  description: string;
  duration: number;
  timeLimit?: number;
  endDate?: any;
  dueDate?: any;
  maxAttempts?: number;
  questions: Question[];
  classroomId: string;
  teacherId: string;
  status: string;
}

interface QuestionResponse {
  question: Question;
  selectedAnswer: string;
  timeTaken: number;
  markedForReview: boolean;
}

const StudentExamInterface: React.FC = () => {
  const { assessmentId } = useParams<{ assessmentId: string }>();
  const { currentUser } = useAuth();
  const navigate = useNavigate();

  const [assessment, setAssessment] = useState<Assessment | null>(null);
  const [loading, setLoading] = useState(true);
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [startTime] = useState<Date>(new Date());
  const [deadlineType, setDeadlineType] = useState<'timeLimit' | 'endDate' | 'duration'>('duration');

  // Rasch Model adaptive testing state
  const [raschEngine, setRaschEngine] = useState<RaschAdaptiveEngine | null>(null);
  const [currentQuestion, setCurrentQuestion] = useState<Question | null>(null);
  const [selectedAnswer, setSelectedAnswer] = useState<string>("");
  const [questionStartTime, setQuestionStartTime] = useState<number>(Date.now());
  const [responses, setResponses] = useState<QuestionResponse[]>([]);
  const [questionsAnswered, setQuestionsAnswered] = useState(0);
  const [currentTheta, setCurrentTheta] = useState<number>(0);
  const [reviewQueue, setReviewQueue] = useState<Question[]>([]); // Questions marked for review
  const [isReviewMode, setIsReviewMode] = useState(false); // Are we in review mode?
  const maxQuestions = useRef(30); // Maximum questions per assessment (dynamically set from assessment)

  // Fetch assessment data
  useEffect(() => {
    const fetchAssessment = async () => {
      if (!assessmentId) return;

      try {
        const assessmentDoc = await getDoc(doc(db, 'assessments', assessmentId));

        if (assessmentDoc.exists()) {
          const data = { ...assessmentDoc.data(), id: assessmentDoc.id } as Assessment;
          setAssessment(data);

          // Calculate time remaining based on timeLimit or endDate (whichever comes first)
          let calculatedTimeRemaining: number;
          let activeDeadlineType: 'timeLimit' | 'endDate' | 'duration' = 'duration';

          // Priority 1: Check if there's a hard endDate deadline
          if (data.endDate) {
            const endDate = data.endDate.toDate ? data.endDate.toDate() : new Date(data.endDate);
            const now = new Date();
            const secondsUntilEnd = Math.floor((endDate.getTime() - now.getTime()) / 1000);

            if (secondsUntilEnd <= 0) {
              // Assessment has already ended
              alert('This assessment has already ended and is no longer accepting submissions.');
              navigate(-1);
              return;
            }

            // Priority 2: Check if there's a timeLimit per attempt
            if (data.timeLimit) {
              const timeLimitSeconds = data.timeLimit * 60;
              // Use whichever is smaller - time until endDate or timeLimit
              calculatedTimeRemaining = Math.min(secondsUntilEnd, timeLimitSeconds);
              activeDeadlineType = secondsUntilEnd < timeLimitSeconds ? 'endDate' : 'timeLimit';
            } else {
              // No timeLimit, use endDate only
              calculatedTimeRemaining = secondsUntilEnd;
              activeDeadlineType = 'endDate';
            }
          } else if (data.timeLimit) {
            // No endDate but has timeLimit
            calculatedTimeRemaining = data.timeLimit * 60;
            activeDeadlineType = 'timeLimit';
          } else {
            // Fallback to duration (old behavior)
            calculatedTimeRemaining = data.duration * 60;
            activeDeadlineType = 'duration';
          }

          setTimeRemaining(calculatedTimeRemaining);
          setDeadlineType(activeDeadlineType);

          console.log(`⏰ Timer set: ${Math.floor(calculatedTimeRemaining / 60)} minutes (${activeDeadlineType})`);

          // Set max questions from assessment length
          maxQuestions.current = data.questions.length;
          console.log(`📊 Loaded ${data.questions.length} questions`);

          // Log first 3 questions with correct answers for debugging
          data.questions.slice(0, 3).forEach((q, idx) => {
            console.log(`Q${idx + 1}: "${q.text}"`);
            console.log(`   Options:`, q.options);
            console.log(`   ✅ Correct Answer: "${q.correctAnswer}"`);
          });

          // Initialize Rasch Model adaptive testing engine
          const engine = new RaschAdaptiveEngine(data.questions);
          setRaschEngine(engine);

          // Get first question (near θ = 0, average difficulty)
          const firstQuestion = engine.getFirstQuestion();
          setCurrentQuestion(firstQuestion);
          setQuestionStartTime(Date.now());
        }
      } catch (error) {
        console.error('Error fetching assessment:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchAssessment();
  }, [assessmentId]);

  // Countdown timer
  useEffect(() => {
    if (!assessment || timeRemaining <= 0) return;

    const timer = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev <= 1) {
          handleAutoSubmit();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [assessment, timeRemaining]);

  const handleAutoSubmit = async () => {
    await submitAssessment();
  };

  const handleOptionSelect = (option: string) => {
    setSelectedAnswer(option);
  };

  const handleNext = () => {
    if (!currentQuestion || !selectedAnswer || !raschEngine) {
      alert("Please select an answer before proceeding");
      return;
    }

    // Calculate time taken for this question
    const timeTaken = Math.floor((Date.now() - questionStartTime) / 1000);
    const isCorrect = selectedAnswer === currentQuestion.correctAnswer;

    // Record response in local state
    const response: QuestionResponse = {
      question: currentQuestion,
      selectedAnswer: selectedAnswer,
      timeTaken: timeTaken,
      markedForReview: false,
    };
    setResponses(prev => [...prev, response]);

    // Update theta using Rasch model
    raschEngine.recordResponse(currentQuestion.id, isCorrect, timeTaken);

    // Update current theta for display
    setCurrentTheta(raschEngine.getTheta());

    setQuestionsAnswered(prev => prev + 1);

    // Check if test is complete
    if (questionsAnswered + 1 >= maxQuestions.current) {
      setShowSubmitModal(true);
      return;
    }

    // Get next question using Maximum Information Criterion
    const nextQuestion = raschEngine.getNextQuestion();

    if (!nextQuestion) {
      // No more questions available
      setShowSubmitModal(true);
      return;
    }

    // Move to next question
    setCurrentQuestion(nextQuestion);
    setSelectedAnswer("");
    setQuestionStartTime(Date.now());
  };

  const handleMarkForReview = () => {
    if (!currentQuestion || !raschEngine) return;

    // Add to review queue
    setReviewQueue(prev => [...prev, currentQuestion]);

    // Record this question as skipped for now (will be updated if answered later)
    const timeTaken = Math.floor((Date.now() - questionStartTime) / 1000);
    const response: QuestionResponse = {
      question: currentQuestion,
      selectedAnswer: "",
      timeTaken: timeTaken,
      markedForReview: true,
    };
    setResponses(prev => [...prev, response]);

    // Don't update theta for skipped questions
    setQuestionsAnswered(prev => prev + 1);

    // Check if test is complete (excluding review queue)
    if (questionsAnswered + 1 >= maxQuestions.current) {
      // If there are questions in review queue, enter review mode
      if (reviewQueue.length + 1 > 0) { // +1 for current question we just added
        setIsReviewMode(true);
        // Show the first question from review queue
        const firstReviewQuestion = reviewQueue.length > 0 ? reviewQueue[0] : currentQuestion;
        setCurrentQuestion(firstReviewQuestion);
        setSelectedAnswer("");
        setQuestionStartTime(Date.now());
      } else {
        setShowSubmitModal(true);
      }
      return;
    }

    // Get next question
    const nextQuestion = raschEngine.getNextQuestion();

    if (!nextQuestion) {
      // No more new questions - enter review mode if we have review queue
      if (reviewQueue.length + 1 > 0) {
        setIsReviewMode(true);
        const firstReviewQuestion = reviewQueue.length > 0 ? reviewQueue[0] : currentQuestion;
        setCurrentQuestion(firstReviewQuestion);
        setSelectedAnswer("");
        setQuestionStartTime(Date.now());
      } else {
        setShowSubmitModal(true);
      }
      return;
    }

    setCurrentQuestion(nextQuestion);
    setSelectedAnswer("");
    setQuestionStartTime(Date.now());
  };

  const handleReviewAnswer = () => {
    if (!currentQuestion || !selectedAnswer) {
      alert("Please select an answer before proceeding");
      return;
    }

    // Update the response for this reviewed question
    const responseIndex = responses.findIndex(r => r.question.id === currentQuestion.id);
    if (responseIndex !== -1) {
      const updatedResponses = [...responses];
      updatedResponses[responseIndex] = {
        ...updatedResponses[responseIndex],
        selectedAnswer: selectedAnswer,
        markedForReview: false,
      };
      setResponses(updatedResponses);

      // Update theta for this response
      if (raschEngine) {
        const isCorrect = selectedAnswer === currentQuestion.correctAnswer;
        raschEngine.recordResponse(currentQuestion.id, isCorrect, updatedResponses[responseIndex].timeTaken);
        setCurrentTheta(raschEngine.getTheta());
      }
    }

    // Remove from review queue
    const updatedQueue = reviewQueue.filter(q => q.id !== currentQuestion.id);
    setReviewQueue(updatedQueue);

    // Move to next review question or finish
    if (updatedQueue.length > 0) {
      setCurrentQuestion(updatedQueue[0]);
      setSelectedAnswer("");
      setQuestionStartTime(Date.now());
    } else {
      // All reviews completed
      setShowSubmitModal(true);
    }
  };

  const submitAssessment = async () => {
    if (!assessment || !currentUser || !raschEngine) return;

    setSubmitting(true);

    try {
      // Get statistics from Rasch model
      const stats = raschEngine.getStatistics();

      // Calculate final score
      const score = stats.accuracy;

      // Build theta progression history (simplified - all use final theta)
      // In a full implementation, you'd track theta after each response
      const thetaHistory: number[] = responses.map(() => stats.theta);

      // Save to Firebase with Rasch model data
      const submissionRef = await addDoc(collection(db, 'submissions'), {
        assessmentId: assessment.id,
        assessmentName: assessment.title,
        studentId: currentUser.id,
        studentName: currentUser.name,
        studentEmail: currentUser.email,
        classroomId: assessment.classroomId,
        responses: responses.map((r, idx) => ({
          questionId: r.question.id,
          questionText: r.question.text,
          selectedAnswer: r.selectedAnswer,
          correctAnswer: r.question.correctAnswer,
          isCorrect: r.selectedAnswer === r.question.correctAnswer,
          bloomLevel: r.question.bloomLevel,
          difficulty: r.question.difficulty,
          concept: r.question.concept,
          timeTaken: r.timeTaken,
          markedForReview: r.markedForReview,
          theta: thetaHistory[idx] || stats.theta, // Theta at time of this question
        })),
        score: score,
        correctCount: stats.correctAnswers,
        totalQuestions: stats.totalQuestions,
        submittedAt: Timestamp.now(),
        timeTaken: (assessment.duration * 60) - timeRemaining,
        // Rasch Model Statistics
        raschData: {
          finalTheta: stats.theta,
          thetaProgression: thetaHistory,
          standardError: stats.standardError,
          abilityLevel: stats.thetaDescription,
          convergence: stats.hasConverged ? 100 : 50,
        },
      });

      console.log('✅ Submission saved with ID:', submissionRef.id);

      // Navigate to results page with AI insights
      navigate(`/student/results/${submissionRef.id}`);
    } catch (error) {
      console.error('Error submitting assessment:', error);
      alert('Failed to submit assessment. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (loading) {
    return (
      <div className="page-content">
        <div className="container" style={{ textAlign: 'center', paddingTop: '100px' }}>
          <div style={{ fontSize: '48px' }}>⏳</div>
          <div style={{ fontSize: '18px', marginTop: '20px', color: '#4B2E05' }}>
            Loading adaptive assessment...
          </div>
        </div>
      </div>
    );
  }

  if (!assessment || !currentQuestion) {
    return (
      <div className="page-content">
        <div className="container">
          <div className="error-state">
            <h2>Assessment not found</h2>
            <p>The assessment you're looking for doesn't exist.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="page-content" style={{ backgroundColor: '#F5E8C7', minHeight: '100vh' }}>
      <div className="container" style={{ maxWidth: '1400px', padding: '20px' }}>
        {/* Header */}
        <div style={{
          backgroundColor: 'white',
          padding: '20px',
          borderRadius: '12px',
          marginBottom: '20px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
        }}>
          <div>
            <h1 style={{ fontSize: '24px', fontWeight: '700', color: '#4B2E05', margin: 0 }}>
              {assessment.title}
            </h1>
            <p style={{ fontSize: '14px', color: '#666', margin: '4px 0 0 0' }}>
              {isReviewMode ? (
                <span style={{ color: '#FF9800', fontWeight: '600' }}>
                  🔄 Review Mode - {reviewQueue.length} question{reviewQueue.length !== 1 ? 's' : ''} remaining
                </span>
              ) : (
                <>🎯 Rasch Model Adaptive Assessment - Question {questionsAnswered + 1} of {maxQuestions.current}</>
              )}
            </p>
            {questionsAnswered > 0 && (
              <p style={{ fontSize: '12px', color: '#2196F3', margin: '4px 0 0 0', fontWeight: '600' }}>
                Current Ability (θ): {currentTheta.toFixed(2)} • {raschEngine?.getThetaDescription()}
              </p>
            )}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{ textAlign: 'right' }}>
              <div style={{
                backgroundColor: timeRemaining < 60 ? '#F44336' : timeRemaining < 300 ? '#FF9800' : '#A47C48',
                color: 'white',
                padding: '12px 24px',
                borderRadius: '8px',
                fontSize: '24px',
                fontWeight: '700',
                minWidth: '120px',
                textAlign: 'center'
              }}>
                ⏱ {formatTime(timeRemaining)}
              </div>
              <div style={{ fontSize: '11px', color: '#666', marginTop: '4px' }}>
                {deadlineType === 'timeLimit' && 'Time Limit'}
                {deadlineType === 'endDate' && 'Assessment Closes'}
                {deadlineType === 'duration' && 'Estimated Duration'}
              </div>
            </div>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: '20px' }}>
          {/* Main Question Area */}
          <div style={{
            backgroundColor: 'white',
            padding: '30px',
            borderRadius: '12px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
          }}>
            {/* Question Text */}
            <div style={{ marginBottom: '30px' }}>
              <div style={{
                display: 'flex',
                gap: '8px',
                marginBottom: '16px',
                flexWrap: 'wrap'
              }}>
                <span style={{
                  padding: '4px 12px',
                  backgroundColor: currentQuestion.difficulty === 'easy' ? '#4CAF50' :
                                    currentQuestion.difficulty === 'medium' ? '#FFC107' : '#F44336',
                  color: 'white',
                  borderRadius: '12px',
                  fontSize: '12px',
                  fontWeight: '600'
                }}>
                  {currentQuestion.difficulty.toUpperCase()}
                </span>
                <span style={{
                  padding: '4px 12px',
                  backgroundColor: '#A47C48',
                  color: 'white',
                  borderRadius: '12px',
                  fontSize: '12px',
                  fontWeight: '600'
                }}>
                  Bloom Level {currentQuestion.bloomLevel}
                </span>
                <span style={{
                  padding: '4px 12px',
                  backgroundColor: '#F5E8C7',
                  borderRadius: '12px',
                  fontSize: '12px',
                  fontWeight: '600',
                  color: '#4B2E05'
                }}>
                  {currentQuestion.concept}
                </span>
              </div>
              <h2 style={{
                fontSize: '20px',
                fontWeight: '600',
                color: '#4B2E05',
                lineHeight: '1.6',
                margin: 0
              }}>
                {currentQuestion.text}
              </h2>
            </div>

            {/* Options */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '30px' }}>
              {currentQuestion.options.map((option, index) => (
                <div
                  key={index}
                  onClick={() => handleOptionSelect(option)}
                  style={{
                    padding: '16px 20px',
                    border: selectedAnswer === option
                      ? '2px solid #A47C48'
                      : '2px solid #E8D5A8',
                    backgroundColor: selectedAnswer === option
                      ? '#F5E8C7'
                      : 'white',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px'
                  }}
                  onMouseEnter={(e) => {
                    if (selectedAnswer !== option) {
                      e.currentTarget.style.borderColor = '#A47C48';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (selectedAnswer !== option) {
                      e.currentTarget.style.borderColor = '#E8D5A8';
                    }
                  }}
                >
                  <div style={{
                    width: '24px',
                    height: '24px',
                    borderRadius: '50%',
                    border: '2px solid #A47C48',
                    backgroundColor: selectedAnswer === option ? '#A47C48' : 'white',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0
                  }}>
                    {selectedAnswer === option && (
                      <div style={{
                        width: '10px',
                        height: '10px',
                        borderRadius: '50%',
                        backgroundColor: 'white'
                      }} />
                    )}
                  </div>
                  <span style={{ fontSize: '16px', color: '#4B2E05' }}>{option}</span>
                </div>
              ))}
            </div>

            {/* Navigation Buttons */}
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              gap: '16px'
            }}>
              {isReviewMode ? (
                // Review mode - only show submit button
                <button
                  className="btn btn-primary"
                  onClick={handleReviewAnswer}
                  disabled={!selectedAnswer}
                  style={{
                    padding: '12px 24px',
                    fontSize: '16px',
                    fontWeight: '600',
                    flex: 1,
                    opacity: !selectedAnswer ? 0.5 : 1,
                    cursor: !selectedAnswer ? 'not-allowed' : 'pointer'
                  }}
                >
                  ✓ Answer & Continue ({reviewQueue.length} left)
                </button>
              ) : (
                // Normal mode - show both buttons
                <>
                  <button
                    className="btn"
                    onClick={handleMarkForReview}
                    style={{
                      backgroundColor: '#FFC107',
                      color: '#4B2E05',
                      border: 'none',
                      padding: '12px 24px',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      fontWeight: '600',
                      fontSize: '16px',
                      flex: 1
                    }}
                  >
                    🏳 Mark for Review & Skip
                  </button>

                  <button
                    className="btn btn-primary"
                    onClick={handleNext}
                    disabled={!selectedAnswer}
                    style={{
                      padding: '12px 24px',
                      fontSize: '16px',
                      fontWeight: '600',
                      flex: 1,
                      opacity: !selectedAnswer ? 0.5 : 1,
                      cursor: !selectedAnswer ? 'not-allowed' : 'pointer'
                    }}
                  >
                    Next Question →
                  </button>
                </>
              )}
            </div>

            <div style={{
              marginTop: '20px',
              padding: '16px',
              backgroundColor: '#E3F2FD',
              borderRadius: '8px',
              fontSize: '14px',
              color: '#1976D2'
            }}>
              <strong>💡 Rasch Model Adaptive Testing:</strong> Questions are selected using Item Response Theory
              to match your ability level (θ). The system estimates your ability using Bayesian updating after each response.
              You cannot go back to previous questions.
            </div>
          </div>

          {/* Sidebar - Progress & Review */}
          <div style={{
            backgroundColor: 'white',
            padding: '20px',
            borderRadius: '12px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
            height: 'fit-content',
            position: 'sticky',
            top: '20px'
          }}>
            <h3 style={{
              fontSize: '16px',
              fontWeight: '700',
              color: '#4B2E05',
              marginBottom: '16px'
            }}>
              Progress
            </h3>

            {/* Progress Stats */}
            <div style={{ marginBottom: '20px' }}>
              <div style={{
                marginBottom: '12px',
                padding: '12px',
                backgroundColor: '#F5E8C7',
                borderRadius: '8px'
              }}>
                <div style={{ fontSize: '24px', fontWeight: '700', color: '#4B2E05' }}>
                  {questionsAnswered} / {maxQuestions.current}
                </div>
                <div style={{ fontSize: '12px', color: '#666' }}>Questions Attempted</div>
              </div>

              <div style={{
                marginBottom: '12px',
                padding: '12px',
                backgroundColor: '#E8F5E9',
                borderRadius: '8px'
              }}>
                <div style={{ fontSize: '20px', fontWeight: '700', color: '#4CAF50' }}>
                  {responses.filter(r => r.selectedAnswer === r.question.correctAnswer).length}
                </div>
                <div style={{ fontSize: '12px', color: '#666' }}>Correct Answers</div>
              </div>

              <div style={{
                marginBottom: '12px',
                padding: '12px',
                backgroundColor: '#E3F2FD',
                borderRadius: '8px'
              }}>
                <div style={{ fontSize: '20px', fontWeight: '700', color: '#2196F3' }}>
                  θ = {currentTheta.toFixed(2)}
                </div>
                <div style={{ fontSize: '12px', color: '#666' }}>Ability Estimate</div>
              </div>
            </div>

            {/* Theta Description */}
            {questionsAnswered > 2 && raschEngine && (
              <div style={{ marginBottom: '20px' }}>
                <h4 style={{
                  fontSize: '14px',
                  fontWeight: '600',
                  color: '#4B2E05',
                  marginBottom: '8px'
                }}>
                  Ability Level
                </h4>
                <div style={{
                  padding: '12px',
                  backgroundColor: '#E8F5E9',
                  borderRadius: '8px',
                  fontSize: '14px',
                  color: '#2E7D32',
                  fontWeight: '600'
                }}>
                  {raschEngine.getThetaDescription()}
                </div>
                <div style={{
                  fontSize: '11px',
                  color: '#666',
                  marginTop: '8px',
                  fontStyle: 'italic'
                }}>
                  SE: ±{raschEngine.getStandardError().toFixed(2)}
                  {raschEngine.hasConverged() && ' ✓ Converged'}
                </div>
              </div>
            )}

            {/* Performance Indicator */}
            {questionsAnswered > 2 && (
              <div style={{
                padding: '16px',
                backgroundColor: '#F5F5F5',
                borderRadius: '8px',
                marginBottom: '20px'
              }}>
                <h4 style={{
                  fontSize: '14px',
                  fontWeight: '600',
                  color: '#4B2E05',
                  marginBottom: '8px'
                }}>
                  Current Performance
                </h4>
                <div style={{ fontSize: '24px', fontWeight: '700', color: '#4CAF50' }}>
                  {Math.round((responses.filter(r => r.selectedAnswer === r.question.correctAnswer).length / questionsAnswered) * 100)}%
                </div>
                <div style={{ fontSize: '12px', color: '#666', marginTop: '4px' }}>
                  Accuracy Rate
                </div>
              </div>
            )}

            {/* Review Queue */}
            {responses.filter(r => r.markedForReview).length > 0 && (
              <div style={{
                padding: '16px',
                backgroundColor: '#FFF9E6',
                borderRadius: '8px',
                marginBottom: '20px',
                border: '2px solid #FFC107'
              }}>
                <h4 style={{
                  fontSize: '14px',
                  fontWeight: '600',
                  color: '#F57C00',
                  marginBottom: '12px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}>
                  🏳 Marked for Review
                </h4>
                <div style={{ fontSize: '12px', color: '#666', marginBottom: '8px' }}>
                  These questions were skipped:
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {responses.filter(r => r.markedForReview).map((resp, idx) => (
                    <div key={idx} style={{
                      padding: '8px',
                      backgroundColor: 'white',
                      borderRadius: '6px',
                      fontSize: '12px',
                      border: '1px solid #FFE082'
                    }}>
                      <div style={{ fontWeight: '600', color: '#4B2E05', marginBottom: '4px' }}>
                        Question #{idx + 1}
                      </div>
                      <div style={{ color: '#666', fontSize: '11px' }}>
                        {resp.question.text.length > 50
                          ? resp.question.text.substring(0, 50) + '...'
                          : resp.question.text}
                      </div>
                      <div style={{ marginTop: '4px', color: '#F57C00', fontSize: '10px' }}>
                        ⚠️ Not answered
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Submit Button */}
            <button
              className="btn btn-primary"
              onClick={() => setShowSubmitModal(true)}
              style={{ width: '100%', fontSize: '16px', fontWeight: '700' }}
            >
              Finish Assessment
            </button>
          </div>
        </div>
      </div>

      {/* Submit Confirmation Modal */}
      <Modal
        isOpen={showSubmitModal}
        onClose={() => setShowSubmitModal(false)}
        title="Submit Assessment?"
      >
        <div style={{ padding: '20px 0' }}>
          <p style={{ fontSize: '16px', marginBottom: '16px', color: '#4B2E05' }}>
            Are you sure you want to submit your assessment?
          </p>

          <div style={{
            backgroundColor: '#F5E8C7',
            padding: '16px',
            borderRadius: '8px',
            marginBottom: '20px'
          }}>
            <div style={{ marginBottom: '8px' }}>
              <strong>Questions Answered:</strong> {questionsAnswered} / {maxQuestions.current}
            </div>
            <div style={{ marginBottom: '8px' }}>
              <strong>Ability (θ):</strong> {currentTheta.toFixed(2)}
            </div>
            <div>
              <strong>Time Remaining:</strong> {formatTime(timeRemaining)}
            </div>
          </div>

          <p style={{ fontSize: '14px', color: '#666' }}>
            You cannot change your answers after submission.
          </p>
        </div>

        <div className="modal-footer">
          <button
            className="btn btn-secondary"
            onClick={() => setShowSubmitModal(false)}
            disabled={submitting}
          >
            Cancel
          </button>
          <button
            className="btn btn-primary"
            onClick={submitAssessment}
            disabled={submitting}
          >
            {submitting ? 'Submitting...' : 'Confirm Submit'}
          </button>
        </div>
      </Modal>
    </div>
  );
};

export default StudentExamInterface;
