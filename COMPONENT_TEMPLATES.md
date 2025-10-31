# Component Implementation Templates

This guide provides templates and guidance for implementing the remaining components of the Task ↔ Schedule system.

## 1. FocusMode Component

**Location:** `src/components/features/FocusMode.tsx`

```typescript
import React, { useState, useEffect } from 'react';
import { useStudyPlanner } from '@/contexts/StudyPlannerContext';
import { useSessionNotes } from '@/hooks/useSessionNotes';
import { PomodoroTimer } from './PomodoroTimer';
import { X } from 'lucide-react';

interface FocusModeProps {
  onClose?: () => void;
}

export function FocusMode({ onClose }: FocusModeProps) {
  const { state, closeFocusMode, markEventComplete, skipToNextEvent, getMaterialsByTask } = useStudyPlanner();
  const { focusMode } = state;
  const { notes, addNote, updateNote } = useSessionNotes(focusMode.studyEventId || '');

  const event = state.scheduleEvents.find(e => e.id === focusMode.studyEventId);
  const task = focusMode.taskId ? state.tasks.find(t => t.id === focusMode.taskId) : null;
  const materials = task ? getMaterialsByTask(task.id) : [];
  const sessionNote = notes[0];

  const [notesContent, setNotesContent] = useState(sessionNote?.content || '');
  const [autoSaveTimer, setAutoSaveTimer] = useState<NodeJS.Timeout | null>(null);

  // Auto-save notes every 30 seconds
  useEffect(() => {
    if (autoSaveTimer) clearTimeout(autoSaveTimer);

    const timer = setTimeout(() => {
      if (sessionNote?.id && notesContent !== sessionNote.content) {
        updateNote(sessionNote.id, notesContent);
      } else if (!sessionNote && notesContent) {
        addNote(notesContent);
      }
    }, 30000);

    setAutoSaveTimer(timer);
    return () => clearTimeout(timer);
  }, [notesContent]);

  if (!focusMode.isOpen || !event) return null;

  const handleComplete = () => {
    markEventComplete(event.id);
    closeFocusMode();
    onClose?.();
  };

  const handleSkip = () => {
    skipToNextEvent(event.id);
    closeFocusMode();
    onClose?.();
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-white rounded-lg w-11/12 max-w-3xl max-h-[90vh] overflow-y-auto shadow-2xl">
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b bg-gradient-to-r from-blue-50 to-purple-50">
          <div>
            <h2 className="text-2xl font-bold text-gray-800">{task?.title || 'Focus Session'}</h2>
            <p className="text-sm text-gray-600 mt-1">{event.title}</p>
          </div>
          <button
            onClick={() => {
              closeFocusMode();
              onClose?.();
            }}
            className="p-2 hover:bg-gray-200 rounded-lg transition"
          >
            <X size={24} />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-6">
          {/* Task Description */}
          {task?.description && (
            <div>
              <h3 className="font-semibold text-gray-700 mb-2">Description</h3>
              <p className="text-gray-600">{task.description}</p>
            </div>
          )}

          {/* Materials Section */}
          {materials.length > 0 && (
            <div>
              <h3 className="font-semibold text-gray-700 mb-3">Attached Materials</h3>
              <div className="grid grid-cols-2 gap-3">
                {materials.map(material => (
                  <div key={material.id} className="border rounded-lg p-3 hover:bg-gray-50 transition">
                    <p className="text-sm font-medium truncate">{material.fileName || material.title}</p>
                    <div className="mt-2 flex gap-2">
                      <button className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded hover:bg-blue-200">
                        Preview
                      </button>
                      <button className="text-xs px-2 py-1 bg-gray-100 text-gray-700 rounded hover:bg-gray-200">
                        Download
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Session Notes */}
          <div>
            <label className="font-semibold text-gray-700 mb-2 block">Session Notes</label>
            <textarea
              className="w-full border rounded-lg p-3 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Take notes during your session... (auto-saves every 30 seconds)"
              rows={6}
              value={notesContent}
              onChange={(e) => setNotesContent(e.target.value)}
            />
            <p className="text-xs text-gray-500 mt-1">Changes auto-save every 30 seconds</p>
          </div>

          {/* Pomodoro Timer */}
          <div>
            <h3 className="font-semibold text-gray-700 mb-3">Timer</h3>
            <PomodoroTimer taskId={task?.id} />
          </div>
        </div>

        {/* Footer */}
        <div className="flex gap-3 p-6 border-t bg-gray-50">
          <button
            onClick={handleComplete}
            className="flex-1 bg-green-600 hover:bg-green-700 text-white font-medium rounded-lg px-4 py-3 transition"
          >
            ✓ Mark Complete
          </button>
          <button
            onClick={handleSkip}
            className="flex-1 bg-orange-600 hover:bg-orange-700 text-white font-medium rounded-lg px-4 py-3 transition"
          >
            ⊗ Skip Session
          </button>
        </div>
      </div>
    </div>
  );
}
```

