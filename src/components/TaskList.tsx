import { useState } from 'react';
import { LifeTask, OperationType } from '../types';
import { format } from 'date-fns';
import { db, handleFirestoreError } from '../lib/firebase';
import { updateDoc, doc, Timestamp, deleteDoc, serverTimestamp } from 'firebase/firestore';
import { motion, AnimatePresence } from 'motion/react';
import { Check, Trash2, Edit3, AlertCircle, Calendar, Tag, Bell } from 'lucide-react';
import { cn } from '../lib/utils';

export function TaskList({ 
  tasks, 
  onEdit 
}: { 
  tasks: LifeTask[], 
  onEdit: (t: LifeTask) => void 
}) {
  if (tasks.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-12 sm:p-20 border-2 border-dashed border-stone-200 rounded-[2.5rem]">
        <AlertCircle className="w-8 h-8 text-stone-200 mb-4" />
        <p className="text-xs font-bold uppercase tracking-widest text-stone-400">No matching records found</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <AnimatePresence mode="popLayout">
        {tasks.map((task) => (
          <TaskItem key={task.id} task={task} onEdit={onEdit} />
        ))}
      </AnimatePresence>
    </div>
  );
}

function TaskItem({ task, onEdit }: { task: LifeTask, onEdit: (t: LifeTask) => void, key?: string }) {
  const [isDeleting, setIsDeleting] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const toggleStatus = async () => {
    try {
      const taskRef = doc(db, 'tasks', task.id!);
      await updateDoc(taskRef, {
        status: task.status === 'completed' ? 'pending' : 'completed',
        updatedAt: serverTimestamp()
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `tasks/${task.id}`);
    }
  };

  const deleteTask = async () => {
    setIsDeleting(true);
    try {
      await deleteDoc(doc(db, 'tasks', task.id!));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `tasks/${task.id}`);
      setIsDeleting(false);
      setShowConfirm(false);
    }
  };

  const dueDate = task.dueDate instanceof Timestamp ? task.dueDate.toDate() : new Date(task.dueDate);
  const isOverdue = task.status === 'pending' && dueDate < new Date();
  const isCompleted = task.status === 'completed';

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      whileHover={{ y: -2 }}
      className={cn(
        "group bg-white rounded-3xl border border-stone-100 shadow-sm transition-all hover:shadow-md p-6 flex items-center justify-between gap-6",
        isCompleted && "opacity-60 bg-white/50"
      )}
    >
      <div className="flex items-start gap-5 min-w-0">
          <button 
          onClick={toggleStatus}
          className={cn(
            "mt-1 w-6 h-6 rounded-lg border flex-shrink-0 flex-row items-center justify-center transition-all",
            isCompleted 
              ? "bg-secondary border-secondary text-white" 
              : "border-stone-100 hover:border-primary/40 bg-white"
          )}
        >
          {isCompleted && <Check className="w-4 h-4" />}
        </button>

        <div className="min-w-0">
          <div className="flex items-center gap-3 mb-1">
            <h3 className={cn(
              "text-xl font-bold tracking-tight text-black transition-all",
              isCompleted && "line-through text-stone-300"
            )}>
              {task.title}
            </h3>
            {!isCompleted && (
                <span className={cn(
                  "text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full italic border",
                  task.priority === 'high' ? "bg-red-50 text-red-500 border-red-100" :
                  task.priority === 'medium' ? "bg-amber-50 text-amber-500 border-amber-100" :
                  "bg-emerald-50 text-emerald-500 border-emerald-100"
                )}>
                  Priority
                </span>
            )}
          </div>
          
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
            <span className={cn(
                "flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest",
                isOverdue && !isCompleted ? "text-red-500" : "text-primary"
            )}>
              <Calendar className="w-3.5 h-3.5" />
              {isOverdue && !isCompleted ? 'Overdue: ' : ''}{format(dueDate, 'dd/MM/yyyy')}
            </span>
            <span className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-stone-400">
              <Tag className="w-3.5 h-3.5" />
              {task.category}
            </span>
            {task.reminderAt && !isCompleted && (
              <span className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-emerald-500 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100 italic">
                <Bell className="w-3 h-3" />
                Reminder: {format(task.reminderAt instanceof Timestamp ? task.reminderAt.toDate() : new Date(task.reminderAt), 'dd/MM HH:mm')}
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-1 sm:gap-2">
        <AnimatePresence mode="wait">
          {showConfirm ? (
            <motion.div 
              key="confirm"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="flex items-center gap-1 bg-black p-1 rounded-2xl border border-black shadow-lg shadow-black/10"
            >
              <button 
                onClick={() => setShowConfirm(false)}
                className="px-3 py-2 text-[10px] font-bold uppercase tracking-widest text-white/60 hover:text-white transition-colors"
              >
                Cancel
              </button>
              <button 
                onClick={deleteTask}
                disabled={isDeleting}
                className="px-4 py-2 bg-primary text-black rounded-xl text-[10px] font-bold uppercase tracking-widest hover:bg-primary/90 transition-all disabled:opacity-50"
              >
                {isDeleting ? 'Deleting...' : 'Delete'}
              </button>
            </motion.div>
          ) : (
            <>
              <button 
                onClick={() => onEdit(task)}
                className="p-3 bg-white border border-stone-50 text-stone-300 hover:text-black hover:bg-accent/10 rounded-2xl transition-all"
                title="Edit Task"
              >
                <Edit3 className="w-5 h-5" />
              </button>
              <button 
                onClick={() => setShowConfirm(true)}
                className="p-3 bg-white border border-stone-50 text-stone-200 hover:text-red-500 hover:bg-red-50 rounded-2xl transition-all"
                title="Delete Task"
              >
                <Trash2 className="w-5 h-5" />
              </button>
            </>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
