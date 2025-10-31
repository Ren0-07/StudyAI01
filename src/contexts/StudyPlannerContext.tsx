import React, { createContext, useContext, useReducer, useEffect, ReactNode } from 'react'
import { useAuth } from './AuthContext'
import { dataSyncService } from '@/services/dataSyncService'
import { safeStorage } from '@/utils/safeStorage'

// Types
export interface Task {
  id: string
  title: string
  description?: string
  completed: boolean
  priority: 'low' | 'medium' | 'high' | 'urgent'
  difficulty?: 'easy' | 'medium' | 'hard'
  subject?: string
  dueDate?: string
  dueTime?: string
  estimate?: string
  reminder?: string
  progress: number
  createdAt: string
  updatedAt: string
  pomodoroSessions: number
  flashcardsGenerated: boolean
  materialIds?: string[] // Materials attached to this task
  notes?: string // NEW: Editable notes attached to the task
  status?: 'pending' | 'in_progress' | 'completed' | 'missed' // NEW: Task status for workflow
}

export interface Flashcard {
  id: string
  taskId?: string
  question: string
  answer: string
  subject?: string
  difficulty: 'easy' | 'medium' | 'hard'
  lastReviewed?: string
  nextReview?: string
  reviewCount: number
  correctCount: number
  createdAt: string
}

export interface FlashcardDeck {
  id: string
  topic: string
  description?: string
  cards: Array<{
    question: string
    answer: string
  }>
  createdAt: string
  updatedAt: string
  lastStudied?: string
  studyProgress?: {
    totalReviews: number
    correctAnswers: number
    incorrectAnswers: number
  }
}

export interface PomodoroSession {
  id: string
  taskId?: string
  duration: number
  completed: boolean
  startTime: string
  endTime?: string
  type: 'work' | 'short-break' | 'long-break'
}

export interface ScheduleEvent {
  id: string
  title: string
  description?: string
  startTime: string
  endTime: string
  type: 'task' | 'study' | 'break' | 'other'
  taskId?: string
  color?: string
  status?: 'scheduled' | 'in_progress' | 'completed' | 'missed' // NEW: Event status tracking
  missedCount?: number // NEW: Number of times marked missed
  startedAt?: string // NEW: When user actually started
  completedAt?: string // NEW: When marked complete
}

export interface Material {
  id: string
  title: string
  description?: string
  subject?: string
  type: 'note' | 'pdf' | 'image' | 'document' | 'presentation' | 'link' | 'other'
  content?: string
  fileName?: string
  fileSize?: number
  filePath?: string // Path to file in Supabase Storage
  tags?: string[]
  taskIds?: string[] // Tasks this material is attached to
  createdAt: string
  updatedAt: string
}

export interface SessionNote {
  id: string
  studyEventId: string
  userId: string
  content: string
  createdAt: string
  updatedAt: string
}

export interface Reminder {
  id: string
  userId: string
  studyEventId: string
  scheduledTime: string
  reminderType: 'session_start' | 'before_10min' | 'before_30min' | 'daily_digest'
  sentAt?: string
  createdAt: string
  updatedAt: string
}

export interface UserStats {
  totalTasks: number
  completedTasks: number
  totalStudyTime: number
  currentStreak: number
  level: number
  xp: number
  xpToNextLevel: number
}

export interface AppSettings {
  profile: {
    displayName: string
    email: string
  }
  appearance: {
    theme: string
    language: string
  }
  studyPreferences: {
    dailyGoal: number
    pomodoroLength: number
    breakLength: number
    autoStartBreaks: boolean
    autoAdvanceEnabled?: boolean // NEW: Enable auto-start of next session
  }
  notifications: {
    studyReminders: boolean
    taskDeadlines: boolean
    achievements: boolean
    weeklyReport: boolean
    notificationsEnabled?: boolean // NEW: Enable browser notifications
    notificationSound?: boolean // NEW: Play sound with notifications
  }
}

