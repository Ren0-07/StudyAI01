import { useStudyPlanner } from '@/contexts/StudyPlannerContext';

/**
 * Hook for managing study events
 * Provides methods for creating, updating, and managing scheduled study sessions
 */
export function useStudyEvents() {
  const context = useStudyPlanner();

  return {
    events: context.state.scheduleEvents,
    createEvent: context.addScheduleEvent,
    updateEvent: context.updateScheduleEvent,
    deleteEvent: context.deleteScheduleEvent,
    startEvent: context.startEvent,
    markComplete: context.markEventComplete,
    markMissed: context.markEventMissed,
    skipToNextEvent: context.skipToNextEvent,
    isLoading: context.state.isLoading,
  };
}
