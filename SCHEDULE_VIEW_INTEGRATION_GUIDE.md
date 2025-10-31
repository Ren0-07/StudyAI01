# ScheduleView Integration Guide

## Overview
Quick reference for integrating FocusMode and status badges into ScheduleView.

## Required Imports

```typescript
import { useStudyPlanner } from '@/contexts/StudyPlannerContext'
import { Clock, Play, Check, AlertCircle } from 'lucide-react'
```

## Helper Functions

### Status Color Function
```typescript
const getStatusColor = (status?: string) => {
  switch (status) {
    case 'in_progress':
      return 'bg-green-100 text-green-800 border-green-300'
    case 'completed':
      return 'bg-gray-100 text-gray-800 border-gray-300'
    case 'missed':
      return 'bg-red-100 text-red-800 border-red-300'
    default:
      return 'bg-blue-100 text-blue-800 border-blue-300'
  }
}

const getStatusIcon = (status?: string) => {
  switch (status) {
    case 'in_progress':
      return <Clock className="w-3 h-3" />
    case 'completed':
      return <Check className="w-3 h-3" />
    case 'missed':
      return <AlertCircle className="w-3 h-3" />
    default:
      return null
  }
}
```

## Event Rendering

### Basic Event Card (in calendar grid)
```tsx
const handleEventClick = (event: ScheduleEvent) => {
  if (event.status === 'in_progress') {
    // Open Focus Mode directly
    openFocusMode(event.id, event.taskId)
  } else if (event.status === 'scheduled' && event.taskId) {
    // Show task details modal
    setSelectedEvent(event)
    setShowTaskModal(true)
  } else {
    // Show read-only event details
    setSelectedEvent(event)
  }
}

<div
  onClick={() => handleEventClick(event)}
  className={`p-3 rounded-lg cursor-pointer border transition ${getStatusColor(event.status)}`}
>
  <div className="flex items-start justify-between gap-2">
    <div className="flex-1">
      <p className="text-sm font-semibold truncate">{event.title}</p>
      {event.taskId && (
        <p className="text-xs opacity-75">📋 Task linked</p>
      )}
    </div>
    {getStatusIcon(event.status)}
  </div>

  <div className="mt-2 flex items-center justify-between">
    <span className="text-xs opacity-75">
      {new Date(event.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
    </span>
    {event.status === 'scheduled' && event.taskId && (
      <button
        onClick={(e) => {
          e.stopPropagation()
          handleStartSession(event)
        }}
        className="text-xs px-2 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 transition"
      >
        Start
      </button>
    )}
  </div>
</div>
```

## Event Details Modal

### Task Details with Start Button
```tsx
{selectedEvent && selectedEvent.status === 'scheduled' && selectedEvent.taskId && (
  <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-40">
    <div className="bg-white rounded-lg p-6 max-w-md w-11/12 space-y-4">
      <div>
        <h3 className="text-lg font-semibold">{selectedEvent.title}</h3>
        {selectedEvent.description && (
          <p className="text-sm text-gray-600 mt-2">{selectedEvent.description}</p>
        )}
      </div>

      <div className="bg-blue-50 rounded p-3 text-sm">
        <p>📅 {new Date(selectedEvent.startTime).toLocaleString()}</p>
        <p>
          ⏱️ {Math.round((new Date(selectedEvent.endTime).getTime() - new Date(selectedEvent.startTime).getTime()) / 60000)} minutes
        </p>
      </div>

      <div className="flex gap-2">
        <button
          onClick={() => setSelectedEvent(null)}
          className="flex-1 px-4 py-2 border rounded hover:bg-gray-50 transition"
        >
          Close
        </button>
        <button
          onClick={() => {
            handleStartSession(selectedEvent)
            setSelectedEvent(null)
          }}
          className="flex-1 px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition flex items-center justify-center gap-2"
        >
          <Play className="w-4 h-4" />
          Start Session
        </button>
      </div>
    </div>
  </div>
)}
```

## Start Session Handler

```typescript
const handleStartSession = (event: ScheduleEvent) => {
  startEvent(event.id)
  openFocusMode(event.id, event.taskId)

  // Optional: Request notification permission
  if (settings.notifications.notificationsEnabled) {
    NotificationService.requestPermission().then(() => {
      NotificationService.scheduleSessionNotifications(event)
    })
  }
}
```

## CSS Classes for Status Display

```css
/* Scheduled - Blue */
.status-scheduled {
  @apply bg-blue-100 text-blue-800 border border-blue-300;
}

/* In Progress - Green */
.status-in-progress {
  @apply bg-green-100 text-green-800 border border-green-300;
}

/* Completed - Gray */
.status-completed {
  @apply bg-gray-100 text-gray-800 border border-gray-300;
}

/* Missed - Red */
.status-missed {
  @apply bg-red-100 text-red-800 border border-red-300;
}
```

## Usage Example in ScheduleView

```tsx
export function ScheduleView() {
  const { state, startEvent, openFocusMode } = useStudyPlanner()
  const [selectedEvent, setSelectedEvent] = useState<ScheduleEvent | null>(null)

  const handleStartSession = (event: ScheduleEvent) => {
    startEvent(event.id)
    openFocusMode(event.id, event.taskId)
    setSelectedEvent(null)
  }

  return (
    <div className="space-y-4">
      {/* Event Grid */}
      <div className="grid grid-cols-1 gap-3">
        {state.scheduleEvents.map((event) => (
          <div
            key={event.id}
            onClick={() => handleEventClick(event)}
            className={`p-3 rounded-lg cursor-pointer border transition ${getStatusColor(
              event.status
            )}`}
          >
            {/* Event Card Content */}
          </div>
        ))}
      </div>

      {/* Event Details Modal */}
      {/* Insert modal code here */}
    </div>
  )
}
```

## Integration Checklist

- [ ] Add status color helper function
- [ ] Add status icon helper function
- [ ] Update event click handler to check status
- [ ] Add Start Session button for scheduled events
- [ ] Create event details modal
- [ ] Add notification permission request on start
- [ ] Test status badge colors in calendar
- [ ] Test Start button flow to Focus Mode
- [ ] Verify Focus Mode opens correctly
- [ ] Test auto-advance skipping to next event

## Notes

- Status is optional (`'scheduled' | 'in_progress' | 'completed' | 'missed'`)
- Scheduled events with `taskId` get a Start button
- In-progress events open Focus Mode directly
- Missed/completed events show read-only details
- All status changes auto-sync to Supabase

## Performance Tips

- Memoize event cards to prevent unnecessary re-renders
- Use `useCallback` for event handlers
- Filter schedule_events by date range for large datasets
- Virtual scroll for 50+ events per view

---

**Ready to integrate?** Start with the helper functions, then update your event rendering logic!