interface StudyPlannerState {
  tasks: Task[]
  flashcards: Flashcard[]
  flashcardDecks: FlashcardDeck[]
  pomodoroSessions: PomodoroSession[]
  scheduleEvents: ScheduleEvent[]
  materials: Material[]
  userStats: UserStats
  settings: AppSettings
  currentPomodoroTask?: Task
  isLoading: boolean
  sessionNotes: SessionNote[] // NEW: Notes from study sessions
  reminders: Reminder[] // NEW: Scheduled reminders
  focusMode: {
    isOpen: boolean
    studyEventId?: string
    taskId?: string
  }
}

type StudyPlannerAction =
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'ADD_TASK'; payload: Task }
  | { type: 'UPDATE_TASK'; payload: Task }
  | { type: 'DELETE_TASK'; payload: string }
  | { type: 'TOGGLE_TASK'; payload: string }
  | { type: 'ADD_FLASHCARD'; payload: Flashcard }
  | { type: 'UPDATE_FLASHCARD'; payload: Flashcard }
  | { type: 'DELETE_FLASHCARD'; payload: string }
  | { type: 'ADD_FLASHCARD_DECK'; payload: FlashcardDeck }
  | { type: 'UPDATE_FLASHCARD_DECK'; payload: FlashcardDeck }
  | { type: 'DELETE_FLASHCARD_DECK'; payload: string }
  | { type: 'ADD_POMODORO_SESSION'; payload: PomodoroSession }
  | { type: 'UPDATE_POMODORO_SESSION'; payload: PomodoroSession }
  | { type: 'SET_CURRENT_POMODORO_TASK'; payload: Task | undefined }
  | { type: 'ADD_SCHEDULE_EVENT'; payload: ScheduleEvent }
  | { type: 'UPDATE_SCHEDULE_EVENT'; payload: ScheduleEvent }
  | { type: 'DELETE_SCHEDULE_EVENT'; payload: string }
  | { type: 'ADD_MATERIAL'; payload: Material }
  | { type: 'UPDATE_MATERIAL'; payload: Material }
  | { type: 'DELETE_MATERIAL'; payload: string }
  | { type: 'ATTACH_MATERIAL_TO_TASK'; payload: { materialId: string; taskId: string } }
  | { type: 'DETACH_MATERIAL_FROM_TASK'; payload: { materialId: string; taskId: string } }
  | { type: 'UPDATE_USER_STATS'; payload: Partial<UserStats> }
  | { type: 'UPDATE_SETTINGS'; payload: Partial<AppSettings> }
  | { type: 'LOAD_DATA'; payload: Partial<StudyPlannerState> }
  | { type: 'ADD_SESSION_NOTE'; payload: SessionNote }
  | { type: 'UPDATE_SESSION_NOTE'; payload: SessionNote }
  | { type: 'DELETE_SESSION_NOTE'; payload: string }
  | { type: 'ADD_REMINDER'; payload: Reminder }
  | { type: 'UPDATE_REMINDER'; payload: Reminder }
  | { type: 'DELETE_REMINDER'; payload: string }
  | { type: 'OPEN_FOCUS_MODE'; payload: { studyEventId: string; taskId?: string } }
  | { type: 'CLOSE_FOCUS_MODE' }

const initialState: StudyPlannerState = {
  tasks: [],
  flashcards: [],
  flashcardDecks: [],
  pomodoroSessions: [],
  scheduleEvents: [],
  materials: [],
  userStats: {
    totalTasks: 0,
    completedTasks: 0,
    totalStudyTime: 0,
    currentStreak: 0,
    level: 3,
    xp: 2300,
    xpToNextLevel: 700
  },
  settings: {
    profile: {
      displayName: 'John Doe',
      email: 'john.doe@example.com'
    },
    appearance: {
      theme: 'light',
      language: 'English'
    },
    studyPreferences: {
      dailyGoal: 4,
      pomodoroLength: 25,
      breakLength: 5,
      autoStartBreaks: true
    },
    notifications: {
      studyReminders: true,
      taskDeadlines: true,
      achievements: true,
      weeklyReport: false
    }
  },
  isLoading: false
}

