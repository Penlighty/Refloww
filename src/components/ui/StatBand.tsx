import React from 'react';

export interface StatItem {
  label: string;
  value: string | number;
  subtext?: string;
  intent?: string;
  delta?: { value: string; positive?: boolean };
  featured?: boolean;
}

interface StatBandProps {
  stats: StatItem[];
  className?: string;
}

export function StatBand({ stats, className = '' }: StatBandProps) {
  return (
    <section className={`panel grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 divide-y sm:divide-y-0 lg:divide-x divide-line ${className}`}>
      {stats.map((stat, idx) => (
        <div key={idx} className={`p-4 md:p-5 min-w-0 ${stat.featured ? 'lg:col-span-2' : ''}`}>
          <p className="label truncate">{stat.label}</p>
          <p className={`money font-bold text-ink mt-1 truncate ${stat.featured ? 'text-xl sm:text-2xl lg:text-metric' : 'text-lg sm:text-xl lg:text-headline'}`}>
            {stat.value}
          </p>
          {stat.delta && (
            <p className={`text-caption font-medium mt-1 truncate ${stat.delta.positive !== false ? 'text-success-text' : 'text-danger-text'}`}>
              {stat.delta.value}
            </p>
          )}
          {stat.subtext && (
            <p className="text-caption font-mono text-ink-muted mt-1 truncate">
              {stat.subtext}
            </p>
          )}
        </div>
      ))}
    </section>
  );
}

export default StatBand;
