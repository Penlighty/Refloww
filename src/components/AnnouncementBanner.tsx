"use client";

import { useEffect, useState } from 'react';
import { X, Megaphone, Gift, Bell, AlertTriangle, ExternalLink } from 'lucide-react';
import {
    subscribeToActiveAnnouncements,
    incrementAnnouncementView,
    incrementAnnouncementClick,
    Announcement
} from '@/lib/firebase/admin';

const typeConfig = {
    announcement: {
        icon: Megaphone,
        bg: 'bg-gradient-to-r from-blue-600 to-blue-500',
        text: 'text-white'
    },
    promotion: {
        icon: Gift,
        bg: 'bg-gradient-to-r from-purple-600 to-pink-500',
        text: 'text-white'
    },
    greeting: {
        icon: Bell,
        bg: 'bg-gradient-to-r from-emerald-600 to-teal-500',
        text: 'text-white'
    },
    warning: {
        icon: AlertTriangle,
        bg: 'bg-gradient-to-r from-amber-500 to-orange-500',
        text: 'text-white'
    }
};

interface AnnouncementBannerProps {
    position?: 'top' | 'bottom';
    className?: string;
}

export function AnnouncementBanner({ position = 'top', className = '' }: AnnouncementBannerProps) {
    const [announcements, setAnnouncements] = useState<Announcement[]>([]);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [dismissed, setDismissed] = useState<Set<string>>(new Set());
    const [viewedIds, setViewedIds] = useState<Set<string>>(new Set());

    useEffect(() => {
        // Load dismissed announcements from localStorage
        const saved = localStorage.getItem('dismissedAnnouncements');
        if (saved) {
            try {
                const parsed = JSON.parse(saved);
                setDismissed(new Set(parsed));
            } catch (e) {
                // Ignore parse errors
            }
        }

        // Subscribe to real-time announcements
        const unsubscribe = subscribeToActiveAnnouncements((data) => {
            setAnnouncements(data);
        });

        return () => unsubscribe();
    }, []);

    // Track views
    useEffect(() => {
        const visibleAnnouncements = announcements.filter(a => !dismissed.has(a.id));
        if (visibleAnnouncements.length > 0) {
            const current = visibleAnnouncements[currentIndex % visibleAnnouncements.length];
            if (current && !viewedIds.has(current.id)) {
                // Mark as viewed
                setViewedIds(prev => new Set(prev).add(current.id));
                // Track view in Firebase
                incrementAnnouncementView(current.id).catch(() => { });
            }
        }
    }, [announcements, currentIndex, dismissed, viewedIds]);

    // Auto-rotate announcements
    useEffect(() => {
        const visibleAnnouncements = announcements.filter(a => !dismissed.has(a.id));
        if (visibleAnnouncements.length > 1) {
            const interval = setInterval(() => {
                setCurrentIndex(prev => (prev + 1) % visibleAnnouncements.length);
            }, 8000);
            return () => clearInterval(interval);
        }
    }, [announcements, dismissed]);

    const handleDismiss = (id: string) => {
        const newDismissed = new Set(dismissed).add(id);
        setDismissed(newDismissed);
        localStorage.setItem('dismissedAnnouncements', JSON.stringify([...newDismissed]));
    };

    const handleCTAClick = (announcement: Announcement) => {
        incrementAnnouncementClick(announcement.id).catch(() => { });
        if (announcement.ctaLink) {
            window.open(announcement.ctaLink, '_blank');
        }
    };

    // Filter out dismissed announcements and non-banner styles
    const visibleAnnouncements = announcements.filter(a =>
        !dismissed.has(a.id) &&
        (!a.displayStyle || a.displayStyle === 'banner')
    );

    if (visibleAnnouncements.length === 0) return null;

    const current = visibleAnnouncements[currentIndex % visibleAnnouncements.length];
    if (!current) return null;

    const Icon = typeConfig[current.type]?.icon || Megaphone;
    const bgClass = typeConfig[current.type]?.bg || typeConfig.announcement.bg;
    const textClass = typeConfig[current.type]?.text || 'text-white';

    return (
        <div
            className={`${bgClass} ${textClass} ${className} relative overflow-hidden`}
            role="banner"
            aria-label="Announcement"
        >
            {/* Background pattern */}
            <div className="absolute inset-0 opacity-10">
                <div className="absolute inset-0" style={{
                    backgroundImage: 'url("data:image/svg+xml,%3Csvg width="20" height="20" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg"%3E%3Cg fill="%23fff" fill-opacity="1" fill-rule="evenodd"%3E%3Ccircle cx="3" cy="3" r="1"/%3E%3Ccircle cx="13" cy="13" r="1"/%3E%3C/g%3E%3C/svg%3E")',
                    backgroundSize: '20px 20px'
                }} />
            </div>

            <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="py-3 flex items-center justify-between gap-4">
                    {/* Left side - Icon & Message */}
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                        <div className="flex-shrink-0 p-1.5 bg-white/20 rounded-lg backdrop-blur-sm">
                            <Icon className="w-4 h-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">
                                <span className="font-semibold">{current.title}:</span>{' '}
                                <span className="opacity-90">{current.message}</span>
                            </p>
                        </div>
                    </div>

                    {/* Right side - CTA & Dismiss */}
                    <div className="flex items-center gap-3 flex-shrink-0">
                        {current.ctaText && (
                            <button
                                onClick={() => handleCTAClick(current)}
                                className="flex items-center gap-1.5 px-3 py-1.5 bg-white/20 hover:bg-white/30 backdrop-blur-sm rounded-lg text-sm font-medium transition-colors"
                            >
                                {current.ctaText}
                                <ExternalLink className="w-3.5 h-3.5" />
                            </button>
                        )}
                        <button
                            onClick={() => handleDismiss(current.id)}
                            className="p-1.5 hover:bg-white/20 rounded-lg transition-colors"
                            aria-label="Dismiss announcement"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    </div>
                </div>

                {/* Pagination dots for multiple announcements */}
                {visibleAnnouncements.length > 1 && (
                    <div className="absolute bottom-1 left-1/2 -translate-x-1/2 flex gap-1">
                        {visibleAnnouncements.map((_, idx) => (
                            <button
                                key={idx}
                                onClick={() => setCurrentIndex(idx)}
                                className={`w-1.5 h-1.5 rounded-full transition-all ${idx === currentIndex % visibleAnnouncements.length
                                    ? 'bg-white w-4'
                                    : 'bg-white/40 hover:bg-white/60'
                                    }`}
                                aria-label={`Go to announcement ${idx + 1}`}
                            />
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}

export default AnnouncementBanner;
