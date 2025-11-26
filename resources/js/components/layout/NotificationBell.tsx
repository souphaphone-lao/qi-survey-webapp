import React, { useState, useRef, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { notificationsApi } from '@/services/api';
import type { Notification } from '@/types';

export default function NotificationBell() {
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const navigate = useNavigate();
    const queryClient = useQueryClient();

    // Poll for unread count every 30 seconds
    const { data: unreadCountData, refetch: refetchCount } = useQuery({
        queryKey: ['notifications', 'unread-count'],
        queryFn: () => notificationsApi.unreadCount(),
        refetchInterval: 30000,
    });

    const unreadCount = unreadCountData?.count || 0;

    // Fetch notifications when dropdown is opened
    const { data: notificationsData, refetch: refetchNotifications } = useQuery({
        queryKey: ['notifications', 'list'],
        queryFn: () => notificationsApi.list({ unread_only: true, per_page: 10 }),
        enabled: isOpen,
    });

    const notifications = notificationsData?.data || [];

    // Mark single notification as read
    const markAsReadMutation = useMutation({
        mutationFn: (id: string) => notificationsApi.markAsRead(id),
        onSuccess: () => {
            refetchCount();
            refetchNotifications();
        },
    });

    // Mark all as read
    const markAllAsReadMutation = useMutation({
        mutationFn: () => notificationsApi.markAllAsRead(),
        onSuccess: () => {
            refetchCount();
            refetchNotifications();
            setIsOpen(false);
        },
    });

    // Handle notification click
    const handleNotificationClick = async (notification: Notification) => {
        // Mark as read
        if (!notification.read_at) {
            await markAsReadMutation.mutateAsync(notification.id);
        }

        // Navigate to submission
        navigate(notification.data.url);
        setIsOpen(false);
    };

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };

        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isOpen]);

    // Get notification icon based on type
    const getNotificationIcon = (type: string) => {
        switch (type) {
            case 'submission_submitted':
                return '📩';
            case 'submission_approved':
                return '✅';
            case 'submission_rejected':
                return '❌';
            case 'submission_created':
                return '📝';
            default:
                return '🔔';
        }
    };

    // Get notification color based on type
    const getNotificationColor = (type: string) => {
        switch (type) {
            case 'submission_submitted':
                return 'bg-blue-50 hover:bg-blue-100';
            case 'submission_approved':
                return 'bg-green-50 hover:bg-green-100';
            case 'submission_rejected':
                return 'bg-red-50 hover:bg-red-100';
            case 'submission_created':
                return 'bg-gray-50 hover:bg-gray-100';
            default:
                return 'bg-gray-50 hover:bg-gray-100';
        }
    };

    // Format timestamp
    const formatTimestamp = (timestamp: string) => {
        const date = new Date(timestamp);
        const now = new Date();
        const diff = now.getTime() - date.getTime();
        const minutes = Math.floor(diff / 60000);
        const hours = Math.floor(minutes / 60);
        const days = Math.floor(hours / 24);

        if (minutes < 1) return 'Just now';
        if (minutes < 60) return `${minutes}m ago`;
        if (hours < 24) return `${hours}h ago`;
        if (days < 7) return `${days}d ago`;
        return date.toLocaleDateString();
    };

    return (
        <div className="relative" ref={dropdownRef}>
            {/* Bell Icon Button */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="relative rounded-full p-2 text-gray-600 hover:bg-gray-100 hover:text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                aria-label="Notifications"
            >
                {/* Bell SVG Icon */}
                <svg
                    className="h-6 w-6"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth="1.5"
                    stroke="currentColor"
                >
                    <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0"
                    />
                </svg>

                {/* Unread Count Badge */}
                {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-xs font-medium text-white">
                        {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                )}
            </button>

            {/* Dropdown Panel */}
            {isOpen && (
                <div className="absolute right-0 z-50 mt-2 w-96 origin-top-right rounded-lg bg-white shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none">
                    {/* Header */}
                    <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3">
                        <h3 className="text-sm font-semibold text-gray-900">Notifications</h3>
                        {notifications.length > 0 && (
                            <button
                                onClick={() => markAllAsReadMutation.mutate()}
                                disabled={markAllAsReadMutation.isPending}
                                className="text-xs text-indigo-600 hover:text-indigo-800 disabled:opacity-50"
                            >
                                Mark all as read
                            </button>
                        )}
                    </div>

                    {/* Notifications List */}
                    <div className="max-h-96 overflow-y-auto">
                        {notifications.length === 0 ? (
                            <div className="px-4 py-8 text-center">
                                <svg
                                    className="mx-auto h-12 w-12 text-gray-300"
                                    fill="none"
                                    viewBox="0 0 24 24"
                                    strokeWidth="1.5"
                                    stroke="currentColor"
                                >
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0"
                                    />
                                </svg>
                                <p className="mt-2 text-sm text-gray-500">No new notifications</p>
                            </div>
                        ) : (
                            <div className="divide-y divide-gray-100">
                                {notifications.map((notification) => (
                                    <button
                                        key={notification.id}
                                        onClick={() => handleNotificationClick(notification)}
                                        className={`w-full px-4 py-3 text-left transition-colors ${getNotificationColor(
                                            notification.data.type
                                        )}`}
                                    >
                                        <div className="flex items-start space-x-3">
                                            <span className="text-2xl flex-shrink-0">
                                                {getNotificationIcon(notification.data.type)}
                                            </span>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-medium text-gray-900">
                                                    {notification.data.questionnaire_title}
                                                </p>
                                                <p className="text-sm text-gray-600">
                                                    {notification.data.institution_name}
                                                </p>
                                                {notification.data.rejection_comments && (
                                                    <p className="mt-1 text-xs text-red-600 line-clamp-2">
                                                        {notification.data.rejection_comments}
                                                    </p>
                                                )}
                                                <p className="mt-1 text-xs text-gray-500">
                                                    {formatTimestamp(notification.created_at)}
                                                </p>
                                            </div>
                                        </div>
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
