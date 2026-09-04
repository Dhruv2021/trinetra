import React, { useState, useRef, useEffect } from 'react';
import { Search, Check, User as UserIcon, Shield, ChevronDown, FileDown, Menu } from 'lucide-react';
import { User } from '../types';

interface NavbarProps {
  currentUser: User;
  onSwitchUser: (user: User) => void;
  allUsers: User[];
  onResetData: () => void;
  onOpenAddCase: () => void;
  onSearch: (query: string) => void;
  onToggleMobileMenu?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentUser,
  onSwitchUser,
  allUsers,
  onResetData,
  onOpenAddCase,
  onSearch,
  onToggleMobileMenu
}) => {
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsProfileOpen(false);
      }
    };
    if (isProfileOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isProfileOpen]);

  // Initials for avatar
  const getInitials = (name: string) => {
    return name
      .replace(/^(Inspector|Sub-Inspector|ACP|DCP|SI)\s+/i, '')
      .split(' ')
      .filter(Boolean)
      .map(part => part[0])
      .join('')
      .slice(0, 2)
      .toUpperCase() || 'IP';
  };

  return (
    <header className="h-14 bg-slate-950/70 backdrop-blur-xl border-b border-white/10 px-5 sm:px-6 flex items-center justify-between sticky top-0 z-40 shadow-sm">
      {/* Brand & Mobile Menu Toggle */}
      <div className="flex items-center gap-3">
        {onToggleMobileMenu && (
          <button
            onClick={onToggleMobileMenu}
            className="md:hidden p-1.5 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] text-slate-300 border border-white/10 transition cursor-pointer"
          >
            <Menu className="w-4 h-4" />
          </button>
        )}
        <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-sky-400/20 via-indigo-400/20 to-teal-400/20 flex items-center justify-center font-bold text-sky-200 text-sm font-mono border border-white/15 shadow-sm">
          T
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold tracking-wider text-white font-mono">TRINETRA</span>
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
        </div>
      </div>

      {/* Global Quick Search */}
      <div className="hidden md:flex items-center flex-1 max-w-sm mx-6">
        <div className="relative w-full">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search cases, suspects, vehicles..."
            onChange={(e) => onSearch(e.target.value)}
            className="w-full bg-white/[0.04] hover:bg-white/[0.07] focus:bg-white/[0.08] border border-white/10 rounded-xl pl-8 pr-3 py-1.5 text-xs text-slate-200 placeholder:text-slate-400 focus:outline-none focus:border-sky-400/40 transition-all"
          />
        </div>
      </div>

      {/* Actions & Profile Area */}
      <div className="flex items-center gap-2">
        <a
          href="/api/guide/pdf"
          download="Trinetra_User_Guide.pdf"
          target="_blank"
          rel="noopener noreferrer"
          title="Download PDF User Guide"
          className="px-2.5 py-1.5 rounded-xl bg-white/[0.05] hover:bg-white/[0.09] text-slate-300 hover:text-white border border-white/10 text-xs font-medium flex items-center gap-1.5 transition cursor-pointer"
        >
          <FileDown className="w-3.5 h-3.5 text-sky-300" />
          <span className="hidden sm:inline">PDF Guide</span>
        </a>

        <button
          onClick={onOpenAddCase}
          className="px-3 py-1.5 rounded-xl bg-sky-300 hover:bg-sky-200 text-slate-950 font-semibold text-xs transition cursor-pointer flex items-center gap-1 shadow-sm"
        >
          <span className="text-sm leading-none font-bold">+</span>
          <span>New FIR</span>
        </button>

        {/* Profile Icon Switcher - Minimal Avatar only */}
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setIsProfileOpen(prev => !prev)}
            aria-label="Inspector Profile"
            title={currentUser.name}
            className={`relative w-8 h-8 rounded-full flex items-center justify-center transition-all cursor-pointer border ${
              isProfileOpen 
                ? 'bg-sky-400/20 border-sky-300 ring-2 ring-sky-400/30' 
                : 'bg-white/[0.07] hover:bg-white/[0.12] border-white/15'
            }`}
          >
            <span className="text-xs font-semibold text-sky-200 font-mono select-none">
              {getInitials(currentUser.name)}
            </span>
            <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-400 ring-2 ring-slate-950"></span>
          </button>

          {/* Inspector Selection Dropdown Popover */}
          {isProfileOpen && (
            <div className="absolute right-0 mt-2 w-72 bg-slate-900/95 backdrop-blur-2xl border border-white/15 rounded-2xl p-2 shadow-2xl z-50 animate-in fade-in zoom-in-95 duration-150">
              <div className="px-3 py-2 border-b border-white/10 mb-1 flex items-center justify-between">
                <span className="text-[11px] font-mono uppercase tracking-wider text-slate-400 font-semibold">
                  Switch Inspector Profile
                </span>
                <span className="text-[10px] px-1.5 py-0.2 rounded bg-white/10 text-slate-300 font-mono">
                  {allUsers.length} Active
                </span>
              </div>

              <div className="space-y-1">
                {allUsers.map((user) => {
                  const isCurrent = user.id === currentUser.id;
                  return (
                    <button
                      key={user.id}
                      onClick={() => {
                        onSwitchUser(user);
                        setIsProfileOpen(false);
                      }}
                      className={`w-full text-left p-2.5 rounded-xl transition flex items-center justify-between gap-2.5 cursor-pointer ${
                        isCurrent
                          ? 'bg-sky-400/15 border border-sky-300/30 text-white'
                          : 'hover:bg-white/[0.06] text-slate-300 border border-transparent'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className={`w-7 h-7 rounded-full shrink-0 flex items-center justify-center text-xs font-semibold font-mono ${
                          isCurrent ? 'bg-sky-400/25 text-sky-200' : 'bg-white/[0.08] text-slate-300'
                        }`}>
                          {getInitials(user.name)}
                        </div>
                        <div className="min-w-0">
                          <div className="text-xs font-medium text-slate-100 truncate">
                            {user.name}
                          </div>
                          <div className="text-[10px] text-slate-400 truncate flex items-center gap-1.5 mt-0.5">
                            <span>{user.rank}</span>
                            <span>•</span>
                            <span className="font-mono text-slate-300">{user.badgeId}</span>
                          </div>
                        </div>
                      </div>

                      {isCurrent && (
                        <div className="shrink-0 w-5 h-5 rounded-full bg-sky-400/20 text-sky-300 flex items-center justify-center">
                          <Check className="w-3 h-3" />
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
