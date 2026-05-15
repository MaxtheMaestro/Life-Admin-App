export interface UserProfile {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  theme?: 'light' | 'dark' | 'system';
  createdAt: any;
}

export type TaskCategory = 
  | "ID/Passport" 
  | "Bills" 
  | "Employment" 
  | "Scholarships" 
  | "Assignments" 
  | "Car" 
  | "Health" 
  | "Government" 
  | "Personal" 
  | "Other";

export type TaskStatus = "pending" | "completed" | "archived";
export type TaskPriority = "low" | "medium" | "high";

export interface Subtask {
  title: string;
  completed: boolean;
}

export interface LifeTask {
  id?: string;
  title: string;
  description: string;
  category: TaskCategory;
  dueDate: any; // Firestore Timestamp
  status: TaskStatus;
  priority: TaskPriority;
  userId: string;
  subtasks: Subtask[];
  reminderAt?: any; // Firestore Timestamp for scheduled notification
  createdAt: any;
  updatedAt: any;
}

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
  }
}