**Usage in App.tsx:**
```typescript
export function App() {
  // ... existing code ...

  return (
    <>
      {/* Main layout */}
      <MainLayout />

      {/* FocusMode - always rendered but hidden */}
      <FocusMode onClose={() => {}} />
    </>
  );
}
```

## 2. TaskModal Enhancement

**Key additions to `src/components/modals/TaskModal.tsx`:**

```typescript
// Add these to the form:

{/* Notes Field */}
<div>
  <label className="block text-sm font-medium text-gray-700 mb-2">
    Task Notes (Optional)
  </label>
  <textarea
    className="w-full border rounded p-2"
    placeholder="Add notes to this task..."
    maxLength={1000}
    rows={3}
    value={formData.notes || ''}
    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
    onBlur={() => {
      // Auto-save on blur
      if (task?.id && formData.notes !== task.notes) {
        updateTask({ ...task, notes: formData.notes });
      }
    }}
  />
  <p className="text-xs text-gray-500 mt-1">
    {(formData.notes || '').length}/1000 characters
  </p>
</div>

{/* File Attachments */}
<div>
  <label className="block text-sm font-medium text-gray-700 mb-2">
    Attach Files (Optional)
  </label>
  <input
    type="file"
    multiple
    onChange={handleFileSelect}
    className="block w-full text-sm text-gray-500"
  />

  {/* Upload Progress */}
  {uploading && (
    <div className="mt-3 space-y-2">
      {uploadProgress.map((item) => (
        <div key={item.fileName} className="flex items-center gap-2">
          <span className="text-sm flex-1">{item.fileName}</span>
          <div className="w-24 h-2 bg-gray-200 rounded overflow-hidden">
            <div
              className="h-full bg-blue-600 transition-all"
              style={{ width: `${item.progress}%` }}
            />
          </div>
          <span className="text-xs text-gray-500">{item.progress}%</span>
        </div>
      ))}
    </div>
  )}

  {/* Attached Files List */}
  {attachedFiles.length > 0 && (
    <div className="mt-3 space-y-2">
      <p className="text-sm font-medium">Attached: {attachedFiles.length}</p>
      {attachedFiles.map((material) => (
        <div key={material.id} className="flex items-center justify-between p-2 bg-gray-100 rounded">
          <span className="text-sm">{material.fileName}</span>
          <button
            onClick={() => detachMaterial(material.id)}
            className="text-red-600 hover:text-red-800 text-sm"
          >
            Remove
          </button>
        </div>
      ))}
    </div>
  )}
</div>

{/* Schedule Checkbox */}
<div className="flex items-center gap-2">
  <input
    type="checkbox"
    id="schedule"
    checked={scheduleEvent}
    onChange={(e) => setScheduleEvent(e.target.checked)}
    className="rounded"
  />
  <label htmlFor="schedule" className="text-sm font-medium text-gray-700">
    Add to Schedule
  </label>
</div>

{/* Schedule Details */}
{scheduleEvent && (
  <div className="space-y-3 p-3 bg-blue-50 rounded">
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">
        Start Time
      </label>
      <input
        type="datetime-local"
        value={eventStartTime}
        onChange={(e) => setEventStartTime(e.target.value)}
        className="w-full border rounded p-2"
      />
    </div>
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">
        Duration (minutes)
      </label>
      <input
        type="number"
        min={15}
        step={15}
        value={eventDuration}
        onChange={(e) => setEventDuration(parseInt(e.target.value))}
        className="w-full border rounded p-2"
      />
    </div>
  </div>
)}
```

**File upload handler:**
```typescript
const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
  const files = Array.from(e.target.files || []);
  setUploading(true);

  for (const file of files) {
    try {
      const { path, error } = await storageService.uploadFile(
        file,
        `materials/${task?.id || 'new'}`
      );

      if (error) throw error;

      const material: Material = {
        id: crypto.randomUUID(),
        title: file.name,
        fileName: file.name,
        fileSize: file.size,
        type: storageService.getFileType(file.name),
        filePath: path,
        taskIds: [task?.id || ''],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      addMaterial(material);
      setAttachedFiles([...attachedFiles, material]);
    } catch (error) {
      console.error('File upload failed:', error);
      // Show error toast
    }
  }

  setUploading(false);
};
```

## 3. ScheduleView Enhancement

