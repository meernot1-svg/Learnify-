export type UserRole = 'Mentor' | 'Student';
export type Subject = 'computer' | 'physics' | 'biology' | 'chemistry';
export type MaterialType = 'video' | 'book' | 'pdf';

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  username: string;
  fullName: string;
  fatherName?: string;
  phone?: string;
  address?: string;
  role: UserRole;
  achievements: string[];
  createdAt: any;
  level?: number;
  points?: number;
}

export interface Material {
  id: string;
  title: string;
  description: string;
  subject: Subject;
  type: MaterialType;
  url: string;
  mentorId: string;
  createdAt: any;
  isPrioritized?: boolean;
}

export interface Course {
  id: string;
  title: string;
  description: string;
  subject: Subject;
  mentorId: string;
  materialIds: string[];
  createdAt: any;
  isPrioritized?: boolean;
}

export interface Progress {
  id: string;
  userId: string;
  materialId: string;
  status: 'completed';
  updatedAt: any;
}

export interface StudyReminder {
  id: string;
  userId: string;
  subject: Subject | string;
  topic: string;
  time: any;
  isNotified: boolean;
  createdAt: any;
}

export type LabSubject = 'chemistry' | 'physics' | 'biology';

export interface QuizQuestionItem {
  question: string;
  options: string[];
  correctIndex: number;
  selectedIndex?: number;
  explanation?: string;
}

export interface SavedQuiz {
  id: string;
  userId: string;
  title: string;
  subject: string;
  questions: QuizQuestionItem[];
  score: number;
  totalQuestions: number;
  timeSpentSeconds: number;
  isExamMode: boolean;
  notes: string;
  createdAt: any;
  updatedAt: any;
}

export interface CreateSavedQuizInput {
  title: string;
  subject?: string;
  questions: QuizQuestionItem[];
  score: number;
  totalQuestions?: number;
  timeSpentSeconds?: number;
  isExamMode?: boolean;
  notes?: string;
}

export interface UpdateSavedQuizInput {
  title?: string;
  subject?: string;
  notes?: string;
  score?: number;
  timeSpentSeconds?: number;
  questions?: QuizQuestionItem[];
}

export interface LabResult {
  id: string;
  userId: string;
  experimentTitle: string;
  subject: LabSubject;
  outcome: string;
  formula: string;
  measurements: string;
  notes: string;
  createdAt: any;
  updatedAt: any;
}

export interface CreateLabResultInput {
  experimentTitle: string;
  subject: LabSubject;
  outcome: string;
  formula?: string;
  measurements?: string;
  notes?: string;
}

export interface UpdateLabResultInput {
  experimentTitle?: string;
  subject?: LabSubject;
  outcome?: string;
  formula?: string;
  measurements?: string;
  notes?: string;
}

