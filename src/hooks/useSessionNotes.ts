import { useStudyPlanner } from '@/contexts/StudyPlannerContext';

/**
 * Hook for managing session notes
 * Provides methods for creating, updating, and deleting notes tied to study sessions
 */
export function useSessionNotes(studyEventId: string) {
  const context = useStudyPlanner();

  return {
    notes: context.getSessionNotesByEvent(studyEventId),
    addNote: (content: string) => context.createSessionNote(studyEventId, content),
    updateNote: context.updateSessionNote,
    deleteNote: context.deleteSessionNote,
  };
}
