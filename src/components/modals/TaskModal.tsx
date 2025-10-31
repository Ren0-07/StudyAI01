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
          priority: 'medium',
          difficulty: 'medium',
          subject: '',
          dueDate: '',
          dueTime: '',
          estimate: '',
          reminder: ''
        })
      }
    } else {
      // Reset everything when modal closes
      setFormData({
        title: '',
        description: '',
        priority: 'medium',
        difficulty: 'medium',
        subject: '',
        dueDate: '',
        dueTime: '',
        estimate: '',
        reminder: ''
      })
    }
  }, [isOpen, editingTaskId, getTaskById])

  const handleSubmit = () => {
    if (!formData.title.trim()) return

    const taskData = {
      title: formData.title.trim(),
      description: formData.description.trim() || undefined,
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

    if (editingTaskId) {
      const existingTask = getTaskById(editingTaskId)
      if (existingTask) {
        updateTask({
          ...existingTask,
          ...taskData
        })
      }
    } else {
      addTask(taskData)
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

          {/* Actions */}
          <div className="flex gap-3 pt-4 border-t">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button 
              onClick={handleSubmit}
              disabled={!formData.title.trim()}
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