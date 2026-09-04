
import { LucideIcon } from 'lucide-react';

interface StatCardProps {
    title: string;
    value: string | number;
    icon: LucideIcon;
    trend?: {
        value: number;
        label: string;
        isPositive: boolean;
    };
    description?: string;
    loading?: boolean;
}

export function StatCard({ title, value, icon: Icon, trend, description, loading }: StatCardProps) {
    if (loading) {
        return (
        <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm animate-pulse admin-card">
                <div className="flex items-center justify-between mb-4">
                    <div className="w-8 h-8 bg-slate-100 dark:bg-slate-700 rounded-lg"></div>
                    <div className="w-24 h-4 bg-slate-100 dark:bg-slate-700 rounded"></div>
                </div>
                <div className="w-16 h-8 bg-slate-100 dark:bg-slate-700 rounded mb-2"></div>
                <div className="w-32 h-3 bg-slate-100 dark:bg-slate-700 rounded"></div>
            </div>
        );
    }

    return (
        <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-md transition-shadow admin-card">
            <div className="flex items-start justify-between mb-4">
                <div className="p-2.5 bg-slate-50 dark:bg-slate-900/50 rounded-lg border border-slate-100 dark:border-slate-700 text-slate-600 dark:text-slate-300">
                    <Icon className="w-5 h-5" />
                </div>
                {trend && (
                    <div className={`flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full ${trend.isPositive ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400' : 'bg-red-50 text-red-600 dark:bg-red-900/30 dark:text-red-400'
                        }`}>
                        <span>{trend.isPositive ? '+' : ''}{trend.value}%</span>
                    </div>
                )}
            </div>

            <h3 className="text-2xl font-bold text-slate-800 dark:text-white mb-1">{value}</h3>
            <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-1">{title}</p>
            {description && (
                <p className="text-xs text-slate-400 dark:text-slate-500">{description}</p>
            )}
        </div>
    );
}
