import React, { useState, useRef, useEffect } from 'react';

interface HeaderProps {
  selectedRepo: string;
  onSelectRepo: (repo: string) => void;
  canExportADR?: boolean;
  onExportADR?: () => void;
}

const REPOS = [
  { id: '', label: 'All Repositories', icon: 'public', iconColor: 'text-primary' },
  { id: 'facebook/react', label: 'facebook/react', badge: '⚛', badgeColor: 'text-info-sky' },
  { id: 'tiangolo/fastapi', label: 'tiangolo/fastapi', badge: '⚡', badgeColor: 'text-confirmed-emerald' },
  { id: 'reduxjs/redux', label: 'reduxjs/redux', badge: '📦', badgeColor: 'text-secondary' },
  { id: 'django/django', label: 'django/django', badge: '🎸', badgeColor: 'text-confirmed-emerald' },
  { id: 'vuejs/vue', label: 'vuejs/vue', badge: '💚', badgeColor: 'text-confirmed-emerald' },
];

export const Header: React.FC<HeaderProps> = ({
  selectedRepo,
  onSelectRepo,
  canExportADR,
  onExportADR,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const activeLabel =
    REPOS.find((r) => r.id === selectedRepo)?.label || (selectedRepo ? selectedRepo : 'All Repos');

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <header className="flex justify-between items-center w-full px-6 py-4 bg-transparent sticky top-0 z-30 backdrop-blur-sm">
      <div className="flex items-center gap-3">
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="group cursor-pointer bg-surface-container-low hover:bg-surface-container border border-outline-variant px-3 py-1.5 rounded-md flex items-center gap-2 transition-colors shadow-sm"
          >
            <span className="material-symbols-outlined text-[18px] text-on-surface-variant">
              source
            </span>
            <span className="font-code-sm text-on-surface font-medium">{activeLabel}</span>
            <span className="material-symbols-outlined text-on-surface-variant text-[16px]">
              expand_more
            </span>
          </button>

          {isOpen && (
            <div className="absolute top-full mt-1 left-0 w-60 bg-surface-container-high border border-outline-variant rounded-xl shadow-2xl z-50 py-1 overflow-hidden">
              {REPOS.map((repo) => (
                <button
                  key={repo.id}
                  onClick={() => {
                    onSelectRepo(repo.id);
                    setIsOpen(false);
                  }}
                  className="w-full px-4 py-2.5 text-left font-body-md text-on-surface hover:bg-surface-container-highest transition-colors flex items-center gap-2 cursor-pointer"
                >
                  {repo.icon ? (
                    <span className={`material-symbols-outlined text-[16px] ${repo.iconColor}`}>
                      {repo.icon}
                    </span>
                  ) : (
                    <span className={`font-code-sm ${repo.badgeColor}`}>{repo.badge}</span>
                  )}
                  <span>{repo.label}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="flex items-center gap-3">
        {canExportADR && onExportADR && (
          <button
            onClick={onExportADR}
            className="bg-surface-container-low hover:bg-surface-container text-on-surface border border-outline-variant hover:border-primary/50 transition-all duration-200 px-3.5 py-1.5 rounded-md font-body-md flex items-center gap-2 text-[13px] shadow-sm cursor-pointer"
          >
            <span className="material-symbols-outlined text-[16px] text-primary">download</span>
            <span>Export as ADR</span>
          </button>
        )}
      </div>
    </header>
  );
};
