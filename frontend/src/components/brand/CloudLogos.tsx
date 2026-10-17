import React from 'react';
import { cn } from '@/lib/utils';

export interface CloudLogoChipProps {
  className?: string;
}

export const GeminiLogo: React.FC<{ className?: string; size?: number }> = ({ className, size = 30 }) => (
  <svg
    role="img"
    viewBox="0 0 24 24"
    width={size}
    height={size}
    className={cn('shrink-0', className)}
    fill="currentColor"
    aria-label="Google Gemini"
  >
    <title>Google Gemini</title>
    <path d="M11.04 19.32Q12 21.51 12 24q0-2.49.93-4.68.96-2.19 2.58-3.81t3.81-2.55Q21.51 12 24 12q-2.49 0-4.68-.93a12.3 12.3 0 0 1-3.81-2.58 12.3 12.3 0 0 1-2.58-3.81Q12 2.49 12 0q0 2.49-.96 4.68-.93 2.19-2.55 3.81a12.3 12.3 0 0 1-3.81 2.58Q2.49 12 0 12q2.49 0 4.68.96 2.19.93 3.81 2.55t2.55 3.81" />
  </svg>
);

export const SpannerLogo: React.FC<{ className?: string; size?: number }> = ({ className, size = 30 }) => (
  <svg
    role="img"
    viewBox="0 0 24 24"
    width={size}
    height={size}
    className={cn('shrink-0', className)}
    fill="currentColor"
    aria-label="Google Cloud Spanner"
  >
    <title>Google Cloud Spanner</title>
    <path d="M12 9.06 7.944 6.864V2.388L10.38.924v3.66l1.62.744 1.62-.744V.924l2.436 1.464v4.476L12 9.06zm-8.124 4.752L0 16.056v2.988l3.228-1.86 1.404.912.096 1.632-3.24 1.872 2.616 1.476 3.828-2.268-.132-4.596-3.924-2.4zm9.732-.9V8.758l-1.37.742-.238.129-.238-.13-1.37-.741v4.154l-3.613 2.09 1.282.783.231.142.008.27.046 1.612L12 15.696l3.595 2.079.045-1.59.008-.27.231-.142 1.301-.795-3.572-2.066zm7.164 4.272L24 19.044v-2.988L20.064 13.8l-3.924 2.4-.132 4.596 3.888 2.244 2.616-1.44-3.24-1.836.096-1.668 1.404-.912z" />
  </svg>
);

export const CloudRunLogo: React.FC<{ className?: string; size?: number }> = ({ className, size = 30 }) => (
  <svg
    role="img"
    viewBox="0 0 256 231"
    width={size}
    height={Math.round(size * (231 / 256))}
    className={cn('shrink-0', className)}
    aria-label="Google Cloud Run"
  >
    <title>Google Cloud Run</title>
    <path
      fill="#4285F4"
      d="M75.39 0a23.1 23.1 0 0 0-19.72 11.76L3.054 102.995a22.96 22.96 0 0 0 0 22.879l52.598 91.997a23.54 23.54 0 0 0 19.719 12.18h105.216a23.46 23.46 0 0 0 19.74-12.12l52.598-91.477a23.44 23.44 0 0 0 3.074-11.61c0-4.004-1.025-8.01-3.074-11.61L200.326 11.76A23.12 23.12 0 0 0 180.606 0z"
    />
    <path
      fill="#000"
      fillOpacity=".08"
      d="m236.495 155.027l-36.17 62.905a23.46 23.46 0 0 1-19.739 12.12H140.51l-58.472-58.995l17.238-55.583l-17.238-56.22l17.705 11.893l23.806 24.019l-11.12-35.912l83.375 56.008z"
    />
    <path
      fill="#fff"
      d="m82.038 59.254l17.705 11.893l13.88 44.618l-13.633 43.278l-17.952 12.014l17.343-55.796zm45.347 19.836l8.593 27.792h32.989zm68.42 36.172l-83.376 55.795l17.343-55.795l-17.343-56.008z"
    />
  </svg>
);

