import React from 'react';
import { MapPinIcon } from './IconComponents';
import { User } from '../types';

interface HeaderProps {
    onTitleClick: () => void;
    user: User | null;
    onLogout: () => void;
}

const Header: React.FC<HeaderProps> = ({ onTitleClick, user, onLogout }) => {
  return (
    <header className="py-4 border-b border-gray-700/50">
      <div className={`container mx-auto px-4 sm:px-6 lg:px-8 flex items-center ${user ? 'justify-between' : 'justify-center'}`}>
        <div onClick={onTitleClick} className="flex items-center space-x-3 cursor-pointer" role="button" aria-label="Go to homepage">
          <MapPinIcon className="h-8 w-8 text-purple-400" />
          <h1 className="text-2xl font-bold tracking-wider text-white">
            Vivid Trails
          </h1>
        </div>

        {user && (
            <div className="flex items-center gap-4">
                <span className="font-semibold hidden sm:inline">{user.username}</span>
                <img src={user.avatarUrl} alt={user.username} className="w-10 h-10 rounded-full border-2 border-purple-400"/>
                <button onClick={onLogout} className="text-sm text-gray-400 hover:text-white transition-colors">Logout</button>
            </div>
        )}
      </div>
    </header>
  );
};

export default Header;