function studyPlannerReducer(state: StudyPlannerState, action: StudyPlannerAction): StudyPlannerState {
  switch (action.type) {
    case 'SET_LOADING':
      return { ...state, isLoading: action.payload }

    case 'ADD_TASK':
      return {
        ...state,
        tasks: [action.payload, ...state.tasks],
        userStats: {
          ...state.userStats,
          totalTasks: state.userStats.totalTasks + 1
        }
      }

    case 'UPDATE_TASK':
      return {
        ...state,
        tasks: state.tasks.map(task =>
          task.id === action.payload.id ? action.payload : task
        )
      }

    case 'DELETE_TASK': {
      const taskToDelete = state.tasks.find(t => t.id === action.payload)
      return {
        ...state,
        tasks: state.tasks.filter(task => task.id !== action.payload),
        flashcards: state.flashcards.filter(card => card.taskId !== action.payload),
        materials: state.materials.map(material => ({
          ...material,
          taskIds: material.taskIds?.filter(id => id !== action.payload)
        })),
        userStats: {
          ...state.userStats,
          totalTasks: Math.max(0, state.userStats.totalTasks - 1),
          completedTasks: taskToDelete?.completed 
            ? Math.max(0, state.userStats.completedTasks - 1)
            : state.userStats.completedTasks
        }
      }
    }

    case 'TOGGLE_TASK': {
      const task = state.tasks.find(t => t.id === action.payload)
      if (!task) return state
      
      const updatedTask = { ...task, completed: !task.completed, updatedAt: new Date().toISOString() }
      const xpGain = !task.completed ? 20 : -20
      const newXp = Math.max(0, state.userStats.xp + xpGain)
      const newLevel = Math.floor(newXp / 100) + 1
      
      return {
        ...state,
        tasks: state.tasks.map(t => t.id === action.payload ? updatedTask : t),
        userStats: {
          ...state.userStats,
          completedTasks: !task.completed 
            ? state.userStats.completedTasks + 1
            : Math.max(0, state.userStats.completedTasks - 1),
          xp: newXp,
          level: newLevel,
          xpToNextLevel: (newLevel * 100) - newXp
        }
      }
    }

    case 'ADD_FLASHCARD':
      return {
        ...state,
        flashcards: [action.payload, ...state.flashcards]
      }

    case 'UPDATE_FLASHCARD':
      return {
        ...state,
        flashcards: state.flashcards.map(card =>
          card.id === action.payload.id ? action.payload : card
        )
      }

    case 'DELETE_FLASHCARD':
      return {
        ...state,
        flashcards: state.flashcards.filter(card => card.id !== action.payload)
      }

    case 'ADD_FLASHCARD_DECK':
      return {
        ...state,
        flashcardDecks: [action.payload, ...state.flashcardDecks]
      }

    case 'UPDATE_FLASHCARD_DECK':
      return {
        ...state,
        flashcardDecks: state.flashcardDecks.map(deck =>
          deck.id === action.payload.id ? action.payload : deck
        )
      }

    case 'DELETE_FLASHCARD_DECK':
      return {
        ...state,
        flashcardDecks: state.flashcardDecks.filter(deck => deck.id !== action.payload)
      }

    case 'ADD_POMODORO_SESSION':
      return {
        ...state,
        pomodoroSessions: [action.payload, ...state.pomodoroSessions],
        userStats: {
          ...state.userStats,
          totalStudyTime: state.userStats.totalStudyTime + (action.payload.completed ? action.payload.duration : 0)
        }
      }

    case 'UPDATE_POMODORO_SESSION':
      return {
        ...state,
        pomodoroSessions: state.pomodoroSessions.map(session =>
          session.id === action.payload.id ? action.payload : session
        )
      }

    case 'SET_CURRENT_POMODORO_TASK':
      return {
        ...state,
        currentPomodoroTask: action.payload
      }

    case 'ADD_SCHEDULE_EVENT':
      return {
        ...state,
        scheduleEvents: [action.payload, ...state.scheduleEvents]
      }

    case 'UPDATE_SCHEDULE_EVENT':
      return {
        ...state,
        scheduleEvents: state.scheduleEvents.map(event =>
          event.id === action.payload.id ? action.payload : event
        )
      }

    case 'DELETE_SCHEDULE_EVENT':
      return {
        ...state,
        scheduleEvents: state.scheduleEvents.filter(event => event.id !== action.payload)
      }

    case 'ADD_MATERIAL':
      return {
        ...state,
        materials: [action.payload, ...state.materials]
      }

    case 'UPDATE_MATERIAL':
      return {
        ...state,
        materials: state.materials.map(material =>
          material.id === action.payload.id ? action.payload : material
        )
      }

    case 'DELETE_MATERIAL':
      return {
        ...state,
        materials: state.materials.filter(material => material.id !== action.payload),
        tasks: state.tasks.map(task => ({
          ...task,
          materialIds: task.materialIds?.filter(id => id !== action.payload)
        }))
      }

    case 'ATTACH_MATERIAL_TO_TASK': {
      const { materialId, taskId } = action.payload
      return {
        ...state,
        materials: state.materials.map(material =>
          material.id === materialId
            ? {
                ...material,
                taskIds: material.taskIds
                  ? [...new Set([...material.taskIds, taskId])]
                  : [taskId]
              }
            : material
        ),
        tasks: state.tasks.map(task =>
          task.id === taskId
            ? {
                ...task,
                materialIds: task.materialIds
                  ? [...new Set([...task.materialIds, materialId])]
                  : [materialId]
              }
            : task
        )
      }
    }

    case 'DETACH_MATERIAL_FROM_TASK': {
      const { materialId, taskId } = action.payload
      return {
        ...state,
        materials: state.materials.map(material =>
          material.id === materialId
            ? {
                ...material,
                taskIds: material.taskIds?.filter(id => id !== taskId)
              }
            : material
        ),
        tasks: state.tasks.map(task =>
          task.id === taskId
            ? {
                ...task,
                materialIds: task.materialIds?.filter(id => id !== materialId)
              }
            : task
        )
      }
    }

    case 'UPDATE_USER_STATS':
      return {
        ...state,
        userStats: { ...state.userStats, ...action.payload }
      }

    case 'UPDATE_SETTINGS':
      return {
        ...state,
        settings: { ...state.settings, ...action.payload }
      }

    case 'LOAD_DATA':
      return { ...state, ...action.payload }

    default:
      return state
  }
}

