export const ATL_CATEGORIES = {
  Communication: {
    label: 'Communication',
    color: '#6366f1',
    bg: '#eef2ff',
    substrands: [
      'Written communication',
      'Oral and visual communication',
      'Digital and media communication',
      'Non-verbal communication',
      'Reading and interpreting information',
    ],
  },
  Social: {
    label: 'Social',
    color: '#10b981',
    bg: '#ecfdf5',
    substrands: [
      'Collaboration and teamwork',
      'Leadership and initiative',
      'Conflict resolution and mediation',
      'Building peer relationships',
      'Contributing to group goals',
    ],
  },
  'Self-management': {
    label: 'Self-management',
    color: '#f59e0b',
    bg: '#fffbeb',
    substrands: [
      'Organisation and planning',
      'Time management',
      'Goal setting and reflection',
      'Emotional regulation and resilience',
      'Mindfulness and metacognition',
    ],
  },
  Research: {
    label: 'Research',
    color: '#3b82f6',
    bg: '#eff6ff',
    substrands: [
      'Information literacy',
      'Media and source evaluation',
      'Data collection and recording',
      'Citation and academic integrity',
      'Synthesis and analysis of sources',
    ],
  },
  Thinking: {
    label: 'Thinking',
    color: '#ec4899',
    bg: '#fdf2f8',
    substrands: [
      'Critical and analytical thinking',
      'Creative and divergent thinking',
      'Transfer of knowledge and skills',
      'Problem-solving strategies',
      'Systems thinking and evaluation',
    ],
  },
}

export const ATL_CATEGORY_KEYS = Object.keys(ATL_CATEGORIES)

export const ASSESSMENT_LEVELS = [
  { value: 'Emerging',   score: 1, color: '#f87171', bg: '#fef2f2', label: 'Emerging' },
  { value: 'Developing', score: 2, color: '#fb923c', bg: '#fff7ed', label: 'Developing' },
  { value: 'Proficient', score: 3, color: '#34d399', bg: '#ecfdf5', label: 'Proficient' },
  { value: 'Advanced',   score: 4, color: '#818cf8', bg: '#eef2ff', label: 'Advanced' },
]

export const SCORE_MAP = {
  Emerging:   1,
  Developing: 2,
  Proficient: 3,
  Advanced:   4,
}

export const SCORE_LABEL = {
  1: 'Emerging',
  2: 'Developing',
  3: 'Proficient',
  4: 'Advanced',
}

export const SUBJECTS = ['Economics', 'Mathematics', 'English']

export const TERMS = ['Beginning', 'Middle', 'End']

export const APPROVAL_STATUS = {
  PENDING:  'pending',
  APPROVED: 'approved',
  REJECTED: 'rejected',
}

export function getLevelStyle(level) {
  return ASSESSMENT_LEVELS.find(l => l.value === level) ?? ASSESSMENT_LEVELS[0]
}

export function getCategoryStyle(category) {
  return ATL_CATEGORIES[category] ?? { color: '#64748b', bg: '#f8fafc' }
}
