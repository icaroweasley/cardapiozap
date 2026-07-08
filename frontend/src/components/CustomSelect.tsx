import { useState, useRef, useEffect, type ReactNode } from 'react';
import { ChevronDown } from 'lucide-react';

interface Option {
  value: string;
  label: string;
}

interface CustomSelectProps {
  value: string;
  onChange: (value: string) => void;
  options: Option[];
  placeholder?: string;
  className?: string;
  variant?: 'default' | 'transparent' | 'small';
  icon?: ReactNode;
}

export default function CustomSelect({ value, onChange, options, placeholder = 'Selecione...', className = '', variant = 'default', icon }: CustomSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const selectedOption = options.find(opt => opt.value === value);

  const buttonClasses = variant === 'transparent' 
    ? "w-full bg-transparent border-none text-black dark:text-white py-2 pl-1 pr-3 text-xs font-inter focus:outline-none flex items-center justify-between group gap-2"
    : variant === 'small'
    ? "w-full bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 border border-black/10 dark:border-white/10 text-black dark:text-white rounded-lg pl-2.5 pr-2 py-1.5 text-[10px] font-bold uppercase tracking-widest shadow-sm focus:outline-none transition-colors flex items-center justify-between group gap-2"
    : "w-full bg-black/5 dark:bg-white/5 border border-black/20 dark:border-white/20 text-black dark:text-white p-3 font-inter text-sm focus:outline-none focus:border-black dark:focus:border-white transition-colors rounded-xl flex items-center justify-between group gap-2";

  return (
    <div className={`relative ${className}`} ref={containerRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={buttonClasses}
      >
        <div className="flex items-center gap-2 overflow-hidden flex-1 min-w-0">
          {icon && <span className="shrink-0 text-black/50 dark:text-white/50 flex items-center">{icon}</span>}
          <span className={`truncate text-left flex-1 min-w-0 ${!selectedOption ? 'text-black/50 dark:text-white/50' : ''}`}>
            {selectedOption ? selectedOption.label : placeholder}
          </span>
        </div>
        <ChevronDown size={variant === 'small' ? 12 : 16} className={`shrink-0 text-black/50 dark:text-white/50 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute z-[100] w-full mt-2 bg-white dark:bg-[#111] border border-black/10 dark:border-white/10 rounded-xl shadow-2xl overflow-hidden animate-fade-in origin-top">
          <div className="max-h-60 overflow-y-auto hide-scrollbar">
            {options.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => {
                  onChange(opt.value);
                  setIsOpen(false);
                }}
                className={`w-full text-left px-4 py-3 font-inter transition-colors hover:bg-black/5 dark:hover:bg-white/5 text-black dark:text-white ${opt.value === value ? 'bg-black/5 dark:bg-white/5 font-bold' : ''} ${variant === 'small' ? 'text-xs' : 'text-sm'}`}
              >
                {opt.label}
              </button>
            ))}
            {options.length === 0 && (
              <div className="px-4 py-3 text-sm text-black/50 dark:text-white/50 font-inter text-center">Nenhuma opção</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
