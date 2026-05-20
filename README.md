# ATL Nexus

A production-quality web application for IB Diploma Programme students to track, reflect on, and demonstrate growth in Approaches to Learning (ATL) skills.

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 19 + Vite 8 |
| Styling | TailwindCSS 3 |
| Auth | Firebase Authentication (Google) |
| Database | Firestore |
| Charts | Recharts |
| Animation | Framer Motion |
| Routing | React Router v6 |
| Deployment | Vercel |

## Project Structure

```
atl-nexus/
├── src/
│   ├── components/
│   │   ├── charts/         # Radar, Bar, Line, Circular chart components
│   │   ├── layout/         # Sidebar, PageLayout
│   │   └── ui/             # Button, Card, Badge, Input, Modal, LoadingSpinner
│   ├── contexts/
│   │   └── AuthContext.jsx # Firebase auth state + user role
│   ├── firebase/
│   │   ├── config.js       # Firebase app initialisation
│   │   ├── auth.js         # Sign-in, sign-out, user document helpers
│   │   ├── firestore.js    # All Firestore queries and subscriptions
│   │   └── seed.js         # Demo data seeder
│   ├── hooks/
│   │   ├── useATLEntries.js  # Firestore real-time subscriptions
│   │   └── useAnalytics.js   # Score calculations and chart data derivation
│   ├── pages/
│   │   ├── Landing.jsx
│   │   ├── Login.jsx
│   │   ├── StudentDashboard.jsx
│   │   ├── TeacherDashboard.jsx
│   │   ├── ReflectionEntry.jsx
│   │   ├── Analytics.jsx
│   │   ├── ApprovalReview.jsx
│   │   └── StudentsPage.jsx
│   └── utils/
│       ├── atlFramework.js   # ATL categories, substrands, scoring constants
│       └── helpers.js        # Date formatting, groupBy, cn(), etc.
├── firestore.rules           # Firestore security rules
├── vercel.json               # SPA rewrite rules + security headers
└── .env.example              # Environment variable template
```

## Getting Started

### 1. Clone and install

```bash
git clone <your-repo-url>
cd atl-nexus
npm install
```

### 2. Create a Firebase project

1. Go to [console.firebase.google.com](https://console.firebase.google.com)
2. Create a new project
3. Enable **Authentication → Google** provider
4. Enable **Firestore Database** (start in production mode)
5. Go to **Project Settings → General** and copy your web app config

### 3. Configure environment variables

```bash
cp .env.example .env
```

Fill in your Firebase credentials in `.env`:

```env
VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_AUTH_DOMAIN=...
VITE_FIREBASE_PROJECT_ID=...
VITE_FIREBASE_STORAGE_BUCKET=...
VITE_FIREBASE_MESSAGING_SENDER_ID=...
VITE_FIREBASE_APP_ID=...
```

### 4. Deploy Firestore security rules

```bash
npm install -g firebase-tools
firebase login
firebase init firestore   # select your project, use existing firestore.rules
firebase deploy --only firestore:rules
```

### 5. Run locally

```bash
npm run dev
```

## User Roles

### Student
- Sign in with Google → automatically gets `role: "student"`
- Creates reflection entries across subjects
- Sees personal analytics and chart progression
- Views teacher feedback on entries

### Teacher
Teacher accounts must be manually promoted. After a teacher signs in once, run this in your browser console (or Firebase console):

```javascript
// In Firebase Console > Firestore > users collection
// Find the teacher's document and change role field to "teacher"
```

Or using the seed helper — call `seedDemoData(teacherUid)` from the browser console after importing `seed.js`.

## Seeding Demo Data

To populate the app with realistic sample data:

1. Open the app in your browser
2. Open the browser console
3. Run:

```javascript
import('/src/firebase/seed.js').then(m => m.seedDemoData('YOUR_TEACHER_UID'))
```

Replace `YOUR_TEACHER_UID` with the Firebase UID of the user you want to promote to teacher. This creates 3 demo students and 8 reflections across various ATL categories and approval states.

## ATL Framework

Categories and substrands implemented:

| Category | Substrands |
|---|---|
| Communication | Written, Oral & visual, Digital & media, Non-verbal, Reading & interpreting |
| Social | Collaboration, Leadership, Conflict resolution, Peer relationships, Group goals |
| Self-management | Organisation, Time management, Goal setting, Emotional regulation, Metacognition |
| Research | Information literacy, Media evaluation, Data collection, Citation, Synthesis |
| Thinking | Critical, Creative, Transfer, Problem-solving, Systems thinking |

## Scoring Model

| Self-assessment | Internal score |
|---|---|
| Emerging | 1 |
| Developing | 2 |
| Proficient | 3 |
| Advanced | 4 |

Only teacher-approved entries contribute to analytics. Teachers can override the student's self-assessment score during the approval process.

## Approval Workflow

```
Student submits entry (status: pending)
         ↓
Teacher reviews in /approvals
         ↓
    ┌────┴────┐
  Approve   Reject
    ↓          ↓
 Approved   Returned
 (counts    (student
 toward     revises)
 analytics)
```

## Deployment to Vercel

```bash
# Install Vercel CLI
npm install -g vercel

# Deploy
vercel

# Set environment variables in Vercel dashboard or via CLI:
vercel env add VITE_FIREBASE_API_KEY
# ... repeat for all env vars
```

The `vercel.json` file handles SPA routing rewrites and adds security headers automatically.

## Environment Variable Security

- Never commit `.env` to version control (it's in `.gitignore`)
- `VITE_` prefix exposes variables to the browser — this is intentional for Firebase config (Firebase API keys are safe to expose; security is enforced by Firestore rules)
- Sensitive operations are protected by Firestore security rules, not by hiding the API key

## Firestore Data Model

### `users/{uid}`
```
uid, displayName, email, photoURL, role, createdAt, updatedAt
```

### `atl_entries/{entryId}`
```
studentId, studentName, subject, atlCategory, substrand,
reflection, selfAssessment, score, term,
approvalStatus, teacherFeedback, teacherScore,
createdAt, updatedAt, reviewedAt
```

## Future Roadmap

- Microsoft Authentication (Azure AD / Entra ID)
- Export to PDF report
- Class section management
- Parent view (read-only)
- Notification system for pending approvals
- Multi-school / multi-class support
