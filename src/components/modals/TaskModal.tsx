import React, { useState, useEffect, useRef } from 'react'
import { motion } from 'framer-motion'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { useStudyPlanner } from '@/contexts/StudyPlannerContext'
import { storageService } from '@/services/storageService'
import {
  Plus,
  X,
  Upload,
  FileText,
  Eye,
  Download,
  Trash2,
  PaperclipIcon,
  Calendar,
  Clock
} from 'lucide-react'

interface TaskModalProps {
  isOpen: boolean
  onClose: () => void
  editingTaskId?: string | null
}

export function TaskModal({ isOpen, onClose, editingTaskId }: TaskModalProps) {
  const {
    state,
    addTask,
    updateTask,
    getTaskById,
    addMaterial,
    addScheduleEvent
  } = useStudyPlanner()

  const [formData, setFormData] = useState<{
    title: string
    description: string
    notes: string
    priority: 'low' | 'medium' | 'high' | 'urgent'
    difficulty: 'easy' | 'medium' | 'hard'
    subject: string
    dueDate: string
    dueTime: string
    estimate: string
    reminder: string
  }>({
    title: '',
    description: '',
    notes: '',
    priority: 'medium',
    difficulty: 'medium',
    subject: '',
    dueDate: '',
    dueTime: '',
    estimate: '',
    reminder: ''
  })

  const [attachedFiles, setAttachedFiles] = useState<any[]>([])
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState<{ fileName: string; progress: number }[]>([])
  const [scheduleEvent, setScheduleEvent] = useState(false)
  const [eventStartTime, setEventStartTime] = useState('')
  const [eventDuration, setEventDuration] = useState(60)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    // Only reset form when modal opens/closes or when explicitly editing a different task
    if (isOpen) {
      if (editingTaskId) {
        const task = getTaskById(editingTaskId)
        if (task) {
          setFormData({
            title: task.title,
            description: task.description || '',
            notes: task.notes || '',
            priority: task.priority,
            difficulty: task.difficulty || 'medium',
            subject: task.subject || '',
            dueDate: task.dueDate || '',
            dueTime: task.dueTime || '',
            estimate: task.estimate || '',
            reminder: task.reminder || ''
          })
        }
      } else {
        // Only reset if we're opening a fresh modal (not during file upload)
        setFormData({
          title: '',
          description: '',
          notes: '',
          priority: 'medium',
          difficulty: 'medium',
          subject: '',
          dueDate: '',
          dueTime: '',
          estimate: '',
          reminder: ''
        })
      }
      setAttachedFiles([])
      setScheduleEvent(false)
      setEventStartTime('')
      setEventDuration(60)
    } else {
      // Reset everything when modal closes
      setFormData({
        title: '',
        description: '',
        notes: '',
        priority: 'medium',
        difficulty: 'medium',
        subject: '',
        dueDate: '',
        dueTime: '',
        estimate: '',
        reminder: ''
      })
      setAttachedFiles([])
      setScheduleEvent(false)
    }
  }, [isOpen, editingTaskId, getTaskById])

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    if (files.length === 0) return

    setUploading(true)
    const newFiles = [...attachedFiles]

    for (const file of files) {
      try {
        // Add progress tracker
        setUploadProgress((prev) => [...prev, { fileName: file.name, progress: 0 }])

        const { path, error } = await storageService.uploadFile(
          file,
          `materials/temp`
        )

        if (error) throw new Error(error)

        // Create material object
        const material = {
          id: crypto.randomUUID(),
          title: file.name,
          fileName: file.name,
          fileSize: file.size,
          type: storageService.getFileType(file.name),
          filePath: path,
          taskIds: [],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        }

        newFiles.push(material)

        // Update progress
        setUploadProgress((prev) =>
          prev.map((p) => (p.fileName === file.name ? { ...p, progress: 100 } : p))
        )
      } catch (error) {
        console.error(`Failed to upload ${file.name}:`, error)
      }
    }

    setAttachedFiles(newFiles)
    setUploading(false)
    setUploadProgress([])
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const handleRemoveFile = (fileId: string) => {
    setAttachedFiles(attachedFiles.filter((f) => f.id !== fileId))
  }

  const handleSubmit = async () => {
    if (!formData.title.trim()) return

    const taskData = {
      title: formData.title.trim(),
      description: formData.description.trim() || undefined,
      notes: formData.notes.trim() || undefined,
      completed: false,
      priority: formData.priority,
      difficulty: formData.difficulty,
      subject: formData.subject || undefined,
      dueDate: formData.dueDate || undefined,
      dueTime: formData.dueTime || undefined,
      estimate: formData.estimate || undefined,
      reminder: formData.reminder || undefined,
      progress: 0
    }

    let taskId = editingTaskId

    if (editingTaskId) {
      const existingTask = getTaskById(editingTaskId)
      if (existingTask) {
        updateTask({
          ...existingTask,
          ...taskData
        })
      }
    } else {
      taskId = addTask(taskData)
    }

    // Add attached materials to task
    if (taskId && attachedFiles.length > 0) {
      for (const file of attachedFiles) {
        const material = {
          ...file,
          taskIds: [taskId],
          filePath: file.filePath,
        }
        addMaterial(material)
      }
    }

    // Create schedule event if requested
    if (scheduleEvent && taskId && eventStartTime) {
      const startTime = new Date(eventStartTime)
      const endTime = new Date(startTime.getTime() + eventDuration * 60 * 1000)

      addScheduleEvent({
        title: formData.title.trim(),
        description: formData.description.trim() || undefined,
        startTime: startTime.toISOString(),
        endTime: endTime.toISOString(),
        type: 'task',
        taskId: taskId,
        color: '#3b82f6',
        status: 'scheduled',
      })
    }

    onClose()
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {editingTaskId ? 'Edit Task' : 'Create New Task'}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Basic Task Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="text-sm font-medium text-muted-foreground mb-2 block">
                Title *
              </label>
              <Input
                placeholder="Task title..."
                value={formData.title}
                onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
              />
            </div>

            <div>
              <label className="text-sm font-medium text-muted-foreground mb-2 block">
                Priority
              </label>
              <Select 
                value={formData.priority} 
                onValueChange={(value: 'low' | 'medium' | 'high' | 'urgent') => 
                  setFormData(prev => ({ ...prev, priority: value }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="urgent">Urgent</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium text-muted-foreground mb-2 block">
                Difficulty
              </label>
              <Select 
                value={formData.difficulty} 
                onValueChange={(value: 'easy' | 'medium' | 'hard') => 
                  setFormData(prev => ({ ...prev, difficulty: value }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="easy">Easy</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="hard">Hard</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium text-muted-foreground mb-2 block">
                Subject
              </label>
              <Select 
                value={formData.subject} 
                onValueChange={(value) => setFormData(prev => ({ ...prev, subject: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select subject" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No Subject</SelectItem>
                  {['Mathematics', 'Computer Science', 'Physics', 'Chemistry', 'Biology', 'History', 'Literature', 'Economics', 'Psychology', 'Other'].map(subject => (
                    <SelectItem key={subject} value={subject}>{subject}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium text-muted-foreground mb-2 block">
                Estimate
              </label>
              <Select 
                value={formData.estimate} 
                onValueChange={(value) => setFormData(prev => ({ ...prev, estimate: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Time estimate" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No Estimate</SelectItem>
                  <SelectItem value="15m">15 minutes</SelectItem>
                  <SelectItem value="30m">30 minutes</SelectItem>
                  <SelectItem value="1h">1 hour</SelectItem>
                  <SelectItem value="2h">2 hours</SelectItem>
                  <SelectItem value="4h">4 hours</SelectItem>
                  <SelectItem value="1d">1 day</SelectItem>
                  <SelectItem value="2d">2 days</SelectItem>
                  <SelectItem value="1w">1 week</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium text-muted-foreground mb-2 block">
                Due Date
              </label>
              <Input
                type="date"
                value={formData.dueDate}
                onChange={(e) => setFormData(prev => ({ ...prev, dueDate: e.target.value }))}
              />
            </div>

            <div>
              <label className="text-sm font-medium text-muted-foreground mb-2 block">
                Due Time
              </label>
              <Input
                type="time"
                value={formData.dueTime}
                onChange={(e) => setFormData(prev => ({ ...prev, dueTime: e.target.value }))}
              />
            </div>
          </div>

          <div>
            <label className="text-sm font-medium text-muted-foreground mb-2 block">
              Description
            </label>
            <Textarea
              placeholder="Task description..."
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              rows={3}
            />
          </div>

          {/* Task Notes */}
          <div>
            <label className="text-sm font-medium text-muted-foreground mb-2 block">
              Task Notes (Optional)
            </label>
            <Textarea
              placeholder="Add notes to this task..."
              maxLength={1000}
              rows={3}
              value={formData.notes}
              onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
            />
            <p className="text-xs text-muted-foreground mt-1">
              {(formData.notes || '').length}/1000 characters
            </p>
          </div>

          {/* File Attachments */}
          <div className="space-y-3">
            <div>
              <label className="text-sm font-medium text-muted-foreground mb-2 block">
                Attach Files (Optional)
              </label>
              <div className="flex gap-2">
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  onChange={handleFileSelect}
                  disabled={uploading}
                  className="hidden"
                  accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.zip"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                  className="gap-2"
                >
                  <Upload size={16} />
                  {uploading ? 'Uploading...' : 'Add Files'}
                </Button>
              </div>
            </div>

            {/* Upload Progress */}
            {uploadProgress.length > 0 && (
              <div className="space-y-2">
                {uploadProgress.map((item) => (
                  <div key={item.fileName} className="flex items-center gap-2">
                    <span className="text-xs flex-1 truncate">{item.fileName}</span>
                    <div className="w-20 h-2 bg-gray-200 rounded overflow-hidden">
                      <div
                        className="h-full bg-blue-600 transition-all"
                        style={{ width: `${item.progress}%` }}
                      />
                    </div>
                    <span className="text-xs text-muted-foreground">{item.progress}%</span>
                  </div>
                ))}
              </div>
            )}

            {/* Attached Files List */}
            {attachedFiles.length > 0 && (
              <div className="space-y-2">
                <p className="text-sm font-medium text-muted-foreground">
                  Attached Files ({attachedFiles.length})
                </p>
                {attachedFiles.map((material) => (
                  <div key={material.id} className="flex items-center justify-between p-2 bg-muted rounded">
                    <span className="text-sm truncate flex items-center gap-2">
                      <FileText size={14} />
                      {material.fileName}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleRemoveFile(material.id)}
                      className="text-red-600 hover:text-red-800 p-1"
                    >
                      <X size={16} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Schedule Event */}
          <div className="space-y-3 border-t pt-4">
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="schedule"
                checked={scheduleEvent}
                onChange={(e) => setScheduleEvent(e.target.checked)}
                className="rounded cursor-pointer"
              />
              <label htmlFor="schedule" className="text-sm font-medium text-muted-foreground cursor-pointer">
                Add to Schedule
              </label>
            </div>

            {scheduleEvent && (
              <div className="space-y-3 p-3 bg-blue-50 rounded border border-blue-200">
                <div>
                  <label className="text-sm font-medium text-muted-foreground mb-2 block">
                    Session Start Time
                  </label>
                  <Input
                    type="datetime-local"
                    value={eventStartTime}
                    onChange={(e) => setEventStartTime(e.target.value)}
                    className="bg-white"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground mb-2 block">
                    Duration (minutes)
                  </label>
                  <Input
                    type="number"
                    min={15}
                    max={480}
                    step={15}
                    value={eventDuration}
                    onChange={(e) => setEventDuration(parseInt(e.target.value))}
                    className="bg-white"
                  />
                </div>
                {eventStartTime && (
                  <div className="text-xs text-muted-foreground bg-white p-2 rounded">
                    <p>
                      📅 Scheduled: {new Date(eventStartTime).toLocaleString()} →{' '}
                      {new Date(new Date(eventStartTime).getTime() + eventDuration * 60000).toLocaleTimeString()}
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-4 border-t">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={!formData.title.trim() || uploading}
              className="bg-gradient-to-r from-blue-600 to-purple-600 text-white"
            >
              {editingTaskId ? 'Update Task' : 'Create Task'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}