**Key changes to `src/components/features/ScheduleView.tsx`:**

```typescript
// Add status badge rendering
const getStatusColor = (status?: string) => {
  switch (status) {
    case 'in_progress': return 'bg-green-100 text-green-800 border-green-300';
    case 'completed': return 'bg-gray-100 text-gray-800 border-gray-300';
    case 'missed': return 'bg-red-100 text-red-800 border-red-300';
    default: return 'bg-blue-100 text-blue-800 border-blue-300';
  }
};

// Event click handler
const handleEventClick = (event: ScheduleEvent) => {
  if (event.status === 'in_progress') {
    openFocusMode(event.id, event.taskId);
  } else if (event.status === 'scheduled' && event.taskId) {
    // Show task details modal with Start button
    setSelectedEvent(event);
  }
};

// Start session handler
const handleStartSession = (event: ScheduleEvent) => {
  startEvent(event.id);
  openFocusMode(event.id, event.taskId);
};

// Event rendering with status
<div className={`p-2 rounded cursor-pointer ${getStatusColor(event.status)}`}>
  <p className="text-sm font-medium">{event.title}</p>
  {event.taskId && <p className="text-xs opacity-75">📋 Task linked</p>}
  <span className="inline-block text-xs mt-1 px-2 py-1 bg-white/50 rounded">
    {event.status || 'scheduled'}
  </span>
</div>
```

## 4. Notification Service

**New file:** `src/utils/notificationService.ts`

```typescript
export class NotificationService {
  static async requestPermission(): Promise<NotificationPermission> {
    if (!('Notification' in window)) {
      console.warn('Notifications not supported');
      return 'denied';
    }

    if (Notification.permission === 'granted' || Notification.permission === 'denied') {
      return Notification.permission;
    }

    return await Notification.requestPermission();
  }

  static sendNotification(title: string, options?: NotificationOptions) {
    if (Notification.permission !== 'granted') return;

    try {
      new Notification(title, {
        icon: '/logo.png',
        ...options,
      });
    } catch (error) {
      console.error('Failed to send notification:', error);
    }
  }

  static scheduleReminders(event: ScheduleEvent) {
    const now = new Date();
    const startTime = new Date(event.startTime);

    // 10 minutes before
    const tenMinBefore = new Date(startTime.getTime() - 10 * 60 * 1000);
    if (tenMinBefore > now) {
      const delay = tenMinBefore.getTime() - now.getTime();
      setTimeout(() => {
        this.sendNotification(`📅 Session in 10 minutes: ${event.title}`);
      }, delay);
    }

    // At start time
    if (startTime > now) {
      const delay = startTime.getTime() - now.getTime();
      setTimeout(() => {
        this.sendNotification(`🎯 Your session is starting: ${event.title}`, {
          tag: 'session-start-' + event.id,
          requireInteraction: true,
        });
      }, delay);
    }
  }
}
```

## 5. Auto-Advance Logic

**Add to `StudyPlannerContext.tsx` useEffect:**

```typescript
// Auto-advance check - runs every 60 seconds
useEffect(() => {
  if (!state.settings.studyPreferences.autoAdvanceEnabled) return;

  const checkInterval = setInterval(() => {
    const now = new Date();

    state.scheduleEvents.forEach(event => {
      if (event.status === 'in_progress' && event.endTime) {
        const endTime = new Date(event.endTime);

        if (endTime < now && !event.completedAt) {
          // Event has passed without completion - mark missed
          markEventMissed(event.id);

          // Find next scheduled event
          const nextEvent = state.scheduleEvents
            .filter(e => e.status === 'scheduled')
            .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime())
            [0];

          if (nextEvent) {
            startEvent(nextEvent.id);
            openFocusMode(nextEvent.id, nextEvent.taskId);
          }
        }
      }
    });
  }, 60000); // Check every 60 seconds

  return () => clearInterval(checkInterval);
}, [state.scheduleEvents, state.settings.studyPreferences.autoAdvanceEnabled]);
```

---

## Implementation Order

1. **FocusMode Component** - Core UI for study sessions
2. **Notification Service** - Schedule reminders for events
3. **TaskModal Enhancement** - Add notes and file upload
4. **ScheduleView Enhancement** - Add status display and start buttons
5. **Auto-Advance Logic** - Automatic session advancement
6. **Integration & Testing** - Connect components and test

---

## Key Points

- Reuse existing `storageService` for file uploads
- Use `PomodoroTimer` component for focus/break controls
- Auto-save notes every 30 seconds to avoid data loss
- Provide visual feedback during file uploads
- Handle offline scenarios gracefully
- Test all CRUD operations before deployment
