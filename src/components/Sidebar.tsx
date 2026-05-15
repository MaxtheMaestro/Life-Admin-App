import { LifeTask, TaskCategory } from '../types';
import { cn } from '../lib/utils';
import { 
  Briefcase, 
  CreditCard, 
  GraduationCap, 
  Car, 
  HeartPulse, 
  Building2, 
  FileText, 
  MoreHorizontal,
  LayoutGrid,
  ShieldCheck,
  User,
  Archive
} from 'lucide-react';

const CATEGORIES: { name: TaskCategory, icon: any }[] = [
  { name: "ID/Passport", icon: ShieldCheck },
  { name: "Bills", icon: CreditCard },
  { name: "Employment", icon: Briefcase },
  { name: "Scholarships", icon: GraduationCap },
  { name: "Assignments", icon: FileText },
  { name: "Car", icon: Car },
  { name: "Health", icon: HeartPulse },
  { name: "Government", icon: Building2 },
  { name: "Personal", icon: User },
  { name: "Other", icon: MoreHorizontal },
];

export function Sidebar({ 
  selectedCategory, 
  setSelectedCategory,
  counts
}: { 
  selectedCategory: TaskCategory | 'All', 
  setSelectedCategory: (c: TaskCategory | 'All') => void,
  counts: Record<string, number>
}) {
  return (
    <aside className="w-72 bg-white flex flex-col h-full border-r border-stone-100 shadow-sm z-20 overflow-hidden transition-colors duration-300">
      <div className="p-8 shrink-0">
        <h1 className="text-3xl font-bold tracking-tighter text-black font-display italic uppercase">Life Admin</h1>
        <p className="text-blue-950 font-bold text-[10px] uppercase tracking-widest mt-1">Registry Workspace</p>
      </div>

      <nav className="flex-1 overflow-y-auto px-4 space-y-8 scrollbar-hide py-4">
        <div className="space-y-1">
          <button
            onClick={() => setSelectedCategory('All')}
            className={cn(
              "w-full flex items-center justify-between px-4 py-3 rounded-2xl transition-all group font-medium",
              selectedCategory === 'All' 
                ? "bg-black text-white shadow-xl shadow-black/10" 
                : "text-blue-900/60 hover:bg-stone-50 hover:text-blue-950"
            )}
          >
            <div className="flex items-center gap-3">
              <LayoutGrid className="w-4 h-4" />
              <span className="font-display text-sm tracking-tight uppercase">Dashboard</span>
            </div>
            <span className="text-xs opacity-50 font-bold font-mono">
              {Object.values(counts).reduce((a, b) => a + b, 0).toString().padStart(2, '0')}
            </span>
          </button>
        </div>

        <div className="space-y-2">
          <p className="px-4 text-[10px] uppercase tracking-widest text-blue-950 font-bold">Collections</p>
          <ul className="space-y-1">
            {CATEGORIES.map((cat) => (
              <li key={cat.name}>
                <button
                  onClick={() => setSelectedCategory(cat.name)}
                  className={cn(
                    "w-full flex items-center justify-between px-4 py-3 rounded-2xl transition-all group font-medium",
                    selectedCategory === cat.name 
                      ? "bg-primary text-black shadow-lg shadow-primary/10" 
                      : "text-blue-900/60 hover:bg-stone-50 hover:text-blue-950"
                  )}
                >
                  <div className="flex items-center gap-3">
                    <cat.icon className="w-4 h-4" />
                    <span className="text-sm tracking-tight">{cat.name}</span>
                  </div>
                  <span className="text-xs opacity-50 font-bold font-mono">
                    {(counts[cat.name] || 0).toString().padStart(2, '0')}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      </nav>

      <div className="p-8">
        <div className="bg-white p-6 rounded-3xl border border-stone-50 shadow-sm shadow-stone-100/50">
          <p className="text-[10px] font-bold text-stone-300 uppercase tracking-widest leading-relaxed">
            Status: Optimized
          </p>
        </div>
      </div>
    </aside>
  );
}
