import React, { useState, useRef, useImperativeHandle, forwardRef } from 'react';
import { TripStory, User, Comment } from '../types';
import { RouteIcon, CameraIcon, PlusIcon, HeartIcon, ChatBubbleIcon } from './IconComponents';
import CommentSection from './CommentSection';

interface ItineraryDisplayProps {
  trip: TripStory;
  isEditing: boolean;
  currentUser: User;
  onPhotoHover: (locationId: string | null) => void;
  onLocationChange: (locationId: string, field: 'name' | 'story', value: string) => void;
  onPhotoDescriptionChange: (photoId: string, description: string) => void;
  onAddPhotos: () => void;
  onUpdateTrip: (updatedTrip: TripStory) => void; // For handling likes/comments
  onPhotoClick: (photoId: string) => void;
  mode: 'detail' | 'preview';
}

export interface ItineraryDisplayHandle {
    scrollToLocation: (locationId: string) => void;
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
            <button onClick={handleLike} className="flex items-center gap-1.5 text-slate-400 hover:text-white transition-colors">
                <HeartIcon className={`w-5 h-5 ${hasLiked ? 'text-red-500 fill-current' : ''}`} />
                <span className="text-xs">{photo.likes.length}</span>
            </button>
             <button onClick={onCommentClick} className="flex items-center gap-1.5 text-slate-400 hover:text-white transition-colors">
                <ChatBubbleIcon className="w-5 h-5" />
                <span className="text-xs">{photo.comments.length}</span>
            </button>
        </div>
    )
}

const ItineraryDisplay = forwardRef<ItineraryDisplayHandle, ItineraryDisplayProps>(({ trip, isEditing, onPhotoHover, onLocationChange, onPhotoDescriptionChange, onAddPhotos, currentUser, onUpdateTrip, onPhotoClick, mode }, ref) => {
  const [activeCommentSectionId, setActiveCommentSectionId] = useState<string | null>(null);
  const locationRefs = useRef(new Map<string, HTMLDivElement>());

  useImperativeHandle(ref, () => ({
      scrollToLocation(locationId: string) {
          const element = locationRefs.current.get(locationId);
          element?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
  }));

  const handleAddPhotoComment = (photoId: string, content: string) => {
    const updatedTrip = { ...trip };
    const targetPhoto = updatedTrip.files.find(f => f.id === photoId);
    if (!targetPhoto || !currentUser) return;

    const newComment: Comment = {
      id: crypto.randomUUID(),
      user: currentUser,
      content,
      createdAt: new Date().toISOString(),
    };
    targetPhoto.comments.push(newComment);
    onUpdateTrip(updatedTrip);
  };

  const handleDeletePhotoComment = (photoId: string, commentId: string) => {
    const updatedTrip = { ...trip };
    const targetPhoto = updatedTrip.files.find(f => f.id === photoId);
    if (!targetPhoto) return;

    targetPhoto.comments = targetPhoto.comments.filter(c => c.id !== commentId);
    onUpdateTrip(updatedTrip);
  };


  return (
    <div className="bg-slate-800/60 p-4 sm:p-6 rounded-2xl shadow-lg border border-slate-700 h-full">
      {isEditing && (
        <div className="mb-4">
            <button 
                onClick={onAddPhotos} 
                className="w-full flex items-center justify-center gap-2 bg-yellow-600/20 hover:bg-yellow-600/40 border border-yellow-500/50 text-yellow-300 font-bold py-2 px-4 rounded-lg transition-colors"
            >
                <PlusIcon className="w-5 h-5"/>
                Add More Photos
            </button>
        </div>
      )}
      <div className="space-y-6 max-h-[70vh] overflow-y-auto pr-2 pl-4">
        {trip.locations.map((loc, index) => {
          const locationPhotos = trip.files.filter(file => loc.photoIds.includes(file.id));
          return (
            <div 
                key={loc.id} 
                ref={el => {
                    if (el) locationRefs.current.set(loc.id, el);
                    else locationRefs.current.delete(loc.id);
                }}
                className="relative pl-3 border-l border-dashed border-slate-600 last:border-transparent"
            >
              <div className="absolute left-[-13px] top-1 flex items-center justify-center w-6 h-6 bg-yellow-600 rounded-full text-white font-bold text-sm ring-4 ring-slate-900">
                {index + 1}
              </div>
              <div className="ml-8 pb-6">
                <h4 className="font-semibold text-white -mt-1">{loc.name}</h4>
                <p className="text-slate-300 text-sm mt-1">{loc.story}</p>

                {locationPhotos.length > 0 && (
                  <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 gap-2" onMouseLeave={() => onPhotoHover(null)}>
                    {locationPhotos.map(photo => (
                      <React.Fragment key={photo.id}>
                        <div onMouseEnter={() => onPhotoHover(loc.id)}>
                          <div className="aspect-square rounded-md overflow-hidden group cursor-pointer relative" onClick={() => onPhotoClick(photo.id)}>
                            <img 
                              src={photo.previewUrl} 
                              alt={photo.file?.name || `A photo from ${loc.name}`} 
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                  (e.target as HTMLImageElement).src = `https://picsum.photos/seed/${photo.id}/200/200`;
                                  (e.target as HTMLImageElement).onerror = null; // Prevent infinite loop
                              }}
                            />
                          </div>
                          {mode === 'detail' && (
                            <PhotoSocialActions 
                                photoId={photo.id} 
                                trip={trip} 
                                currentUser={currentUser} 
                                onUpdateTrip={onUpdateTrip} 
                                onCommentClick={() => setActiveCommentSectionId(activeCommentSectionId === photo.id ? null : photo.id)} 
                            />
                          )}
                        </div>

                        {activeCommentSectionId === photo.id && mode === 'detail' && (
                          <div className="col-span-2 sm:col-span-3">
                            <CommentSection
                              title="Photo Comments"
                              comments={photo.comments}
                              currentUser={currentUser}
                              onAddComment={(content) => handleAddPhotoComment(photo.id, content)}
                              onDeleteComment={(commentId) => handleDeletePhotoComment(photo.id, commentId)}
                              placeholder="Add a comment..."
                            />
                          </div>
                        )}
                      </React.Fragment>
                    ))}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
});

ItineraryDisplay.displayName = 'ItineraryDisplay';

export default ItineraryDisplay;
