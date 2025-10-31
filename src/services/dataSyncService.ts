import { supabase } from '@/lib/supabase';
import type {
  Task,
  Material,
  Flashcard,
  FlashcardDeck,
  PomodoroSession,
  ScheduleEvent,
  UserStats,
  SessionNote,
  Reminder
} from '@/contexts/StudyPlannerContext';

export type SyncStatus = 'idle' | 'syncing' | 'synced' | 'error';

// Helper function to convert snake_case to camelCase
const toCamelCase = (obj: any): any => {
  if (Array.isArray(obj)) {
    return obj.map(toCamelCase);
  } else if (obj !== null && typeof obj === 'object') {
    return Object.keys(obj).reduce((result, key) => {
      const camelKey = key.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
      result[camelKey] = toCamelCase(obj[key]);
      return result;
    }, {} as any);
  }
  return obj;
};

// Helper function to convert camelCase to snake_case
const toSnakeCase = (obj: any): any => {
  if (Array.isArray(obj)) {
    return obj.map(toSnakeCase);
  } else if (obj !== null && typeof obj === 'object') {
    return Object.keys(obj).reduce((result, key) => {
      const snakeKey = key.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
      result[snakeKey] = toSnakeCase(obj[key]);
      return result;
    }, {} as any);
  }
  return obj;
};

class DataSyncService {
  private syncStatusCallbacks: ((status: SyncStatus) => void)[] = [];
  private currentStatus: SyncStatus = 'idle';

  // Subscribe to sync status changes
  onSyncStatusChange(callback: (status: SyncStatus) => void) {
    this.syncStatusCallbacks.push(callback);
    return () => {
      this.syncStatusCallbacks = this.syncStatusCallbacks.filter(cb => cb !== callback);
    };
  }

  private setSyncStatus(status: SyncStatus) {
    this.currentStatus = status;
    this.syncStatusCallbacks.forEach(cb => cb(status));
  }

  getSyncStatus(): SyncStatus {
    return this.currentStatus;
  }

  // Initialize user data (create empty records for new users)
  async initializeUserData(userId: string): Promise<void> {
    try {
      this.setSyncStatus('syncing');

      // Check if user stats already exist
      const { data: existingStats } = await supabase
        .from('user_stats')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (!existingStats) {
        // Create initial user stats
        await supabase.from('user_stats').insert({
          user_id: userId,
          total_tasks: 0,
          completed_tasks: 0,
          total_study_time: 0,
          current_streak: 0,
          level: 1,
          xp: 0,
          xp_to_next_level: 100,
        });
      }

      this.setSyncStatus('synced');
    } catch (error) {
      console.error('Error initializing user data:', error);
      this.setSyncStatus('error');
      throw error;
    }
  }

  // Fetch all user data from Supabase
  async fetchAllUserData(userId: string) {
    try {
      this.setSyncStatus('syncing');

      const [
        tasksResult,
        materialsResult,
        flashcardsResult,
        flashcardDecksResult,
        pomodoroSessionsResult,
        scheduleEventsResult,
        userStatsResult,
        sessionNotesResult,
        remindersResult,
      ] = await Promise.all([
        supabase.from('tasks').select('*').eq('user_id', userId),
        supabase.from('materials').select('*').eq('user_id', userId),
        supabase.from('flashcards').select('*').eq('user_id', userId),
        supabase.from('flashcard_decks').select('*').eq('user_id', userId),
        supabase.from('pomodoro_sessions').select('*').eq('user_id', userId),
        supabase.from('schedule_events').select('*').eq('user_id', userId),
        supabase.from('user_stats').select('*').eq('user_id', userId).single(),
        supabase.from('session_notes').select('*').eq('user_id', userId),
        supabase.from('reminders').select('*').eq('user_id', userId),
      ]);

      this.setSyncStatus('synced');

      return {
        tasks: toCamelCase(tasksResult.data || []),
        materials: toCamelCase(materialsResult.data || []),
        flashcards: toCamelCase(flashcardsResult.data || []),
        flashcardDecks: toCamelCase(flashcardDecksResult.data || []),
        pomodoroSessions: toCamelCase(pomodoroSessionsResult.data || []),
        scheduleEvents: toCamelCase(scheduleEventsResult.data || []),
        userStats: toCamelCase(userStatsResult.data) || {
          totalTasks: 0,
          completedTasks: 0,
          totalStudyTime: 0,
          currentStreak: 0,
          level: 1,
          xp: 0,
          xpToNextLevel: 100,
        },
        sessionNotes: toCamelCase(sessionNotesResult.data || []),
        reminders: toCamelCase(remindersResult.data || []),
      };
    } catch (error) {
      console.error('Error fetching user data:', error);
      this.setSyncStatus('error');
      throw error;
    }
  }

