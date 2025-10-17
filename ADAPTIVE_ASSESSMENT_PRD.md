# Product Requirements Document (PRD)
## Adaptive Assessment Platform - EduPortal

---

## 📋 Document Information
- **Project Name:** Adaptive Assessment Platform
- **Version:** 1.0
- **Date:** October 17, 2025
- **Prepared For:** Hackathon Development Team
- **Tech Stack:** React 19.2, TypeScript, Firebase (Auth, Firestore, Functions, Hosting), Recharts
- **Styling:** Custom CSS (Brown/Beige theme: #F5E8C7, #A47C48, #4B2E05)

---

## 🎯 Executive Summary

**Project Goal:** Build an adaptive online assessment platform where questions dynamically adjust based on student performance in real-time, using Bloom's Taxonomy levels and difficulty tiers.

**Core Innovation:** Unlike traditional linear assessments, our system adapts question difficulty based on:
1. Answer correctness (right/wrong)
2. Response speed (fast/slow)
3. Current Bloom's taxonomy level (Remember/Understand/Apply)
4. Historical performance patterns

**Post-Assessment Intelligence:** AI-powered analysis using Hugging Face LLMs generates personalized insights for students and aggregate analytics for teachers.

---

## 👥 User Personas

### Teacher (Primary User)
- Creates classrooms and assessments
- Uploads question pools (30+ questions) tagged with difficulty & Bloom levels
- Monitors live student progress
- Triggers AI analysis post-exam
- Views class-wide and individual student analytics

### Student (Secondary User)
- Joins classrooms via code
- Takes adaptive assessments
- Sees real-time navigation (question grid)
- Receives AI-generated performance insights
- Tracks personal analytics

---

## 🏗️ System Architecture Overview

```
┌─────────────────────────────────────────────────────────┐
│                    React Frontend                        │
│  (Landing → Auth → Dashboard → Assessment Interface)     │
└──────────────────┬──────────────────────────────────────┘
                   │
                   ↓
┌─────────────────────────────────────────────────────────┐
│                  Firebase Backend                        │
│  • Authentication (Google Sign-In)                       │
│  • Firestore (Real-time DB)                             │
│  • Cloud Functions (Adaptive Logic, AI Triggers)         │
│  • Hosting (Web App Deployment)                          │
└──────────────────┬──────────────────────────────────────┘
                   │
                   ↓
┌─────────────────────────────────────────────────────────┐
│              Hugging Face API (Free Tier)                │
│  • Model: mistralai/Mistral-7B-Instruct-v0.2           │
│  • Purpose: Generate personalized analytics             │
└─────────────────────────────────────────────────────────┘
```

---

## 📊 Data Models (Firestore Schema)

### Collection: `users`
```typescript
{
  uid: string;                    // Firebase Auth UID
  email: string;
  name: string;
  role: "teacher" | "student";
  avatar?: string;
  createdAt: Timestamp;
}
```

### Collection: `classrooms`
```typescript
{
  id: string;                     // Auto-generated
  teacherId: string;              // Reference to users collection
  name: string;                   // "Advanced Mathematics"
  subject: string;                // "Mathematics"
  description: string;
  code: string;                   // 6-char alphanumeric (e.g., "A7X9K2")
  members: string[];              // Array of student UIDs
  createdAt: Timestamp;
}
```

### Collection: `assessments` (subcollection of `classrooms`)
Path: `classrooms/{classroomId}/assessments/{assessmentId}`
```typescript
{
  id: string;
  title: string;                  // "Mid-term Quiz"
  description: string;
  createdAt: Timestamp;
  publishedAt: Timestamp | null;
  status: "draft" | "published" | "closed";
  duration: number;               // Minutes (e.g., 30)
  questions: Question[];          // Array of question objects
}

interface Question {
  id: string;
  text: string;
  options: string[];              // ["Option A", "Option B", "Option C", "Option D"]
  correctAnswer: string;          // "Option B"
  bloomLevel: 1 | 2 | 3;         // 1=Remember, 2=Understand, 3=Apply
  difficulty: "easy" | "medium" | "hard";
  concept: string;                // "Ratios", "Probability", etc.
  timeEstimate: number;           // Expected seconds to answer
}
```

### Collection: `sessions` (subcollection of `assessments`)
Path: `classrooms/{classroomId}/assessments/{assessmentId}/sessions/{sessionId}`
```typescript
{
  id: string;                     // Auto-generated
  studentId: string;
  assessmentId: string;
  startedAt: Timestamp;
  submittedAt: Timestamp | null;
  status: "in_progress" | "submitted";
  currentDifficultyTier: "easy" | "medium" | "hard";
  currentBloomLevel: 1 | 2 | 3;
  questionsServed: string[];      // Ordered array of question IDs
  questionsAnswered: string[];
  markedForReview: string[];
  totalTimeSpent: number;         // Seconds
}
```

### Collection: `responses` (subcollection of `sessions`)
Path: `...sessions/{sessionId}/responses/{responseId}`
```typescript
{
  id: string;
  questionId: string;
  answer: string;
  isCorrect: boolean;
  timeSpent: number;              // Seconds
  markedForReview: boolean;
  timestamp: Timestamp;
  selectionReason: string;        // "correct_fast_jump" | "incorrect_drop" | "correct_slow_stay"
}
```

### Collection: `analytics`
Path: `analytics/students/{studentId}/assessments/{assessmentId}`
```typescript
{
  studentId: string;
  assessmentId: string;
  classroomId: string;
  score: number;                  // (Correct / Attempted) * 100
  totalQuestions: number;
  questionsAttempted: number;
  correctAnswers: number;
  bloomBreakdown: {
    1: { attempted: number; correct: number; percentage: number };
    2: { attempted: number; correct: number; percentage: number };
    3: { attempted: number; correct: number; percentage: number };
  };
  difficultyBreakdown: {
    easy: { attempted: number; correct: number };
    medium: { attempted: number; correct: number };
    hard: { attempted: number; correct: number };
  };
  avgTimePerQuestion: number;
  timePerQuestion: Record<string, number>;  // {q1: 45, q2: 120}
  flaggedConcepts: string[];      // ["ratios", "probability"]
  aiInsights: string;             // LLM-generated text
  generatedAt: Timestamp;
}
```

Path: `analytics/classrooms/{classroomId}/assessments/{assessmentId}`
```typescript
{
  classroomId: string;
  assessmentId: string;
  totalStudents: number;
  completedStudents: number;
  avgScore: number;
  distribution: {
    90-100: number;
    80-89: number;
    70-79: number;
    below70: number;
  };
  conceptMastery: Record<string, number>;  // {"ratios": 75, "probability": 82}
  avgTimeSpent: number;
  aiSummary: string;              // LLM-generated class summary
  generatedAt: Timestamp;
}
```

---

## ⚙️ Core Features & User Flows

### Feature 1: Authentication & Role Selection

**User Flow:**
1. User lands on Landing Page
2. Sees two role cards: "Teacher" and "Student"
3. Clicks desired role → Redirects to Google Sign-In
4. Firebase Auth creates/retrieves user
5. Custom claim sets role: `teacher` or `student`
6. Redirects to respective dashboard

**Components Required:**
- ✅ `LandingPage.tsx` (Already exists - needs Student card addition)
- 🆕 `LoginPage.tsx` (Firebase Auth integration)
- 🆕 Firebase Auth setup with Google Provider

---

### Feature 2: Teacher - Classroom Management

**User Flow:**
1. Teacher dashboard shows stats + classroom cards
2. Clicks "Create Classroom" button
3. Modal opens:
   - Name (e.g., "Advanced Mathematics")
   - Subject (e.g., "Mathematics")
   - Description
4. Submits → Firestore creates document with auto-generated 6-char code
5. Classroom card appears on dashboard with code displayed

**Components Required:**
- ✅ `TeacherDashboard.tsx` (Exists - needs "Create Classroom" button)
- 🆕 `CreateClassroomModal.tsx`
- ✅ `TeacherClassrooms.tsx` (Exists - needs Firestore integration)

**Firestore Operations:**
```javascript
// Create Classroom
await db.collection('classrooms').add({
  teacherId: currentUser.uid,
  name: formData.name,
  subject: formData.subject,
  description: formData.description,
  code: generateClassroomCode(), // Random 6-char alphanumeric
  members: [],
  createdAt: Timestamp.now()
});
```

---

### Feature 3: Student - Join Classroom

**User Flow:**
1. Student dashboard shows "Join Classroom" button
2. Clicks → Modal prompts for 6-character code
3. Enters code → Validates in Firestore
4. If valid: Adds student UID to `classrooms/{id}/members` array
5. Classroom appears in student's dashboard

**Components Required:**
- 🆕 `JoinClassroomModal.tsx`
- ✅ `StudentDashboard.tsx` (Exists - needs join functionality)
- ✅ `StudentClassrooms.tsx` (Exists - needs Firestore integration)

**Firestore Operations:**
```javascript
// Validate and Join
const classroomRef = db.collection('classrooms')
  .where('code', '==', enteredCode)
  .limit(1);
const snapshot = await classroomRef.get();

if (!snapshot.empty) {
  await snapshot.docs[0].ref.update({
    members: firebase.firestore.FieldValue.arrayUnion(currentUser.uid)
  });
}
```

---

### Feature 4: Teacher - Assessment Creation

**User Flow:**
1. Teacher opens classroom details page
2. Clicks "Create Assessment" button
3. Form appears:
   - Title, Description, Duration (minutes)
   - Question input interface:
     - Question text
     - 4 options (MCQ)
     - Correct answer selection
     - Bloom level dropdown (1-Remember, 2-Understand, 3-Apply)
     - Difficulty dropdown (Easy, Medium, Hard)
     - Concept tag (e.g., "Ratios")
4. Can add multiple questions (minimum 10, recommended 30+)
5. Saves as "draft"
6. Clicks "Publish" → Updates status to "published"
7. Real-time listener in student dashboards shows new assessment

**Components Required:**
- 🆕 `CreateAssessmentPage.tsx`
- 🆕 `QuestionInputForm.tsx` (Reusable component for each question)
- ✅ `ClassroomDetails.tsx` (Exists - needs "Create Assessment" button)

**UI Pattern (Matches existing style):**
```css
/* Brown card with beige text */
.assessment-form {
  background: #A47C48;
  color: #F5E8C7;
  border-radius: 12px;
  padding: 24px;
}

.input-field {
  background: #F5E8C7;
  color: #4B2E05;
  border: 2px solid #A47C48;
  border-radius: 8px;
}
```

---

### Feature 5: Student - Adaptive Exam Interface

**User Flow:**
1. Student sees published assessment in classroom
2. Clicks "Start Assessment" → Creates `session` document
3. Cloud Function `getFirstQuestion()` returns Question 1 (Easy, Bloom-1)
4. **Exam Interface:**
   - **Main Area:** Question text + 4 options
   - **Right Sidebar:** Question grid (1-30)
     - Gray = Not visited
     - Green = Answered
     - Yellow = Marked for review
   - **Top Bar:** Countdown timer (e.g., "24:35 remaining")
   - **Bottom Buttons:**
     - "Mark for Review" checkbox
     - "Save & Next" button
     - "Submit Assessment" button (appears on last question or anytime)
5. After each answer submission:
   - Cloud Function `submitResponse()` processes:
     - Checks correctness
     - Tracks time spent
     - **Adaptive Logic Executes:**
       ```
       IF correct AND timeSpent < 30s:
         → Jump to next difficulty tier
       ELSE IF correct AND timeSpent > 60s:
         → Stay in same tier, try another question
       ELSE IF incorrect:
         → Drop to lower difficulty tier
       ```
   - Returns next question ID
6. Student can click any question number in sidebar to jump
7. Clicks "Submit Assessment" → Confirmation modal → Locks session

**Components Required:**
- 🆕 `ExamInterface.tsx`
  - 🆕 `QuestionDisplay.tsx`
  - 🆕 `QuestionGrid.tsx` (Sidebar)
  - 🆕 `ExamTimer.tsx`
  - 🆕 `SubmitConfirmationModal.tsx`

**Cloud Functions Required:**
- 🆕 `getFirstQuestion` (HTTP/Callable)
- 🆕 `submitResponse` (HTTP/Callable)
- 🆕 `getNextQuestion` (HTTP/Callable)

**Adaptive Algorithm (Pseudocode):**
```javascript
// Cloud Function: getNextQuestion
async function getNextQuestion(sessionId, lastResponseId) {
  // 1. Fetch session data
  const session = await getSessionData(sessionId);
  const lastResponse = await getResponseData(lastResponseId);
  
  // 2. Determine new difficulty tier
  let newDifficulty = session.currentDifficultyTier;
  let newBloomLevel = session.currentBloomLevel;
  
  if (lastResponse.isCorrect && lastResponse.timeSpent < 30) {
    // Fast & correct → Jump up
    if (newDifficulty === 'easy') newDifficulty = 'medium';
    else if (newDifficulty === 'medium') newDifficulty = 'hard';
  } else if (lastResponse.isCorrect && lastResponse.timeSpent > 60) {
    // Slow & correct → Stay same tier
    // Do nothing
  } else if (!lastResponse.isCorrect) {
    // Incorrect → Drop down
    if (newDifficulty === 'hard') newDifficulty = 'medium';
    else if (newDifficulty === 'medium') newDifficulty = 'easy';
  }
  
  // 3. Query question pool
  const assessment = await getAssessmentData(session.assessmentId);
  const availableQuestions = assessment.questions.filter(q => 
    q.difficulty === newDifficulty &&
    q.bloomLevel === newBloomLevel &&
    !session.questionsServed.includes(q.id)
  );
  
  // 4. Select next question (random from available)
  const nextQuestion = availableQuestions[Math.floor(Math.random() * availableQuestions.length)];
  
  // 5. Update session
  await updateSession(sessionId, {
    currentDifficultyTier: newDifficulty,
    currentBloomLevel: newBloomLevel,
    questionsServed: [...session.questionsServed, nextQuestion.id]
  });
  
  // 6. Return question
  return nextQuestion;
}
```

---

### Feature 6: Teacher - Trigger AI Analysis

**User Flow:**
1. Teacher opens classroom → Assessment details
2. Sees "X/30 students completed" status
3. Clicks "Generate Analysis" button
4. Loading indicator appears (20-30 seconds)
5. Cloud Function `generateAnalytics()` executes:
   - For each student:
     - Aggregates responses
     - Computes scores, Bloom breakdown, time patterns
     - Calls Hugging Face API with prompt:
       ```
       Student answered 25/30 questions correctly (83%).
       Bloom Level 1 (Remember): 8/10 correct
       Bloom Level 2 (Understand): 10/12 correct
       Bloom Level 3 (Apply): 7/8 correct
       Struggled with: Ratio problems (avg 95s per question)
       Fast on: Basic arithmetic (avg 20s per question)
       
       Generate a concise, actionable performance summary for this student.
       ```
     - Stores AI insight in `analytics/students/{id}`
   - For entire class:
     - Aggregates all student data
     - Calls Hugging Face API for class summary
     - Stores in `analytics/classrooms/{id}`
6. Analytics appear in teacher dashboard and student dashboard

**Components Required:**
- 🆕 `AnalyticsGenerationButton.tsx`
- 🆕 `AnalyticsLoadingState.tsx`

**Cloud Function:**
```javascript
// Cloud Function: generateAnalytics
exports.generateAnalytics = functions.https.onCall(async (data, context) => {
  const { assessmentId, classroomId } = data;
  
  // Fetch all sessions for this assessment
  const sessions = await getAllSessions(assessmentId);
  
  // Process each student
  for (const session of sessions) {
    const analytics = await computeStudentAnalytics(session);
    
    // Call Hugging Face API
    const aiInsight = await callHuggingFaceAPI({
      model: "mistralai/Mistral-7B-Instruct-v0.2",
      prompt: buildStudentPrompt(analytics)
    });
    
    // Store analytics
    await db.doc(`analytics/students/${session.studentId}/assessments/${assessmentId}`).set({
      ...analytics,
      aiInsights: aiInsight,
      generatedAt: Timestamp.now()
    });
  }
  
  // Compute class analytics
  const classAnalytics = await computeClassAnalytics(sessions);
  const classSummary = await callHuggingFaceAPI({
    model: "mistralai/Mistral-7B-Instruct-v0.2",
    prompt: buildClassPrompt(classAnalytics)
  });
  
  await db.doc(`analytics/classrooms/${classroomId}/assessments/${assessmentId}`).set({
    ...classAnalytics,
    aiSummary: classSummary,
    generatedAt: Timestamp.now()
  });
  
  return { success: true };
});
```

**Hugging Face API Integration:**
```javascript
async function callHuggingFaceAPI(payload) {
  const response = await fetch(
    "https://api-inference.huggingface.co/models/mistralai/Mistral-7B-Instruct-v0.2",
    {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.HUGGINGFACE_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        inputs: payload.prompt,
        parameters: {
          max_new_tokens: 250,
          temperature: 0.7,
          return_full_text: false
        }
      })
    }
  );
  
  const result = await response.json();
  return result[0].generated_text;
}
```

---

### Feature 7: Student - View Analytics

**User Flow:**
1. After teacher generates analysis, student sees badge on dashboard
2. Clicks assessment card → Opens analytics page
3. Sees:
   - **Score Card:** 83% (25/30 correct)
   - **Bloom Level Breakdown:** Bar chart
   - **Difficulty Performance:** Pie chart
   - **Time Heatmap:** Which questions took longest
   - **AI Insights:** Personalized text summary
   - **Flagged Concepts:** "You struggled with: Ratios, Probability"
   - **Recommendations:** "Consider reviewing Unit 5 on proportional reasoning"

**Components Required:**
- 🆕 `StudentAnalyticsPage.tsx`
  - 🆕 `ScoreCard.tsx`
  - 🆕 `BloomBreakdownChart.tsx`
  - 🆕 `TimeHeatmap.tsx`
  - 🆕 `AIInsightsCard.tsx`

---

### Feature 8: Teacher - Class Analytics

**User Flow:**
1. Teacher opens classroom → Analytics tab
2. Sees:
   - **Class Average:** 78%
   - **Score Distribution:** Bar chart (90-100: 5 students, 80-89: 12 students, etc.)
   - **Concept Mastery:** Table showing % correct for each concept
   - **Top Performers:** Leaderboard (top 5)
   - **Students Needing Help:** Bottom 5 with flagged concepts
   - **AI Summary:** "The class performed well on foundational concepts (Bloom-1) but struggled with application problems (Bloom-3). Consider additional practice on multi-step word problems."

**Components Required:**
- 🆕 `ClassAnalyticsPage.tsx`
  - 🆕 `ScoreDistributionChart.tsx`
  - 🆕 `ConceptMasteryTable.tsx`
  - 🆕 `StudentLeaderboard.tsx`
  - 🆕 `AIClassSummary.tsx`

---

## 🔥 Firebase Integration Steps

### Phase 0: Firebase Project Setup

**Estimated Time:** 30 minutes

**Tasks:**
1. Create Firebase project at console.firebase.google.com
2. Enable services:
   - Authentication (Google provider)
   - Firestore Database
   - Cloud Functions
   - Hosting
3. Install Firebase CLI:
   ```bash
   npm install -g firebase-tools
   firebase login
   ```
4. Initialize Firebase in project:
   ```bash
   cd /path/to/ED_08-main
   firebase init
   # Select: Authentication, Firestore, Functions, Hosting, Emulators
   ```
5. Create `.env` file:
   ```
   REACT_APP_FIREBASE_API_KEY=your_api_key
   REACT_APP_FIREBASE_AUTH_DOMAIN=your_auth_domain
   REACT_APP_FIREBASE_PROJECT_ID=your_project_id
   REACT_APP_FIREBASE_STORAGE_BUCKET=your_storage_bucket
   REACT_APP_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
   REACT_APP_FIREBASE_APP_ID=your_app_id
   REACT_APP_HUGGINGFACE_API_KEY=your_hf_token
   ```
6. Create `src/firebase/config.ts`:
   ```typescript
   import { initializeApp } from 'firebase/app';
   import { getAuth } from 'firebase/auth';
   import { getFirestore } from 'firebase/firestore';
   import { getFunctions } from 'firebase/functions';

   const firebaseConfig = {
     apiKey: process.env.REACT_APP_FIREBASE_API_KEY,
     authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN,
     projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID,
     storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET,
     messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID,
     appId: process.env.REACT_APP_FIREBASE_APP_ID
   };

   const app = initializeApp(firebaseConfig);
   export const auth = getAuth(app);
   export const db = getFirestore(app);
   export const functions = getFunctions(app);
   ```

**Acceptance Criteria:**
- Firebase console shows project created
- Local emulator runs successfully: `firebase emulators:start`
- Frontend can import Firebase services

---

## 📅 Development Phases (JIRA-Style Breakdown)

---

## **PHASE 0: Setup & Foundation** ⏱️ 1-2 hours

### Epic: ENV-001 - Environment Configuration

#### Story: ENV-001-1 - Firebase Project Initialization
**Priority:** Critical  
**Story Points:** 3  
**Description:** Set up Firebase project and connect to React app

**Tasks:**
- [ ] Create Firebase project in console
- [ ] Enable Authentication, Firestore, Functions, Hosting
- [ ] Install Firebase CLI globally
- [ ] Run `firebase init` in project root
- [ ] Create `.env` file with Firebase config
- [ ] Create `src/firebase/config.ts` with initialization
- [ ] Test emulator: `firebase emulators:start`

**Acceptance Criteria:**
- [ ] Firebase emulator runs without errors
- [ ] React app successfully imports `auth`, `db`, `functions`
- [ ] `.gitignore` includes `.env` and `firebase` debug files

**Testing:**
```bash
cd ED_08-main
firebase emulators:start --only firestore,auth,functions
# Should see: ✔ All emulators ready!
```

---

#### Story: ENV-001-2 - Install Firebase Dependencies
**Priority:** Critical  
**Story Points:** 1  
**Description:** Add Firebase SDK to project

**Tasks:**
- [ ] Run: `npm install firebase`
- [ ] Verify version compatibility with React 19.2
- [ ] Update `package.json` scripts:
  ```json
  {
    "scripts": {
      "start": "react-scripts start",
      "emulators": "firebase emulators:start",
      "deploy": "npm run build && firebase deploy"
    }
  }
  ```

**Acceptance Criteria:**
- [ ] `npm start` runs without Firebase errors
- [ ] No peer dependency warnings

---

#### Story: ENV-001-3 - Update Existing Types
**Priority:** High  
**Story Points:** 2  
**Description:** Extend TypeScript interfaces for new features

**Tasks:**
- [ ] Open `src/types/index.ts`
- [ ] Add new interfaces:
  ```typescript
  export interface Assessment {
    id: string;
    title: string;
    description: string;
    createdAt: string;
    publishedAt: string | null;
    status: 'draft' | 'published' | 'closed';
    duration: number;
    questions: Question[];
  }

  export interface Question {
    id: string;
    text: string;
    options: string[];
    correctAnswer: string;
    bloomLevel: 1 | 2 | 3;
    difficulty: 'easy' | 'medium' | 'hard';
    concept: string;
    timeEstimate: number;
  }

  export interface Session {
    id: string;
    studentId: string;
    assessmentId: string;
    startedAt: string;
    submittedAt: string | null;
    status: 'in_progress' | 'submitted';
    currentDifficultyTier: 'easy' | 'medium' | 'hard';
    currentBloomLevel: 1 | 2 | 3;
    questionsServed: string[];
    questionsAnswered: string[];
    markedForReview: string[];
    totalTimeSpent: number;
  }

  export interface Response {
    id: string;
    questionId: string;
    answer: string;
    isCorrect: boolean;
    timeSpent: number;
    markedForReview: boolean;
    timestamp: string;
    selectionReason: string;
  }

  export interface StudentAnalytics {
    studentId: string;
    assessmentId: string;
    classroomId: string;
    score: number;
    totalQuestions: number;
    questionsAttempted: number;
    correctAnswers: number;
    bloomBreakdown: {
      [key: number]: {
        attempted: number;
        correct: number;
        percentage: number;
      };
    };
    difficultyBreakdown: {
      easy: { attempted: number; correct: number };
      medium: { attempted: number; correct: number };
      hard: { attempted: number; correct: number };
    };
    avgTimePerQuestion: number;
    timePerQuestion: Record<string, number>;
    flaggedConcepts: string[];
    aiInsights: string;
    generatedAt: string;
  }

  export interface ClassAnalytics {
    classroomId: string;
    assessmentId: string;
    totalStudents: number;
    completedStudents: number;
    avgScore: number;
    distribution: {
      '90-100': number;
      '80-89': number;
      '70-79': number;
      'below70': number;
    };
    conceptMastery: Record<string, number>;
    avgTimeSpent: number;
    aiSummary: string;
    generatedAt: string;
  }
  ```

**Acceptance Criteria:**
- [ ] No TypeScript compilation errors
- [ ] Interfaces exported correctly
- [ ] Existing components still compile

---

### Epic: ENV-002 - Authentication Setup

#### Story: ENV-002-1 - Modify Landing Page
**Priority:** High  
**Story Points:** 2  
**Description:** Add Student card to landing page and Firebase Auth integration

**Tasks:**
- [ ] Open `src/pages/LandingPage.tsx`
- [ ] Update `selectedRole` state to include `"student"`
- [ ] Duplicate Teacher card markup for Student card
- [ ] Update Student card:
  - Icon: 👨‍🎓
  - Title: "Student"
  - Description: "Join classrooms, take adaptive assessments, track your progress, and view personalized insights."
  - Features: "Join Classes", "Take Assessments", "View Analytics", "Track Progress"
- [ ] Modify `handleRoleSelection` to accept both roles
- [ ] Store selected role in sessionStorage for auth flow

**Modified Code:**
```typescript
const [selectedRole, setSelectedRole] = useState<"teacher" | "student" | null>(null);

const handleRoleSelection = (role: "teacher" | "student") => {
  setSelectedRole(role);
  sessionStorage.setItem('pendingRole', role);
  // Will redirect to auth in next story
};
```

**Acceptance Criteria:**
- [ ] Landing page displays both Teacher and Student cards
- [ ] Cards use existing brown/beige theme
- [ ] Clicking either card stores role in sessionStorage

---

#### Story: ENV-002-2 - Create Login Page with Google Auth
**Priority:** Critical  
**Story Points:** 5  
**Description:** Build authentication page using Firebase Google Sign-In

**Tasks:**
- [ ] Create `src/pages/LoginPage.tsx`
- [ ] Import Firebase Auth:
  ```typescript
  import { auth } from '../firebase/config';
  import { GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
  ```
- [ ] Create Google Sign-In button with existing theme
- [ ] Implement sign-in flow:
  ```typescript
  const handleGoogleSignIn = async () => {
    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      const user = result.user;
      
      // Get pending role from sessionStorage
      const role = sessionStorage.getItem('pendingRole') || 'student';
      
      // Create/update user document in Firestore
      await createOrUpdateUser(user, role);
      
      // Redirect to dashboard
      if (role === 'teacher') {
        navigate('/teacher/dashboard');
      } else {
        navigate('/student/dashboard');
      }
    } catch (error) {
      console.error('Sign-in error:', error);
      setError('Failed to sign in. Please try again.');
    }
  };
  ```
- [ ] Create helper function `createOrUpdateUser`:
  ```typescript
  import { doc, setDoc, getDoc } from 'firebase/firestore';
  
  async function createOrUpdateUser(user: any, role: string) {
    const userRef = doc(db, 'users', user.uid);
    const userDoc = await getDoc(userRef);
    
    if (!userDoc.exists()) {
      // First-time user
      await setDoc(userRef, {
        uid: user.uid,
        email: user.email,
        name: user.displayName,
        role: role,
        avatar: user.photoURL,
        createdAt: new Date().toISOString()
      });
    }
  }
  ```

**Acceptance Criteria:**
- [ ] Google Sign-In popup appears on button click
- [ ] User document created in Firestore `users` collection
- [ ] Successful login redirects to correct dashboard
- [ ] Error handling displays user-friendly messages

---

#### Story: ENV-002-3 - Create Auth Context Provider
**Priority:** High  
**Story Points:** 3  
**Description:** Implement global authentication state management

**Tasks:**
- [ ] Create `src/contexts/AuthContext.tsx`:
  ```typescript
  import React, { createContext, useContext, useEffect, useState } from 'react';
  import { auth, db } from '../firebase/config';
  import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
  import { doc, getDoc } from 'firebase/firestore';
  import { User } from '../types';

  interface AuthContextType {
    currentUser: User | null;
    loading: boolean;
    signOut: () => Promise<void>;
  }

  const AuthContext = createContext<AuthContextType | undefined>(undefined);

  export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) throw new Error('useAuth must be used within AuthProvider');
    return context;
  };

  export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [currentUser, setCurrentUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
      const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
        if (firebaseUser) {
          // Fetch user data from Firestore
          const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
          if (userDoc.exists()) {
            setCurrentUser(userDoc.data() as User);
          }
        } else {
          setCurrentUser(null);
        }
        setLoading(false);
      });

      return unsubscribe;
    }, []);

    const signOut = async () => {
      await auth.signOut();
      setCurrentUser(null);
    };

    return (
      <AuthContext.Provider value={{ currentUser, loading, signOut }}>
        {!loading && children}
      </AuthContext.Provider>
    );
  };
  ```
- [ ] Wrap `App.tsx` with `AuthProvider`
- [ ] Add loading spinner while auth initializes

**Acceptance Criteria:**
- [ ] Auth state persists across page refreshes
- [ ] `useAuth()` hook accessible in all components
- [ ] Sign-out functionality works correctly

---

#### Story: ENV-002-4 - Add Protected Routes
**Priority:** High  
**Story Points:** 2  
**Description:** Implement route guards for authenticated users

**Tasks:**
- [ ] Create `src/components/ProtectedRoute.tsx`:
  ```typescript
  import { Navigate } from 'react-router-dom';
  import { useAuth } from '../contexts/AuthContext';

  interface ProtectedRouteProps {
    children: React.ReactNode;
    requiredRole?: 'teacher' | 'student';
  }

  const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, requiredRole }) => {
    const { currentUser } = useAuth();

    if (!currentUser) {
      return <Navigate to="/login" replace />;
    }

    if (requiredRole && currentUser.role !== requiredRole) {
      return <Navigate to={`/${currentUser.role}/dashboard`} replace />;
    }

    return <>{children}</>;
  };

  export default ProtectedRoute;
  ```
- [ ] Update `App.tsx` routes to use `ProtectedRoute`

**Acceptance Criteria:**
- [ ] Unauthenticated users redirected to login
- [ ] Teachers cannot access student routes (and vice versa)
- [ ] Direct URL navigation respects role restrictions

---

## **PHASE 1: Teacher Classroom Management** ⏱️ 2-3 hours

### Epic: TCM-001 - Classroom CRUD Operations

#### Story: TCM-001-1 - Create Classroom Modal
**Priority:** Critical  
**Story Points:** 5  
**Description:** Build modal for teachers to create new classrooms

**Tasks:**
- [ ] Create `src/components/CreateClassroomModal.tsx`
- [ ] Use existing `Modal.tsx` component as base
- [ ] Add form fields:
  - Name (text input)
  - Subject (text input)
  - Description (textarea)
- [ ] Style with existing brown/beige theme
- [ ] Implement form validation:
  ```typescript
  const [formData, setFormData] = useState({
    name: '',
    subject: '',
    description: ''
  });
  const [errors, setErrors] = useState({});

  const validate = () => {
    const newErrors: any = {};
    if (!formData.name.trim()) newErrors.name = 'Classroom name is required';
    if (!formData.subject.trim()) newErrors.subject = 'Subject is required';
    return newErrors;
  };
  ```
- [ ] Generate 6-character classroom code:
  ```typescript
  function generateClassroomCode(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    for (let i = 0; i < 6; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  }
  ```
- [ ] Implement Firestore create operation:
  ```typescript
  import { collection, addDoc, Timestamp } from 'firebase/firestore';
  import { db } from '../firebase/config';
  import { useAuth } from '../contexts/AuthContext';

  const handleCreateClassroom = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const validationErrors = validate();
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    setLoading(true);
    try {
      await addDoc(collection(db, 'classrooms'), {
        teacherId: currentUser!.uid,
        name: formData.name,
        subject: formData.subject,
        description: formData.description,
        code: generateClassroomCode(),
        members: [],
        createdAt: Timestamp.now()
      });

      onClose();
      // Trigger parent refresh
    } catch (error) {
      console.error('Error creating classroom:', error);
      setErrors({ submit: 'Failed to create classroom' });
    } finally {
      setLoading(false);
    }
  };
  ```

**Acceptance Criteria:**
- [ ] Modal opens/closes smoothly
- [ ] Form validation prevents empty submissions
- [ ] Classroom document created in Firestore
- [ ] Unique 6-character code generated
- [ ] Success feedback shown to user

---

#### Story: TCM-001-2 - Update Teacher Dashboard with Create Button
**Priority:** High  
**Story Points:** 2  
**Description:** Add "Create Classroom" button to teacher dashboard

**Tasks:**
- [ ] Open `src/pages/TeacherDashboard.tsx`
- [ ] Add state for modal visibility:
  ```typescript
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  ```
- [ ] Add button before overview cards:
  ```typescript
  <div className="dashboard-header">
    <h2>My Classrooms</h2>
    <button 
      className="btn btn-primary"
      onClick={() => setIsCreateModalOpen(true)}
    >
      + Create Classroom
    </button>
  </div>
  ```
- [ ] Import and render modal:
  ```typescript
  <CreateClassroomModal 
    isOpen={isCreateModalOpen}
    onClose={() => setIsCreateModalOpen(false)}
  />
  ```

**Acceptance Criteria:**
- [ ] Button appears at top of dashboard
- [ ] Clicking button opens modal
- [ ] Modal closes on successful creation

---

#### Story: TCM-001-3 - Display Classrooms with Real-time Listener
**Priority:** Critical  
**Story Points:** 5  
**Description:** Fetch and display teacher's classrooms from Firestore

**Tasks:**
- [ ] Open `src/pages/TeacherClassrooms.tsx`
- [ ] Replace sample data with Firestore query:
  ```typescript
  import { collection, query, where, onSnapshot } from 'firebase/firestore';
  
  const [classrooms, setClassrooms] = useState<Classroom[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!currentUser) return;

    const q = query(
      collection(db, 'classrooms'),
      where('teacherId', '==', currentUser.uid)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const classroomData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Classroom[];
      
      setClassrooms(classroomData);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [currentUser]);
  ```
- [ ] Add loading state UI
- [ ] Add empty state when no classrooms exist

**Acceptance Criteria:**
- [ ] Teacher sees only their own classrooms
- [ ] Real-time updates when new classroom created
- [ ] Loading spinner shows while fetching
- [ ] Empty state encourages creating first classroom

---

#### Story: TCM-001-4 - Display Classroom Code in Cards
**Priority:** Medium  
**Story Points:** 1  
**Description:** Show classroom code prominently in classroom cards

**Tasks:**
- [ ] Update classroom card component to display code:
  ```typescript
  <div className="classroom-card">
    <h3>{classroom.name}</h3>
    <p className="subject">{classroom.subject}</p>
    <div className="classroom-code">
      <span className="code-label">Code:</span>
      <span className="code-value">{classroom.code}</span>
      <button className="copy-btn" onClick={() => copyToClipboard(classroom.code)}>
        📋 Copy
      </button>
    </div>
    <p className="description">{classroom.description}</p>
    <div className="stats">
      <span>{classroom.members.length} students</span>
    </div>
  </div>
  ```
- [ ] Implement copy to clipboard functionality:
  ```typescript
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    // Show toast notification
  };
  ```

**Acceptance Criteria:**
- [ ] Classroom code visible in large, readable font
- [ ] Copy button copies code to clipboard
- [ ] Success toast appears after copying

---

## **PHASE 2: Student Classroom Joining** ⏱️ 1-2 hours

### Epic: SCJ-001 - Join Classroom Feature

#### Story: SCJ-001-1 - Create Join Classroom Modal
**Priority:** Critical  
**Story Points:** 5  
**Description:** Build modal for students to join classrooms via code

**Tasks:**
- [ ] Create `src/components/JoinClassroomModal.tsx`
- [ ] Add single input field for 6-character code
- [ ] Implement real-time validation:
  ```typescript
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleCodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.toUpperCase().slice(0, 6);
    setCode(value);
    setError('');
  };

  const handleJoinClassroom = async () => {
    if (code.length !== 6) {
      setError('Code must be 6 characters');
      return;
    }

    setLoading(true);
    try {
      // Query Firestore for classroom with this code
      const q = query(
        collection(db, 'classrooms'),
        where('code', '==', code),
        limit(1)
      );
      
      const snapshot = await getDocs(q);
      
      if (snapshot.empty) {
        setError('Invalid classroom code');
        return;
      }

      const classroomRef = snapshot.docs[0].ref;
      const classroomData = snapshot.docs[0].data();

      // Check if already a member
      if (classroomData.members.includes(currentUser!.uid)) {
        setError('You are already in this classroom');
        return;
      }

      // Add student to classroom
      await updateDoc(classroomRef, {
        members: arrayUnion(currentUser!.uid)
      });

      // Success!
      onClose();
      // Show success toast
    } catch (error) {
      console.error('Error joining classroom:', error);
      setError('Failed to join classroom');
    } finally {
      setLoading(false);
    }
  };
  ```

**Acceptance Criteria:**
- [ ] Input accepts only 6 alphanumeric characters
- [ ] Invalid codes show error message
- [ ] Valid codes add student to classroom
- [ ] Duplicate joins prevented
- [ ] Loading state shown during validation

---

#### Story: SCJ-001-2 - Update Student Dashboard
**Priority:** High  
**Story Points:** 2  
**Description:** Add "Join Classroom" button to student dashboard

**Tasks:**
- [ ] Open `src/pages/StudentDashboard.tsx`
- [ ] Add join modal trigger:
  ```typescript
  const [isJoinModalOpen, setIsJoinModalOpen] = useState(false);
  ```
- [ ] Add button to UI:
  ```typescript
  <button 
    className="btn btn-primary"
    onClick={() => setIsJoinModalOpen(true)}
  >
    + Join Classroom
  </button>
  ```
- [ ] Import and render modal

**Acceptance Criteria:**
- [ ] Button visible in dashboard header
- [ ] Modal opens on click
- [ ] Dashboard refreshes after successful join

---

#### Story: SCJ-001-3 - Display Student's Classrooms
**Priority:** Critical  
**Story Points:** 5  
**Description:** Show classrooms student is enrolled in

**Tasks:**
- [ ] Open `src/pages/StudentClassrooms.tsx`
- [ ] Implement Firestore query:
  ```typescript
  const [classrooms, setClassrooms] = useState<Classroom[]>([]);

  useEffect(() => {
    if (!currentUser) return;

    const q = query(
      collection(db, 'classrooms'),
      where('members', 'array-contains', currentUser.uid)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const classroomData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Classroom[];
      
      setClassrooms(classroomData);
    });

    return () => unsubscribe();
  }, [currentUser]);
  ```
- [ ] Display classroom cards with:
  - Subject icon
  - Classroom name
  - Teacher name
  - Number of assessments
- [ ] Add click handler to navigate to classroom detail

**Acceptance Criteria:**
- [ ] Student sees only joined classrooms
- [ ] Real-time updates when joining new classroom
- [ ] Cards clickable to view assessments

---

## **PHASE 3: Assessment Creation (Teacher)** ⏱️ 3-4 hours

### Epic: AC-001 - Assessment Builder

#### Story: AC-001-1 - Create Assessment Creation Page
**Priority:** Critical  
**Story Points:** 8  
**Description:** Build comprehensive assessment creation interface

**Tasks:**
- [ ] Create `src/pages/CreateAssessmentPage.tsx`
- [ ] Implement multi-step form:
  - **Step 1: Basic Info**
    - Title
    - Description
    - Duration (minutes)
  - **Step 2: Add Questions**
    - Question input form (see next story)
  - **Step 3: Review & Publish**
- [ ] Add navigation between steps
- [ ] Store draft in component state:
  ```typescript
  const [assessment, setAssessment] = useState<Partial<Assessment>>({
    title: '',
    description: '',
    duration: 30,
    questions: [],
    status: 'draft'
  });
  ```

**Acceptance Criteria:**
- [ ] All form fields styled with existing theme
- [ ] Step navigation works smoothly
- [ ] Draft state persists during creation

---

#### Story: AC-001-2 - Build Question Input Component
**Priority:** Critical  
**Story Points:** 8  
**Description:** Create reusable component for adding/editing questions

**Tasks:**
- [ ] Create `src/components/QuestionInputForm.tsx`
- [ ] Add form fields:
  - Question text (textarea)
  - 4 option inputs
  - Correct answer radio buttons
  - Bloom level dropdown (1-Remember, 2-Understand, 3-Apply)
  - Difficulty dropdown (Easy, Medium, Hard)
  - Concept tag (text input)
- [ ] Implement validation:
  ```typescript
  const validateQuestion = (q: Question) => {
    const errors: string[] = [];
    if (!q.text.trim()) errors.push('Question text required');
    if (q.options.some(opt => !opt.trim())) errors.push('All options required');
    if (!q.correctAnswer) errors.push('Select correct answer');
    if (!q.concept.trim()) errors.push('Concept tag required');
    return errors;
  };
  ```
- [ ] Add "Add Question" and "Remove Question" buttons
- [ ] Display question counter (e.g., "Question 5 of 30")

**Acceptance Criteria:**
- [ ] All fields required before adding question
- [ ] Validation prevents incomplete questions
- [ ] Questions can be edited after addition
- [ ] Questions can be removed from list

---

#### Story: AC-001-3 - Implement Question List Management
**Priority:** High  
**Story Points:** 3  
**Description:** Manage array of questions with add/edit/delete

**Tasks:**
- [ ] In `CreateAssessmentPage.tsx`:
  ```typescript
  const [questions, setQuestions] = useState<Question[]>([]);

  const addQuestion = (newQuestion: Question) => {
    setQuestions([...questions, { ...newQuestion, id: generateId() }]);
  };

  const updateQuestion = (id: string, updatedQuestion: Question) => {
    setQuestions(questions.map(q => q.id === id ? updatedQuestion : q));
  };

  const deleteQuestion = (id: string) => {
    setQuestions(questions.filter(q => q.id !== id));
  };
  ```
- [ ] Display question list with preview cards
- [ ] Add edit/delete icons on each card
- [ ] Show distribution summary:
  - Easy: X, Medium: Y, Hard: Z
  - Bloom-1: A, Bloom-2: B, Bloom-3: C

**Acceptance Criteria:**
- [ ] Questions appear in list after adding
- [ ] Edit button opens question form with pre-filled data
- [ ] Delete button removes question with confirmation
- [ ] Distribution summary updates in real-time

---

#### Story: AC-001-4 - Save Draft to Firestore
**Priority:** High  
**Story Points:** 3  
**Description:** Allow saving assessment as draft before publishing

**Tasks:**
- [ ] Add "Save Draft" button
- [ ] Implement Firestore save:
  ```typescript
  const handleSaveDraft = async () => {
    try {
      const classroomId = params.classroomId; // From route params
      const assessmentRef = collection(
        db, 
        `classrooms/${classroomId}/assessments`
      );

      await addDoc(assessmentRef, {
        title: assessment.title,
        description: assessment.description,
        duration: assessment.duration,
        questions: questions,
        status: 'draft',
        createdAt: Timestamp.now(),
        publishedAt: null
      });

      // Show success message
      navigate(`/teacher/classroom/${classroomId}`);
    } catch (error) {
      console.error('Error saving draft:', error);
    }
  };
  ```

**Acceptance Criteria:**
- [ ] Draft saved to Firestore with correct path
- [ ] Draft appears in classroom assessments list
- [ ] Status badge shows "Draft"
- [ ] Teacher can resume editing draft

---

#### Story: AC-001-5 - Publish Assessment
**Priority:** Critical  
**Story Points:** 3  
**Description:** Publish assessment to make it available to students

**Tasks:**
- [ ] Add validation before publish:
  - Minimum 10 questions
  - Balanced difficulty distribution (suggest minimum 3 of each)
- [ ] Add "Publish" button in review step
- [ ] Implement publish logic:
  ```typescript
  const handlePublish = async (assessmentId: string) => {
    // Validate
    if (questions.length < 10) {
      alert('Minimum 10 questions required');
      return;
    }

    const difficultyCount = {
      easy: questions.filter(q => q.difficulty === 'easy').length,
      medium: questions.filter(q => q.difficulty === 'medium').length,
      hard: questions.filter(q => q.difficulty === 'hard').length
    };

    if (Object.values(difficultyCount).some(count => count < 3)) {
      if (!confirm('Unbalanced difficulty. Publish anyway?')) return;
    }

    // Update status
    await updateDoc(
      doc(db, `classrooms/${classroomId}/assessments/${assessmentId}`),
      {
        status: 'published',
        publishedAt: Timestamp.now()
      }
    );

    // Success notification
  };
  ```

**Acceptance Criteria:**
- [ ] Validation prevents publishing incomplete assessments
- [ ] Warning shown for unbalanced difficulty
- [ ] Published assessment visible to students immediately
- [ ] Status badge changes to "Published"

---

## **PHASE 4: Adaptive Exam Interface (Student)** ⏱️ 4-5 hours

### Epic: AEI-001 - Exam Taking Experience

#### Story: AEI-001-1 - Create Exam Interface Layout
**Priority:** Critical  
**Story Points:** 8  
**Description:** Build main exam UI with question display and navigation

**Tasks:**
- [ ] Create `src/pages/ExamInterface.tsx`
- [ ] Implement layout structure:
  ```typescript
  <div className="exam-container">
    <ExamTimer duration={assessment.duration} onTimeout={handleSubmit} />
    
    <div className="exam-content">
      <div className="question-area">
        <QuestionDisplay 
          question={currentQuestion}
          onAnswer={handleAnswerSelect}
          selectedAnswer={selectedAnswer}
        />
        
        <div className="exam-controls">
          <label>
            <input 
              type="checkbox" 
              checked={markedForReview}
              onChange={(e) => setMarkedForReview(e.target.checked)}
            />
            Mark for Review
          </label>
          
          <button 
            className="btn btn-primary"
            onClick={handleSaveAndNext}
          >
            Save & Next
          </button>
          
          <button 
            className="btn btn-secondary"
            onClick={() => setShowSubmitModal(true)}
          >
            Submit Assessment
          </button>
        </div>
      </div>
      
      <QuestionGrid 
        questions={sessionQuestions}
        currentQuestionId={currentQuestion.id}
        onQuestionClick={jumpToQuestion}
      />
    </div>
  </div>
  ```
- [ ] Style with existing theme (brown/beige colors)

**Acceptance Criteria:**
- [ ] Layout responsive and clean
- [ ] Timer visible at top
- [ ] Question grid fixed on right side
- [ ] Controls accessible and clear

---

#### Story: AEI-001-2 - Implement Question Display Component
**Priority:** High  
**Story Points:** 3  
**Description:** Build component to render question and options

**Tasks:**
- [ ] Create `src/components/QuestionDisplay.tsx`
- [ ] Render question text and 4 options as radio buttons:
  ```typescript
  <div className="question-display">
    <h3 className="question-text">{question.text}</h3>
    
    <div className="options-list">
      {question.options.map((option, index) => (
        <label 
          key={index}
          className={`option ${selectedAnswer === option ? 'selected' : ''}`}
        >
          <input 
            type="radio"
            name="answer"
            value={option}
            checked={selectedAnswer === option}
            onChange={() => onAnswer(option)}
          />
          <span className="option-letter">{String.fromCharCode(65 + index)}.</span>
          <span className="option-text">{option}</span>
        </label>
      ))}
    </div>
  </div>
  ```

**Acceptance Criteria:**
- [ ] Question text prominently displayed
- [ ] Options selectable via click or radio button
- [ ] Selected option highlighted
- [ ] Keyboard navigation works (Arrow keys)

---

#### Story: AEI-001-3 - Build Question Grid Sidebar
**Priority:** High  
**Story Points:** 5  
**Description:** Create navigable question grid with status indicators

**Tasks:**
- [ ] Create `src/components/QuestionGrid.tsx`
- [ ] Display grid of question numbers:
  ```typescript
  <div className="question-grid">
    <h4>Questions</h4>
    <div className="grid-container">
      {questions.map((q, index) => {
        const status = getQuestionStatus(q.id);
        return (
          <button
            key={q.id}
            className={`grid-item ${status} ${currentQuestionId === q.id ? 'current' : ''}`}
            onClick={() => onQuestionClick(q.id)}
          >
            {index + 1}
          </button>
        );
      })}
    </div>
    
    <div className="legend">
      <div><span className="answered"></span> Answered</div>
      <div><span className="review"></span> Marked for Review</div>
      <div><span className="not-visited"></span> Not Visited</div>
      <div><span className="current"></span> Current</div>
    </div>
  </div>
  ```
- [ ] Implement status calculation:
  ```typescript
  const getQuestionStatus = (questionId: string) => {
    if (markedForReview.includes(questionId)) return 'review';
    if (answeredQuestions.includes(questionId)) return 'answered';
    if (visitedQuestions.includes(questionId)) return 'visited';
    return 'not-visited';
  };
  ```

**Acceptance Criteria:**
- [ ] Grid shows all questions in assessment
- [ ] Color coding matches legend:
  - Green = Answered
  - Yellow = Marked for Review
  - Gray = Not Visited
  - Blue Border = Current Question
- [ ] Clicking number jumps to that question
- [ ] Current question highlighted

---

#### Story: AEI-001-4 - Implement Countdown Timer
**Priority:** High  
**Story Points:** 3  
**Description:** Create timer component that counts down from duration

**Tasks:**
- [ ] Create `src/components/ExamTimer.tsx`
- [ ] Use `useState` and `useEffect` for countdown:
  ```typescript
  const ExamTimer: React.FC<{ duration: number; onTimeout: () => void }> = ({ duration, onTimeout }) => {
    const [timeRemaining, setTimeRemaining] = useState(duration * 60); // Convert to seconds

    useEffect(() => {
      const interval = setInterval(() => {
        setTimeRemaining(prev => {
          if (prev <= 1) {
            clearInterval(interval);
            onTimeout(); // Auto-submit
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      return () => clearInterval(interval);
    }, []);

    const minutes = Math.floor(timeRemaining / 60);
    const seconds = timeRemaining % 60;

    return (
      <div className={`exam-timer ${timeRemaining < 300 ? 'warning' : ''}`}>
        <span className="timer-icon">⏱️</span>
        <span className="timer-text">
          {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
        </span>
      </div>
    );
  };
  ```
- [ ] Add warning color when < 5 minutes remaining

**Acceptance Criteria:**
- [ ] Timer displays MM:SS format
- [ ] Counts down every second
- [ ] Turns red when < 5 minutes remaining
- [ ] Auto-submits assessment at 00:00

---

#### Story: AEI-001-5 - Initialize Exam Session
**Priority:** Critical  
**Story Points:** 5  
**Description:** Create session document and fetch first question

**Tasks:**
- [ ] In `ExamInterface.tsx`, add session initialization:
  ```typescript
  useEffect(() => {
    const initializeSession = async () => {
      try {
        // Create session document
        const sessionRef = await addDoc(
          collection(db, `classrooms/${classroomId}/assessments/${assessmentId}/sessions`),
          {
            studentId: currentUser!.uid,
            assessmentId: assessmentId,
            startedAt: Timestamp.now(),
            submittedAt: null,
            status: 'in_progress',
            currentDifficultyTier: 'easy',
            currentBloomLevel: 1,
            questionsServed: [],
            questionsAnswered: [],
            markedForReview: [],
            totalTimeSpent: 0
          }
        );

        setSessionId(sessionRef.id);

        // Fetch first question (always starts with Easy, Bloom-1)
        const firstQuestion = assessment.questions.find(
          q => q.difficulty === 'easy' && q.bloomLevel === 1
        );

        setCurrentQuestion(firstQuestion);
        setQuestionStartTime(Date.now());
      } catch (error) {
        console.error('Error initializing session:', error);
      }
    };

    initializeSession();
  }, []);
  ```

**Acceptance Criteria:**
- [ ] Session document created in Firestore
- [ ] First question always Easy + Bloom-1
- [ ] Timer starts immediately
- [ ] Question displayed correctly

---

#### Story: AEI-001-6 - Implement Save & Next Logic
**Priority:** Critical  
**Story Points:** 8  
**Description:** Handle answer submission and fetch next adaptive question

**Tasks:**
- [ ] Create `handleSaveAndNext` function:
  ```typescript
  const handleSaveAndNext = async () => {
    if (!selectedAnswer) {
      alert('Please select an answer');
      return;
    }

    const timeSpent = Math.floor((Date.now() - questionStartTime) / 1000);
    const isCorrect = selectedAnswer === currentQuestion.correctAnswer;

    // Save response to Firestore
    await addDoc(
      collection(db, `.../sessions/${sessionId}/responses`),
      {
        questionId: currentQuestion.id,
        answer: selectedAnswer,
        isCorrect: isCorrect,
        timeSpent: timeSpent,
        markedForReview: markedForReview,
        timestamp: Timestamp.now(),
        selectionReason: '' // Will be set by Cloud Function
      }
    );

    // Update session metadata
    await updateDoc(doc(db, `.../sessions/${sessionId}`), {
      questionsAnswered: arrayUnion(currentQuestion.id),
      markedForReview: markedForReview 
        ? arrayUnion(currentQuestion.id) 
        : arrayRemove(currentQuestion.id)
    });

    // Call Cloud Function to get next question
    const getNext = httpsCallable(functions, 'getNextQuestion');
    const result = await getNext({ 
      sessionId: sessionId,
      lastQuestionId: currentQuestion.id,
      isCorrect: isCorrect,
      timeSpent: timeSpent
    });

    const nextQuestion = result.data.nextQuestion;
    
    // Update UI
    setCurrentQuestion(nextQuestion);
    setSelectedAnswer('');
    setMarkedForReview(false);
    setQuestionStartTime(Date.now());
  };
  ```

**Acceptance Criteria:**
- [ ] Response saved to Firestore with correctness
- [ ] Time tracking accurate
- [ ] Next question fetched adaptively
- [ ] UI updates smoothly to next question

---

## **PHASE 5: Cloud Functions - Adaptive Logic** ⏱️ 3-4 hours

### Epic: CF-001 - Serverless Functions

#### Story: CF-001-1 - Setup Cloud Functions Project
**Priority:** Critical  
**Story Points:** 2  
**Description:** Initialize Firebase Functions in project

**Tasks:**
- [ ] Run: `firebase init functions`
- [ ] Select TypeScript
- [ ] Install dependencies in `functions/` directory
- [ ] Add Hugging Face API key to environment:
  ```bash
  firebase functions:config:set huggingface.api_key="YOUR_HF_TOKEN"
  ```

**Acceptance Criteria:**
- [ ] `functions/src/index.ts` exists
- [ ] `npm run build` in functions directory succeeds
- [ ] Environment variables configured

---

#### Story: CF-001-2 - Implement getNextQuestion Function
**Priority:** Critical  
**Story Points:** 8  
**Description:** Build adaptive question selection algorithm

**Tasks:**
- [ ] Create function in `functions/src/index.ts`:
  ```typescript
  import * as functions from 'firebase-functions';
  import * as admin from 'firebase-admin';

  admin.initializeApp();
  const db = admin.firestore();

  export const getNextQuestion = functions.https.onCall(async (data, context) => {
    const { sessionId, lastQuestionId, isCorrect, timeSpent } = data;

    // 1. Fetch session data
    const sessionRef = db.doc(`...sessions/${sessionId}`);
    const sessionDoc = await sessionRef.get();
    const session = sessionDoc.data();

    // 2. Determine selection reason and new difficulty tier
    let newDifficulty = session.currentDifficultyTier;
    let newBloomLevel = session.currentBloomLevel;
    let selectionReason = '';

    if (isCorrect && timeSpent < 30) {
      // Fast & correct → Jump up
      selectionReason = 'correct_fast_jump';
      if (newDifficulty === 'easy') newDifficulty = 'medium';
      else if (newDifficulty === 'medium') newDifficulty = 'hard';
    } else if (isCorrect && timeSpent > 60) {
      // Slow & correct → Stay same tier
      selectionReason = 'correct_slow_stay';
      // newDifficulty stays same
    } else if (!isCorrect) {
      // Incorrect → Drop down
      selectionReason = 'incorrect_drop';
      if (newDifficulty === 'hard') newDifficulty = 'medium';
      else if (newDifficulty === 'medium') newDifficulty = 'easy';
    }

    // 3. Fetch assessment to get question pool
    const assessmentRef = db.doc(`...assessments/${session.assessmentId}`);
    const assessmentDoc = await assessmentRef.get();
    const assessment = assessmentDoc.data();

    // 4. Filter available questions
    const availableQuestions = assessment.questions.filter((q: any) => 
      q.difficulty === newDifficulty &&
      q.bloomLevel === newBloomLevel &&
      !session.questionsServed.includes(q.id)
    );

    // 5. If no questions available at this tier, try adjacent tiers
    if (availableQuestions.length === 0) {
      // Fallback logic: try any difficulty at same Bloom level
      const fallbackQuestions = assessment.questions.filter((q: any) =>
        q.bloomLevel === newBloomLevel &&
        !session.questionsServed.includes(q.id)
      );
      
      if (fallbackQuestions.length === 0) {
        // No more questions - assessment complete
        return { nextQuestion: null, completed: true };
      }

      const nextQuestion = fallbackQuestions[0];
      await updateSessionAndResponse(sessionRef, nextQuestion, selectionReason);
      return { nextQuestion: nextQuestion, completed: false };
    }

    // 6. Select random question from available pool
    const nextQuestion = availableQuestions[Math.floor(Math.random() * availableQuestions.length)];

    // 7. Update session
    await updateSessionAndResponse(sessionRef, nextQuestion, selectionReason);

    return { nextQuestion: nextQuestion, completed: false };
  });

  async function updateSessionAndResponse(sessionRef: any, nextQuestion: any, selectionReason: string) {
    await sessionRef.update({
      currentDifficultyTier: nextQuestion.difficulty,
      currentBloomLevel: nextQuestion.bloomLevel,
      questionsServed: admin.firestore.FieldValue.arrayUnion(nextQuestion.id)
    });

    // Update last response with selection reason
    // (Query for most recent response and update)
  }
  ```

**Acceptance Criteria:**
- [ ] Function callable from frontend
- [ ] Adaptive logic correctly adjusts difficulty
- [ ] Selection reason logged for audit
- [ ] Handles edge cases (no questions available)

---

#### Story: CF-001-3 - Deploy and Test Cloud Function
**Priority:** High  
**Story Points:** 2  
**Description:** Deploy function and verify it works

**Tasks:**
- [ ] Deploy function:
  ```bash
  cd functions
  npm run build
  firebase deploy --only functions
  ```
- [ ] Test from frontend by taking a sample exam
- [ ] Verify Firestore logs show correct selection reasons

**Acceptance Criteria:**
- [ ] Function deploys without errors
- [ ] Callable from frontend
- [ ] Adaptive logic works as expected in live test

---

## **PHASE 6: AI Analytics Generation** ⏱️ 2-3 hours

### Epic: AI-001 - LLM Integration

#### Story: AI-001-1 - Setup Hugging Face API Integration
**Priority:** Critical  
**Story Points:** 3  
**Description:** Create helper function to call Hugging Face Inference API

**Tasks:**
- [ ] In `functions/src/index.ts`, add helper:
  ```typescript
  import fetch from 'node-fetch';

  async function callHuggingFaceAPI(prompt: string): Promise<string> {
    const apiKey = functions.config().huggingface.api_key;
    
    const response = await fetch(
      'https://api-inference.huggingface.co/models/mistralai/Mistral-7B-Instruct-v0.2',
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          inputs: prompt,
          parameters: {
            max_new_tokens: 250,
            temperature: 0.7,
            return_full_text: false
          }
        })
      }
    );

    const result = await response.json();
    
    if (result.error) {
      throw new Error(`Hugging Face API error: ${result.error}`);
    }

    return result[0].generated_text;
  }
  ```
- [ ] Add error handling and retry logic

**Acceptance Criteria:**
- [ ] Function successfully calls Hugging Face API
- [ ] Returns generated text
- [ ] Handles rate limits gracefully

---

#### Story: AI-001-2 - Implement Student Analytics Computation
**Priority:** Critical  
**Story Points:** 8  
**Description:** Aggregate student responses and compute metrics

**Tasks:**
- [ ] Create helper function:
  ```typescript
  async function computeStudentAnalytics(sessionId: string) {
    // Fetch all responses for this session
    const responsesSnapshot = await db
      .collection(`.../sessions/${sessionId}/responses`)
      .get();

    const responses = responsesSnapshot.docs.map(doc => doc.data());

    // Compute basic stats
    const totalQuestions = responses.length;
    const correctAnswers = responses.filter(r => r.isCorrect).length;
    const score = (correctAnswers / totalQuestions) * 100;

    // Bloom breakdown
    const bloomBreakdown: any = { 1: { attempted: 0, correct: 0 }, 2: { attempted: 0, correct: 0 }, 3: { attempted: 0, correct: 0 } };
    
    responses.forEach(r => {
      const question = getQuestionById(r.questionId); // Helper to fetch question
      bloomBreakdown[question.bloomLevel].attempted++;
      if (r.isCorrect) bloomBreakdown[question.bloomLevel].correct++;
    });

    Object.keys(bloomBreakdown).forEach(level => {
      const data = bloomBreakdown[level];
      data.percentage = (data.correct / data.attempted) * 100;
    });

    // Difficulty breakdown
    const difficultyBreakdown: any = { easy: { attempted: 0, correct: 0 }, medium: { attempted: 0, correct: 0 }, hard: { attempted: 0, correct: 0 } };

    responses.forEach(r => {
      const question = getQuestionById(r.questionId);
      difficultyBreakdown[question.difficulty].attempted++;
      if (r.isCorrect) difficultyBreakdown[question.difficulty].correct++;
    });

    // Time analysis
    const timePerQuestion: any = {};
    responses.forEach(r => {
      timePerQuestion[r.questionId] = r.timeSpent;
    });

    const avgTimePerQuestion = responses.reduce((sum, r) => sum + r.timeSpent, 0) / totalQuestions;

    // Identify flagged concepts (incorrect answers)
    const flaggedConcepts = responses
      .filter(r => !r.isCorrect)
      .map(r => getQuestionById(r.questionId).concept)
      .filter((v, i, arr) => arr.indexOf(v) === i); // Unique

    return {
      score,
      totalQuestions,
      questionsAttempted: totalQuestions,
      correctAnswers,
      bloomBreakdown,
      difficultyBreakdown,
      avgTimePerQuestion,
      timePerQuestion,
      flaggedConcepts
    };
  }
  ```

**Acceptance Criteria:**
- [ ] All metrics computed correctly
- [ ] Bloom and difficulty breakdowns accurate
- [ ] Time analysis includes per-question data
- [ ] Flagged concepts identified

---

#### Story: AI-001-3 - Generate Student AI Insights
**Priority:** Critical  
**Story Points:** 5  
**Description:** Use LLM to generate personalized student feedback

**Tasks:**
- [ ] Create prompt builder:
  ```typescript
  function buildStudentPrompt(analytics: any): string {
    return `
      You are an educational AI assistant providing personalized feedback to a student.

      Student Performance Summary:
      - Overall Score: ${analytics.score.toFixed(1)}% (${analytics.correctAnswers}/${analytics.totalQuestions} correct)
      - Bloom's Taxonomy Performance:
        * Level 1 (Remember): ${analytics.bloomBreakdown[1].correct}/${analytics.bloomBreakdown[1].attempted} correct (${analytics.bloomBreakdown[1].percentage.toFixed(0)}%)
        * Level 2 (Understand): ${analytics.bloomBreakdown[2].correct}/${analytics.bloomBreakdown[2].attempted} correct (${analytics.bloomBreakdown[2].percentage.toFixed(0)}%)
        * Level 3 (Apply): ${analytics.bloomBreakdown[3].correct}/${analytics.bloomBreakdown[3].attempted} correct (${analytics.bloomBreakdown[3].percentage.toFixed(0)}%)
      - Difficulty Performance:
        * Easy: ${analytics.difficultyBreakdown.easy.correct}/${analytics.difficultyBreakdown.easy.attempted} correct
        * Medium: ${analytics.difficultyBreakdown.medium.correct}/${analytics.difficultyBreakdown.medium.attempted} correct
        * Hard: ${analytics.difficultyBreakdown.hard.correct}/${analytics.difficultyBreakdown.hard.attempted} correct
      - Average time per question: ${analytics.avgTimePerQuestion.toFixed(0)} seconds
      - Concepts needing improvement: ${analytics.flaggedConcepts.join(', ') || 'None'}

      Generate a concise (3-4 sentences), encouraging, and actionable performance summary for this student. Focus on:
      1. Overall performance
      2. Specific strengths
      3. Areas for improvement
      4. One concrete next step

      Do not use bullet points. Write in a friendly, supportive tone.
    `;
  }
  ```
- [ ] Call Hugging Face API with prompt
- [ ] Store result in analytics document

**Acceptance Criteria:**
- [ ] Prompt includes all relevant metrics
- [ ] Generated text is encouraging and actionable
- [ ] Stored in Firestore analytics collection

---

#### Story: AI-001-4 - Create generateAnalytics Cloud Function
**Priority:** Critical  
**Story Points:** 8  
**Description:** Teacher-triggered function to process all students

**Tasks:**
- [ ] Create callable function:
  ```typescript
  export const generateAnalytics = functions.https.onCall(async (data, context) => {
    const { assessmentId, classroomId } = data;

    // Fetch all sessions for this assessment
    const sessionsSnapshot = await db
      .collection(`classrooms/${classroomId}/assessments/${assessmentId}/sessions`)
      .where('status', '==', 'submitted')
      .get();

    const sessions = sessionsSnapshot.docs;

    // Process each student
    for (const sessionDoc of sessions) {
      const session = sessionDoc.data();
      
      // Compute analytics
      const analytics = await computeStudentAnalytics(sessionDoc.id);
      
      // Generate AI insights
      const prompt = buildStudentPrompt(analytics);
      const aiInsights = await callHuggingFaceAPI(prompt);

      // Store in analytics collection
      await db.doc(`analytics/students/${session.studentId}/assessments/${assessmentId}`).set({
        ...analytics,
        studentId: session.studentId,
        assessmentId: assessmentId,
        classroomId: classroomId,
        aiInsights: aiInsights,
        generatedAt: admin.firestore.Timestamp.now()
      });
    }

    // Compute class-wide analytics
    const classAnalytics = await computeClassAnalytics(sessions);
    const classSummary = await callHuggingFaceAPI(buildClassPrompt(classAnalytics));

    await db.doc(`analytics/classrooms/${classroomId}/assessments/${assessmentId}`).set({
      ...classAnalytics,
      aiSummary: classSummary,
      generatedAt: admin.firestore.Timestamp.now()
    });

    return { success: true, studentsProcessed: sessions.length };
  });
  ```

**Acceptance Criteria:**
- [ ] Function processes all submitted sessions
- [ ] Student analytics generated and stored
- [ ] Class analytics aggregated and stored
- [ ] AI insights generated for both levels

---

#### Story: AI-001-5 - Implement Class Analytics Computation
**Priority:** High  
**Story Points:** 5  
**Description:** Aggregate metrics across all students

**Tasks:**
- [ ] Create helper function:
  ```typescript
  async function computeClassAnalytics(sessions: any[]) {
    const totalStudents = sessions.length;
    let completedStudents = 0;
    let totalScore = 0;
    const distribution = { '90-100': 0, '80-89': 0, '70-79': 0, 'below70': 0 };
    const conceptScores: any = {};

    for (const sessionDoc of sessions) {
      const analytics = await computeStudentAnalytics(sessionDoc.id);
      
      completedStudents++;
      totalScore += analytics.score;

      // Distribution
      if (analytics.score >= 90) distribution['90-100']++;
      else if (analytics.score >= 80) distribution['80-89']++;
      else if (analytics.score >= 70) distribution['70-79']++;
      else distribution['below70']++;

      // Concept mastery
      // Aggregate concept performance across students
    }

    const avgScore = totalScore / completedStudents;

    return {
      totalStudents,
      completedStudents,
      avgScore,
      distribution,
      conceptMastery: conceptScores,
      avgTimeSpent: 0 // Compute from sessions
    };
  }

  function buildClassPrompt(classAnalytics: any): string {
    return `
      You are an educational AI assistant providing insights to a teacher about their class performance.

      Class Performance Summary:
      - Total Students: ${classAnalytics.totalStudents}
      - Average Score: ${classAnalytics.avgScore.toFixed(1)}%
      - Score Distribution:
        * 90-100%: ${classAnalytics.distribution['90-100']} students
        * 80-89%: ${classAnalytics.distribution['80-89']} students
        * 70-79%: ${classAnalytics.distribution['70-79']} students
        * Below 70%: ${classAnalytics.distribution['below70']} students

      Generate a concise (4-5 sentences) class performance summary for the teacher. Include:
      1. Overall class performance
      2. Notable trends or patterns
      3. Suggestions for teaching adjustments
      4. Concepts that need re-teaching (if any)

      Write in a professional, actionable tone.
    `;
  }
  ```

**Acceptance Criteria:**
- [ ] Class metrics aggregated correctly
- [ ] Distribution calculated accurately
- [ ] AI summary generated for teacher
- [ ] Stored in class analytics collection

---

## **PHASE 7: Analytics Visualization** ⏱️ 2-3 hours

### Epic: VIZ-001 - Student Analytics Pages

#### Story: VIZ-001-1 - Create Student Analytics Page
**Priority:** High  
**Story Points:** 8  
**Description:** Build student-facing analytics dashboard

**Tasks:**
- [ ] Create `src/pages/StudentAnalyticsPage.tsx`
- [ ] Fetch analytics from Firestore:
  ```typescript
  const [analytics, setAnalytics] = useState<StudentAnalytics | null>(null);

  useEffect(() => {
    const fetchAnalytics = async () => {
      const analyticsDoc = await getDoc(
        doc(db, `analytics/students/${currentUser!.uid}/assessments/${assessmentId}`)
      );
      
      if (analyticsDoc.exists()) {
        setAnalytics(analyticsDoc.data() as StudentAnalytics);
      }
    };

    fetchAnalytics();
  }, [assessmentId]);
  ```
- [ ] Create layout with cards:
  - Score card (large, prominent)
  - Bloom breakdown (bar chart using Recharts)
  - Difficulty performance (pie chart)
  - Time heatmap (bar chart)
  - AI insights card (text)
  - Flagged concepts (list)

**Acceptance Criteria:**
- [ ] Analytics load from Firestore
- [ ] All charts render correctly with existing theme
- [ ] AI insights displayed prominently
- [ ] Layout responsive

---

#### Story: VIZ-001-2 - Build Bloom Breakdown Chart
**Priority:** Medium  
**Story Points:** 3  
**Description:** Visualize performance across Bloom levels

**Tasks:**
- [ ] Create `src/components/BloomBreakdownChart.tsx`
- [ ] Use Recharts BarChart:
  ```typescript
  const data = [
    { level: 'Remember (L1)', percentage: analytics.bloomBreakdown[1].percentage },
    { level: 'Understand (L2)', percentage: analytics.bloomBreakdown[2].percentage },
    { level: 'Apply (L3)', percentage: analytics.bloomBreakdown[3].percentage }
  ];

  <ResponsiveContainer width="100%" height={300}>
    <BarChart data={data}>
      <CartesianGrid strokeDasharray="3 3" stroke="#A47C48" opacity={0.3} />
      <XAxis dataKey="level" stroke="#4B2E05" />
      <YAxis stroke="#4B2E05" domain={[0, 100]} />
      <Tooltip 
        contentStyle={{ 
          backgroundColor: '#F5E8C7', 
          border: '2px solid #A47C48' 
        }} 
      />
      <Bar dataKey="percentage" fill="#A47C48" radius={[4, 4, 0, 0]} />
    </BarChart>
  </ResponsiveContainer>
  ```

**Acceptance Criteria:**
- [ ] Chart displays Bloom levels on X-axis
- [ ] Percentage correct on Y-axis
- [ ] Matches existing brown/beige theme
- [ ] Responsive and readable

---

#### Story: VIZ-001-3 - Create AI Insights Card
**Priority:** High  
**Story Points:** 2  
**Description:** Display LLM-generated insights prominently

**Tasks:**
- [ ] Create `src/components/AIInsightsCard.tsx`
- [ ] Style as prominent card:
  ```typescript
  <div className="ai-insights-card">
    <div className="card-header">
      <h3>📊 Your Performance Insights</h3>
      <span className="ai-badge">AI-Generated</span>
    </div>
    <p className="insights-text">{analytics.aiInsights}</p>
  </div>
  ```
- [ ] Add CSS for special styling (e.g., gradient border)

**Acceptance Criteria:**
- [ ] Insights text displayed clearly
- [ ] AI badge visible
- [ ] Card stands out visually

---

### Epic: VIZ-002 - Teacher Analytics Pages

#### Story: VIZ-002-1 - Create Class Analytics Page
**Priority:** High  
**Story Points:** 8  
**Description:** Build teacher-facing class analytics dashboard

**Tasks:**
- [ ] Create `src/pages/ClassAnalyticsPage.tsx`
- [ ] Fetch class analytics from Firestore
- [ ] Layout with sections:
  - Class average score (large card)
  - Score distribution (bar chart)
  - Concept mastery table
  - AI summary (prominent card)
  - Top performers (list)
  - Students needing help (list)

**Acceptance Criteria:**
- [ ] Class analytics load correctly
- [ ] Charts display distribution accurately
- [ ] AI summary visible to teacher
- [ ] Actionable insights highlighted

---

#### Story: VIZ-002-2 - Add "Generate Analysis" Button
**Priority:** Critical  
**Story Points:** 3  
**Description:** Teacher can trigger analytics generation

**Tasks:**
- [ ] In classroom assessment view, add button:
  ```typescript
  const handleGenerateAnalytics = async () => {
    setLoading(true);
    try {
      const generateFn = httpsCallable(functions, 'generateAnalytics');
      await generateFn({ assessmentId, classroomId });
      
      // Show success notification
      alert('Analytics generated! Students can now view their results.');
    } catch (error) {
      console.error('Error generating analytics:', error);
      alert('Failed to generate analytics');
    } finally {
      setLoading(false);
    }
  };

  <button 
    className="btn btn-primary"
    onClick={handleGenerateAnalytics}
    disabled={loading}
  >
    {loading ? 'Generating...' : '🤖 Generate AI Analysis'}
  </button>
  ```
- [ ] Show loading spinner during generation (20-30s)

**Acceptance Criteria:**
- [ ] Button calls Cloud Function
- [ ] Loading state shown during processing
- [ ] Success message after completion
- [ ] Analytics immediately available

---

## **PHASE 8: Polish & Testing** ⏱️ 2-3 hours

### Epic: POL-001 - UI/UX Improvements

#### Story: POL-001-1 - Add Loading States
**Priority:** Medium  
**Story Points:** 2  
**Description:** Implement loading spinners for async operations

**Tasks:**
- [ ] Create `src/components/LoadingSpinner.tsx`
- [ ] Add to all pages with Firestore queries
- [ ] Use existing brown/beige colors

**Acceptance Criteria:**
- [ ] Loading spinners appear during data fetch
- [ ] Spinners styled with existing theme
- [ ] No flickering on fast loads

---

#### Story: POL-001-2 - Add Error Handling
**Priority:** High  
**Story Points:** 3  
**Description:** Graceful error states for failed operations

**Tasks:**
- [ ] Create `src/components/ErrorMessage.tsx`
- [ ] Wrap try-catch around all Firebase operations
- [ ] Display user-friendly error messages

**Acceptance Criteria:**
- [ ] Errors don't crash the app
- [ ] Users see helpful error messages
- [ ] Errors logged to console for debugging

---

#### Story: POL-001-3 - Add Toast Notifications
**Priority:** Medium  
**Story Points:** 3  
**Description:** Success/error feedback for user actions

**Tasks:**
- [ ] Install `react-toastify` or create custom toast
- [ ] Add notifications for:
  - Classroom created
  - Classroom joined
  - Assessment published
  - Answer saved
  - Assessment submitted
  - Analytics generated

**Acceptance Criteria:**
- [ ] Toasts appear on successful actions
- [ ] Styled with existing theme
- [ ] Auto-dismiss after 3 seconds

---

### Epic: POL-002 - Testing & Bug Fixes

#### Story: POL-002-1 - Manual Testing Checklist
**Priority:** Critical  
**Story Points:** 5  
**Description:** Complete end-to-end testing

**Test Scenarios:**
1. **Teacher Flow:**
   - [ ] Sign in with Google
   - [ ] Create classroom
   - [ ] Copy classroom code
   - [ ] Create assessment with 15 questions (5 easy, 5 medium, 5 hard across Bloom 1-3)
   - [ ] Publish assessment
   - [ ] Verify assessment appears in classroom

2. **Student Flow:**
   - [ ] Sign in with Google
   - [ ] Join classroom using code
   - [ ] Start assessment
   - [ ] Answer questions (mix of correct/incorrect, fast/slow)
   - [ ] Mark questions for review
   - [ ] Jump to different questions via grid
   - [ ] Submit assessment
   - [ ] Verify submission recorded

3. **Adaptive Logic:**
   - [ ] Answer easy question correctly in <30s → Verify medium question next
   - [ ] Answer hard question incorrectly → Verify medium question next
   - [ ] Answer medium question correctly in >60s → Verify another medium question next

4. **Analytics:**
   - [ ] Teacher clicks "Generate Analysis"
   - [ ] Wait for completion (20-30s)
   - [ ] Verify student can see analytics
   - [ ] Verify teacher can see class analytics
   - [ ] Verify AI insights generated

**Acceptance Criteria:**
- [ ] All scenarios pass without errors
- [ ] Adaptive logic works as designed
- [ ] Analytics accurate
- [ ] No data loss or corruption

---

#### Story: POL-002-2 - Fix Critical Bugs
**Priority:** Critical  
**Story Points:** 5  
**Description:** Address any blocking issues found in testing

**Common Issues to Check:**
- [ ] Timer not starting
- [ ] Questions not loading
- [ ] Responses not saving
- [ ] Next question not appearing
- [ ] Analytics not generating
- [ ] Session not ending properly

**Acceptance Criteria:**
- [ ] All critical bugs resolved
- [ ] Retested scenarios pass

---

## **PHASE 9: Deployment** ⏱️ 1 hour

### Epic: DEP-001 - Production Deployment

#### Story: DEP-001-1 - Build Production Bundle
**Priority:** Critical  
**Story Points:** 1  
**Description:** Optimize and build for production

**Tasks:**
- [ ] Run: `npm run build`
- [ ] Verify no build errors
- [ ] Test production build locally:
  ```bash
  npx serve -s build
  ```

**Acceptance Criteria:**
- [ ] Build succeeds without errors
- [ ] No console warnings
- [ ] App functions correctly in production mode

---

#### Story: DEP-001-2 - Deploy to Firebase Hosting
**Priority:** Critical  
**Story Points:** 1  
**Description:** Deploy frontend to Firebase Hosting

**Tasks:**
- [ ] Configure `firebase.json`:
  ```json
  {
    "hosting": {
      "public": "build",
      "ignore": ["firebase.json", "**/.*", "**/node_modules/**"],
      "rewrites": [
        {
          "source": "**",
          "destination": "/index.html"
        }
      ]
    }
  }
  ```
- [ ] Deploy:
  ```bash
  firebase deploy --only hosting
  ```
- [ ] Test deployed URL

**Acceptance Criteria:**
- [ ] App deployed to Firebase Hosting
- [ ] URL accessible publicly
- [ ] All features work in deployed version

---

#### Story: DEP-001-3 - Deploy Cloud Functions
**Priority:** Critical  
**Story Points:** 1  
**Description:** Deploy serverless functions to Firebase

**Tasks:**
- [ ] Deploy functions:
  ```bash
  firebase deploy --only functions
  ```
- [ ] Verify functions appear in Firebase Console
- [ ] Test Cloud Functions from deployed app

**Acceptance Criteria:**
- [ ] Functions deployed successfully
- [ ] Functions callable from frontend
- [ ] No errors in function logs

---

## 📝 Demo Script for Hackathon Judges

### Setup (Before Demo)
1. Have 2 browser windows open:
   - Window 1: Teacher account (your email)
   - Window 2: Student account (test email)
2. Pre-create a classroom with assessment containing 10 questions (for quick demo)

### Demo Flow (5-7 minutes)

**Part 1: Teacher Creates Assessment (2 mins)**
1. "I'm a teacher starting my day. Let me create a classroom for my Math class."
2. Click "Create Classroom" → Fill in "Advanced Algebra" → Show generated code "A7X9K2"
3. "Now I'll create an adaptive assessment with questions across difficulty levels."
4. Show question creation interface → Add 2-3 questions with different Bloom levels and difficulties
5. Click "Publish" → "Assessment is now live for all students."

**Part 2: Student Takes Adaptive Exam (3 mins)**
1. Switch to student window
2. "As a student, I'll join this class using the code."
3. Enter code → Show classroom appears
4. Click "Start Assessment"
5. **Demonstrate Adaptive Logic:**
   - Answer Question 1 (Easy) correctly in 10 seconds → "Notice I get a Medium question next"
   - Answer Question 2 (Medium) incorrectly → "Now I get an Easy question because I struggled"
   - Answer Question 3 (Easy) correctly but slowly (wait 70 seconds) → "I get another Easy question to solidify understanding"
6. Show question grid sidebar → "I can mark questions for review and jump around"
7. Click "Submit Assessment"

**Part 3: AI Analytics (2 mins)**
1. Switch to teacher window
2. "Now I'll generate AI-powered insights for the class."
3. Click "Generate Analysis" → Show loading (20-30s) → Can talk about backend during wait
4. Once complete, show teacher analytics:
   - Class average
   - Score distribution
   - AI summary: "The AI identified that students struggled with application-level questions..."
5. Switch to student window
6. Show student analytics:
   - Personal score
   - Bloom breakdown chart
   - AI insights: "You excelled at recall questions but need more practice with multi-step problems..."

**Closing:**
"Our platform uses real-time adaptive algorithms to personalize assessments and AI to generate actionable insights, helping both teachers and students focus on what matters most."

---

## 🎓 Technical Highlights for Jury

**Key Innovations:**
1. **Adaptive Question Selection:** Real-time difficulty adjustment based on correctness + response time
2. **Bloom's Taxonomy Integration:** Tracks cognitive skill development
3. **Serverless Architecture:** Scalable Cloud Functions for adaptive logic
4. **AI-Powered Insights:** Hugging Face LLMs generate personalized feedback
5. **Real-time Sync:** Firebase Firestore listeners for instant updates
6. **Free Tier Only:** Entire solution runs on Firebase Spark plan + free Hugging Face API

**Tech Stack:**
- Frontend: React 19.2 + TypeScript
- Backend: Firebase (Auth, Firestore, Functions, Hosting)
- AI: Hugging Face Inference API (Mistral-7B-Instruct)
- Charts: Recharts
- Styling: Custom CSS (brown/beige theme)

---

## 🚀 Quick Start Commands

```bash
# Clone repo
git clone <repo-url>
cd ED_08-main

# Install dependencies
npm install

# Setup Firebase
firebase login
firebase init
# Select: Authentication, Firestore, Functions, Hosting, Emulators

# Start development
npm start

# Run emulators (in separate terminal)
firebase emulators:start

# Deploy
npm run build
firebase deploy
```

---

## 📊 Success Metrics

**MVP Complete When:**
- [ ] Teacher can create classroom and assessment
- [ ] Student can join classroom and take exam
- [ ] Adaptive algorithm adjusts questions correctly
- [ ] AI analytics generated for both teacher and student
- [ ] Deployed to Firebase Hosting with working URL

**Bonus Features (If Time Permits):**
- [ ] Email notifications when assessment published
- [ ] Export class analytics to CSV
- [ ] Dark mode toggle
- [ ] Mobile responsive optimization

---

## ⚠️ Known Limitations (MVP)

1. **Question Pool Size:** Requires minimum 30 questions for optimal adaptation
2. **AI Response Time:** 20-30 seconds for analytics generation
3. **Hugging Face Rate Limits:** Free tier has 1000 requests/day limit
4. **No PDF Upload:** Questions must be entered manually (for MVP)
5. **Single Assessment at a Time:** Students can only take one exam at a time
6. **No Proctoring:** Trust-based system (no webcam monitoring)

---

## 🔒 Security Considerations

**Firestore Security Rules:**
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Users
    match /users/{userId} {
      allow read: if request.auth != null;
      allow write: if request.auth.uid == userId;
    }
    
    // Classrooms
    match /classrooms/{classroomId} {
      allow read: if request.auth != null;
      allow create: if request.auth != null;
      allow update, delete: if resource.data.teacherId == request.auth.uid;
      
      // Assessments
      match /assessments/{assessmentId} {
        allow read: if request.auth != null;
        allow write: if get(/databases/$(database)/documents/classrooms/$(classroomId)).data.teacherId == request.auth.uid;
        
        // Sessions
        match /sessions/{sessionId} {
          allow read: if request.auth.uid == resource.data.studentId || 
                         get(/databases/$(database)/documents/classrooms/$(classroomId)).data.teacherId == request.auth.uid;
          allow create: if request.auth.uid == request.resource.data.studentId;
          allow update: if request.auth.uid == resource.data.studentId;
          
          // Responses
          match /responses/{responseId} {
            allow read, write: if request.auth.uid == get(/databases/$(database)/documents/classrooms/$(classroomId)/assessments/$(assessmentId)/sessions/$(sessionId)).data.studentId;
          }
        }
      }
    }
    
    // Analytics
    match /analytics/students/{studentId}/assessments/{assessmentId} {
      allow read: if request.auth.uid == studentId;
      allow write: if false; // Only Cloud Functions can write
    }
    
    match /analytics/classrooms/{classroomId}/assessments/{assessmentId} {
      allow read: if get(/databases/$(database)/documents/classrooms/$(classroomId)).data.teacherId == request.auth.uid;
      allow write: if false; // Only Cloud Functions can write
    }
  }
}
```

---

## 📚 Resources & Documentation

**Firebase:**
- [Firebase Console](https://console.firebase.google.com/)
- [Firestore Documentation](https://firebase.google.com/docs/firestore)
- [Cloud Functions Guide](https://firebase.google.com/docs/functions)

**Hugging Face:**
- [Inference API Docs](https://huggingface.co/docs/api-inference/index)
- [Mistral-7B Model](https://huggingface.co/mistralai/Mistral-7B-Instruct-v0.2)

**React:**
- [React Documentation](https://react.dev/)
- [Recharts Examples](https://recharts.org/en-US/examples)

---

## ✅ Final Checklist Before Submission

**Code Quality:**
- [ ] No console errors
- [ ] All TypeScript types defined
- [ ] Comments on complex logic
- [ ] .gitignore includes .env

**Functionality:**
- [ ] Authentication works
- [ ] Classroom creation/joining works
- [ ] Assessment creation/publishing works
- [ ] Adaptive exam interface works
- [ ] AI analytics generation works
- [ ] All charts render correctly

**Deployment:**
- [ ] Frontend deployed to Firebase Hosting
- [ ] Cloud Functions deployed
- [ ] Public URL accessible
- [ ] Demo script rehearsed

**Documentation:**
- [ ] README.md updated with setup instructions
- [ ] Environment variables documented
- [ ] Known issues documented

---

## 🎉 Congratulations!

You've successfully built an AI-powered adaptive assessment platform from scratch! This PRD provided a complete roadmap from initial Firebase setup to production deployment.

**Key Achievements:**
✅ Real-time adaptive question selection  
✅ Bloom's Taxonomy integration  
✅ AI-powered analytics with Hugging Face  
✅ Scalable serverless architecture  
✅ Beautiful, responsive UI  
✅ Deployed on free tier

**Next Steps After Hackathon:**
- Add more question types (Multiple Select, Fill-in-the-Blank)
- Implement PDF upload for bulk question import
- Add email notifications
- Mobile app (React Native)
- Advanced analytics (learning curves, retention metrics)

Good luck with your demo! 🚀
