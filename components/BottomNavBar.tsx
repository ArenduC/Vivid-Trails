

import React from 'react';
import { UserIcon, GlobeAltIcon, PlusIcon, TrophyIcon } from './IconComponents';

interface BottomNavBarProps {
    onNavigate: (view: 'profile' | 'explore' | 'create' | 'competitions') => void;
    currentView: string;
}

const BottomNavBar: React.FC<BottomNavBarProps> = ({ onNavigate, currentView }) => {
    
    const navItems = [
        { view: 'profile', label: 'Profile', icon: UserIcon },
        { view: 'explore', label: 'Explore', icon: GlobeAltIcon },
        { view: 'create', label: 'Create', icon: PlusIcon, isCentral: true },
        { view: 'competitions', label: 'Contests', icon: TrophyIcon },
    ];

    const isViewActive = (view: string) => {
        if (view === currentView) return true;
        if (currentView === 'detail' && view === 'explore') return true;
        if (currentView === 'competition_detail' && view === 'competitions') return true;
        if (currentView.startsWith('profile') && view === 'profile') return true; // Handles profile view by ID
        return false;
    };


    return (
        <footer className="fixed bottom-0 left-0 right-0 bg-slate-800/80 backdrop-blur-md border-t border-slate-700 md:hidden z-40">
            <div className="flex justify-around items-center h-16 px-2">
                {navItems.map((item, index) => {
                    const isActive = isViewActive(item.view);
                    
                    if (item.isCentral) {
                        return (
                            <div key={item.view} className="flex-1 flex justify-center">
                                <button 
                                    onClick={() => onNavigate(item.view as any)}
                                    className="w-16 h-16 -mt-8 bg-yellow-600 rounded-full flex items-center justify-center text-white shadow-lg shadow-yellow-500/30 ring-4 ring-slate-900 transform transition-transform hover:scale-110"
                                    aria-label="Create new trip"
                                >
                                    <item.icon className="w-8 h-8" />
                                </button>
                            </div>
                        );
                    }

                    return (
                        <div key={item.view} className="flex-1 flex justify-center">
                            <button onClick={() => onNavigate(item.view as any)} className={`flex flex-col items-center justify-center gap-1 w-full h-full transition-colors duration-200 ${isActive ? 'text-yellow-400' : 'text-slate-400 hover:text-white'}`}>
                                <item.icon className="w-6 h-6" />
                                <span className="text-xs font-medium">{item.label}</span>
                            </button>
                        </div>
                    );
                })}
            </div>
        </footer>
    );
};

export default BottomNavBar;
