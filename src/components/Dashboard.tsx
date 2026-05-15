import { useState, useEffect, ReactNode } from 'react';
import { User } from 'firebase/auth';
import { collection, query, where, onSnapshot, orderBy, Timestamp, addDoc, updateDoc, deleteDoc, doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db, logout, handleFirestoreError } from '../lib/firebase';
import { cn } from '../lib/utils';
import { LifeTask, TaskCategory, OperationType } from '../types';
import { TaskList } from './TaskList';
import { TaskModal } from './TaskModal';
import { Sidebar } from './Sidebar';
import { LogOut, Plus, Search, Calendar, CheckSquare, Clock, Menu, Bell, BellOff, Archive, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { format } from 'date-fns';
import { NotificationService } from '../services/notificationService';

export function Dashboard({ user }: { user: User }) {
  const [tasks, setTasks] = useState<LifeTask[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<TaskCategory | 'All'>('All');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [editingTask, setEditingTask] = useState<LifeTask | undefined>(undefined);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [filterMode, setFilterMode] = useState<'all' | 'pending' | 'overdue' | 'active' | 'archived'>('all');
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission>(
    NotificationService.currentPermission()
  );
  const [isMuted, setIsMuted] = useState(NotificationService.isMuted());

  useEffect(() => {
    // Check if we should prompt for notifications
    if (NotificationService.currentPermission() === 'default') {
      const timer = setTimeout(() => {
        handleRequestNotifications();
      }, 2000); // Prompt after 2 seconds
      return () => clearTimeout(timer);
    }
  }, []);

  const handleToggleMute = () => {
    const newMuteState = !isMuted;
    setIsMuted(newMuteState);
    NotificationService.setMuted(newMuteState);
    
    if (!newMuteState && NotificationService.currentPermission() === 'default') {
      handleRequestNotifications();
    }
  };

  const handleRequestNotifications = async () => {
    const permission = await NotificationService.requestPermission();
    setNotificationPermission(permission);
    if (permission === 'granted') {
      NotificationService.testNotification();
    }
  };

  useEffect(() => {
    // Notify about overdue tasks if permission is granted
    if (notificationPermission === 'granted' && tasks.length > 0) {
      const overdueTasks = tasks.filter(t => {
        const now = new Date();
        const due = t.dueDate instanceof Timestamp ? t.dueDate.toDate() : new Date(t.dueDate);
        return t.status === 'pending' && due < now;
      });

      if (overdueTasks.length > 0) {
        const lastNotifiedCount = parseInt(localStorage.getItem('last_notified_overdue') || '0');
        if (overdueTasks.length > lastNotifiedCount) {
          NotificationService.sendNotification('Overdue Tasks Detected', {
            body: `You have ${overdueTasks.length} tasks that require immediate attention.`,
            tag: 'overdue-alert'
          });
          localStorage.setItem('last_notified_overdue', overdueTasks.length.toString());
        }
      }
    }
  }, [notificationPermission, tasks]);

  useEffect(() => {
    // Check for scheduled reminders every 30 seconds
    if (notificationPermission !== 'granted' || tasks.length === 0) return;

    const interval = setInterval(() => {
      const now = new Date();
      const currentMinuteStr = format(now, 'yyyy-MM-dd HH:mm');

      tasks.forEach(task => {
        if (task.status === 'pending' && task.reminderAt) {
          const reminderDate = task.reminderAt instanceof Timestamp ? task.reminderAt.toDate() : new Date(task.reminderAt);
          const reminderMinuteStr = format(reminderDate, 'yyyy-MM-dd HH:mm');

          if (currentMinuteStr === reminderMinuteStr) {
            const notifyKey = `notified_rem_${task.id}_${reminderMinuteStr}`;
            if (!localStorage.getItem(notifyKey)) {
              NotificationService.sendNotification(`Task Reminder: ${task.title}`, {
                body: task.description || 'Your scheduled reminder is active.',
                tag: `task-reminder-${task.id}`,
                requireInteraction: true
              });
              localStorage.setItem(notifyKey, 'true');
            }
          }
        }
      });
    }, 30000);

    return () => clearInterval(interval);
  }, [notificationPermission, tasks]);

  useEffect(() => {
    // Ensure user profile exists
    const ensureUserProfile = async () => {
      const userRef = doc(db, 'users', user.uid);
      const userSnap = await getDoc(userRef);
      if (!userSnap.exists()) {
        await setDoc(userRef, {
          email: user.email,
          displayName: user.displayName,
          photoURL: user.photoURL,
          createdAt: serverTimestamp(),
        });
      }
    };
    ensureUserProfile();

    // Listen for tasks
    let q = query(
      collection(db, 'tasks'),
      where('userId', '==', user.uid),
      orderBy('dueDate', 'asc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const tasksData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as LifeTask[];
      setTasks(tasksData);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'tasks');
    });

    return () => unsubscribe();
  }, [user]);

  const filteredTasks = tasks.filter(task => {
    const matchesCategory = selectedCategory === 'All' || task.category === selectedCategory;
    const matchesSearch = task.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         task.description?.toLowerCase().includes(searchQuery.toLowerCase());
    
    if (!matchesCategory || !matchesSearch) return false;

    const now = new Date();
    const due = task.dueDate instanceof Timestamp ? task.dueDate.toDate() : new Date(task.dueDate);

    // Default view: exclude completed tasks unless in archived mode
    if (filterMode !== 'archived' && task.status === 'completed') return false;

    if (filterMode === 'pending') return task.status === 'pending';
    if (filterMode === 'overdue') return task.status === 'pending' && due < now;
    if (filterMode === 'active') {
        const next7Days = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
        return task.status === 'pending' && due >= now && due < next7Days;
    }
    if (filterMode === 'archived') return task.status === 'completed';
    
    return true;
  });

  const now = new Date();
  const endOfDay = new Date(now);
  endOfDay.setHours(23, 59, 59, 999);
  
  const todayTasks = tasks.filter(t => {
    const due = t.dueDate instanceof Timestamp ? t.dueDate.toDate() : new Date(t.dueDate);
    return t.status === 'pending' && due <= endOfDay && due >= new Date(new Date().setHours(0,0,0,0));
  });

  const stats = {
    total: tasks.length,
    pending: tasks.filter(t => t.status === 'pending').length,
    completed: tasks.filter(t => t.status === 'completed').length,
    upcomingCount: tasks.filter(t => {
        const now = new Date();
        const due = t.dueDate instanceof Timestamp ? t.dueDate.toDate() : new Date(t.dueDate);
        return t.status === 'pending' && due > now && due < new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    }).length,
    overdueCount: tasks.filter(t => {
        const now = new Date();
        const due = t.dueDate instanceof Timestamp ? t.dueDate.toDate() : new Date(t.dueDate);
        return t.status === 'pending' && due < now;
    }).length,
    completionRate: tasks.length > 0 ? (tasks.filter(t => t.status === 'completed').length / tasks.length) * 100 : 0,
    recentCompleted: tasks.filter(t => {
      if (t.status !== 'completed' || !t.updatedAt) return false;
      const updated = t.updatedAt instanceof Timestamp ? t.updatedAt.toDate() : new Date(t.updatedAt);
      const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      return updated > sevenDaysAgo;
    }).length
  };

  const handleEditTask = (task: LifeTask) => {
    setEditingTask(task);
    setIsModalOpen(true);
  };

  return (
    <div className="flex h-screen h-[100dvh] overflow-hidden relative">
      {/* Background Ripple */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden z-0 opacity-30">
        {[...Array(2)].map((_, i) => (
          <motion.div
            key={i}
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{
              scale: [0.8, 1.2, 1.5],
              opacity: [0, 0.2, 0],
            }}
            transition={{
              duration: 12,
              repeat: Number.POSITIVE_INFINITY,
              delay: i * 6,
              ease: "easeInOut",
            }}
            className="absolute -top-1/4 -left-1/4 w-[150%] h-[150%] border-4 border-primary/10 rounded-full"
          />
        ))}
      </div>

      {/* Mobile Sidebar Overlay */}
      <AnimatePresence>
        {isSidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsSidebarOpen(false)}
            className="fixed inset-0 bg-stone-900/60 backdrop-blur-sm z-30 lg:hidden"
          />
        )}
      </AnimatePresence>

      <div className={cn(
        "fixed inset-y-0 left-0 z-40 transform transition-transform duration-300 lg:relative lg:translate-x-0",
        isSidebarOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <Sidebar 
          selectedCategory={selectedCategory} 
          setSelectedCategory={(cat) => {
            setSelectedCategory(cat);
            setFilterMode('all');
            setIsSidebarOpen(false);
          }} 
          counts={tasks.reduce((acc, task) => {
            acc[task.category] = (acc[task.category] || 0) + 1;
            return acc;
          }, {} as Record<string, number>)}
        />
      </div>

      <main className="flex-1 flex flex-col min-w-0 bg-white/40 backdrop-blur-sm overflow-hidden relative z-10 transition-colors duration-300">
        {/* Header */}
        <header className="h-20 px-4 sm:px-8 flex items-center justify-between z-10 shrink-0 border-b border-stone-100 transition-colors duration-300">
          <div className="flex items-center gap-4 flex-1 max-w-xl">
            <button 
              onClick={() => setIsSidebarOpen(true)}
              className="lg:hidden p-2 hover:bg-primary/10 rounded-xl"
            >
              <Menu className="w-6 h-6" />
            </button>
            <div className="relative w-full group">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-300 group-focus-within:text-primary transition-colors" />
               <input 
                type="text" 
                placeholder="Search repository..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-white border border-stone-100 rounded-2xl py-3 pl-12 focus:ring-2 focus:ring-primary/20 transition-all font-medium text-sm placeholder:text-stone-300"
              />
            </div>
          </div>

          <div className="flex items-center gap-4 sm:gap-6">
             <button
                onClick={handleToggleMute}
                className={cn(
                  "p-2.5 rounded-2xl border transition-all",
                  (notificationPermission === 'granted' && !isMuted)
                    ? "bg-emerald-50 text-emerald-500 border-emerald-100" 
                    : isMuted
                      ? "bg-red-50 text-red-500 border-red-100"
                      : "bg-white border-stone-100 text-stone-300 hover:text-black hover:bg-stone-50"
                )}
                title={isMuted ? 'Unmute Notifications' : 'Mute Notifications'}
             >
                {(notificationPermission === 'granted' && !isMuted) ? <Bell className="w-5 h-5" /> : <BellOff className="w-5 h-5" />}
             </button>

             <div className="flex items-center gap-3 bg-white p-2 rounded-2xl border border-stone-100 shadow-sm">
                {user.photoURL ? (
                    <img src={user.photoURL} alt={user.displayName || ''} className="w-8 h-8 rounded-xl" />
                ) : (
                    <div className="w-8 h-8 bg-black text-white rounded-xl flex items-center justify-center font-bold text-xs font-display">
                        {user.displayName?.charAt(0) || user.email?.charAt(0)}
                    </div>
                )}
                <div className="flex flex-col pr-2">
                    <p className="text-xs font-bold text-black leading-none block">{user.displayName}</p>
                    <button onClick={logout} className="text-[10px] font-bold text-primary hover:text-black transition-opacity text-left">
                        Logout
                    </button>
                </div>
             </div>
          </div>
        </header>

        {/* Main Content Areas - Scrollable on mobile as a block */}
        <div className="flex-1 overflow-y-auto px-4 sm:px-8 pb-12 custom-scrollbar pt-8">
          <div className="max-w-6xl mx-auto w-full">
            
            {/* Summary & Progress Row */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 mb-12">
              <div className="lg:col-span-8">
                <div className="bg-white rounded-3xl border border-stone-100 p-8 relative overflow-hidden group">
                  <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity">
                    <Sparkles className="w-32 h-32 text-black" />
                  </div>
                  <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-6">
                    <div>
                      <h2 className="text-3xl font-bold tracking-tight text-black font-display italic uppercase">Weekly Momentum</h2>
                      <p className="text-stone-400 text-sm font-medium mt-1">You've completed {stats.recentCompleted} assignments this week.</p>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="relative w-20 h-20">
                        <svg className="w-full h-full transform -rotate-90">
                          <circle cx="40" cy="40" r="36" stroke="currentColor" strokeWidth="8" fill="transparent" className="text-stone-100" />
                          <circle cx="40" cy="40" r="36" stroke="currentColor" strokeWidth="8" fill="transparent" 
                            strokeDasharray={226.2} 
                            strokeDashoffset={226.2 - (226.2 * stats.completionRate / 100)} 
                            className="text-primary transition-all duration-1000 ease-out" 
                          />
                        </svg>
                        <div className="absolute inset-0 flex items-center justify-center">
                          <span className="text-sm font-bold font-mono">{Math.round(stats.completionRate)}%</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="lg:col-span-4">
                <div className="bg-black text-white rounded-3xl p-8 h-full flex flex-col justify-between shadow-xl shadow-black/10">
                   <div>
                    <h3 className="text-xs font-bold uppercase tracking-widest text-primary/60 mb-2">Daily Agenda</h3>
                    <p className="text-2xl font-bold italic font-display uppercase tracking-tight">Next 24 Hours</p>
                   </div>
                   <div className="mt-4 space-y-3">
                      {todayTasks.length > 0 ? todayTasks.slice(0, 2).map(t => (
                        <div key={t.id} className="flex items-center gap-3 bg-white/10 p-3 rounded-2xl border border-white/5">
                          <div className={cn("w-1.5 h-8 rounded-full", t.priority === 'high' ? 'bg-red-500' : 'bg-primary')} />
                          <div className="min-w-0">
                            <p className="text-xs font-bold truncate">{t.title}</p>
                            <p className="text-[10px] text-white/40 uppercase tracking-widest">{format(t.dueDate instanceof Timestamp ? t.dueDate.toDate() : new Date(t.dueDate), 'HH:mm')}</p>
                          </div>
                        </div>
                      )) : (
                        <p className="text-xs text-white/40 italic">No pressing deadlines today.</p>
                      )}
                      {todayTasks.length > 2 && <p className="text-[10px] uppercase font-bold text-primary">+{todayTasks.length - 2} more</p>}
                   </div>
                </div>
              </div>
            </div>

            {/* Stats Row - Bento Style inside scrollable area to save mobile vertical space */}
            <section className="mb-12">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                    <StatTile 
                        icon={<CheckSquare className="w-4 h-4" />} 
                        label="Pending" 
                        value={stats.pending} 
                        color="text-black" 
                        isActive={filterMode === 'pending'}
                        onClick={() => setFilterMode(filterMode === 'pending' ? 'all' : 'pending')}
                    />
                    <StatTile 
                        icon={<Clock className="w-4 h-4" />} 
                        label="Overdue" 
                        value={stats.overdueCount} 
                        color="text-primary" 
                        bgColor="bg-black" 
                        borderColor="border-black" 
                        isActive={filterMode === 'overdue'}
                        onClick={() => setFilterMode(filterMode === 'overdue' ? 'all' : 'overdue')}
                    />
                    <StatTile 
                        icon={<Calendar className="w-4 h-4" />} 
                        label="Active" 
                        value={stats.upcomingCount} 
                        color="text-black" 
                        isActive={filterMode === 'active'}
                        onClick={() => setFilterMode(filterMode === 'active' ? 'all' : 'active')}
                    />
                    <StatTile 
                        icon={<Archive className="w-4 h-4" />} 
                        label="Archived" 
                        value={stats.completed} 
                        color="text-stone-400" 
                        isActive={filterMode === 'archived'}
                        onClick={() => setFilterMode(filterMode === 'archived' ? 'all' : 'archived')}
                    />
                    <motion.button 
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => { setEditingTask(undefined); setIsModalOpen(true); }}
                      className="bg-primary text-black rounded-3xl p-6 flex flex-col justify-between items-start hover:bg-primary/90 transition-all shadow-lg shadow-primary/20 group col-span-1"
                    >
                      <div className="w-10 h-10 bg-black/20 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform">
                          <Plus className="w-5 h-5 text-black" />
                      </div>
                      <div>
                        <p className="text-sm font-bold font-display uppercase italic">New Task</p>
                        <p className="text-[10px] text-black/40 font-bold uppercase tracking-widest mt-1">Initialize Record</p>
                      </div>
                    </motion.button>
                </div>
            </section>

            <div className="mb-4 sm:mb-8 flex items-end justify-between">
              <h2 className="text-2xl sm:text-4xl font-bold tracking-tighter text-black font-display italic uppercase flex flex-col sm:flex-row sm:items-baseline gap-1 sm:gap-4">
                {selectedCategory}
                <span className="text-xs sm:text-sm font-medium text-primary font-sans not-italic tracking-normal">/ {filteredTasks.length} Records found</span>
              </h2>
              {filterMode !== 'all' && (
                  <motion.button 
                    initial={{ opacity: 0, x: 10 }}
                    animate={{ opacity: 1, x: 0 }}
                    onClick={() => setFilterMode('all')}
                    className="text-[10px] font-bold uppercase tracking-widest text-stone-300 hover:text-black transition-colors"
                  >
                    Clear Filter
                  </motion.button>
              )}
            </div>
            
            <TaskList 
                tasks={filteredTasks} 
                onEdit={handleEditTask}
            />
          </div>
        </div>
      </main>

      <AnimatePresence>
        {isModalOpen && (
          <TaskModal 
            isOpen={isModalOpen} 
            onClose={() => setIsModalOpen(false)} 
            user={user}
            editingTask={editingTask}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

function StatTile({ 
  icon, 
  label, 
  value, 
  color, 
  bgColor = "bg-white", 
  borderColor = "border-stone-100",
  isActive = false,
  onClick
}: { 
  icon: ReactNode, 
  label: string, 
  value: number, 
  color: string,
  bgColor?: string,
  borderColor?: string,
  isActive?: boolean,
  onClick: () => void
}) {
  return (
    <motion.button 
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className={cn(
        "rounded-3xl p-6 border flex flex-col justify-between transition-all text-left overflow-hidden relative", 
        bgColor === "bg-white" ? "bg-white shadow-[0_8px_30px_rgb(0,0,0,0.04)]" : bgColor, 
        borderColor === "border-stone-100" ? "border-stone-50" : borderColor,
        isActive ? "ring-2 ring-accent ring-offset-2 scale-[1.02] shadow-lg shadow-accent/10" : "hover:shadow-md"
      )}
    >
      <div className="flex items-center justify-between w-full relative z-10">
        <span className={cn("text-[10px] uppercase tracking-widest font-bold", (isActive && bgColor === 'bg-black') ? "text-white/60" : "text-stone-300")}>{label}</span>
        <div className={cn("p-2 rounded-xl border border-stone-100 bg-white/50", isActive && "border-white/20")}>
          {icon}
        </div>
      </div>
      <div className={cn("text-4xl font-bold font-display mt-4 relative z-10 italic", color)}>
        {value.toString().padStart(2, '0')}
      </div>
      {isActive && (
          <motion.div 
            layoutId="active-bg"
            className="absolute inset-0 bg-accent/10 -z-0"
          />
      )}
    </motion.button>
  );
}