interface StudyPlannerContextType {
  state: StudyPlannerState
  dispatch: React.Dispatch<StudyPlannerAction>
  // Task operations
  addTask: (taskData: Omit<Task, 'id' | 'createdAt' | 'updatedAt' | 'pomodoroSessions' | 'flashcardsGenerated'>) => string
  updateTask: (task: Task) => void
  deleteTask: (id: string) => void
  toggleTask: (id: string) => void
  // Flashcard operations
  addFlashcard: (flashcardData: Omit<Flashcard, 'id' | 'createdAt' | 'reviewCount' | 'correctCount'>) => void
  updateFlashcard: (flashcard: Flashcard) => void
  deleteFlashcard: (id: string) => void
  generateFlashcardsForTask: (taskId: string) => void
  importFlashcardsFromAI: (flashcardSet: any) => number | undefined
  importStudyNoteFromAI: (note: any) => boolean
  // Flashcard Deck operations
  addFlashcardDeck: (deckData: Omit<FlashcardDeck, 'id' | 'createdAt' | 'updatedAt'>) => string
  updateFlashcardDeck: (deck: FlashcardDeck) => void
  deleteFlashcardDeck: (id: string) => void
  getDeckById: (id: string) => FlashcardDeck | undefined
  // Pomodoro operations
  addPomodoroSession: (sessionData: Omit<PomodoroSession, 'id'>) => void
  updatePomodoroSession: (session: PomodoroSession) => void
  setCurrentPomodoroTask: (task: Task | undefined) => void
  // Schedule operations
  addScheduleEvent: (eventData: Omit<ScheduleEvent, 'id'>) => void
  updateScheduleEvent: (event: ScheduleEvent) => void
  deleteScheduleEvent: (id: string) => void
  // Material operations
  addMaterial: (materialData: Omit<Material, 'id' | 'createdAt' | 'updatedAt'>) => string
  updateMaterial: (material: Material) => void
  deleteMaterial: (id: string) => void
  attachMaterialToTask: (materialId: string, taskId: string) => void
  detachMaterialFromTask: (materialId: string, taskId: string) => void
  // Settings operations
  updateSettings: (settings: Partial<AppSettings>) => void
  // Utility functions
  getTaskById: (id: string) => Task | undefined
  getFlashcardsByTask: (taskId: string) => Flashcard[]
  getPomodoroSessionsByTask: (taskId: string) => PomodoroSession[]
  getMaterialsByTask: (taskId: string) => Material[]
}