  // Tasks
  async syncTask(task: Task, userId: string, operation: 'insert' | 'update' | 'delete') {
    try {
      this.setSyncStatus('syncing');
      const taskData = toSnakeCase({ ...task, user_id: userId });

      let result;
      if (operation === 'delete') {
        result = await supabase.from('tasks').delete().eq('id', task.id).eq('user_id', userId);
      } else if (operation === 'insert') {
        result = await supabase.from('tasks').insert(taskData);
      } else {
        result = await supabase.from('tasks').update(taskData).eq('id', task.id).eq('user_id', userId);
      }

      if (result.error) {
        console.error('❌ Supabase error syncing task:', result.error);
        console.error('Operation:', operation, 'Task:', task);
        this.setSyncStatus('error');
        throw result.error;
      }

      console.log('✅ Task synced successfully:', operation, task.id);
      this.setSyncStatus('synced');
    } catch (error) {
      console.error('❌ Error syncing task:', error);
      this.setSyncStatus('error');
      throw error;
    }
  }

  // Materials
  async syncMaterial(material: Material, userId: string, operation: 'insert' | 'update' | 'delete') {
    try {
      this.setSyncStatus('syncing');
      const materialData = toSnakeCase({ ...material, user_id: userId });

      if (operation === 'delete') {
        await supabase.from('materials').delete().eq('id', material.id).eq('user_id', userId);
      } else if (operation === 'insert') {
        await supabase.from('materials').insert(materialData);
      } else {
        await supabase.from('materials').update(materialData).eq('id', material.id).eq('user_id', userId);
      }

      this.setSyncStatus('synced');
    } catch (error) {
      console.error('Error syncing material:', error);
      this.setSyncStatus('error');
      throw error;
    }
  }

  // Flashcards
  async syncFlashcard(flashcard: Flashcard, userId: string, operation: 'insert' | 'update' | 'delete') {
    try {
      this.setSyncStatus('syncing');
      const flashcardData = toSnakeCase({ ...flashcard, user_id: userId });

      if (operation === 'delete') {
        await supabase.from('flashcards').delete().eq('id', flashcard.id).eq('user_id', userId);
      } else if (operation === 'insert') {
        await supabase.from('flashcards').insert(flashcardData);
      } else {
        await supabase.from('flashcards').update(flashcardData).eq('id', flashcard.id).eq('user_id', userId);
      }

      this.setSyncStatus('synced');
    } catch (error) {
      console.error('Error syncing flashcard:', error);
      this.setSyncStatus('error');
      throw error;
    }
  }

  // Flashcard Decks
  async syncFlashcardDeck(deck: FlashcardDeck, userId: string, operation: 'insert' | 'update' | 'delete') {
    try {
      this.setSyncStatus('syncing');
      const deckData = toSnakeCase({ ...deck, user_id: userId });

      if (operation === 'delete') {
        await supabase.from('flashcard_decks').delete().eq('id', deck.id).eq('user_id', userId);
      } else if (operation === 'insert') {
        await supabase.from('flashcard_decks').insert(deckData);
      } else {
        await supabase.from('flashcard_decks').update(deckData).eq('id', deck.id).eq('user_id', userId);
      }

      this.setSyncStatus('synced');
    } catch (error) {
      console.error('Error syncing flashcard deck:', error);
      this.setSyncStatus('error');
      throw error;
    }
  }

  // Pomodoro Sessions
  async syncPomodoroSession(session: PomodoroSession, userId: string, operation: 'insert' | 'update') {
    try {
      this.setSyncStatus('syncing');
      const sessionData = toSnakeCase({ ...session, user_id: userId });

      if (operation === 'insert') {
        await supabase.from('pomodoro_sessions').insert(sessionData);
      } else {
        await supabase.from('pomodoro_sessions').update(sessionData).eq('id', session.id).eq('user_id', userId);
      }

      this.setSyncStatus('synced');
    } catch (error) {
      console.error('Error syncing pomodoro session:', error);
      this.setSyncStatus('error');
      throw error;
    }
  }

