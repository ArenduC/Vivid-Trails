import React, { useState, useEffect, useRef } from 'react';
import { BellIcon, HeartIcon, UserIcon as FollowerIcon, VideoCameraIcon, TrophyIcon } from './IconComponents';
import { User } from '../types';

interface HeaderProps {
    onTitleClick: () => void;
    onExploreClick: () => void;
    onCompetitionsClick: () => void;
    user: User | null;
    onLogout: () => void;
}

const NotificationPanel: React.FC = () => {
    const notifications = [
        { id: 1, icon: HeartIcon, text: "alex_travels liked your trip 'Alpine Adventure'.", time: "2m ago" },
        { id: 2, icon: FollowerIcon, text: "You have a new follower: Wanderlust_Jane.", time: "1h ago" },
        { id: 3, icon: VideoCameraIcon, text: "Your highlight reel for 'Beaches of Thailand' is ready!", time: "3h ago" },
        { id: 4, icon: TrophyIcon, text: "A new competition 'Golden Hour Landscapes' has started.", time: "1d ago" },
    ];

    return (
        <div className="absolute top-full right-0 mt-2 w-80 bg-slate-800 border border-slate-700 rounded-lg shadow-lg z-50 text-white animate-fade-in-down">
            <div className="p-3 border-b border-slate-700">
                <h4 className="font-semibold text-white">Notifications</h4>
            </div>
            <div className="max-h-96 overflow-y-auto">
                {notifications.length > 0 ? (
                    notifications.map(notification => (
                        <div key={notification.id} className="p-3 hover:bg-slate-700/50 flex items-start gap-3 cursor-pointer">
                            <notification.icon className="w-5 h-5 text-yellow-400 mt-1 flex-shrink-0" />
                            <div className="flex-1">
                                <p className="text-sm text-slate-200">{notification.text}</p>
                                <p className="text-xs text-slate-400 mt-0.5">{notification.time}</p>
                            </div>
                        </div>
                    ))
                ) : (
                    <p className="text-sm text-slate-400 text-center py-8">No new notifications.</p>
                )}
            </div>
             <div className="p-2 text-center border-t border-slate-700">
                <button className="text-sm font-semibold text-yellow-400 hover:text-yellow-300">View all</button>
            </div>
        </div>
    );
};


const Header: React.FC<HeaderProps> = ({ onTitleClick, onExploreClick, onCompetitionsClick, user, onLogout }) => {
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const notificationsRef = useRef<HTMLDivElement>(null);
  const profileMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
        if (notificationsRef.current && !notificationsRef.current.contains(event.target as Node)) {
            setIsNotificationsOpen(false);
        }
        if (profileMenuRef.current && !profileMenuRef.current.contains(event.target as Node)) {
            setIsProfileMenuOpen(false);
        }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogoutClick = () => {
    onLogout();
    setIsProfileMenuOpen(false);
  };

  return (
    <header className="py-4 border-b border-slate-700/50 sticky top-0 bg-slate-900/80 backdrop-blur-md z-30">
      <div className={`container mx-auto px-4 sm:px-6 lg:px-8 flex items-center ${user ? 'justify-between' : 'justify-center'}`}>
        <div className="flex items-center gap-8">
            <div onClick={onTitleClick} className="flex items-center gap-3 cursor-pointer" role="button" aria-label="Go to homepage">
                <img src="https://zcxsscvheqidzvkhlnwz.supabase.co/storage/v1/object/public/Default%20image/Union%20(1).png" alt="Vivid Trails Icon" className="h-8"/>
                <img src="https://zcxsscvheqidzvkhlnwz.supabase.co/storage/v1/object/public/Default%20image/graphynovus%20_%20Vivid%20Trails.png" alt="Vivid Trails Wordmark" className="h-5"/>
            </div>
            {user && (
                <nav className="hidden md:flex items-center gap-6">
                    <button onClick={onTitleClick} className="font-semibold text-slate-300 hover:text-yellow-400 transition-colors">My Profile</button>
                    <button onClick={onExploreClick} className="font-semibold text-slate-300 hover:text-yellow-400 transition-colors">Explore</button>
                    <button onClick={onCompetitionsClick} className="font-semibold text-slate-300 hover:text-yellow-400 transition-colors">Competitions</button>
                </nav>
            )}
        </div>

        {user && (
            <div className="flex items-center gap-2">
                <div className="relative" ref={notificationsRef}>
                    <button 
                      onClick={() => setIsNotificationsOpen(!isNotificationsOpen)} 
                      className="text-slate-400 hover:text-white p-2 rounded-full hover:bg-slate-700 transition-colors"
                      aria-label="Toggle notifications"
                    >
                        <BellIcon className="w-6 h-6" />
                    </button>
                    {isNotificationsOpen && <NotificationPanel />}
                </div>
                
                <div className="relative" ref={profileMenuRef}>
                    <div onClick={() => setIsProfileMenuOpen(prev => !prev)} className="flex items-center gap-3 cursor-pointer group p-2 rounded-lg hover:bg-slate-800/50" aria-haspopup="true" aria-expanded={isProfileMenuOpen}>
                        <span className="font-semibold hidden sm:inline text-slate-300 group-hover:text-white transition-colors">{user.username}</span>
                        <img src={user.avatarUrl} alt={user.username} className="w-10 h-10 rounded-full border-2 border-yellow-400 group-hover:border-yellow-300 transition-colors"/>
                    </div>
                    {isProfileMenuOpen && (
                        <div className="absolute top-full right-0 mt-2 w-56 bg-slate-800 border border-slate-700 rounded-lg shadow-lg z-50 text-white animate-fade-in-down py-2" role="menu">
                            <button onClick={handleLogoutClick} className="w-full text-left px-4 py-2 text-sm hover:bg-slate-700/50 text-red-400 font-semibold" role="menuitem">Logout</button>
                        </div>
                    )}
                </div>
            </div>
        )}
      </div>
    </header>
  );
};

export default Header;