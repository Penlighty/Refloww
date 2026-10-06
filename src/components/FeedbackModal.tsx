"use client";

import { useState } from 'react';
import {
    MessageSquare,
    X,
    Send,
    Bug,
    Lightbulb,
    Heart,
    MessageCircle,
    ThumbsUp,
    Minus,
    ThumbsDown,
    CheckCircle,
    RefreshCw
} from '@/components/icons';
import { createFeedback } from '@/lib/firebase/admin';
import { useAuth } from '@/lib/contexts/AuthContext';
import { Modal, ModalFooter } from '@/components/ui';

interface FeedbackModalProps {
    isOpen: boolean;
    onClose: () => void;
}

const categories = [
    { id: 'general', label: 'General', icon: MessageCircle, color: 'text-blue-600 bg-blue-50 dark:bg-blue-900/30' },
    { id: 'bug', label: 'Bug Report', icon: Bug, color: 'text-red-600 bg-red-50 dark:bg-red-900/30' },
    { id: 'feature', label: 'Feature Request', icon: Lightbulb, color: 'text-amber-600 bg-amber-50 dark:bg-amber-900/30' },
    { id: 'praise', label: 'Praise', icon: Heart, color: 'text-pink-600 bg-pink-50 dark:bg-pink-900/30' }
];

const sentiments = [
    { id: 'positive', icon: ThumbsUp, label: 'Positive', color: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-900/30 border-emerald-200 dark:border-emerald-800' },
    { id: 'neutral', icon: Minus, label: 'Neutral', color: 'text-neutral-600 bg-neutral-100 dark:bg-neutral-700 border-neutral-200 dark:border-neutral-600' },
    { id: 'negative', icon: ThumbsDown, label: 'Negative', color: 'text-red-600 bg-red-50 dark:bg-red-900/30 border-red-200 dark:border-red-800' }
];

export function FeedbackModal({ isOpen, onClose }: FeedbackModalProps) {
    const { user } = useAuth();
    const [message, setMessage] = useState('');
    const [category, setCategory] = useState('general');
    const [sentiment, setSentiment] = useState<'positive' | 'neutral' | 'negative'>('neutral');
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!message.trim()) return;

        setLoading(true);
        try {
            await createFeedback({
                message: message.trim(),
                category: category as any,
                sentiment,
                userId: user?.uid,
                userEmail: user?.email || undefined,
                appVersion: process.env.NEXT_PUBLIC_APP_VERSION || '1.0.0'
            });
            setSuccess(true);
            setTimeout(() => {
                setMessage('');
                setCategory('general');
                setSentiment('neutral');
                setSuccess(false);
                onClose();
            }, 2000);
        } catch (error) {
            console.error('Error submitting feedback:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleClose = () => {
        if (!loading) {
            setMessage('');
            setCategory('general');
            setSentiment('neutral');
            setSuccess(false);
            onClose();
        }
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={handleClose}
            title="Send Feedback"
            size="md"
        >
            {success ? (
                <div className="py-12 text-center">
                    <div className="w-16 h-16 mx-auto mb-4 bg-emerald-100 dark:bg-emerald-900/30 rounded-full flex items-center justify-center">
                        <CheckCircle className="size-8 text-emerald-600 dark:text-emerald-400" />
                    </div>
                    <h3 className="text-lg font-semibold text-ink mb-2">
                        Thank you!
                    </h3>
                    <p className="text-ink-muted">
                        Your feedback has been submitted successfully.
                    </p>
                </div>
            ) : (
                <form onSubmit={handleSubmit} className="space-y-5">
                    {/* Category Selection */}
                    <div>
                        <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                            Category
                        </label>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                            {categories.map((cat) => {
                                const Icon = cat.icon;
                                const isSelected = category === cat.id;
                                return (
                                    <button
                                        key={cat.id}
                                        type="button"
                                        onClick={() => setCategory(cat.id)}
                                        className={`flex flex-col items-center gap-2 p-3 rounded-xl border-2 transition-all ${isSelected
                                            ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30'
                                            : 'border-line hover:border-neutral-300 dark:hover:border-neutral-600'
                                            }`}
                                    >
                                        <div className={`p-2 rounded-lg ${cat.color}`}>
                                            <Icon className="size-4" />
                                        </div>
                                        <span className={`text-xs font-medium ${isSelected ? 'text-blue-700 dark:text-blue-300' : 'text-ink-muted'
                                            }`}>
                                            {cat.label}
                                        </span>
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Message */}
                    <div>
                        <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                            Your Message
                        </label>
                        <textarea
                            required
                            value={message}
                            onChange={(e) => setMessage(e.target.value)}
                            rows={4}
                            className="w-full px-4 py-3 bg-ground border border-line rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-ink placeholder-neutral-400 transition-all resize-none"
                            placeholder={
                                category === 'bug'
                                    ? "Describe the bug you encountered. What were you trying to do? What happened instead?"
                                    : category === 'feature'
                                        ? "Describe the feature you'd like to see. How would it help you?"
                                        : category === 'praise'
                                            ? "Tell us what you love about Refloww!"
                                            : "Share your thoughts, suggestions, or questions..."
                            }
                        />
                        <p className="mt-1 text-xs text-neutral-400">
                            {message.length}/500 characters
                        </p>
                    </div>

                    {/* Sentiment */}
                    <div>
                        <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                            How are you feeling?
                        </label>
                        <div className="flex gap-2">
                            {sentiments.map((s) => {
                                const Icon = s.icon;
                                const isSelected = sentiment === s.id;
                                return (
                                    <button
                                        key={s.id}
                                        type="button"
                                        onClick={() => setSentiment(s.id as any)}
                                        className={`flex-1 flex items-center justify-center gap-2 p-3 rounded-xl border-2 transition-all ${isSelected
                                            ? s.color + ' border-current'
                                            : 'border-line text-neutral-500 hover:border-neutral-300 dark:hover:border-neutral-600'
                                            }`}
                                    >
                                        <Icon className="size-4" />
                                        <span className="text-sm font-medium">{s.label}</span>
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* User info note */}
                    {user && (
                        <p className="text-xs text-ink-muted">
                            Submitting as {user.email}
                        </p>
                    )}

                    <ModalFooter>
                        <button
                            type="button"
                            onClick={handleClose}
                            disabled={loading}
                            className="px-4 py-2 text-ink-muted hover:bg-neutral-100 dark:hover:bg-neutral-700 rounded-xl font-medium transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={loading || !message.trim()}
                            className="flex items-center gap-2 px-6 py-2 bg-[#2d3748] dark:bg-white hover:bg-neutral-800 dark:hover:bg-neutral-200 text-white dark:text-neutral-900 rounded-xl font-medium transition-colors disabled:opacity-50"
                        >
                            {loading ? (
                                <RefreshCw className="size-4 rf-spin" />
                            ) : (
                                <Send className="size-4" />
                            )}
                            Send Feedback
                        </button>
                    </ModalFooter>
                </form>
            )}
        </Modal>
    );
}

export default FeedbackModal;
