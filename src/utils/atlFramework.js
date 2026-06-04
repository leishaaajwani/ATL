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

export const SUBJECTS = [
  'English Literature',
  'English Language and Literature',
  'Theory of Knowledge',
  'German Ab Initio',
  'French Ab Initio',
  'Hindi B',
  'Spanish Ab Initio',
  'Spanish B',
  'French B',
  'Chemistry',
  'Computer Science',
  'Business Management',
  'Environmental Systems and Societies SL',
  'Digital Society',
  'Social and Cultural Anthropology HL',
  'Psychology',
  'Biology',
  'Economics',
  'Math AA',
  'Math AI',
  'Physics',
  'Global Politics',
  'Music',
  'Sports, Health and Exercise Science',
  'History',
  'Geography',
  'Visual Arts',
]

export const SUBJECT_TEACHERS = {
  'English Literature': ['JULIA ROBERTSON'],
  'English Language and Literature': ['SHELDON DIAS', 'RUCHI SINGH', 'SINDHU JOSEPH', 'RUMANA FIRDOSE AZEEZ', 'AARTI SETH', 'ANVITA ZUTSHI'],
  'Theory of Knowledge': ['RUMANA FIRDOSE AZEEZ', 'DIVYA RAJGARHIA', 'PALIYATH VINAYA VENUGOPAL', 'SRIVIDYA JAGATHRAKSHAGAN', 'BINITA JOSHI'],
  'German Ab Initio': ['SHIVANI MAHESHWARI'],
  'French Ab Initio': ['MOHAMED AIT ABDELLAH'],
  'Hindi B': ['PRITI SHEKHAWAT'],
  'Spanish Ab Initio': ['PRIYA GURNANI', 'SAHANA MITRA'],
  'Spanish B': ['SAHANA MITRA'],
  'French B': ['FATIMA POONAWALA'],
  'Chemistry': ['PALIYATH VINAYA VENUGOPAL', 'ANJANA NAINAN', 'SIMI SUDHEENDRAN'],
  'Computer Science': ['MALINI MURALI', 'KAMALPREET DHALIWAL'],
  'Business Management': ['ERIYAT LAKSHMI DEVI', 'NARAHARI SHASTRY VALSALAMARRY', 'RAJANI JOHN', 'SIBY'],
  'Environmental Systems and Societies SL': ['VANDANA MATHUR'],
  'Digital Society': ['RITESH DHANAK'],
  'Social and Cultural Anthropology HL': ['CHARLES MIRANDA'],
  'Psychology': ['SHILPA BALDEV KUMAR SHARMA', 'MARIA ARULDASS'],
  'Biology': ['PRASHANSA RAIZADA', 'SRIVIDYA JAGATHRAKSHAGAN'],
  'Economics': ['SRIVIDHYA SATHYAMURTHI', 'JOYDEEP CHATERJEE', 'SAGARIKA BANERJEE'],
  'Math AA': ['SHIBA SETHI JUNEJA', 'SHELY DAS', 'SHEHLA ABBASI', 'NARESH YALAVARTHI'],
  'Math AI': ['MAHEK AJWANI', 'GIRISH'],
  'Physics': ['SHRUTI TALWAR', 'HAFSA FAISAL', 'ANEESH VEETIL'],
  'Global Politics': ['TRAFFORD GREGGORY', 'HAWABIBI'],
  'Music': ['AXEL RODERICKS'],
  'Sports, Health and Exercise Science': ['KUSHAL SACHDEVA'],
  'History': ['AYOTI'],
  'Geography': ['RAJKUMAR'],
  'Visual Arts': ['MITHRA ASHRAT BHARUCHA'],
}

export const GRADES = ['DP1', 'DP2']

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
