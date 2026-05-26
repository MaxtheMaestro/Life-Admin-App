import { useState, useEffect, FormEvent } from 'react';
import { User } from 'firebase/auth';
import { db, handleFirestoreError } from '../lib/firebase';
import { collection, addDoc, updateDoc, doc, Timestamp, serverTimestamp } from 'firebase/firestore';
import { LifeTask, TaskCategory, TaskPriority, OperationType, Subtask } from '../types';
import { motion } from 'motion/react';
import { X, Save, Plus, Check, Trash2, Loader2, Calendar, Bell, Clock } from 'lucide-react';
import { cn } from '../lib/utils';
import { format } from 'date-fns';
import {
  TASK_CATEGORIES,
  TASK_INPUT_LIMITS,
  TASK_PRIORITIES,
  clampTextInput,
  isTaskCategory,
  isTaskPriority,
  parseBoundedDate,
  parseBoundedDateTime,
  sanitizeMultiLineInput,
  sanitizeSingleLineInput,
  sanitizeSubtasks,
} from '../lib/inputValidation';

export function TaskModal({ 
  isOpen, 
  onClose, 
  user,
  editingTask
}: { 
  isOpen: boolean, 
  onClose: () => void, 
  user: User,
  editingTask?: LifeTask
}) {
  const [title, setTitle] = useState(editingTask?.title || '');
  const [description, setDescription] = useState(editingTask?.description || '');
  const [category, setCategory] = useState<TaskCategory>(editingTask?.category || 'Other');
  const [priority, setPriority] = useState<TaskPriority>(editingTask?.priority || 'medium');
  const [dueDate, setDueDate] = useState(
    editingTask ? format(editingTask.dueDate instanceof Timestamp ? editingTask.dueDate.toDate() : new Date(editingTask.dueDate), 'yyyy-MM-dd') : ''
  );
  const [reminderDate, setReminderDate] = useState(
    editingTask?.reminderAt ? format(editingTask.reminderAt instanceof Timestamp ? editingTask.reminderAt.toDate() : new Date(editingTask.reminderAt), 'yyyy-MM-dd') : ''
  );
  const [reminderTime, setReminderTime] = useState(
    editingTask?.reminderAt ? format(editingTask.reminderAt instanceof Timestamp ? editingTask.reminderAt.toDate() : new Date(editingTask.reminderAt), 'HH:mm') : ''
  );
  const [reminderEnabled, setReminderEnabled] = useState(!!editingTask?.reminderAt);
  const [subtasks, setSubtasks] = useState<Subtask[]>(editingTask?.subtasks || []);
  const [isSaving, setIsSaving] = useState(false);
  const [validationError, setValidationError] = useState('');

  useEffect(() => {
    if (editingTask) {
        setTitle(clampTextInput(editingTask.title || '', TASK_INPUT_LIMITS.title));
        setDescription(clampTextInput(editingTask.description || '', TASK_INPUT_LIMITS.description));
        setCategory(isTaskCategory(editingTask.category) ? editingTask.category : 'Other');
        setPriority(isTaskPriority(editingTask.priority) ? editingTask.priority : 'medium');
        setDueDate(format(editingTask.dueDate instanceof Timestamp ? editingTask.dueDate.toDate() : new Date(editingTask.dueDate), 'yyyy-MM-dd'));
        setSubtasks((editingTask.subtasks || []).slice(0, TASK_INPUT_LIMITS.subtasks));
        
        if (editingTask.reminderAt) {
          const date = editingTask.reminderAt instanceof Timestamp ? editingTask.reminderAt.toDate() : new Date(editingTask.reminderAt);
          setReminderDate(format(date, 'yyyy-MM-dd'));
          setReminderTime(format(date, 'HH:mm'));
          setReminderEnabled(true);
        } else {
          setReminderEnabled(false);
        }
    }
  }, [editingTask]);

  const handleSave = async (e: FormEvent) => {
    e.preventDefault();
    setValidationError('');

    const cleanTitle = sanitizeSingleLineInput(title, TASK_INPUT_LIMITS.title);
    const cleanDescription = sanitizeMultiLineInput(description, TASK_INPUT_LIMITS.description);
    const cleanCategory = isTaskCategory(category) ? category : 'Other';
    const cleanPriority = isTaskPriority(priority) ? priority : 'medium';
    const cleanSubtasks = sanitizeSubtasks(subtasks);
    const parsedDueDate = parseBoundedDate(dueDate);

    if (!cleanTitle || !parsedDueDate) {
      setValidationError('Add a task title and a valid due date.');
      return;
    }

    setIsSaving(true);
    try {
      let reminderAt = null;
      if (reminderEnabled) {
        const parsedReminder = reminderDate && reminderTime
          ? parseBoundedDateTime(reminderDate, reminderTime)
          : null;
        if (!parsedReminder) {
          setValidationError('Choose a valid reminder date and time.');
          return;
        }
        reminderAt = Timestamp.fromDate(parsedReminder);
      }

      const taskData = {
        title: cleanTitle,
        description: cleanDescription,
        category: cleanCategory,
        dueDate: Timestamp.fromDate(parsedDueDate),
        status: editingTask?.status || 'pending',
        priority: cleanPriority,
        userId: user.uid,
        subtasks: cleanSubtasks,
        reminderAt,
        updatedAt: serverTimestamp()
      };

      if (editingTask?.id) {
        await updateDoc(doc(db, 'tasks', editingTask.id), taskData);
      } else {
        await addDoc(collection(db, 'tasks'), {
          ...taskData,
          createdAt: serverTimestamp()
        });
      }
      onClose();
    } catch (error) {
      handleFirestoreError(error, editingTask ? OperationType.UPDATE : OperationType.CREATE, 'tasks');
    } finally {
      setIsSaving(false);
    }
  };

  const addManualSubtask = () => {
    if (subtasks.length >= TASK_INPUT_LIMITS.subtasks) return;
    setSubtasks([...subtasks, { title: '', completed: false }]);
  };

  const updateSubtask = (index: number, val: string) => {
    if (index < 0 || index >= subtasks.length) return;
    const next = [...subtasks];
    next[index].title = clampTextInput(val, TASK_INPUT_LIMITS.subtaskTitle);
    setSubtasks(next);
  };

  const removeSubtask = (index: number) => {
    if (index < 0 || index >= subtasks.length) return;
    setSubtasks(subtasks.filter((_, i) => i !== index));
  };

  const toggleSubtask = (index: number) => {
    if (index < 0 || index >= subtasks.length) return;
    const next = [...subtasks];
    next[index].completed = !next[index].completed;
    setSubtasks(next);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-[#141414]/80 backdrop-blur-sm" 
      />
      
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="relative w-full max-w-2xl bg-white rounded-[2.5rem] border border-stone-200 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
      >
        <div className="flex items-center justify-between p-8 border-b border-stone-100">
          <div>
            <h2 className="text-3xl font-bold tracking-tighter text-black font-display italic uppercase">
              {editingTask ? 'Edit Task' : 'New Entry'}
            </h2>
            <p className="text-primary font-bold text-[10px] uppercase tracking-widest mt-1">Registry Update Interface</p>
          </div>
          <button onClick={onClose} className="p-3 hover:bg-accent/5 rounded-2xl transition-colors">
            <X className="w-6 h-6 text-stone-400" />
          </button>
        </div>

        <form onSubmit={handleSave} className="flex-1 overflow-y-auto p-8 custom-scrollbar">
          <div className="space-y-8">
            <section className="space-y-6">
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-widest text-stone-400 px-1">Task Title</label>
                <input 
                  autoFocus
                  required
                  value={title}
                  maxLength={TASK_INPUT_LIMITS.title}
                  onChange={e => setTitle(clampTextInput(e.target.value, TASK_INPUT_LIMITS.title))}
                  placeholder="e.g., Renew International Passport"
                  className="w-full bg-white border border-stone-100 rounded-2xl p-4 font-bold text-xl focus:ring-2 focus:ring-accent/30 transition-all placeholder:text-stone-300"
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-widest text-stone-400 px-1">Observations</label>
                <textarea 
                  value={description}
                  maxLength={TASK_INPUT_LIMITS.description}
                  onChange={e => setDescription(clampTextInput(e.target.value, TASK_INPUT_LIMITS.description))}
                  placeholder="Add context, reference numbers, or crucial notes..."
                  rows={3}
                  className="w-full bg-white border border-stone-100 rounded-2xl p-4 text-sm focus:ring-2 focus:ring-stone-200 transition-all font-medium placeholder:text-stone-300"
                />
              </div>
            </section>

            <section className="grid grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-widest text-stone-400 px-1">Classification</label>
                <select 
                  value={category}
                  onChange={e => setCategory(e.target.value as TaskCategory)}
                  className="w-full bg-white border border-stone-100 rounded-2xl p-4 text-sm font-bold focus:ring-2 focus:ring-stone-200"
                >
                  {TASK_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-widest text-stone-400 px-1">Deadline</label>
                <div className="relative">
                  <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
                  <input 
                    type="date"
                    required
                    value={dueDate}
                    min="2000-01-01"
                    max="2100-12-31"
                    onChange={e => setDueDate(e.target.value)}
                    className="w-full bg-white border border-stone-100 rounded-2xl p-4 pl-12 text-sm font-bold focus:ring-2 focus:ring-stone-200"
                  />
                </div>
              </div>
            </section>

            <section className="space-y-2">
               <label className="text-xs font-bold uppercase tracking-widest text-stone-400 px-1">Priority Level</label>
               <div className="flex gap-3">
                {TASK_PRIORITIES.map(p => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setPriority(p)}
                    className={cn(
                      "flex-1 py-3 rounded-2xl text-xs font-bold uppercase tracking-widest border transition-all",
                      priority === p 
                        ? "bg-primary text-black border-primary shadow-lg shadow-primary/20" 
                        : "bg-white border-stone-100 text-stone-300 hover:text-black hover:border-primary/30 shadow-sm"
                    )}
                  >
                    {p}
                  </button>
                ))}
              </div>
            </section>

            <section className="space-y-4 pt-6 border-t border-stone-100">
               <div className="flex items-center justify-between px-1">
                 <div className="flex items-center gap-2">
                    <Bell className={cn("w-4 h-4", reminderEnabled ? "text-primary" : "text-stone-300")} />
                    <label className="text-xs font-bold uppercase tracking-widest text-stone-400">Scheduled Reminder</label>
                 </div>
                 <button 
                  type="button"
                  onClick={() => setReminderEnabled(!reminderEnabled)}
                  className={cn(
                    "relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none",
                    reminderEnabled ? "bg-primary" : "bg-stone-200"
                  )}
                 >
                   <span className={cn(
                     "inline-block h-4 w-4 transform rounded-full bg-white transition-transform",
                     reminderEnabled ? "translate-x-6" : "translate-x-1"
                   )} />
                 </button>
               </div>

               {reminderEnabled && (
                 <motion.div 
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className="grid grid-cols-2 gap-4"
                 >
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold uppercase tracking-widest text-stone-400 px-1">Reminder Date</label>
                      <div className="relative">
                        <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
                        <input 
                          type="date"
                          required={reminderEnabled}
                          value={reminderDate}
                          min="2000-01-01"
                          max="2100-12-31"
                          onChange={e => setReminderDate(e.target.value)}
                          className="w-full bg-stone-50 border border-stone-100 rounded-2xl p-4 pl-12 text-sm font-bold focus:ring-2 focus:ring-primary/20"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold uppercase tracking-widest text-stone-400 px-1">Reminder Time</label>
                      <div className="relative">
                        <Clock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
                        <input 
                          type="time"
                          required={reminderEnabled}
                          value={reminderTime}
                          onChange={e => setReminderTime(e.target.value)}
                          className="w-full bg-stone-50 border border-stone-100 rounded-2xl p-4 pl-12 text-sm font-bold focus:ring-2 focus:ring-primary/20"
                        />
                      </div>
                    </div>
                 </motion.div>
               )}
            </section>

            <section className="space-y-4 pt-6 border-t border-stone-100">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold uppercase tracking-widest text-stone-400 px-1">Procedural Checklist</label>
                <div className="flex gap-2">
                  <button 
                    type="button"
                    onClick={addManualSubtask}
                    disabled={subtasks.length >= TASK_INPUT_LIMITS.subtasks}
                    className="flex items-center gap-2 px-3 py-1.5 bg-stone-50 text-stone-500 rounded-xl text-[10px] font-bold uppercase tracking-widest hover:bg-stone-100 transition-all border border-stone-100 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <Plus className="w-3 h-3" /> Add Step
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                {subtasks.map((st, i) => (
                  <div key={i} className="flex items-center gap-3 p-2 bg-white border border-stone-100 rounded-2xl group transition-all">
                    <button 
                      type="button"
                      onClick={() => toggleSubtask(i)}
                      className={cn(
                        "w-5 h-5 rounded-lg border-2 flex-shrink-0 flex items-center justify-center transition-all",
                        st.completed ? "bg-secondary border-secondary text-white" : "border-stone-200 bg-white"
                      )}
                    >
                      {st.completed && <Check className="w-3 h-3" />}
                    </button>
                    <input 
                      value={st.title}
                      maxLength={TASK_INPUT_LIMITS.subtaskTitle}
                      onChange={e => updateSubtask(i, e.target.value)}
                      placeholder="Add checklist item..."
                      className={cn(
                        "flex-1 bg-transparent border-none p-0 text-sm font-medium focus:ring-0",
                        st.completed && "line-through text-stone-400"
                      )}
                    />
                    <button 
                      type="button"
                      onClick={() => removeSubtask(i)}
                      className="opacity-0 group-hover:opacity-100 transition-opacity p-2 text-stone-300 hover:text-red-500"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </section>
          </div>

          <div className="mt-12 space-y-4">
            {validationError && (
              <p className="rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-xs font-bold uppercase tracking-widest text-red-500">
                {validationError}
              </p>
            )}
            <button
              type="submit"
              disabled={isSaving}
              className="w-full bg-primary text-white py-5 rounded-[2rem] flex items-center justify-center gap-3 hover:bg-primary/90 transition-all shadow-xl shadow-primary/10 disabled:opacity-50"
            >
              {isSaving ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <Save className="w-5 h-5 transition-transform" />
              )}
              <span className="font-bold tracking-tight text-lg">Save Record</span>
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}
