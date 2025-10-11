import React, { useState } from 'react';
import { Profile, TripStory, User } from '../types';
import { HomeIcon, UserIcon, RouteIcon, UsersIcon, PlusIcon, SparklesIcon } from './IconComponents';

// Re-using the TripCard component by moving its definition here temporarily.
// Ideally, this would be in its own file (e.g., components/TripCard.tsx)
const StarRatingDisplay: React.FC<{ ratings: any[], className?: string }> = ({ ratings, className }) => {
    if (!ratings || ratings.length === 0) return null;
    const averageRating = ratings.reduce((acc, r) => acc + r.value, 0) / ratings.length;

    return (
        <div className={`flex items-center gap-1 flex-shrink-0 ${className}`}>
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4 text-yellow-400">
              <path fillRule="evenodd" d="M10.788 3.21c.448-1.077 1.976-1.077 2.424 0l2.082 5.006 5.404.434c1.164.093 1.636 1.545.749 2.305l-4.117 3.527 1.257 5.273c.271 1.136-.964 2.033-1.96 1.425L12 18.354 7.373 21.18c-.996.608-2.231-.29-1.96-1.425l1.257-5.273-4.117-3.527c-.887-.76-.415-2.212.749-2.305l5.404-.434 2.082-5.005Z" clipRule="evenodd" />
            </svg>
            <span className="text-sm font-bold text-white">{averageRating.toFixed(1)}</span>
            <span className="text-xs text-slate-400">({ratings.length})</span>
        </div>
    );
};
const TripCard: React.FC<{ trip: TripStory; onClick: () => void; onUserClick: (userId: string) => void; currentUser: User | null }> = ({ trip, onClick, onUserClick, currentUser }) => (
  <div className="bg-slate-800/60 rounded-2xl overflow-hidden border border-slate-700 shadow-lg group transform transition-all duration-300 hover:shadow-yellow-500/20 hover:-translate-y-1">
    <div onClick={onClick} className="cursor-pointer">
      <div className="aspect-video overflow-hidden relative">
        <img src={trip.coverImageUrl} alt={trip.title} className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" onError={(e) => { (e.target as HTMLImageElement).src = `https://picsum.photos/seed/${trip.id}/400/225`; }} />
      </div>
      <div className="p-4 sm:p-5">
        <div className="flex justify-between items-start gap-2">
            <h3 className="text-xl font-bold text-white truncate group-hover:text-yellow-400 transition-colors flex-1">{trip.title}</h3>
            <StarRatingDisplay ratings={trip.ratings} />
        </div>
        <p className="text-slate-400 text-sm mt-2 line-clamp-2">{trip.summary}</p>
      </div>
    </div>
    <div className="px-5 pb-4 border-t border-slate-700/50 flex justify-between items-center">
        <div onClick={(e) => { e.stopPropagation(); onUserClick(trip.user.id); }} className="flex items-center gap-2 cursor-pointer group/user">
            <img src={trip.user.avatarUrl} alt={trip.user.username} className="w-8 h-8 rounded-full"/>
            <span className="text-sm font-semibold text-slate-300 group-hover/user:text-yellow-400 transition-colors">{trip.user.username}</span>
        </div>
        <div className="flex items-center gap-4 text-slate-400">
             <div className="flex items-center gap-1.5">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={`w-5 h-5 ${currentUser && trip.likes.some(l => l.userId === currentUser.id) ? 'text-red-500 fill-current' : ''}`}><path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12Z" /></svg>
                <span className="text-sm">{trip.likes.length}</span>
            </div>
            <div className="flex items-center gap-1.5">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M20.25 8.511c.884.284 1.5 1.128 1.5 2.097v4.286c0 1.136-.847 2.1-1.98 2.193l-3.722.537a5.25 5.25 0 0 1-1.04-.018l-3.722-.537a5.25 5.25 0 0 0-1.04.018l-3.722.537A2.25 2.25 0 0 1 3 17.25V13c0-1.007.67-1.838 1.62-2.097M15.75 6.75v3.375c0 .621.504 1.125 1.125 1.125h3.375V13a2.25 2.25 0 0 1-2.25 2.25h-9A2.25 2.25 0 0 1 6 13V6.75a2.25 2.25 0 0 1 2.25-2.25h9A2.25 2.25 0 0 1 15.75 6.75Z" /></svg>
                <span className="text-sm">{trip.comments.length}</span>
            </div>
        </div>
    </div>
  </div>
);


interface ProfilePageProps {
    profile: Profile;
    trips: TripStory[];
    currentUser: User;
    onSelectTrip: (tripId: string) => void;
    onUserClick: (userId: string) => void;
    onNewTrip: () => void;
}

