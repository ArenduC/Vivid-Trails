import React, { useState } from 'react';
import { TripStory, CameraDetails, User } from '../types';
import { RouteIcon, CameraIcon, PlusIcon, HeartIcon, ChatBubbleIcon } from './IconComponents';

interface ItineraryDisplayProps {
  trip: TripStory;
  isEditing: boolean;
  currentUser: User;
  onPhotoHover: (locationId: string | null) => void;
  onLocationChange: (locationId: string, field: 'name' | 'story', value: string) => void;
  onPhotoDescriptionChange: (photoId: string, description: string) => void;
  onAddPhotos: () => void;
  onUpdateTrip: (updatedTrip: TripStory) => void; // For handling likes/comments
}

const PhotoSocialActions: React.FC<{photoId: string; trip: TripStory; currentUser: User; onUpdateTrip: (trip: TripStory)=>void; onCommentClick: ()=>void}> = 
({ photoId, trip, currentUser, onUpdateTrip, onCommentClick }) => {
    const photo = trip.files.find(f => f.id === photoId);
    if (!photo) return null;

    const handleLike = () => {
        const updatedTrip = {...trip};
        const targetPhoto = updatedTrip.files.find(f => f.id === photoId);
        if(!targetPhoto) return;

        const likeIndex = targetPhoto.likes.findIndex(l => l.userId === currentUser.id);
        if(likeIndex > -1) {
            targetPhoto.likes.splice(likeIndex, 1);
        } else {
            targetPhoto.likes.push({ userId: currentUser.id });
        }
        onUpdateTrip(updatedTrip);
    };

    const hasLiked = photo.likes.some(l => l.userId === currentUser.id);

    return (
        <div className="flex items-center gap-4 mt-2">
            <button onClick={handleLike} className="flex items-center gap-1.5 text-gray-400 hover:text-white transition-colors">
                <HeartIcon className={`w-5 h-5 ${hasLiked ? 'text-red-500 fill-current' : ''}`} />
                <span className="text-xs">{photo.likes.length}</span>
            </button>
             <button onClick={onCommentClick} className="flex items-center gap-1.5 text-gray-400 hover:text-white transition-colors">
                <ChatBubbleIcon className="w-5 h-5" />
                <span className="text-xs">{photo.comments.length}</span>
            </button>
        </div>
    )
}

const ItineraryDisplay: React.FC<ItineraryDisplayProps> = ({ trip, isEditing, onPhotoHover, onLocationChange, onPhotoDescriptionChange, onAddPhotos, currentUser, onUpdateTrip }) => {
  const [visibleCameraDetailsId, setVisibleCameraDetailsId] = useState<string | null>(null);
  const [activeCommentSectionId, setActiveCommentSectionId] = useState<string | null>(null);

  return (
    <div className="bg-gray-800/50 p-4 sm:p-6 rounded-2xl shadow-lg border border-gray-700 h-full">
      <div className="flex items-center justify-between mb-4">
        {/* Header remains the same */}
      </div>
      <div className="space-y-6 max-h-[70vh] overflow-y-auto pr-2">
        {trip.locations.map((loc, index) => {
          const locationPhotos = trip.files.filter(file => loc.photoIds.includes(file.id));
          return (
            <div key={loc.id} className="relative pl-8">
              {/* Pin and line rendering remains the same */}
              <div className="absolute left-0 top-1 flex items-center justify-center w-6 h-6 bg-purple-600 rounded-full text-white font-bold text-sm ring-4 ring-gray-800">
                {index + 1}
              </div>
              <h4 className="font-semibold text-white">{loc.name}</h4>
              <p className="text-gray-300 text-sm mt-1">{loc.story}</p>

              {locationPhotos.length > 0 && (
                <div className="mt-4 grid grid-cols-3 gap-2" onMouseLeave={() => onPhotoHover(null)}>
                  {locationPhotos.map(photo => (
                    <div key={photo.id} onMouseEnter={() => onPhotoHover(loc.id)}>
                      <div className="aspect-square rounded-md overflow-hidden group cursor-pointer relative">
                        <img src={photo.previewUrl} alt={photo.file.name} className="w-full h-full object-cover"/>
                      </div>
                      <PhotoSocialActions photoId={photo.id} trip={trip} currentUser={currentUser} onUpdateTrip={onUpdateTrip} onCommentClick={() => setActiveCommentSectionId(activeCommentSectionId === photo.id ? null : photo.id)} />
                      {/* Comment section would be conditionally rendered here based on activeCommentSectionId */}
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default ItineraryDisplay;
