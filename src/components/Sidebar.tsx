import React from 'react';
import { 
  LayoutDashboard, 
  FolderGit2, 
  Share2, 
  GitFork, 
  MapPin, 
  FileText, 
  Bot, 
  FileSpreadsheet
} from 'lucide-react';

export type NavTab = 
  | 'dashboard' 
  | 'cases' 
  | 'network' 
  | 'connections' 
  | 'geo' 
  | 'documents' 
  | 'copilot' 
  | 'reports';

interface SidebarProps {
  currentTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
  connectionsCount: number;
  emergingAlertsCount: number;
  isOpen?: boolean;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentTab,
  onSelectTab,
  connectionsCount,
  isOpen = false
}) => {
  const navItems = [
    { id: 'dashboard' as NavTab, label: 'Overview', icon: LayoutDashboard },
    { id: 'cases' as NavTab, label: 'Cases', icon: FolderGit2 },
    { 
      id: 'network' as NavTab, 
      label: 'Syndicate Graph', 
      icon: Share2, 
      badge: 'Core',
      badgeColor: 'bg-sky-400/10 text-sky-300 border-sky-400/20' 
    },
    { 
      id: 'connections' as NavTab, 
      label: 'Connections', 
      icon: GitFork,
      badge: connectionsCount > 0 ? `${connectionsCount}` : undefined,
      badgeColor: 'bg-amber-400/10 text-amber-300 border-amber-400/20'
    },
    { id: 'geo' as NavTab, label: 'Geo Map', icon: MapPin },
    { id: 'documents' as NavTab, label: 'Documents', icon: FileText },
    { 
      id: 'copilot' as NavTab, 
      label: 'AI Copilot', 
      icon: Bot,
      badge: 'AI',
      badgeColor: 'bg-teal-400/10 text-teal-300 border-teal-400/20'
    },
    { id: 'reports' as NavTab, label: 'Reports', icon: FileSpreadsheet },
  ];

  return (
    <aside className={`w-56 bg-slate-950/95 md:bg-slate-950/50 backdrop-blur-xl border-r border-white/10 flex flex-col justify-between shrink-0 select-none h-full fixed md:relative inset-y-0 left-0 z-30 transition-transform duration-300 ${isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'} overflow-y-auto`}>
      <div className="p-3 space-y-1">
        <div className="px-3 py-2 text-[10px] font-semibold uppercase tracking-wider text-slate-400 font-mono flex items-center justify-between">
          <span>Navigation</span>
          <span className="flex items-center gap-1.5 text-emerald-400 text-[10px]">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
            Online
          </span>
        </div>

        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onSelectTab(item.id)}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition cursor-pointer ${
                isActive
                  ? 'bg-white/[0.08] text-white border border-white/15'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-white/[0.04] border border-transparent'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Icon className={`w-4 h-4 ${isActive ? 'text-sky-300' : 'text-slate-400'}`} />
                <span>{item.label}</span>
              </div>
              {item.badge && (
                <span className={`text-[10px] px-1.5 py-0.2 rounded-md border font-mono font-medium ${item.badgeColor}`}>
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Minimal Footer */}
      <div className="p-4 border-t border-white/5 text-[10px] text-slate-500 font-mono flex items-center justify-between">
        <span>TRINETRA v2.4</span>
        <span className="text-slate-400">Delhi-NCR</span>
      </div>
    </aside>
  );
};