const ProfilePage: React.FC<ProfilePageProps> = ({ profile, trips, currentUser, onSelectTrip, onUserClick, onNewTrip }) => {
    const [activeTab, setActiveTab] = useState('home');
    const isOwnProfile = profile.id === currentUser.id;

    const navItems = [
        { id: 'home', label: 'Home', icon: HomeIcon },
        { id: 'profile', label: 'Profile', icon: UserIcon },
        { id: 'trips', label: 'Trips', icon: RouteIcon },
        { id: 'community', label: 'Community', icon: UsersIcon },
    ];

    return (
        <div>
            {/* Banner and Header */}
            <div>
                <div className="h-48 md:h-64 bg-slate-800 rounded-2xl overflow-hidden">
                    <img src={profile.bannerUrl} alt={`${profile.username}'s banner`} className="w-full h-full object-cover" />
                </div>
                <div className="px-8">
                    <div className="flex justify-between items-end -mt-16">
                        <div className="flex items-end gap-4">
                            <img src={profile.avatarUrl} alt={profile.username} className="w-32 h-32 rounded-full border-4 border-slate-900 bg-slate-800" />
                            <div>
                                <h1 className="text-3xl font-bold">{profile.fullName}</h1>
                                <p className="text-slate-400">@{profile.username}</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-2 pb-4">
                            {isOwnProfile ? (
                                <button onClick={onNewTrip} className="flex items-center gap-2 bg-yellow-500 hover:bg-yellow-600 text-white font-bold py-2 px-4 rounded-full transition-transform transform hover:scale-105 shadow-lg">
                                    <PlusIcon className="w-5 h-5"/> New Trip
                                </button>
                            ) : (
                                <>
                                    <button className="bg-yellow-500 hover:bg-yellow-600 text-white font-bold py-2 px-4 rounded-full transition-colors">Follow</button>
                                    <button className="bg-slate-700 hover:bg-slate-600 text-white font-bold py-2 px-4 rounded-full transition-colors">Message</button>
                                </>
                            )}
                        </div>
                    </div>
                    <div className="mt-4 flex items-center gap-6 text-sm">
                        <p><span className="font-bold text-white">{profile.following.toLocaleString()}</span> <span className="text-slate-400">Following</span></p>
                        <p><span className="font-bold text-white">{(profile.followers / 1000).toFixed(1)}k</span> <span className="text-slate-400">Followers</span></p>
                    </div>
                </div>
            </div>

            {/* Navigation Tabs */}
            <div className="mt-8 border-b border-slate-700">
                <nav className="flex items-center gap-2">
                    {navItems.map(item => (
                        <button 
                            key={item.id} 
                            onClick={() => setActiveTab(item.id)}
                            className={`flex items-center gap-2 px-4 py-3 font-semibold transition-colors duration-200 border-b-2 ${activeTab === item.id ? 'text-yellow-400 border-yellow-400' : 'text-slate-400 border-transparent hover:text-white'}`}
                        >
                            <item.icon className="w-5 h-5"/>
                            <span>{item.label}</span>
                        </button>
                    ))}
                </nav>
            </div>
            
            {/* Tab Content */}
            <div className="mt-8">
                {activeTab === 'home' && (
                    <div>
                        <h2 className="text-2xl font-bold mb-6">Recent Trips</h2>
                        {trips.length === 0 ? (
                            <div className="text-center py-20 px-8 bg-slate-800/60 rounded-2xl border border-dashed border-slate-700">
                                <h2 className="text-2xl font-bold text-white mb-2">{isOwnProfile ? "Your adventures await!" : "No trips shared yet."}</h2>
                                <p className="text-slate-400 mb-6 max-w-md mx-auto">{isOwnProfile ? "You haven't created any trips. Why not share your first journey?" : `${profile.fullName} hasn't shared any trips.`}</p>
                                {isOwnProfile && (
                                     <button onClick={onNewTrip} className="flex items-center gap-2 bg-yellow-500 hover:bg-yellow-600 text-white font-bold py-2 px-6 rounded-full transition-transform transform hover:scale-105 shadow-lg mx-auto">
                                        <SparklesIcon className="w-5 h-5"/> Create First Trip
                                    </button>
                                )}
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                                {trips.map(trip => (
                                    <TripCard key={trip.id} trip={trip} onClick={() => onSelectTrip(trip.id)} onUserClick={onUserClick} currentUser={currentUser} />
                                ))}
                            </div>
                        )}
                    </div>
                )}
                 {activeTab !== 'home' && (
                    <div className="text-center py-20 text-slate-500">
                        Content for "{activeTab}" coming soon!
                    </div>
                )}
            </div>
        </div>
    );
};

export default ProfilePage;
