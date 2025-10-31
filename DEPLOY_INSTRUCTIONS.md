# Deployment Instructions

## Step 1: Deploy Database Migration

1. Open your Supabase dashboard
2. Go to SQL Editor
3. Copy entire contents of: `supabase/migrations/task_schedule_system_implementation.sql`
4. Paste and run the SQL
5. Verify new tables appear:
   - session_notes
   - reminders
   - Updated schedule_events (check for new columns)

**Test:** Query `SELECT * FROM session_notes LIMIT 1;` - should work

## Step 2: Review Implementation

Read these files in order:
1. `IMPLEMENTATION_COMPLETE_SUMMARY.md` (2 min)
2. `TASK_SCHEDULE_IMPLEMENTATION_STATUS.md` (5 min)
3. `COMPONENT_TEMPLATES.md` (10 min)

## Step 3: Implement Components

Use templates from `COMPONENT_TEMPLATES.md`:

1. Create `src/components/features/FocusMode.tsx` (1-2 hours)
2. Enhance `src/components/modals/TaskModal.tsx` (1 hour)
3. Enhance `src/components/features/ScheduleView.tsx` (1-2 hours)

## Step 4: Add Automation

1. Add auto-advance logic to StudyPlannerContext (30 min)
2. Create `src/utils/notificationService.ts` (1 hour)

## Step 5: Test Locally

```bash
cd StudyAI01
npm run dev
```

Test checklist:
- [ ] Create task with notes
- [ ] Attach files to task
- [ ] Create schedule event
- [ ] Click event → see task details
- [ ] Start session → FocusMode opens
- [ ] Add session notes
- [ ] Mark complete
- [ ] Event marked completed

## Step 6: Deploy to Vercel

```bash
git add .
git commit -m "feat: implement task schedule system"
git push origin main
```

Vercel auto-deploys on push.

## Verify Deployment

1. Open app in browser
2. Test full workflow:
   - Create task
   - Add attachment
   - Schedule event
   - Start session
3. Check browser console for errors

## Rollback Plan

If issues occur:
```bash
git revert HEAD
git push origin main
```

Database migration is safe and backward compatible - can run on existing data.

## Environment Check

Verify in Supabase:
```sql
-- Check tables exist
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public' AND table_name IN ('session_notes', 'reminders');

-- Check RLS is enabled
SELECT tablename FROM pg_tables
WHERE schemaname = 'public' AND tablename IN ('session_notes', 'reminders');

-- Check indexes
SELECT indexname FROM pg_indexes
WHERE tablename IN ('session_notes', 'reminders');
```

## Support

If migration fails:
1. Check Supabase error message
2. Ensure user has admin access to database
3. Verify SQL syntax is correct
4. Try running queries individually

Common issues:
- "table already exists" - Tables already deployed (safe to continue)
- "permission denied" - Need schema editor role in Supabase
- "invalid syntax" - Copy/paste error (retry carefully)

## Success Indicators

✅ Supabase shows new tables
✅ App loads without errors
✅ Tasks can be created with notes
✅ Files can be attached
✅ Events appear with status badges
✅ FocusMode opens on event click
✅ Session notes save
✅ Notifications trigger (if browser allows)

## Post-Deployment

1. Announce new features to users
2. Monitor error logs for 24 hours
3. Gather user feedback
4. Iterate on UX based on feedback
5. Consider optional enhancements (AI scheduling, etc.)

---

**Estimated Total Time:** 6-8 hours (including testing)
**Risk Level:** Low (backward compatible)
**Rollback Time:** < 1 minute
