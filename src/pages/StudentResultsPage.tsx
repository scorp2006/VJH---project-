import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase/config';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell } from 'recharts';
import Card from '../components/Card';
import { generateStudentInsights, StudentSubmission, StudentInsights } from '../services/intelligentAnalyticsService';

const StudentResultsPage: React.FC = () => {
  const { submissionId } = useParams<{ submissionId: string }>();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [submission, setSubmission] = useState<StudentSubmission | null>(null);
  const [insights, setInsights] = useState<StudentInsights | null>(null);

  useEffect(() => {
    loadSubmissionAndGenerateInsights();
  }, [submissionId]);

  const loadSubmissionAndGenerateInsights = async () => {
    if (!submissionId) return;

    try {
      console.log('📊 Loading submission and generating insights...');

      // Load submission from Firestore
      const submissionDoc = await getDoc(doc(db, 'submissions', submissionId));

      if (!submissionDoc.exists()) {
        console.error('Submission not found');
        navigate('/student/submissions');
        return;
      }

      const data = submissionDoc.data();

      // Convert Firestore data to StudentSubmission format
      const submissionData: StudentSubmission = {
        studentId: data.studentId,
        studentName: data.studentName || 'Student',
        studentEmail: data.studentEmail || '',
        assessmentId: data.assessmentId,
        assessmentName: data.assessmentName || 'Assessment',
        responses: data.responses || [],
        raschData: data.raschData || {
          finalTheta: data.finalTheta || 0,
          thetaProgression: data.thetaProgression || [],
          standardError: data.standardError || 0.5,
          abilityLevel: '',
          convergence: 0,
        },
        submittedAt: data.submittedAt?.toDate() || new Date(),
        timeTaken: data.timeTaken || 0,
      };

      setSubmission(submissionData);

      // Generate AI-powered insights
      console.log('🤖 Generating AI insights...');
      const generatedInsights = await generateStudentInsights(submissionData);
      setInsights(generatedInsights);

      console.log('✅ Insights generated successfully');

    } catch (error) {
      console.error('Error loading submission:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="page-content">
        <div className="container">
          <div style={{ textAlign: 'center', padding: '60px 20px' }}>
            <div style={{ fontSize: '48px', marginBottom: '20px' }}>🤖</div>
            <h2>Generating Your Personalized Insights...</h2>
            <p style={{ color: '#666', marginTop: '10px' }}>
              AI is analyzing your performance using Rasch Model IRT
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (!submission || !insights) {
    return (
      <div className="page-content">
        <div className="container">
          <div className="alert alert-error">
            <p>Could not load submission data.</p>
            <button className="btn btn-primary" onClick={() => navigate('/student/submissions')}>
              Back to Submissions
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Prepare chart data
  const thetaProgressionData = submission.raschData.thetaProgression.map((theta, index) => ({
    question: `Q${index + 1}`,
    theta: parseFloat(theta.toFixed(2)),
  }));

  const difficultyData = [
    { name: 'Easy', accuracy: insights.accuracyByDifficulty.easy, fill: '#4CAF50' },
    { name: 'Medium', accuracy: insights.accuracyByDifficulty.medium, fill: '#FF9800' },
    { name: 'Hard', accuracy: insights.accuracyByDifficulty.hard, fill: '#F44336' },
  ];

  const bloomData = [
    { name: 'L1: Remember', accuracy: insights.accuracyByBloomLevel.level1, fill: '#2196F3' },
    { name: 'L2: Understand', accuracy: insights.accuracyByBloomLevel.level2, fill: '#9C27B0' },
    { name: 'L3: Apply', accuracy: insights.accuracyByBloomLevel.level3, fill: '#FF5722' },
  ];

  const performanceDistribution = [
    { name: 'Correct', value: insights.correctAnswers, color: '#4CAF50' },
    { name: 'Incorrect', value: insights.totalQuestions - insights.correctAnswers, color: '#F44336' },
  ];

  return (
    <div className="page-content">
      <div className="container">
        {/* Header */}
        <div style={{ marginBottom: '30px' }}>
          <h1 className="page-title">Assessment Results</h1>
          <p style={{ fontSize: '18px', color: '#666', marginTop: '10px' }}>
            {submission.assessmentName}
          </p>
        </div>

        {/* Success Message */}
        <div className="alert alert-success" style={{ marginBottom: '30px' }}>
          <h3 style={{ margin: 0, marginBottom: '10px' }}>🎉 Assessment Completed!</h3>
          <p style={{ margin: 0 }}>
            {insights.aiInsights.motivationalMessage}
          </p>
        </div>

        {/* Performance Overview Cards */}
        <div className="grid grid-4 mb-8">
          <Card title="Overall Score" subtitle="Accuracy">
            <div className="stat-number" style={{ color: insights.overallAccuracy >= 70 ? '#4CAF50' : insights.overallAccuracy >= 50 ? '#FF9800' : '#F44336' }}>
              {insights.overallAccuracy}%
            </div>
            <p style={{ marginTop: '10px', fontSize: '14px', color: '#666' }}>
              {insights.correctAnswers}/{insights.totalQuestions} correct
            </p>
          </Card>

          <Card title="Ability Level (θ)" subtitle="Rasch Model Estimate">
            <div className="stat-number" style={{ color: submission.raschData.finalTheta >= 0 ? '#4CAF50' : '#FF9800' }}>
              {submission.raschData.finalTheta.toFixed(2)}
            </div>
            <p style={{ marginTop: '10px', fontSize: '14px', color: '#666' }}>
              {insights.raschAnalysis.abilityLevel}
            </p>
          </Card>

          <Card title="Measurement Precision" subtitle="Convergence">
            <div className="stat-number">
              {insights.raschAnalysis.convergence}%
            </div>
            <p style={{ marginTop: '10px', fontSize: '14px', color: '#666' }}>
              SE: ±{submission.raschData.standardError.toFixed(2)}
            </p>
          </Card>

          <Card title="Time Taken" subtitle="Average per question">
            <div className="stat-number">
              {insights.averageTime}s
            </div>
            <p style={{ marginTop: '10px', fontSize: '14px', color: '#666' }}>
              Total: {Math.floor(submission.timeTaken / 60)}m {submission.timeTaken % 60}s
            </p>
          </Card>
        </div>

        {/* Theta Progression Chart */}
        <div className="chart-container mb-8">
          <h3 className="chart-title">📈 Your Ability (θ) Progression - Real-Time Rasch Model</h3>
          <p style={{ color: '#666', marginBottom: '20px', fontSize: '14px' }}>
            Watch how your estimated ability changed after each question using Bayesian updating
          </p>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={thetaProgressionData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#A47C48" opacity={0.3} />
              <XAxis dataKey="question" stroke="#4B2E05" fontSize={12} />
              <YAxis stroke="#4B2E05" fontSize={12} domain={[-3, 3]} />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#F5E8C7',
                  border: '2px solid #A47C48',
                  borderRadius: '8px',
                  color: '#4B2E05',
                }}
              />
              <Line
                type="monotone"
                dataKey="theta"
                stroke="#A47C48"
                strokeWidth={3}
                dot={{ fill: '#A47C48', strokeWidth: 2, r: 5 }}
                name="Ability (θ)"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Performance Breakdown */}
        <div className="grid grid-3 gap-6 mb-8">
          {/* Overall Performance */}
          <div className="chart-container">
            <h3 className="chart-title">Performance Overview</h3>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={performanceDistribution}
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  dataKey="value"
                  label={({ name, value }) => `${name}: ${value}`}
                >
                  {performanceDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* Accuracy by Difficulty */}
          <div className="chart-container">
            <h3 className="chart-title">Accuracy by Difficulty</h3>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={difficultyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#A47C48" opacity={0.3} />
                <XAxis dataKey="name" stroke="#4B2E05" fontSize={12} />
                <YAxis stroke="#4B2E05" fontSize={12} domain={[0, 100]} />
                <Tooltip />
                <Bar dataKey="accuracy" radius={[4, 4, 0, 0]}>
                  {difficultyData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Accuracy by Bloom Level */}
          <div className="chart-container">
            <h3 className="chart-title">Accuracy by Bloom Level</h3>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={bloomData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#A47C48" opacity={0.3} />
                <XAxis dataKey="name" stroke="#4B2E05" fontSize={10} angle={-15} textAnchor="end" height={60} />
                <YAxis stroke="#4B2E05" fontSize={12} domain={[0, 100]} />
                <Tooltip />
                <Bar dataKey="accuracy" radius={[4, 4, 0, 0]}>
                  {bloomData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* AI-Generated Insights */}
        <div className="grid grid-2 gap-6 mb-8">
          {/* Strengths */}
          <Card title="💪 Your Strengths" subtitle="AI-Powered Analysis">
            <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
              {insights.aiInsights.strengths.map((strength, index) => (
                <li key={index} style={{ marginBottom: '12px', paddingLeft: '20px', position: 'relative' }}>
                  <span style={{ position: 'absolute', left: 0 }}>✅</span>
                  {strength}
                </li>
              ))}
            </ul>
          </Card>

          {/* Areas for Improvement */}
          <Card title="📚 Areas for Improvement" subtitle="AI-Powered Analysis">
            <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
              {insights.aiInsights.weaknesses.map((weakness, index) => (
                <li key={index} style={{ marginBottom: '12px', paddingLeft: '20px', position: 'relative' }}>
                  <span style={{ position: 'absolute', left: 0 }}>📌</span>
                  {weakness}
                </li>
              ))}
            </ul>
          </Card>
        </div>

        {/* Recommendations & Study Plan */}
        <div className="grid grid-2 gap-6 mb-8">
          {/* Recommendations */}
          <Card title="💡 Personalized Recommendations" subtitle="AI-Generated">
            <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
              {insights.aiInsights.recommendations.map((rec, index) => (
                <li key={index} style={{ marginBottom: '12px', paddingLeft: '20px', position: 'relative' }}>
                  <span style={{ position: 'absolute', left: 0 }}>🎯</span>
                  {rec}
                </li>
              ))}
            </ul>
          </Card>

          {/* Study Plan */}
          <Card title="📖 Your Study Plan" subtitle="AI-Generated">
            <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
              {insights.aiInsights.studyPlan.map((item, index) => (
                <li key={index} style={{ marginBottom: '12px', paddingLeft: '20px', position: 'relative' }}>
                  <span style={{ position: 'absolute', left: 0 }}>📝</span>
                  {item}
                </li>
              ))}
            </ul>
          </Card>
        </div>

        {/* Predictive Analytics */}
        <div className="alert" style={{ backgroundColor: '#E3F2FD', border: '2px solid #2196F3', marginBottom: '30px' }}>
          <h3 style={{ margin: 0, marginBottom: '10px', color: '#1565C0' }}>🔮 Predictive Analytics</h3>
          <p style={{ margin: 0, color: '#1976D2' }}>
            Based on your Rasch ability estimate (θ = {submission.raschData.finalTheta.toFixed(2)}),
            we predict your next assessment score to be around <strong>{insights.predictedNextPerformance}%</strong>.
          </p>
          <p style={{ margin: '10px 0 0 0', fontSize: '14px', color: '#1976D2' }}>
            Risk Level: <strong style={{ color: insights.riskLevel === 'high' ? '#F44336' : insights.riskLevel === 'medium' ? '#FF9800' : '#4CAF50' }}>
              {insights.riskLevel.toUpperCase()}
            </strong>
          </p>
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', gap: '15px', justifyContent: 'center' }}>
          <button className="btn btn-secondary" onClick={() => navigate('/student/submissions')}>
            View All Submissions
          </button>
          <button className="btn btn-primary" onClick={() => navigate('/student/classrooms')}>
            Back to Classrooms
          </button>
        </div>

        {/* Footer Note */}
        <div style={{ marginTop: '40px', padding: '20px', backgroundColor: '#FFF3E0', borderRadius: '8px', textAlign: 'center' }}>
          <p style={{ margin: 0, color: '#E65100', fontSize: '14px' }}>
            🤖 <strong>All insights generated using AI-powered psychometric analysis</strong> (Rasch Model + Hugging Face LLM)
          </p>
        </div>
      </div>
    </div>
  );
};

export default StudentResultsPage;
