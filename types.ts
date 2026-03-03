
export enum UserRole {
  USER = 'USER',
  ADMIN = 'ADMIN'
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  createdAt: string;
}

export interface PredictionResponse {
  isAnimal: boolean;
  animalType: string;
  breedName: string;
  confidence: number;
  description: string;
  similarBreeds: string[];
  price: number;
  uses: string[];
  lifeExpectancy: string;
  dietRoutine: string;
  exercisePlan: string;
  smartSuggestions: string;
  imageQuality: {
    score: number;
    feedback: string;
  };
}

export interface ChatMessage {
  role: 'user' | 'model';
  text: string;
}

export interface HealthIssue {
  issue: string;
  severity: 'Low' | 'Medium' | 'High';
  description: string;
  recommendedAction: string;
}

export interface HealthAnalysisResponse {
  potentialIssues: HealthIssue[];
  summary: string;
  isHealthy: boolean;
}

export interface Reminder {
  id: string;
  userId: string;
  animalName: string;
  type: 'Vaccination' | 'Deworming' | 'Checkup' | 'Other';
  date: string;
  completed: boolean;
}

export interface CommunityPost {
  id: string;
  userId: string;
  userName: string;
  content: string;
  imageUrl?: string;
  timestamp: string;
  likes: number;
}

export interface VetLocation {
  id: string;
  name: string;
  address: string;
  distance: string;
  phone: string;
  rating: number;
}

export interface GovernmentScheme {
  id: string;
  title: string;
  description: string;
  link: string;
  eligibility: string;
}

export interface EmotionResult {
  emotion: string;
  stressLevel: 'Low' | 'Moderate' | 'High';
  explanation: string;
  recommendation: string;
}

export interface BreedResult extends PredictionResponse {
  id: string;
  userId: string;
  imageUrl: string;
  timestamp: string;
  healthAnalysis?: HealthAnalysisResponse;
  emotionAnalysis?: EmotionResult;
  isPurchased?: boolean;
}
