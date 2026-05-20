/**
 * Demo seed data — run once via the browser console or a one-off script.
 * Import seedDemoData() and call it after confirming teacher uid.
 */
import { setDoc, doc, addDoc, collection, serverTimestamp, Timestamp } from 'firebase/firestore'
import { db } from './config'
import { SCORE_MAP, APPROVAL_STATUS } from '../utils/atlFramework'

const demoStudents = [
  { uid: 'demo-student-1', displayName: 'Amara Osei', email: 'amara@demo.atlnexus.io', role: 'student' },
  { uid: 'demo-student-2', displayName: 'Lucas Ferreira', email: 'lucas@demo.atlnexus.io', role: 'student' },
  { uid: 'demo-student-3', displayName: 'Priya Sharma', email: 'priya@demo.atlnexus.io', role: 'student' },
]

const demoEntries = [
  {
    studentId: 'demo-student-1',
    studentName: 'Amara Osei',
    subject: 'Economics',
    atlCategory: 'Thinking',
    substrand: 'Critical and analytical thinking',
    reflection: 'During our economics unit on market failure, I worked on breaking down complex arguments about externalities. I challenged my initial assumptions about government intervention and evaluated multiple perspectives before forming my own position.',
    selfAssessment: 'Proficient',
    term: 'Beginning',
    approvalStatus: APPROVAL_STATUS.APPROVED,
    teacherFeedback: 'Excellent critical analysis. Your ability to hold multiple perspectives simultaneously is developing well.',
    teacherScore: 3,
  },
  {
    studentId: 'demo-student-1',
    studentName: 'Amara Osei',
    subject: 'Mathematics',
    atlCategory: 'Self-management',
    substrand: 'Time management',
    reflection: 'I created a study schedule for the trigonometry unit and stuck to it for three weeks. I noticed that breaking revision into 25-minute blocks helped me retain information more effectively. I will apply this to future units.',
    selfAssessment: 'Developing',
    term: 'Middle',
    approvalStatus: APPROVAL_STATUS.APPROVED,
    teacherFeedback: 'Good reflection on your learning process. Keep tracking your productivity patterns.',
    teacherScore: 2,
  },
  {
    studentId: 'demo-student-1',
    studentName: 'Amara Osei',
    subject: 'English',
    atlCategory: 'Communication',
    substrand: 'Written communication',
    reflection: 'I revised my essay on "1984" three times, focusing on how Orwell uses language to construct power. Each revision improved the clarity of my argument. I asked my peer to review my thesis statement which led to a stronger central claim.',
    selfAssessment: 'Advanced',
    term: 'End',
    approvalStatus: APPROVAL_STATUS.APPROVED,
    teacherFeedback: 'Outstanding written work. The iterative revision process clearly paid off.',
    teacherScore: 4,
  },
  {
    studentId: 'demo-student-2',
    studentName: 'Lucas Ferreira',
    subject: 'Economics',
    atlCategory: 'Research',
    substrand: 'Information literacy',
    reflection: 'For our macroeconomics assignment I gathered data from the IMF, World Bank and OECD. I had to cross-reference multiple sources to verify the GDP figures and learnt to evaluate source credibility beyond just checking if a website looks official.',
    selfAssessment: 'Proficient',
    term: 'Beginning',
    approvalStatus: APPROVAL_STATUS.APPROVED,
    teacherFeedback: 'Solid research methodology. Remember to consider recency of data in future assignments.',
    teacherScore: 3,
  },
  {
    studentId: 'demo-student-2',
    studentName: 'Lucas Ferreira',
    subject: 'Mathematics',
    atlCategory: 'Thinking',
    substrand: 'Problem-solving strategies',
    reflection: 'When I got stuck on the calculus problem set, instead of asking for help immediately, I tried three different approaches. The second approach—drawing a diagram—helped me visualise the rate of change and eventually solve it independently.',
    selfAssessment: 'Developing',
    term: 'Middle',
    approvalStatus: APPROVAL_STATUS.PENDING,
    teacherFeedback: '',
    teacherScore: null,
  },
  {
    studentId: 'demo-student-3',
    studentName: 'Priya Sharma',
    subject: 'English',
    atlCategory: 'Social',
    substrand: 'Collaboration and teamwork',
    reflection: 'Our group literature circle had conflicting interpretations of "The Handmaid\'s Tale". I facilitated a structured discussion where everyone got to present their reading before we debated. This helped us reach a richer collective analysis.',
    selfAssessment: 'Advanced',
    term: 'Beginning',
    approvalStatus: APPROVAL_STATUS.APPROVED,
    teacherFeedback: 'Exemplary collaborative leadership. You created a safe space for genuine dialogue.',
    teacherScore: 4,
  },
  {
    studentId: 'demo-student-3',
    studentName: 'Priya Sharma',
    subject: 'Economics',
    atlCategory: 'Self-management',
    substrand: 'Goal setting and reflection',
    reflection: 'I set a target of improving my Economics Paper 1 score from a 4 to a 6. I mapped out the specific command terms I was struggling with and created practice questions. After six weeks I achieved a 5 and identified why I did not yet reach my target.',
    selfAssessment: 'Proficient',
    term: 'Middle',
    approvalStatus: APPROVAL_STATUS.APPROVED,
    teacherFeedback: 'Commendable self-regulation. Your target-setting process is becoming very systematic.',
    teacherScore: 3,
  },
  {
    studentId: 'demo-student-1',
    studentName: 'Amara Osei',
    subject: 'Economics',
    atlCategory: 'Research',
    substrand: 'Synthesis and analysis of sources',
    reflection: 'I pulled together six academic sources on inequality for my extended essay. Initially they seemed to contradict each other but I learned that the disagreements were about measurement methodology not the trend itself. Synthesising this improved my argument significantly.',
    selfAssessment: 'Developing',
    term: 'Middle',
    approvalStatus: APPROVAL_STATUS.PENDING,
    teacherFeedback: '',
    teacherScore: null,
  },
]

export async function seedDemoData(teacherUid) {
  console.log('Seeding demo data...')

  // Upsert demo students
  for (const student of demoStudents) {
    await setDoc(doc(db, 'users', student.uid), {
      ...student,
      photoURL: '',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    }, { merge: true })
  }

  // Add teacher role to current user if uid provided
  if (teacherUid) {
    await setDoc(doc(db, 'users', teacherUid), {
      role: 'teacher',
      updatedAt: serverTimestamp(),
    }, { merge: true })
  }

  // Seed entries with offset timestamps so they appear in a logical order
  for (let i = 0; i < demoEntries.length; i++) {
    const entry = demoEntries[i]
    const daysAgo = (demoEntries.length - i) * 5
    const ts = Timestamp.fromDate(new Date(Date.now() - daysAgo * 86400000))

    await addDoc(collection(db, 'atl_entries'), {
      ...entry,
      score: SCORE_MAP[entry.selfAssessment] ?? 1,
      createdAt: ts,
      updatedAt: ts,
      reviewedAt: entry.approvalStatus === APPROVAL_STATUS.APPROVED ? ts : null,
    })
  }

  console.log('Demo data seeded successfully.')
}