const StudyPlannerContext = createContext<StudyPlannerContextType | undefined>(undefined)

export function StudyPlannerProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(studyPlannerReducer, initialState)
  const { user } = useAuth()

  // Load data from Supabase when user logs in
  useEffect(() => {
    if (user) {
      loadUserData()
    } else {
      // Clear data when user logs out
      dispatch({ type: 'LOAD_DATA', payload: initialState })
    }
  }, [user])

  const loadUserData = async () => {
    if (!user) return

    try {
      dispatch({ type: 'SET_LOADING', payload: true })
      
      // Initialize user data if this is a new user
      await dataSyncService.initializeUserData(user.id)
      
      // Fetch all user data from Supabase
      const userData = await dataSyncService.fetchAllUserData(user.id)
      
      dispatch({ type: 'LOAD_DATA', payload: userData })
    } catch (error) {
      console.error('Failed to load user data:', error)
      // Fallback to safeStorage if Supabase fails
      const savedData = await safeStorage.getItem('studyPlannerData')
      if (savedData) {
        dispatch({ type: 'LOAD_DATA', payload: savedData })
      }
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false })
    }
  }

  // Save data to safeStorage as backup whenever state changes
  useEffect(() => {
    if (user) {
      const dataToSave = {
        tasks: state.tasks,
        flashcards: state.flashcards,
        flashcardDecks: state.flashcardDecks,
        pomodoroSessions: state.pomodoroSessions,
        scheduleEvents: state.scheduleEvents,
        materials: state.materials,
        userStats: state.userStats,
        settings: state.settings
      }
      safeStorage.setItem('studyPlannerData', dataToSave).catch(console.error)
    }
  }, [user, state.tasks, state.flashcards, state.flashcardDecks, state.pomodoroSessions, state.scheduleEvents, state.materials, state.userStats, state.settings])

  // Sync user stats to Supabase when they change
  useEffect(() => {
    if (user && !state.isLoading) {
      dataSyncService.syncUserStats(state.userStats, user.id).catch(console.error)
    }
  }, [user, state.userStats, state.isLoading])

  // Task operations
  const addTask = (taskData: Omit<Task, 'id' | 'createdAt' | 'updatedAt' | 'pomodoroSessions' | 'flashcardsGenerated'>) => {
    const task: Task = {
      ...taskData,
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      pomodoroSessions: 0,
      flashcardsGenerated: false
    }
    dispatch({ type: 'ADD_TASK', payload: task })
    
    // Sync to Supabase
    if (user) {
      dataSyncService.syncTask(task, user.id, 'insert').catch(console.error)
    }
    
    return task.id // Return the task ID so materials can be linked
  }

  const updateTask = (task: Task) => {
    const updatedTask = { ...task, updatedAt: new Date().toISOString() }
    dispatch({ type: 'UPDATE_TASK', payload: updatedTask })
    
    // Sync to Supabase
    if (user) {
      dataSyncService.syncTask(updatedTask, user.id, 'update').catch(console.error)
    }
  }

  const deleteTask = (id: string) => {
    const task = state.tasks.find(t => t.id === id)
    dispatch({ type: 'DELETE_TASK', payload: id })
    
    // Sync to Supabase
    if (user && task) {
      dataSyncService.syncTask(task, user.id, 'delete').catch(console.error)
    }
  }

  const toggleTask = (id: string) => {
    dispatch({ type: 'TOGGLE_TASK', payload: id })
    
    // Sync to Supabase after toggle
    const task = state.tasks.find(t => t.id === id)
    if (user && task) {
      const updatedTask = { ...task, completed: !task.completed, updatedAt: new Date().toISOString() }
      dataSyncService.syncTask(updatedTask, user.id, 'update').catch(console.error)
    }
  }

  // Flashcard operations
  const addFlashcard = (flashcardData: Omit<Flashcard, 'id' | 'createdAt' | 'reviewCount' | 'correctCount'>) => {
    const flashcard: Flashcard = {
      ...flashcardData,
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
      reviewCount: 0,
      correctCount: 0
    }
    dispatch({ type: 'ADD_FLASHCARD', payload: flashcard })
    
    // Sync to Supabase
    if (user) {
      dataSyncService.syncFlashcard(flashcard, user.id, 'insert').catch(console.error)
    }
  }

  const updateFlashcard = (flashcard: Flashcard) => {
    dispatch({ type: 'UPDATE_FLASHCARD', payload: flashcard })
    
    // Sync to Supabase
    if (user) {
      dataSyncService.syncFlashcard(flashcard, user.id, 'update').catch(console.error)
    }
  }

  const deleteFlashcard = (id: string) => {
    const flashcard = state.flashcards.find(f => f.id === id)
    dispatch({ type: 'DELETE_FLASHCARD', payload: id })
    
    // Sync to Supabase
    if (user && flashcard) {
      dataSyncService.syncFlashcard(flashcard, user.id, 'delete').catch(console.error)
    }
  }

  const generateFlashcardsForTask = (taskId: string) => {
    const task = state.tasks.find(t => t.id === taskId)
    if (!task || task.flashcardsGenerated) return

    // Generate sample flashcards based on task content
    const flashcards = [
      {
        question: `What is the main objective of: ${task.title}?`,
        answer: task.description || 'Complete the assigned task according to requirements.',
        subject: task.subject,
        difficulty: task.difficulty || 'medium',
        taskId: taskId
      },
      {
        question: `When is the due date for: ${task.title}?`,
        answer: task.dueDate ? new Date(task.dueDate).toLocaleDateString() : 'No due date set',
        subject: task.subject,
        difficulty: 'easy' as const,
        taskId: taskId
      }
    ]

    flashcards.forEach(flashcardData => addFlashcard(flashcardData))
    
    // Mark task as having flashcards generated
    updateTask({ ...task, flashcardsGenerated: true })
  }
  
  // Import flashcards from AI assistant
  const importFlashcardsFromAI = (flashcardSet: any) => {
    if (!flashcardSet || !flashcardSet.cards || !Array.isArray(flashcardSet.cards)) {
      console.error('Invalid flashcard set format');
      return;
    }
    
    const subject = flashcardSet.title.replace('Flashcards for ', '').trim();
    
    // Add each flashcard to the local storage
    flashcardSet.cards.forEach((card: any) => {
      addFlashcard({
        question: card.front,
        answer: card.back,
        subject: subject,
        difficulty: 'medium',
        taskId: 'ai-generated' // Special marker for AI-generated cards
      });
    });
    
    // Return the number of imported cards
    return flashcardSet.cards.length;
  }
  
  // Import study notes from AI assistant
  const importStudyNoteFromAI = (note: any) => {
    if (!note || !note.title || !note.content) {
      console.error('Invalid study note format');
      return false;
    }
    
    const subject = note.title.replace('Notes on ', '').trim();
    
    // Create a task to represent the study note
    addTask({
      title: `Study Note: ${subject}`,
      description: note.content,
      subject: subject,
      priority: 'medium',
      difficulty: 'medium',
      estimate: '30 minutes', // Default 30 minutes
      dueDate: null,
      completed: false,
      progress: 0
    });
    
    return true;
  }

  // Pomodoro operations
  const addPomodoroSession = (sessionData: Omit<PomodoroSession, 'id'>) => {
    const session: PomodoroSession = {
      ...sessionData,
      id: crypto.randomUUID()
    }
    dispatch({ type: 'ADD_POMODORO_SESSION', payload: session })
    
    // Sync to Supabase
    if (user) {
      dataSyncService.syncPomodoroSession(session, user.id, 'insert').catch(console.error)
    }
  }

  const updatePomodoroSession = (session: PomodoroSession) => {
    dispatch({ type: 'UPDATE_POMODORO_SESSION', payload: session })
    
    // Sync to Supabase
    if (user) {
      dataSyncService.syncPomodoroSession(session, user.id, 'update').catch(console.error)
    }
  }

  const setCurrentPomodoroTask = (task: Task | undefined) => {
    dispatch({ type: 'SET_CURRENT_POMODORO_TASK', payload: task })
  }

  // Schedule operations
  const addScheduleEvent = (eventData: Omit<ScheduleEvent, 'id'>) => {
    const event: ScheduleEvent = {
      ...eventData,
      id: crypto.randomUUID()
    }
    dispatch({ type: 'ADD_SCHEDULE_EVENT', payload: event })
    
    // Sync to Supabase
    if (user) {
      dataSyncService.syncScheduleEvent(event, user.id, 'insert').catch(console.error)
    }
  }

  const updateScheduleEvent = (event: ScheduleEvent) => {
    dispatch({ type: 'UPDATE_SCHEDULE_EVENT', payload: event })
    
    // Sync to Supabase
    if (user) {
      dataSyncService.syncScheduleEvent(event, user.id, 'update').catch(console.error)
    }
  }

  const deleteScheduleEvent = (id: string) => {
    const event = state.scheduleEvents.find(e => e.id === id)
    dispatch({ type: 'DELETE_SCHEDULE_EVENT', payload: id })
    
    // Sync to Supabase
    if (user && event) {
      dataSyncService.syncScheduleEvent(event, user.id, 'delete').catch(console.error)
    }
  }

  // Material operations
  const addMaterial = (materialData: Omit<Material, 'id' | 'createdAt' | 'updatedAt'>) => {
    const material: Material = {
      ...materialData,
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
    dispatch({ type: 'ADD_MATERIAL', payload: material })
    
    // Sync to Supabase
    if (user) {
      dataSyncService.syncMaterial(material, user.id, 'insert').catch(console.error)
    }
    
    return material.id
  }

  const updateMaterial = (material: Material) => {
    const updatedMaterial = { ...material, updatedAt: new Date().toISOString() }
    dispatch({ type: 'UPDATE_MATERIAL', payload: updatedMaterial })
    
    // Sync to Supabase
    if (user) {
      dataSyncService.syncMaterial(updatedMaterial, user.id, 'update').catch(console.error)
    }
  }

  const deleteMaterial = (id: string) => {
    const material = state.materials.find(m => m.id === id)
    dispatch({ type: 'DELETE_MATERIAL', payload: id })
    
    // Sync to Supabase
    if (user && material) {
      dataSyncService.syncMaterial(material, user.id, 'delete').catch(console.error)
    }
  }

  const attachMaterialToTask = (materialId: string, taskId: string) => {
    dispatch({ type: 'ATTACH_MATERIAL_TO_TASK', payload: { materialId, taskId } })
  }

  const detachMaterialFromTask = (materialId: string, taskId: string) => {
    dispatch({ type: 'DETACH_MATERIAL_FROM_TASK', payload: { materialId, taskId } })
  }

  // Flashcard Deck operations
  const addFlashcardDeck = (deckData: Omit<FlashcardDeck, 'id' | 'createdAt' | 'updatedAt'>) => {
    const deck: FlashcardDeck = {
      ...deckData,
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
    dispatch({ type: 'ADD_FLASHCARD_DECK', payload: deck })
    
    // Sync to Supabase
    if (user) {
      dataSyncService.syncFlashcardDeck(deck, user.id, 'insert').catch(console.error)
    }
    
    return deck.id
  }

  const updateFlashcardDeck = (deck: FlashcardDeck) => {
    const updatedDeck = { ...deck, updatedAt: new Date().toISOString() }
    dispatch({ type: 'UPDATE_FLASHCARD_DECK', payload: updatedDeck })
    
    // Sync to Supabase
    if (user) {
      dataSyncService.syncFlashcardDeck(updatedDeck, user.id, 'update').catch(console.error)
    }
  }

  const deleteFlashcardDeck = (id: string) => {
    const deck = state.flashcardDecks.find(d => d.id === id)
    dispatch({ type: 'DELETE_FLASHCARD_DECK', payload: id })
    
    // Sync to Supabase
    if (user && deck) {
      dataSyncService.syncFlashcardDeck(deck, user.id, 'delete').catch(console.error)
    }
  }

  const getDeckById = (id: string) => state.flashcardDecks.find(deck => deck.id === id)

  // Settings operations
  const updateSettings = (settings: Partial<AppSettings>) => {
    dispatch({ type: 'UPDATE_SETTINGS', payload: settings })
  }

  // Utility functions
  const getTaskById = (id: string) => state.tasks.find(task => task.id === id)
  const getFlashcardsByTask = (taskId: string) => state.flashcards.filter(card => card.taskId === taskId)
  const getPomodoroSessionsByTask = (taskId: string) => state.pomodoroSessions.filter(session => session.taskId === taskId)
  const getMaterialsByTask = (taskId: string) => state.materials.filter(material => material.taskIds?.includes(taskId))

  const value: StudyPlannerContextType = {
    state,
    dispatch,
    addTask,
    updateTask,
    deleteTask,
    toggleTask,
    addFlashcard,
    updateFlashcard,
    deleteFlashcard,
    generateFlashcardsForTask,
    importFlashcardsFromAI,
    importStudyNoteFromAI,
    addFlashcardDeck,
    updateFlashcardDeck,
    deleteFlashcardDeck,
    getDeckById,
    addPomodoroSession,
    updatePomodoroSession,
    setCurrentPomodoroTask,
    addScheduleEvent,
    updateScheduleEvent,
    deleteScheduleEvent,
    addMaterial,
    updateMaterial,
    deleteMaterial,
    attachMaterialToTask,
    detachMaterialFromTask,
    updateSettings,
    getTaskById,
    getFlashcardsByTask,
    getPomodoroSessionsByTask,
    getMaterialsByTask
  }

  return (
    <StudyPlannerContext.Provider value={value}>
      {children}
    </StudyPlannerContext.Provider>
  )
}

export function useStudyPlanner() {
  const context = useContext(StudyPlannerContext)
  if (context === undefined) {
    console.error('useStudyPlanner must be used within a StudyPlannerProvider')
    // Return a default context instead of throwing an error
    return {
      state: initialState,
      dispatch: () => null,
      addTask: () => 'mock-task-id',
      updateTask: () => {},
      deleteTask: () => {},
      toggleTask: () => {},
      addFlashcard: () => {},
      updateFlashcard: () => {},
      deleteFlashcard: () => {},
      generateFlashcardsForTask: () => {},
      importFlashcardsFromAI: () => 0,
      importStudyNoteFromAI: () => false,
      addFlashcardDeck: () => 'mock-deck-id',
      updateFlashcardDeck: () => {},
      deleteFlashcardDeck: () => {},
      getDeckById: () => undefined,
      addPomodoroSession: () => {},
      updatePomodoroSession: () => {},
      setCurrentPomodoroTask: () => {},
      addScheduleEvent: () => {},
      updateScheduleEvent: () => {},
      deleteScheduleEvent: () => {},
      addMaterial: (materialData: Omit<Material, 'id' | 'createdAt' | 'updatedAt'>) => {
        console.warn('addMaterial called outside of StudyPlannerProvider context');
        // Return a mock ID to prevent errors
        return 'mock-id-' + Date.now();
      },
      updateMaterial: () => {},
      deleteMaterial: () => {},
      attachMaterialToTask: () => {},
      detachMaterialFromTask: () => {},
      updateSettings: () => {},
      getTaskById: () => undefined,
      getFlashcardsByTask: () => [],
      getPomodoroSessionsByTask: () => [],
      getMaterialsByTask: () => []
    } as StudyPlannerContextType
  }
  return context
}
