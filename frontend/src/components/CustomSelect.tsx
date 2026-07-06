import { useState, useRef, useEffect } from 'react';
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
}

export default function CustomSelect({ value, onChange, options, placeholder = 'Selecione...', className = '' }: CustomSelectProps) {
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

  return (
    <div className={`relative ${className}`} ref={containerRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full bg-black/5 dark:bg-white/5 border border-black/20 dark:border-white/20 text-black dark:text-white p-3 font-inter text-sm focus:outline-none focus:border-black dark:focus:border-white transition-colors rounded-xl flex items-center justify-between group gap-2"
      >
        <span className={`truncate text-left flex-1 ${!selectedOption ? 'text-black/50 dark:text-white/50' : ''}`}>
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <ChevronDown size={16} className={`shrink-0 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
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
                className={`w-full text-left px-4 py-3 font-inter text-sm transition-colors hover:bg-black/5 dark:hover:bg-white/5 text-black dark:text-white ${opt.value === value ? 'bg-black/5 dark:bg-white/5 font-bold' : ''}`}
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