  // Schedule Events
  async syncScheduleEvent(event: ScheduleEvent, userId: string, operation: 'insert' | 'update' | 'delete') {
    try {
      this.setSyncStatus('syncing');
      const eventData = toSnakeCase({ ...event, user_id: userId });

      if (operation === 'delete') {
        await supabase.from('schedule_events').delete().eq('id', event.id).eq('user_id', userId);
      } else if (operation === 'insert') {
        await supabase.from('schedule_events').insert(eventData);
      } else {
        await supabase.from('schedule_events').update(eventData).eq('id', event.id).eq('user_id', userId);
      }

      this.setSyncStatus('synced');
    } catch (error) {
      console.error('Error syncing schedule event:', error);
      this.setSyncStatus('error');
      throw error;
    }
  }

  // User Stats
  async syncUserStats(stats: UserStats, userId: string) {
    try {
      this.setSyncStatus('syncing');
      const statsData = toSnakeCase({ ...stats, user_id: userId });

      await supabase
        .from('user_stats')
        .upsert(statsData, { onConflict: 'user_id' });

      this.setSyncStatus('synced');
    } catch (error) {
      console.error('Error syncing user stats:', error);
      this.setSyncStatus('error');
      throw error;
    }
  }

  // Session Notes
  async syncSessionNote(note: SessionNote, userId: string, operation: 'insert' | 'update' | 'delete') {
    try {
      this.setSyncStatus('syncing');
      const noteData = toSnakeCase({ ...note, user_id: userId });

      if (operation === 'delete') {
        await supabase.from('session_notes').delete().eq('id', note.id).eq('user_id', userId);
      } else if (operation === 'insert') {
        await supabase.from('session_notes').insert(noteData);
      } else {
        await supabase.from('session_notes').update(noteData).eq('id', note.id).eq('user_id', userId);
      }

      this.setSyncStatus('synced');
    } catch (error) {
      console.error('Error syncing session note:', error);
      this.setSyncStatus('error');
      throw error;
    }
  }

  // Reminders
  async syncReminder(reminder: Reminder, userId: string, operation: 'insert' | 'update' | 'delete') {
    try {
      this.setSyncStatus('syncing');
      const reminderData = toSnakeCase({ ...reminder, user_id: userId });

      if (operation === 'delete') {
        await supabase.from('reminders').delete().eq('id', reminder.id).eq('user_id', userId);
      } else if (operation === 'insert') {
        await supabase.from('reminders').insert(reminderData);
      } else {
        await supabase.from('reminders').update(reminderData).eq('id', reminder.id).eq('user_id', userId);
      }

      this.setSyncStatus('synced');
    } catch (error) {
      console.error('Error syncing reminder:', error);
      this.setSyncStatus('error');
      throw error;
    }
  }

  // Real-time subscriptions
  subscribeToTasks(userId: string, callback: (payload: any) => void) {
    return supabase
      .channel('tasks-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'tasks',
          filter: `user_id=eq.${userId}`,
        },
        callback
      )
      .subscribe();
  }

  subscribeToMaterials(userId: string, callback: (payload: any) => void) {
    return supabase
      .channel('materials-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'materials',
          filter: `user_id=eq.${userId}`,
        },
        callback
      )
      .subscribe();
  }

  subscribeToFlashcards(userId: string, callback: (payload: any) => void) {
    return supabase
      .channel('flashcards-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'flashcards',
          filter: `user_id=eq.${userId}`,
        },
        callback
      )
      .subscribe();
  }

  subscribeToFlashcardDecks(userId: string, callback: (payload: any) => void) {
    return supabase
      .channel('flashcard-decks-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'flashcard_decks',
          filter: `user_id=eq.${userId}`,
        },
        callback
      )
      .subscribe();
  }

  subscribeToUserStats(userId: string, callback: (payload: any) => void) {
    return supabase
      .channel('user-stats-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'user_stats',
          filter: `user_id=eq.${userId}`,
        },
        callback
      )
      .subscribe();
  }
}

export const dataSyncService = new DataSyncService();
