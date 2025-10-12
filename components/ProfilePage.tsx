import React, { useState } from 'react';
import { Profile, TripStory, User, Rating } from '../types';
import { UserIcon, RouteIcon, UsersIcon, PlusIcon, SparklesIcon, StarIcon, HeartIcon, ChatBubbleIcon } from './IconComponents';

// Re-using the TripCard component by moving its definition here temporarily.
// Ideally, this would be in its own file (e.g., components/TripCard.tsx)
const StarRatingDisplay: React.FC<{ ratings: Rating[], className?: string }> = ({ ratings, className }) => {
    if (!ratings || ratings.length === 0) return null;
    const averageRating = ratings.reduce((acc, r) => acc + r.value, 0) / ratings.length;

    return (
        <div className={`flex items-center gap-1 flex-shrink-0 ${className}`}>
            <StarIcon className="w-4 h-4 text-yellow-400" filled />
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
                <HeartIcon className={`w-5 h-5 ${currentUser && trip.likes.some(l => l.userId === currentUser.id) ? 'text-red-500 fill-current' : ''}`}/>
                <span className="text-sm">{trip.likes.length}</span>
            </div>
            <div className="flex items-center gap-1.5">
                <ChatBubbleIcon className="w-5 h-5" />
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

const UserListItem: React.FC<{ user: { avatarUrl: string, username: string, fullName: string } }> = ({ user }) => (
    <div className="flex items-center justify-between p-3 bg-slate-800/60 rounded-lg">
        <div className="flex items-center gap-3">
            <img src={user.avatarUrl} alt={user.username} className="w-12 h-12 rounded-full" />
            <div>
                <p className="font-bold text-white">{user.fullName}</p>
                <p className="text-sm text-slate-400">@{user.username}</p>
            </div>
        </div>
        <button className="bg-slate-700 hover:bg-slate-600 text-white font-bold py-2 px-4 rounded-full text-sm transition-colors">
            Follow
        </button>
    </div>
);

const ProfilePage: React.FC<ProfilePageProps> = ({ profile, trips, currentUser, onSelectTrip, onUserClick, onNewTrip }) => {
    const [activeTab, setActiveTab] = useState('trips');
    const isOwnProfile = profile.id === currentUser.id;

    const navItems = [
        { id: 'trips', label: 'Trips', icon: RouteIcon },
        { id: 'about', label: 'About', icon: UserIcon },
        { id: 'community', label: 'Community', icon: UsersIcon },
    ];

    // Mock data for Community tab to demonstrate functionality
    const mockUsers = [
        { avatarUrl: 'https://picsum.photos/seed/alex/100/100', username: 'alex_travels', fullName: 'Alex Smith' },
        { avatarUrl: 'https://picsum.photos/seed/jane/100/100', username: 'Wanderlust_Jane', fullName: 'Jane Doe' },
        { avatarUrl: 'https://picsum.photos/seed/mike/100/100', username: 'mountain_mike', fullName: 'Mike Johnson' },
        { avatarUrl: 'https://picsum.photos/seed/becca/100/100', username: 'beach_becca', fullName: 'Rebecca Williams' },
        { avatarUrl: 'https://picsum.photos/seed/chris/100/100', username: 'city_explorer', fullName: 'Chris Brown' },
    ];

    const renderTabContent = () => {
        switch (activeTab) {
            case 'trips':
                return (
                    <div>
                        <h2 className="text-2xl font-bold mb-6">Trips ({trips.length})</h2>
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
                );
            case 'about':
                return (
                     <div className="max-w-4xl mx-auto bg-slate-800/60 p-8 rounded-2xl border border-slate-700">
                         <h2 className="text-2xl font-bold mb-4 text-white">About {profile.fullName}</h2>
                         <div className="text-slate-300 leading-relaxed space-y-4">
                            {profile.bio ? (
                                <p>{profile.bio}</p>
                            ) : (
                                <p>{isOwnProfile ? "You haven't written a bio yet. Click 'Edit Profile' to tell the community about your travel style!" : `${profile.fullName} hasn't written a bio yet.`}</p>
                            )}
                         </div>
                    </div>
                );
            case 'community':
                return (
                    <div>
                         <h2 className="text-2xl font-bold mb-6 text-white">Community</h2>
                         <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <div>
                                <h3 className="text-xl font-semibold mb-4">Followers <span className="text-slate-400 font-normal text-base">({profile.followers.toLocaleString()})</span></h3>
                                <div className="space-y-3">
                                    {mockUsers.slice(0,3).map(user => <UserListItem key={user.username} user={user} />)}
                                </div>
                            </div>
                             <div>
                                <h3 className="text-xl font-semibold mb-4">Following <span className="text-slate-400 font-normal text-base">({profile.following.toLocaleString()})</span></h3>
                                <div className="space-y-3">
                                     {mockUsers.slice(2,5).map(user => <UserListItem key={user.username} user={user} />)}
                                </div>
                            </div>
                         </div>
                    </div>
                );
            default:
                return null;
        }
    }

    return (
        <div>
            {/* Banner and Header */}
            <div>
                <div className="h-48 md:h-64 bg-slate-800 rounded-2xl overflow-hidden">
                    <img src={profile.bannerUrl} alt={`${profile.username}'s banner`} className="w-full h-full object-cover" />
                </div>
                <div className="px-4 md:px-8">
                    <div className="flex flex-col md:flex-row md:justify-between md:items-end -mt-12 md:-mt-16">
                        <div className="flex items-end gap-4">
                            <img src={profile.avatarUrl} alt={profile.username} className="w-24 h-24 md:w-32 md:h-32 rounded-full border-4 border-slate-900 bg-slate-800" />
                            <div>
                                <h1 className="text-2xl md:text-3xl font-bold">{profile.fullName}</h1>
                                <p className="text-slate-400">@{profile.username}</p>
                            </div>
                        </div>
                        <div className="w-full md:w-auto flex items-center gap-2 mt-4 md:mt-0 md:pb-4">
                            {isOwnProfile ? (
                                <button onClick={onNewTrip} className="w-full md:w-auto flex items-center justify-center gap-2 bg-yellow-500 hover:bg-yellow-600 text-white font-bold py-2 px-4 rounded-full transition-transform transform hover:scale-105 shadow-lg">
                                    <PlusIcon className="w-5 h-5"/> New Trip
                                </button>
                            ) : (
                                <>
                                    <button className="flex-1 md:flex-initial bg-yellow-500 hover:bg-yellow-600 text-white font-bold py-2 px-4 rounded-full transition-colors">Follow</button>
                                    <button className="flex-1 md:flex-initial bg-slate-700 hover:bg-slate-600 text-white font-bold py-2 px-4 rounded-full transition-colors">Message</button>
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
                {renderTabContent()}
            </div>
        </div>
    );
};

export default ProfilePage;