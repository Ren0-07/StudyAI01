# Task ↔ Schedule System - Implementation Status

## ✓ COMPLETED

### 1. Database Schema
- SQL migration file created: `supabase/migrations/task_schedule_system_implementation.sql`
- Adds `notes` field to tasks
- Adds status tracking to schedule_events (scheduled, in_progress, completed, missed)
- Creates `session_notes` table with RLS
- Creates `reminders` table with RLS
- Indexes and triggers configured

**ACTION:** Run migration in Supabase SQL Editor

### 2. TypeScript Interfaces
- Task: Added `notes` and `status` fields
- ScheduleEvent: Added `status`, `missedCount`, `startedAt`, `completedAt`
- SessionNote: New interface
- Reminder: New interface
- AppSettings: Added auto-advance and notification settings

**LOCATION:** `src/contexts/StudyPlannerContext.tsx`

### 3. React Context & State Management
- Enhanced StudyPlannerContext with new state, actions, and methods
- Implemented session note operations (create, update, delete, fetch)
- Implemented reminder operations (create, update, delete, fetch)
- Implemented study event operations (start, mark complete, mark missed, skip to next)
- Implemented focus mode operations (open, close)

**LOCATION:** `src/contexts/StudyPlannerContext.tsx`

### 4. Data Sync Service
- Added `syncSessionNote(note, userId, operation)` method
- Added `syncReminder(reminder, userId, operation)` method
- Updated `fetchAllUserData()` to fetch session_notes and reminders

**LOCATION:** `src/services/dataSyncService.ts`

### 5. Custom Hooks
- `useStudyEvents()` - Manage study events
- `useSessionNotes(studyEventId)` - Manage session notes

**LOCATION:** `src/hooks/useStudyEvents.ts`, `src/hooks/useSessionNotes.ts`

---

## ⏳ TO IMPLEMENT

### Phase 1: UI Components

#### TaskModal Enhancement
- Add notes textarea (auto-save on blur)
- Add file attachment button + upload UI
- Add "Schedule this task?" checkbox
- Link files to task in materials table

#### FocusMode Component (NEW)
- Centered modal with backdrop blur
- Task title, description, materials preview
- Session notes editor (auto-save every 30s)
- Pomodoro timer integration
- "Mark Complete" and "Skip Session" buttons
- File upload during session

#### ScheduleView Enhancement
- Add status badges (color-coded)
- Click event → task details modal if scheduled
- Start Session button → startEvent() + openFocusMode()
- Show task links on events

### Phase 2: Automation

#### Auto-Advance Logic
- Check every 60s for missed in-progress events
- Mark missed + mark linked task missed
- Find next scheduled event and auto-start if enabled
- Trigger Focus Mode for auto-started event

#### Notifications
- Browser Notifications API integration
- Prompt for permission on first scheduled event
- Notify 10 min before and at session start
- Optional sound with notification

### Phase 3: Polish

#### IndexedDB Migration
- One-time migration of IndexedDB materials to Supabase
- Show migration prompt on first login

#### AI Auto-Scheduling (Optional)
- Use existing Gemini API to suggest task placement
- Analyze free time blocks
- Create suggested schedule

---

## Testing Checklist

- [ ] Create task with notes → persists
- [ ] Attach files to task → appear in materials with correct paths
- [ ] Create study event linked to task
- [ ] Click event → see task details + Start button
- [ ] Start session → Focus Mode opens
- [ ] Write session notes → auto-save every 30s
- [ ] Mark Complete → status changes to completed
- [ ] Skip → marks missed, auto-starts next (if enabled)
- [ ] Browser notifications appear as expected
- [ ] No file corruption on upload/download
- [ ] Offline sync works on reconnect

---

## Deployment

1. Run SQL migration in Supabase
2. Implement remaining components (Phase 1)
3. Add automation logic (Phase 2)
4. Test thoroughly
5. Deploy to Vercel

Environment variables needed:
- VITE_SUPABASE_URL
- VITE_SUPABASE_PUBLISHABLE_KEY
- VITE_GOOGLE_GENERATIVE_AI_API_KEY

---

## Key Implementation Notes

1. **FocusMode modal** should be rendered in App/Dashboard component and controlled by `state.focusMode.isOpen`
2. **File uploads** use `storageService.uploadFile(file, 'materials/{taskId}')` and create Material entries
3. **Auto-advance** runs on 60s interval client-side; Edge Function can be fallback
4. **Backward compatibility** - existing events without status work fine (default 'scheduled')
5. **Session notes** auto-save every 30s to session_notes table (not merged into tasks.notes unless user explicitly saves)
