import React, { useState, useEffect } from 'react';
import { useStudyPlanner } from '@/contexts/StudyPlannerContext';
import { useSessionNotes } from '@/hooks/useSessionNotes';
import { PomodoroTimer } from './PomodoroTimer';
import { X, FileText, Download, Eye } from 'lucide-react';
import { storageService } from '@/services/storageService';

interface FocusModeProps {
  onClose?: () => void;
}

export function FocusMode({ onClose }: FocusModeProps) {
  const {
    state,
    closeFocusMode,
    markEventComplete,
    skipToNextEvent,
    getMaterialsByTask,
    createSessionNote,
    updateSessionNote,
  } = useStudyPlanner();

  const { focusMode } = state;
  const { notes, updateNote } = useSessionNotes(focusMode.studyEventId || '');

  const event = state.scheduleEvents.find((e) => e.id === focusMode.studyEventId);
  const task = focusMode.taskId ? state.tasks.find((t) => t.id === focusMode.taskId) : null;
  const materials = task ? getMaterialsByTask(task.id) : [];
  const sessionNote = notes[0];

  const [notesContent, setNotesContent] = useState(sessionNote?.content || '');
  const [autoSaveTimer, setAutoSaveTimer] = useState<NodeJS.Timeout | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [showPreview, setShowPreview] = useState(false);

  // Auto-save notes every 30 seconds
  useEffect(() => {
    if (autoSaveTimer) clearTimeout(autoSaveTimer);

    const timer = setTimeout(() => {
      if (sessionNote?.id && notesContent !== sessionNote.content) {
        updateNote(sessionNote.id, notesContent);
      } else if (!sessionNote && notesContent) {
        createSessionNote(focusMode.studyEventId || '', notesContent);
      }
    }, 30000);

    setAutoSaveTimer(timer);
    return () => clearTimeout(timer);
  }, [notesContent, sessionNote, createSessionNote, updateNote, focusMode.studyEventId]);

  // Generate preview URL for material
  const handlePreview = async (materialId: string) => {
    const material = materials.find((m) => m.id === materialId);
    if (material && material.filePath) {
      try {
        const url = await storageService.getSignedUrl(material.filePath);
        setPreviewUrl(url);
        setShowPreview(true);
      } catch (error) {
        console.error('Failed to generate preview URL:', error);
      }
    }
  };

  // Download material
  const handleDownload = async (materialId: string) => {
    const material = materials.find((m) => m.id === materialId);
    if (material && material.filePath) {
      try {
        const url = await storageService.getSignedUrl(material.filePath);
        const link = document.createElement('a');
        link.href = url;
        link.download = material.fileName || material.title;
        link.click();
      } catch (error) {
        console.error('Failed to download file:', error);
      }
    }
  };

  const handleComplete = () => {
    if (sessionNote?.id && notesContent !== sessionNote.content) {
      updateNote(sessionNote.id, notesContent);
    }
    markEventComplete(event?.id || '');
    closeFocusMode();
    onClose?.();
  };

  const handleSkip = () => {
    if (sessionNote?.id && notesContent !== sessionNote.content) {
      updateNote(sessionNote.id, notesContent);
    }
    skipToNextEvent(event?.id || '');
    closeFocusMode();
    onClose?.();
  };

  if (!focusMode.isOpen || !event) return null;

  return (
    <>
      {/* Main FocusMode Modal */}
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
        <div className="bg-white rounded-xl w-11/12 max-w-3xl max-h-[90vh] overflow-y-auto shadow-2xl animate-in fade-in zoom-in-95">
          {/* Header */}
          <div className="flex justify-between items-start p-6 border-b bg-gradient-to-r from-blue-50 to-indigo-50 sticky top-0">
            <div className="flex-1">
              <h2 className="text-2xl font-bold text-gray-800">{task?.title || 'Focus Session'}</h2>
              <p className="text-sm text-gray-600 mt-1">📅 {event.title}</p>
              {event.status && (
                <div className="mt-2">
                  <span
                    className={`inline-block px-3 py-1 rounded-full text-xs font-medium ${
                      event.status === 'in_progress'
                        ? 'bg-green-100 text-green-800'
                        : 'bg-blue-100 text-blue-800'
                    }`}
                  >
                    {event.status === 'in_progress' ? '🟢 In Progress' : '🔵 Scheduled'}
                  </span>
                </div>
              )}
            </div>
            <button
              onClick={() => {
                closeFocusMode();
                onClose?.();
              }}
              className="p-2 hover:bg-gray-200 rounded-lg transition text-gray-600 hover:text-gray-800"
              aria-label="Close"
            >
              <X size={24} />
            </button>
          </div>

          {/* Body */}
          <div className="p-6 space-y-6">
            {/* Task Description */}
            {task?.description && (
              <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                <h3 className="font-semibold text-gray-700 mb-2">📝 Description</h3>
                <p className="text-gray-600 text-sm leading-relaxed">{task.description}</p>
              </div>
            )}

            {/* Materials Section */}
            {materials.length > 0 && (
              <div>
                <h3 className="font-semibold text-gray-700 mb-3 flex items-center gap-2">
                  <FileText size={18} />
                  Attached Materials ({materials.length})
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {materials.map((material) => (
                    <div
                      key={material.id}
                      className="border rounded-lg p-4 hover:bg-blue-50 transition bg-white"
                    >
                      <p className="text-sm font-medium text-gray-700 truncate mb-3">
                        📄 {material.fileName || material.title}
                      </p>
                      {material.fileSize && (
                        <p className="text-xs text-gray-500 mb-3">
                          {(material.fileSize / 1024 / 1024).toFixed(2)} MB
                        </p>
                      )}
                      <div className="flex gap-2">
                        <button
                          onClick={() => handlePreview(material.id)}
                          className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded hover:bg-blue-200 transition flex items-center gap-1"
                        >
                          <Eye size={12} /> Preview
                        </button>
                        <button
                          onClick={() => handleDownload(material.id)}
                          className="text-xs px-2 py-1 bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition flex items-center gap-1"
                        >
                          <Download size={12} /> Download
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Session Notes Editor */}
            <div className="bg-gradient-to-br from-purple-50 to-indigo-50 rounded-lg p-4 border border-purple-200">
              <label className="font-semibold text-gray-700 mb-2 block flex items-center gap-2">
                <FileText size={18} />
                Session Notes
              </label>
              <textarea
                className="w-full border border-purple-300 rounded-lg p-3 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                placeholder="Take notes during your session... (auto-saves every 30 seconds)"
                rows={6}
                value={notesContent}
                onChange={(e) => setNotesContent(e.target.value)}
              />
              <p className="text-xs text-gray-500 mt-2">
                💾 Changes auto-save every 30 seconds
              </p>
            </div>

            {/* Pomodoro Timer */}
            <div className="bg-gradient-to-br from-orange-50 to-red-50 rounded-lg p-4 border border-orange-200">
              <h3 className="font-semibold text-gray-700 mb-3 flex items-center gap-2">
                ⏱️ Timer
              </h3>
              <PomodoroTimer taskId={task?.id} />
            </div>

            {/* Task Notes (if exists) */}
            {task?.notes && (
              <div className="bg-yellow-50 rounded-lg p-4 border border-yellow-200">
                <h3 className="font-semibold text-gray-700 mb-2 flex items-center gap-2">
                  🗒️ Task Notes
                </h3>
                <p className="text-sm text-gray-600 whitespace-pre-wrap">{task.notes}</p>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex gap-3 p-6 border-t bg-gray-50 sticky bottom-0">
            <button
              onClick={handleComplete}
              className="flex-1 bg-green-600 hover:bg-green-700 text-white font-medium rounded-lg px-4 py-3 transition shadow-md hover:shadow-lg flex items-center justify-center gap-2"
            >
              ✓ Mark Complete
            </button>
            <button
              onClick={handleSkip}
              className="flex-1 bg-orange-600 hover:bg-orange-700 text-white font-medium rounded-lg px-4 py-3 transition shadow-md hover:shadow-lg flex items-center justify-center gap-2"
            >
              ⊗ Skip Session
            </button>
          </div>
        </div>
      </div>

      {/* Preview Modal */}
      {showPreview && previewUrl && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-[60]" onClick={() => setShowPreview(false)}>
          <div className="bg-white rounded-lg w-11/12 max-w-4xl max-h-[80vh] overflow-auto">
            <div className="flex justify-between items-center p-4 border-b sticky top-0 bg-white">
              <h3 className="font-semibold">Preview</h3>
              <button onClick={() => setShowPreview(false)} className="text-gray-500 hover:text-gray-700">
                <X size={24} />
              </button>
            </div>
            <div className="p-4">
              <iframe
                src={previewUrl}
                className="w-full h-[600px] border rounded"
                title="Material Preview"
              />
            </div>
          </div>
        </div>
      )}
    </>
  );
}
