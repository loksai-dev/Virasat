import React from 'react';
import { Languages } from 'lucide-react';
import { useVirasatStore, SupportedLanguage } from '@/store/useVirasatStore';
import { cn } from '@/lib/utils';

interface LanguageSwitcherProps {
  className?: string;
  variant?: 'segmented' | 'compact';
}

const languages: { code: SupportedLanguage; label: string; native: string }[] = [
  { code: 'en', label: 'English', native: 'English' },
  { code: 'hi', label: 'Hindi', native: 'हिंदी' },
  { code: 'te', label: 'Telugu', native: 'తెలుగు' },
];

export const LanguageSwitcher: React.FC<LanguageSwitcherProps> = ({
  className,
  variant = 'compact',
}) => {
  const { language, setLanguage, addToast } = useVirasatStore();

  const handleSelect = (code: SupportedLanguage, native: string) => {
    setLanguage(code);
    addToast({
      type: 'info',
      title: `Language changed to ${native}`,
      message: 'Interface vocabulary adjusted for elder-friendly readability.',
      duration: 2500,
    });
  };

  if (variant === 'segmented') {
    return (
      <div
        className={cn(
          'inline-flex items-center p-1 rounded-xl bg-slate-100 border border-slate-200 text-xs font-medium',
          className
        )}
      >
        {languages.map((lang) => (
          <button
            key={lang.code}
            type="button"
            onClick={() => handleSelect(lang.code, lang.native)}
            className={cn(
              'px-2.5 py-1 rounded-lg transition-all duration-150',
              language === lang.code
                ? 'bg-white text-navy font-semibold shadow-xs'
                : 'text-slate-600 hover:text-navy'
            )}
          >
            {lang.native}
          </button>
        ))}
      </div>
    );
  }

  return (
    <div className={cn('relative inline-flex items-center', className)}>
      <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border border-slate-200 bg-white/80 text-xs font-medium text-slate-700 shadow-xs hover:border-slate-300">
        <Languages className="w-3.5 h-3.5 text-teal-600" />
        <select
          value={language}
          onChange={(e) => {
            const selected = languages.find(l => l.code === e.target.value);
            handleSelect(e.target.value as SupportedLanguage, selected?.native || 'English');
          }}
          className="bg-transparent border-none text-navy font-semibold focus:outline-none cursor-pointer pr-1"
          aria-label="Select language"
        >
          {languages.map((l) => (
            <option key={l.code} value={l.code}>
              {l.native} ({l.label})
            </option>
          ))}
        </select>
      </div>
    </div>
  );
};
