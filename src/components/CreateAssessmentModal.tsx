import React, { useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import { db } from "../firebase/config";
import { collection, addDoc, Timestamp } from "firebase/firestore";
import Modal from "./Modal";
import { extractQuestionsIntelligently } from "../services/intelligentDocumentService";

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

interface CreateAssessmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  classroomId: string;
}

const CreateAssessmentModal: React.FC<CreateAssessmentModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  classroomId,
}) => {
  const { currentUser } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [currentStep, setCurrentStep] = useState<'details' | 'questions'>('details');
  const [uploadMode, setUploadMode] = useState<'manual' | 'pdf'>('manual');
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [extracting, setExtracting] = useState(false);
  const [classifying, setClassifying] = useState(false);
  const [classificationProgress, setClassificationProgress] = useState<string>('');

  const [assessmentDetails, setAssessmentDetails] = useState({
    title: "",
    description: "",
    duration: 30,
  });

  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentQuestion, setCurrentQuestion] = useState({
    text: "",
    option1: "",
    option2: "",
    option3: "",
    option4: "",
    correctAnswer: "",
    bloomLevel: 1 as 1 | 2 | 3,
    difficulty: 'easy' as 'easy' | 'medium' | 'hard',
    concept: "",
    timeEstimate: 60,
  });

  const handleDetailsChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setAssessmentDetails((prev) => ({
      ...prev,
      [name]: name === 'duration' ? parseInt(value) || 0 : value,
    }));
  };

  const handleQuestionChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setCurrentQuestion((prev) => ({
      ...prev,
      [name]: name === 'bloomLevel' ? parseInt(value) as 1 | 2 | 3 :
              name === 'timeEstimate' ? parseInt(value) || 0 : value,
    }));
  };

  const addQuestion = () => {
    // Validate question
    if (!currentQuestion.text || !currentQuestion.option1 || !currentQuestion.option2 ||
        !currentQuestion.option3 || !currentQuestion.option4 || !currentQuestion.correctAnswer ||
        !currentQuestion.concept) {
      setError("Please fill all question fields");
      return;
    }

    // Validate correct answer is one of the options
    const options = [
      currentQuestion.option1,
      currentQuestion.option2,
      currentQuestion.option3,
      currentQuestion.option4
    ];

    if (!options.includes(currentQuestion.correctAnswer)) {
      setError("Correct answer must match one of the options exactly");
      return;
    }

    const newQuestion: Question = {
      id: `q_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      text: currentQuestion.text,
      options: options,
      correctAnswer: currentQuestion.correctAnswer,
      bloomLevel: currentQuestion.bloomLevel,
      difficulty: currentQuestion.difficulty,
      concept: currentQuestion.concept,
      timeEstimate: currentQuestion.timeEstimate,
    };

    setQuestions([...questions, newQuestion]);

    // Reset form
    setCurrentQuestion({
      text: "",
      option1: "",
      option2: "",
      option3: "",
      option4: "",
      correctAnswer: "",
      bloomLevel: 1,
      difficulty: 'easy',
      concept: "",
      timeEstimate: 60,
    });
    setError("");
  };

  const removeQuestion = (questionId: string) => {
    setQuestions(questions.filter(q => q.id !== questionId));
  };

  const handlePdfUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.includes('text') && file.type !== 'application/pdf') {
      setError('Please upload a text or PDF file');
      return;
    }

    setPdfFile(file);
    setExtracting(true);
    setClassifying(true);
    setError('');
    setClassificationProgress('🤖 Reading document with AI...');

    try {
      const reader = new FileReader();
      reader.onload = async (event) => {
        try {
          const text = event.target?.result as string;

          setClassificationProgress('🧠 Intelligently extracting questions with LangChain + Hugging Face...');

          // Use intelligent AI-powered extraction (replaces dumb regex parsing)
          const extractedQuestions = await extractQuestionsIntelligently(
            text,
            assessmentDetails.title || 'General',
            assessmentDetails.description
          );

          if (extractedQuestions.length === 0) {
            setError('No questions found in file. Please check the format.');
            setExtracting(false);
            setClassifying(false);
            setClassificationProgress('');
            return;
          }

          setQuestions(extractedQuestions);
          setExtracting(false);
          setClassifying(false);
          setClassificationProgress('');
          setError(`✓ Successfully extracted ${extractedQuestions.length} questions using AI! Bloom levels and difficulty have been intelligently classified.`);
          setTimeout(() => setError(''), 5000);

        } catch (err) {
          console.error('Error processing file:', err);
          setError('Failed to process file. Please try again or use manual entry.');
          setExtracting(false);
          setClassifying(false);
          setClassificationProgress('');
        }
      };
      reader.readAsText(file);
    } catch (err) {
      console.error('Error reading file:', err);
      setError('Failed to read file. Please try again or use manual entry.');
      setExtracting(false);
      setClassifying(false);
      setClassificationProgress('');
    }
  };

  const parsePdfQuestions = (text: string): Question[] => {
    const questions: Question[] = [];

    // Normalize line breaks and clean up the text
    text = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

    // Split by question markers: Q1, Q2, etc.
    // Use a more robust pattern that splits on Q followed by number
    const questionSplitPattern = /\s*Q(\d+)\./gi;
    const parts = text.split(questionSplitPattern);

    // parts[0] is text before first question (usually empty)
    // parts[1] is question number, parts[2] is question content
    // parts[3] is next number, parts[4] is next content, etc.

    for (let i = 1; i < parts.length; i += 2) {
      if (i + 1 >= parts.length) break;

      const questionNumber = parts[i];
      let questionContent = parts[i + 1].trim();

      // Try multiple option patterns
      let options: string[] = [];
      let cleanedQuestionText = questionContent;

      // Pattern 1: (1)56 (2)132 format - handles inline options without spaces
      const pattern1 = /\((\d+)\)\s*([^\(\n]+?)(?=\s*\(\d+\)|$)/gis;
      const matches1 = Array.from(questionContent.matchAll(pattern1));

      if (matches1.length >= 4) {
        options = [];
        for (let i = 0; i < Math.min(4, matches1.length); i++) {
          const optionText = matches1[i][2].trim();
          if (optionText) options.push(optionText);
        }
        // Extract question text before first option
        const firstOptionMatch = questionContent.match(/\(\d+\)/);
        if (firstOptionMatch) {
          const firstOptionIndex = questionContent.indexOf(firstOptionMatch[0]);
          cleanedQuestionText = questionContent.substring(0, firstOptionIndex).trim();
        }
      }

      // Pattern 2: (1) 56 format with newlines - handles options on separate lines
      if (options.length < 4) {
        const pattern2 = /\((\d+)\)\s*(.+?)(?=\s*\(\d+\)|$)/gis;
        const matches2 = Array.from(questionContent.matchAll(pattern2));

        if (matches2.length >= 4) {
          options = [];
          for (let i = 0; i < Math.min(4, matches2.length); i++) {
            let optionText = matches2[i][2].trim();
            // Remove trailing newlines and extra whitespace
            optionText = optionText.replace(/\n.*$/s, '').trim();
            if (optionText) options.push(optionText);
          }
          const firstOptionMatch = questionContent.match(/\(\d+\)/);
          if (firstOptionMatch) {
            const firstOptionIndex = questionContent.indexOf(firstOptionMatch[0]);
            cleanedQuestionText = questionContent.substring(0, firstOptionIndex).trim();
          }
        }
      }

      // Pattern 3: A), B), C), D) format
      if (options.length < 4) {
        const pattern3 = /\n\s*([A-Da-d])\)\s*(.+?)(?=\n\s*[A-Da-d]\)|$)/gis;
        const matches3 = Array.from(questionContent.matchAll(pattern3));

        if (matches3.length >= 4) {
          options = [];
          for (let i = 0; i < Math.min(4, matches3.length); i++) {
            const optionText = matches3[i][2].trim();
            if (optionText) options.push(optionText);
          }
          const firstOptionMatch = questionContent.match(/\n\s*[A-Da-d]\)/);
          if (firstOptionMatch) {
            const firstOptionIndex = questionContent.indexOf(firstOptionMatch[0]);
            cleanedQuestionText = questionContent.substring(0, firstOptionIndex).trim();
          }
        }
      }

      // Pattern 4: 1), 2), 3), 4) format
      if (options.length < 4) {
        const pattern4 = /\n\s*([1-4])\)\s*(.+?)(?=\n\s*[1-4]\)|$)/gis;
        const matches4 = Array.from(questionContent.matchAll(pattern4));

        if (matches4.length >= 4) {
          options = [];
          for (let i = 0; i < Math.min(4, matches4.length); i++) {
            const optionText = matches4[i][2].trim();
            if (optionText) options.push(optionText);
          }
          const firstOptionMatch = questionContent.match(/\n\s*[1-4]\)/);
          if (firstOptionMatch) {
            const firstOptionIndex = questionContent.indexOf(firstOptionMatch[0]);
            cleanedQuestionText = questionContent.substring(0, firstOptionIndex).trim();
          }
        }
      }

      // Clean up the question text - remove extra whitespace and newlines
      cleanedQuestionText = cleanedQuestionText.replace(/\s+/g, ' ').trim();

      // Only add if we have valid question text and exactly 4 options
      if (cleanedQuestionText && cleanedQuestionText.length >= 5 && options.length === 4) {
        questions.push({
          id: `q_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          text: cleanedQuestionText,
          options: options.slice(0, 4),
          correctAnswer: options[0], // Default to first option - teacher can edit
          bloomLevel: 2, // Default to "Understand" - AI will update this
          difficulty: 'medium', // Default to medium - AI will update this
          concept: 'General', // Default concept - AI will update this
          timeEstimate: 60,
        });
      }
    }

    return questions;
  };

  const handleSubmit = async () => {
    if (questions.length < 10) {
      setError("Assessment must have at least 10 questions");
      return;
    }

    setLoading(true);
    setError("");

    try {
      await addDoc(collection(db, 'assessments'), {
        classroomId: classroomId,
        teacherId: currentUser?.id,
        title: assessmentDetails.title,
        description: assessmentDetails.description,
        duration: assessmentDetails.duration,
        questions: questions,
        status: 'draft',
        createdAt: Timestamp.now(),
        publishedAt: null,
      });

      // Reset form
      setAssessmentDetails({ title: "", description: "", duration: 30 });
      setQuestions([]);
      setCurrentStep('details');
      onSuccess();
      onClose();
    } catch (err: any) {
      console.error("Error creating assessment:", err);
      setError("Failed to create assessment. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const getBloomLevelName = (level: number) => {
    const names = { 1: 'Remember', 2: 'Understand', 3: 'Apply' };
    return names[level as 1 | 2 | 3] || '';
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Create Assessment">
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

      {/* Step Indicator */}
      <div style={{ display: 'flex', gap: '16px', marginBottom: '24px', justifyContent: 'center' }}>
        <div style={{
          padding: '8px 16px',
          borderRadius: '20px',
          backgroundColor: currentStep === 'details' ? '#a47c48' : '#e8d5a8',
          color: currentStep === 'details' ? 'white' : '#4b2e05',
          fontWeight: '600',
          fontSize: '14px'
        }}>
          1. Details
        </div>
        <div style={{
          padding: '8px 16px',
          borderRadius: '20px',
          backgroundColor: currentStep === 'questions' ? '#a47c48' : '#e8d5a8',
          color: currentStep === 'questions' ? 'white' : '#4b2e05',
          fontWeight: '600',
          fontSize: '14px'
        }}>
          2. Questions ({questions.length}/10+)
        </div>
      </div>

      {currentStep === 'details' && (
        <div>
          <div className="form-group">
            <label className="form-label" htmlFor="title">Assessment Title</label>
            <input
              type="text"
              id="title"
              name="title"
              className="form-input"
              value={assessmentDetails.title}
              onChange={handleDetailsChange}
              placeholder="e.g., Midterm Exam - Algebra"
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="description">Description</label>
            <textarea
              id="description"
              name="description"
              className="form-textarea"
              value={assessmentDetails.description}
              onChange={handleDetailsChange}
              placeholder="Describe what this assessment covers..."
              rows={3}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="duration">Duration (minutes)</label>
            <input
              type="number"
              id="duration"
              name="duration"
              className="form-input"
              value={assessmentDetails.duration}
              onChange={handleDetailsChange}
              min="5"
              max="180"
              required
            />
          </div>

          <div className="modal-footer">
            <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
            <button
              className="btn btn-primary"
              onClick={() => setCurrentStep('questions')}
              disabled={!assessmentDetails.title || !assessmentDetails.description}
            >
              Next: Add Questions
            </button>
          </div>
        </div>
      )}

      {currentStep === 'questions' && (
        <div>
          <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '16px', color: '#4b2e05' }}>
            Add Questions (Minimum 10 required)
          </h3>

          {/* Toggle between Manual and PDF Upload */}
          <div style={{
            display: 'flex',
            gap: '12px',
            marginBottom: '24px',
            padding: '4px',
            backgroundColor: '#E8D5A8',
            borderRadius: '8px',
            width: 'fit-content'
          }}>
            <button
              onClick={() => setUploadMode('manual')}
              style={{
                padding: '8px 16px',
                borderRadius: '6px',
                border: 'none',
                backgroundColor: uploadMode === 'manual' ? '#A47C48' : 'transparent',
                color: uploadMode === 'manual' ? 'white' : '#4B2E05',
                fontWeight: '600',
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
            >
              Manual Entry
            </button>
            <button
              onClick={() => setUploadMode('pdf')}
              style={{
                padding: '8px 16px',
                borderRadius: '6px',
                border: 'none',
                backgroundColor: uploadMode === 'pdf' ? '#A47C48' : 'transparent',
                color: uploadMode === 'pdf' ? 'white' : '#4B2E05',
                fontWeight: '600',
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
            >
              Upload File
            </button>
          </div>

          {/* Question List */}
          {questions.length > 0 && (
            <div style={{ marginBottom: '24px', maxHeight: '200px', overflowY: 'auto' }}>
              {questions.map((q, index) => (
                <div key={q.id} style={{
                  padding: '12px',
                  backgroundColor: '#f5e8c7',
                  borderRadius: '8px',
                  marginBottom: '8px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: '600', marginBottom: '4px' }}>
                      Q{index + 1}: {q.text.substring(0, 50)}{q.text.length > 50 ? '...' : ''}
                    </div>
                    <div style={{ fontSize: '12px', opacity: 0.7 }}>
                      {getBloomLevelName(q.bloomLevel)} • {q.difficulty.charAt(0).toUpperCase() + q.difficulty.slice(1)} • {q.concept}
                    </div>
                  </div>
                  <button
                    onClick={() => removeQuestion(q.id)}
                    style={{
                      padding: '4px 8px',
                      backgroundColor: '#f44336',
                      color: 'white',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      fontSize: '12px'
                    }}
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* PDF Upload Section */}
          {uploadMode === 'pdf' && (
            <div style={{
              border: '2px dashed #A47C48',
              borderRadius: '8px',
              padding: '32px',
              marginBottom: '16px',
              backgroundColor: '#F5E8C7',
              textAlign: 'center'
            }}>
              <div style={{ fontSize: '48px', marginBottom: '16px' }}>📄</div>
              <h4 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '8px', color: '#4B2E05' }}>
                🤖 AI-Powered Document Upload
              </h4>
              <p style={{ fontSize: '14px', color: '#666', marginBottom: '16px' }}>
                Upload any text file with questions - AI will intelligently extract and classify them!
              </p>

              <input
                type="file"
                accept=".txt,.text"
                onChange={handlePdfUpload}
                style={{ display: 'none' }}
                id="pdf-upload"
                disabled={extracting || classifying}
              />
              <label htmlFor="pdf-upload">
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    document.getElementById('pdf-upload')?.click();
                  }}
                  disabled={extracting || classifying}
                  style={{
                    padding: '12px 24px',
                    backgroundColor: (extracting || classifying) ? '#ccc' : '#A47C48',
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    fontSize: '16px',
                    fontWeight: '600',
                    cursor: (extracting || classifying) ? 'not-allowed' : 'pointer',
                    transition: 'all 0.2s'
                  }}
                >
                  {extracting ? 'Extracting Questions...' :
                   classifying ? 'AI Classification in Progress...' :
                   pdfFile ? `Uploaded: ${pdfFile.name}` : 'Choose Text File'}
                </button>
              </label>

              {classifying && (
                <div style={{
                  marginTop: '16px',
                  padding: '12px',
                  backgroundColor: '#E3F2FD',
                  borderRadius: '8px',
                  border: '1px solid #2196F3'
                }}>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    marginBottom: '8px'
                  }}>
                    <div style={{
                      width: '20px',
                      height: '20px',
                      border: '3px solid #2196F3',
                      borderTopColor: 'transparent',
                      borderRadius: '50%',
                      animation: 'spin 1s linear infinite'
                    }} />
                    <span style={{ fontSize: '14px', fontWeight: '600', color: '#1976D2' }}>
                      {classificationProgress}
                    </span>
                  </div>
                  <div style={{ fontSize: '12px', color: '#666' }}>
                    Using LangChain + Hugging Face LLM to intelligently extract and classify questions from your document...
                  </div>
                </div>
              )}

              {pdfFile && !extracting && (
                <div style={{ marginTop: '16px', fontSize: '14px', color: '#4CAF50' }}>
                  ✓ File uploaded successfully! {questions.length} questions extracted.
                </div>
              )}

              <div style={{
                marginTop: '24px',
                padding: '16px',
                backgroundColor: 'white',
                borderRadius: '8px',
                textAlign: 'left'
              }}>
                <p style={{ fontSize: '14px', fontWeight: '600', marginBottom: '8px', color: '#4B2E05' }}>
                  Text File Format Example:
                </p>
                <pre style={{
                  fontSize: '12px',
                  color: '#666',
                  lineHeight: '1.6',
                  margin: 0,
                  whiteSpace: 'pre-wrap'
                }}>
{`1. What is the capital of France?
A) London
B) Paris
C) Berlin
D) Madrid

2. Which planet is known as the Red Planet?
A) Venus
B) Mars
C) Jupiter
D) Saturn`}
                </pre>
                <p style={{ fontSize: '12px', color: '#999', marginTop: '12px', fontStyle: 'italic' }}>
                  💡 Powered by LangChain + Hugging Face Mistral-7B model. The AI will intelligently extract ALL questions regardless of format variations,
                  detect Bloom levels mentioned in the document, and classify difficulty automatically.
                  Works with messy formatting too!
                </p>
              </div>
            </div>
          )}

          {/* Current Question Form */}
          {uploadMode === 'manual' && (
            <div style={{ border: '2px solid #a47c48', borderRadius: '8px', padding: '16px', marginBottom: '16px' }}>
            <div className="form-group">
              <label className="form-label" htmlFor="text">Question Text</label>
              <textarea
                id="text"
                name="text"
                className="form-textarea"
                value={currentQuestion.text}
                onChange={handleQuestionChange}
                placeholder="Enter your question here..."
                rows={2}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Options</label>
              <input
                type="text"
                name="option1"
                className="form-input"
                value={currentQuestion.option1}
                onChange={handleQuestionChange}
                placeholder="Option 1"
                style={{ marginBottom: '8px' }}
              />
              <input
                type="text"
                name="option2"
                className="form-input"
                value={currentQuestion.option2}
                onChange={handleQuestionChange}
                placeholder="Option 2"
                style={{ marginBottom: '8px' }}
              />
              <input
                type="text"
                name="option3"
                className="form-input"
                value={currentQuestion.option3}
                onChange={handleQuestionChange}
                placeholder="Option 3"
                style={{ marginBottom: '8px' }}
              />
              <input
                type="text"
                name="option4"
                className="form-input"
                value={currentQuestion.option4}
                onChange={handleQuestionChange}
                placeholder="Option 4"
              />
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="correctAnswer">Correct Answer</label>
              <input
                type="text"
                id="correctAnswer"
                name="correctAnswer"
                className="form-input"
                value={currentQuestion.correctAnswer}
                onChange={handleQuestionChange}
                placeholder="Enter the exact text of the correct option"
              />
              <small className="form-help">Must match one of the options above exactly</small>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div className="form-group">
                <label className="form-label" htmlFor="bloomLevel">Bloom's Level</label>
                <select
                  id="bloomLevel"
                  name="bloomLevel"
                  className="form-select"
                  value={currentQuestion.bloomLevel}
                  onChange={handleQuestionChange}
                >
                  <option value="1">1 - Remember</option>
                  <option value="2">2 - Understand</option>
                  <option value="3">3 - Apply</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="difficulty">Difficulty</label>
                <select
                  id="difficulty"
                  name="difficulty"
                  className="form-select"
                  value={currentQuestion.difficulty}
                  onChange={handleQuestionChange}
                >
                  <option value="easy">Easy</option>
                  <option value="medium">Medium</option>
                  <option value="hard">Hard</option>
                </select>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '12px' }}>
              <div className="form-group">
                <label className="form-label" htmlFor="concept">Concept/Topic</label>
                <input
                  type="text"
                  id="concept"
                  name="concept"
                  className="form-input"
                  value={currentQuestion.concept}
                  onChange={handleQuestionChange}
                  placeholder="e.g., Linear Equations"
                />
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="timeEstimate">Time (seconds)</label>
                <input
                  type="number"
                  id="timeEstimate"
                  name="timeEstimate"
                  className="form-input"
                  value={currentQuestion.timeEstimate}
                  onChange={handleQuestionChange}
                  min="30"
                  max="300"
                />
              </div>
            </div>

            <button
              className="btn btn-primary"
              onClick={addQuestion}
              style={{ width: '100%' }}
            >
              Add Question
            </button>
          </div>
          )}

          <div className="modal-footer">
            <button className="btn btn-secondary" onClick={() => setCurrentStep('details')}>
              Back
            </button>
            <button
              className="btn btn-primary"
              onClick={handleSubmit}
              disabled={loading || questions.length < 10}
            >
              {loading ? 'Creating...' : `Create Assessment (${questions.length}/10+)`}
            </button>
          </div>
        </div>
      )}
    </Modal>
  );
};

export default CreateAssessmentModal;