export const FirebaseLogo: React.FC<{ className?: string; size?: number }> = ({ className, size = 30 }) => (
  <svg
    role="img"
    viewBox="0 0 24 24"
    width={size}
    height={size}
    className={cn('shrink-0', className)}
    fill="#FFCA28"
    aria-label="Firebase"
  >
    <title>Firebase</title>
    <path d="M19.455 8.369c-.538-.748-1.778-2.285-3.681-4.569-.826-.991-1.535-1.832-1.884-2.245a146 146 0 0 0-.488-.576l-.207-.245-.113-.133-.022-.032-.01-.005L12.57 0l-.609.488c-1.555 1.246-2.828 2.851-3.681 4.64-.523 1.064-.864 2.105-1.043 3.176-.047.241-.088.489-.121.738-.209-.017-.421-.028-.632-.033-.018-.001-.035-.002-.059-.003a7.46 7.46 0 0 0-2.28.274l-.317.089-.163.286c-.765 1.342-1.198 2.869-1.252 4.416-.07 2.01.477 3.954 1.583 5.625 1.082 1.633 2.61 2.882 4.42 3.611l.236.095.071.025.003-.001a9.59 9.59 0 0 0 2.941.568q.171.006.342.006c1.273 0 2.513-.249 3.69-.742l.008.004.313-.145a9.63 9.63 0 0 0 3.927-3.335c1.01-1.49 1.577-3.234 1.641-5.042.075-2.161-.643-4.304-2.133-6.371m-7.083 6.695c.328 1.244.264 2.44-.191 3.558-1.135-1.12-1.967-2.352-2.475-3.665-.543-1.404-.87-2.74-.974-3.975.48.157.922.366 1.315.622 1.132.737 1.914 1.902 2.325 3.461zm.207 6.022c.482.368.99.712 1.513 1.028-.771.21-1.565.302-2.369.273a8 8 0 0 1-.373-.022c.458-.394.869-.823 1.228-1.279zm1.347-6.431c-.516-1.957-1.527-3.437-3.002-4.398-.647-.421-1.385-.741-2.194-.95.011-.134.026-.268.043-.4.014-.113.03-.216.046-.313.133-.689.332-1.37.589-2.025.099-.25.206-.499.321-.74l.004-.008c.177-.358.376-.719.61-1.105l.092-.152-.003-.001c.544-.851 1.197-1.627 1.942-2.311l.288.341c.672.796 1.304 1.548 1.878 2.237 1.291 1.549 2.966 3.583 3.612 4.48 1.277 1.771 1.893 3.579 1.83 5.375-.049 1.395-.461 2.755-1.195 3.933-.694 1.116-1.661 2.05-2.8 2.708-.636-.318-1.559-.839-2.539-1.599.79-1.575.952-3.28.479-5.072zm-2.575 5.397c-.725.939-1.587 1.55-2.09 1.856-.081-.029-.163-.06-.243-.093l-.065-.026c-1.49-.616-2.747-1.656-3.635-3.01-.907-1.384-1.356-2.993-1.298-4.653.041-1.19.338-2.327.882-3.379.316-.07.638-.114.96-.131l.084-.002c.162-.003.324-.003.478 0 .227.011.454.035.677.07.073 1.513.445 3.145 1.105 4.852.637 1.644 1.694 3.162 3.144 4.515z" />
  </svg>
);

export const CloudPlatformStrip: React.FC<{ className?: string }> = ({ className }) => {
  const chips = [
    {
      name: 'Google Gemini',
      descriptor: 'Multimodal Legal AI',
      icon: <GeminiLogo size={30} className="text-teal-600" />,
      accentBg: 'bg-teal-50/70 border-teal-200/60',
      glowColor: 'hover:shadow-[0_8px_20px_-4px_rgba(20,184,166,0.25)]',
    },
    {
      name: 'Cloud Spanner',
      descriptor: 'Kinship & Succession Graph',
      icon: <SpannerLogo size={30} className="text-blue-600" />,
      accentBg: 'bg-blue-50/70 border-blue-200/60',
      glowColor: 'hover:shadow-[0_8px_20px_-4px_rgba(37,99,235,0.25)]',
    },
    {
      name: 'Cloud Run',
      descriptor: 'Serverless Microservices',
      icon: <CloudRunLogo size={32} />,
      accentBg: 'bg-sky-50/70 border-sky-200/60',
      glowColor: 'hover:shadow-[0_8px_20px_-4px_rgba(14,165,233,0.25)]',
    },
    {
      name: 'Firebase',
      descriptor: 'Authentication & Hosting',
      icon: <FirebaseLogo size={30} />,
      accentBg: 'bg-amber-50/70 border-amber-200/60',
      glowColor: 'hover:shadow-[0_8px_20px_-4px_rgba(245,158,11,0.25)]',
    },
  ];

  return (
    <div className={cn('grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 items-stretch', className)}>
      {chips.map((chip) => (
        <div
          key={chip.name}
          tabIndex={0}
          role="region"
          aria-label={`${chip.name}: ${chip.descriptor}`}
          className={cn(
            'group relative p-4 rounded-xl bg-white/90 backdrop-blur-xs',
            'border border-slate-200/90 hover:border-teal-500/50',
            'shadow-xs hover:-translate-y-0.5 transition-all duration-200 ease-out',
            'focus:outline-hidden focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:ring-offset-2',
            'flex items-center gap-3.5',
            chip.glowColor
          )}
        >
          {/* Subtle gradient hairline indicator */}
          <div className="absolute inset-x-0 -top-px h-px bg-gradient-to-r from-transparent via-teal-400/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

          {/* Logo container */}
          <div
            className={cn(
              'w-11 h-11 rounded-xl flex items-center justify-center shrink-0 border transition-transform duration-200 group-hover:scale-105',
              chip.accentBg
            )}
          >
            {chip.icon}
          </div>

          {/* Text block */}
          <div className="min-w-0">
            <div className="text-xs font-bold text-navy tracking-tight group-hover:text-teal-900 transition-colors">
              {chip.name}
            </div>
            <div className="text-[11px] text-slate-500 truncate mt-0.5 font-medium">
              {chip.descriptor}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};
