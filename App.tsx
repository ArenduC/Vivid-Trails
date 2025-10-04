
import React, { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { UploadedFile, TripStory, CameraDetails, LocationPin, User, Comment, Rating, Profile, Competition, CompetitionEntry } from './types';
import { generateTripStory, generateTripVideo, addPhotosToTripStory } from './services/geminiService';
import Header from './components/Header';
import FileUpload from './components/FileUpload';
import Loader from './components/Loader';
import MapView from './components/MapView';
import ItineraryDisplay, { ItineraryDisplayHandle } from './components/ItineraryDisplay';
import Auth from './Auth';
import { supabase, supabaseUrl } from './supabaseClient';
import { PlusIcon, ArrowLeftIcon, SparklesIcon, PencilIcon, CheckIcon, XMarkIcon, HeartIcon, ChatBubbleIcon, ShareIcon, VideoCameraIcon, StarIcon, CameraIcon as CameraDetailIcon, ShutterSpeedIcon, ApertureIcon, IsoIcon, RefreshIcon, GlobeAltIcon, TrashIcon as DiscardIcon, ArchiveBoxIcon, DevicePhoneMobileIcon, TrophyIcon } from './components/IconComponents';
import CommentSection from './components/CommentSection';
import LibraryImagePicker from './components/Gallery';
import ProfilePage from './components/ProfilePage';

declare const EXIF: any;

// --- DATE HELPERS ---
const parseUTCDate = (dateString: string): Date => {
    // This function now robustly handles both 'YYYY-MM-DD' and full ISO date strings.
    if (typeof dateString !== 'string' || !dateString) {
        console.warn('Invalid date string provided (not a string or empty):', dateString);
        return new Date(0);
    }
    
    // Take just the date part (first 10 characters) to handle formats like '2024-07-26T00:00:00+00:00'.
    const datePart = dateString.substring(0, 10);

    if (!/^\d{4}-\d{2}-\d{2}$/.test(datePart)) {
        console.warn('Invalid date string format provided to parseUTCDate:', dateString);
        return new Date(0); // Return epoch for invalid strings to avoid crashes
    }
    const [year, month, day] = datePart.split('-').map(Number);
    // Create a new Date object from the UTC timestamp.
    return new Date(Date.UTC(year, month - 1, day));
};

const getLocalDateISOString = (date: Date): string => {
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    return `${year}-${month}-${day}`;
};


// --- EXIF HELPERS ---
const toDecimal = (gpsData: number[], ref: string): number => {
    return (gpsData[0] + gpsData[1] / 60 + gpsData[2] / 3600) * (ref === 'S' || ref === 'W' ? -1 : 1);
};
export const extractFileMetadata = (file: File): Promise<{ coords: { lat: number; lng: number } | null; cameraDetails: CameraDetails | null; isOriginal: boolean }> => {
    return new Promise((resolve) => {
        EXIF.getData(file, function(this: any) {
            try {
                const lat = EXIF.getTag(this, 'GPSLatitude');
                const latRef = EXIF.getTag(this, 'GPSLatitudeRef');
                const lng = EXIF.getTag(this, 'GPSLongitude');
                const lngRef = EXIF.getTag(this, 'GPSLongitudeRef');
                const coords = (lat && latRef && lng && lngRef) ? { lat: toDecimal(lat, latRef), lng: toDecimal(lng, lngRef) } : null;

                const sanitize = (input: any): string | undefined => {
                    if (input === null || input === undefined) return undefined;
                    return input.toString().replace(/\u0000/g, '').trim();
                };

                const model = sanitize(EXIF.getTag(this, 'Model'));
                const exposureTimeRaw = EXIF.getTag(this, 'ExposureTime');
                const fNumberRaw = EXIF.getTag(this, 'FNumber');
                const iso = sanitize(EXIF.getTag(this, 'ISOSpeedRatings'));
                
                const exposureTime = exposureTimeRaw ? `${exposureTimeRaw.numerator}/${exposureTimeRaw.denominator}s` : undefined;
                const fNumber = fNumberRaw ? `f/${fNumberRaw.toString()}`: undefined;

                const cameraDetails = (model || exposureTime || fNumber || iso) ? { model, exposureTime, fNumber, iso } : null;
                
                // Validation for "RAW"/Original: Check for key metadata fields.
                // An original photo from a camera should have a model and at least one other primary setting.
                const isOriginal = !!(model && (exposureTimeRaw || fNumberRaw || iso));
                
                resolve({ coords, cameraDetails, isOriginal });
            } catch (error) { console.error('Error reading EXIF data:', error); resolve({ coords: null, cameraDetails: null, isOriginal: false }); }
        });
    });
};

// --- SUB-COMPONENTS ---

const StarRatingDisplay: React.FC<{ ratings: Rating[], className?: string }> = ({ ratings, className }) => {
    if (!ratings || ratings.length === 0) return null;
    const averageRating = ratings.reduce((acc, r) => acc + r.value, 0) / ratings.length;

    return (
        <div className={`flex items-center gap-1 flex-shrink-0 ${className}`}>
            <StarIcon className="w-4 h-4 text-yellow-400" filled />
            <span className="text-sm font-bold text-white">{averageRating.toFixed(1)}</span>
            <span className="text-xs text-gray-400">({ratings.length})</span>
        </div>
    );
};

const PhotoModal: React.FC<{ photo: UploadedFile; onClose: () => void }> = ({ photo, onClose }) => {
    const details = [
        { Icon: CameraDetailIcon, value: photo.cameraDetails?.model, label: 'Camera Model' },
        { Icon: ShutterSpeedIcon, value: photo.cameraDetails?.exposureTime, label: 'Exposure Time' },
        { Icon: ApertureIcon, value: photo.cameraDetails?.fNumber, label: 'Aperture' },
        { Icon: IsoIcon, value: `ISO ${photo.cameraDetails?.iso}`, label: 'ISO', condition: photo.cameraDetails?.iso },
    ];
    const availableDetails = details.filter(d => d.condition !== undefined ? d.condition : d.value);

    return (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-md flex items-center justify-center z-50 p-4" onClick={onClose} role="dialog" aria-modal="true">
            <div className="relative w-full h-full flex flex-col lg:flex-row items-center justify-center gap-8" onClick={e => e.stopPropagation()}>
                <div className="relative flex-1 w-full lg:w-auto lg:h-full max-h-[70vh] lg:max-h-full flex items-center justify-center">
                    <img 
                      src={photo.previewUrl} 
                      alt={photo.description || photo.file?.name || 'A photo from the trip'} 
                      className="max-w-full max-h-full object-contain rounded-lg shadow-2xl" 
                      onError={(e) => {
                          (e.target as HTMLImageElement).src = `https://picsum.photos/seed/${photo.id}/800/600`;
                          (e.target as HTMLImageElement).onerror = null;
                      }}
                    />
                </div>
                <div className="lg:w-80 bg-gray-800/50 p-6 rounded-2xl border border-gray-700 text-white flex-shrink-0 w-full lg:max-w-sm">
                    <h3 className="text-xl font-bold mb-1">Photo Details</h3>
                    {photo.description && <p className="text-gray-300 mb-4">{photo.description}</p>}
                    
                    {availableDetails.length > 0 && (
                        <div className="space-y-3">
                            {availableDetails.map(({ Icon, value, label }) => (
                                <div key={label} className="flex items-center gap-3">
                                    <div className="bg-gray-700 p-2 rounded-full">
                                        <Icon className="w-5 h-5 text-purple-400" />
                                    </div>
                                    <div>
                                        <p className="font-semibold text-sm leading-tight">{value}</p>
                                        <p className="text-xs text-gray-400 leading-tight">{label}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
                <button onClick={onClose} className="absolute top-4 right-4 text-white bg-gray-800/50 rounded-full p-2 hover:bg-gray-700" aria-label="Close photo view">
                    <XMarkIcon className="w-6 h-6" />
                </button>
            </div>
        </div>
    );
};


const TripCard: React.FC<{ trip: TripStory; onClick: () => void; onUserClick: (userId: string) => void; currentUser: User | null }> = ({ trip, onClick, onUserClick, currentUser }) => (
  <div className="bg-gray-800/50 rounded-2xl overflow-hidden border border-gray-700 shadow-lg group transform transition-all duration-300 hover:shadow-purple-500/20 hover:-translate-y-1">
    <div onClick={onClick} className="cursor-pointer">
      <div className="aspect-video overflow-hidden relative">
        <img 
          src={trip.coverImageUrl} 
          alt={trip.title} 
          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" 
          onError={(e) => {
              (e.target as HTMLImageElement).src = `https://picsum.photos/seed/${trip.id}/400/225`;
              (e.target as HTMLImageElement).onerror = null;
          }}
        />
      </div>
      <div className="p-4 sm:p-5">
        <div className="flex justify-between items-start gap-2">
            <h3 className="text-xl font-bold text-white truncate group-hover:text-purple-400 transition-colors flex-1">{trip.title}</h3>
            <StarRatingDisplay ratings={trip.ratings} />
        </div>
        <p className="text-gray-400 text-sm mt-2 line-clamp-2">{trip.summary}</p>
      </div>
    </div>
    <div className="px-5 pb-4 border-t border-gray-700/50 flex justify-between items-center">
        <div onClick={(e) => { e.stopPropagation(); onUserClick(trip.user.id); }} className="flex items-center gap-2 cursor-pointer group/user">
            <img src={trip.user.avatarUrl} alt={trip.user.username} className="w-8 h-8 rounded-full"/>
            <span className="text-sm font-semibold text-gray-300 group-hover/user:text-purple-400 transition-colors">{trip.user.username}</span>
        </div>
        <div className="flex items-center gap-4 text-gray-400">
            <div className="flex items-center gap-1.5">
                <HeartIcon className={`w-5 h-5 ${currentUser && trip.likes.some(l => l.userId === currentUser.id) ? 'text-red-500 fill-current' : ''}`}/>
                <span className="text-sm">{trip.likes.length}</span>
            </div>
            <div className="flex items-center gap-1.5">
                <ChatBubbleIcon className="w-5 h-5"/>
                <span className="text-sm">{trip.comments.length}</span>
            </div>
        </div>
    </div>
  </div>
);

const ExplorePage: React.FC<{ trips: TripStory[]; onSelectTrip: (id: string) => void; onUserClick: (id: string) => void; currentUser: User | null; }> = ({ trips, onSelectTrip, onUserClick, currentUser }) => (
    <div>
        <h1 className="text-3xl font-bold mb-8">Explore All Trips</h1>
        {trips.length === 0 ? (
            <div className="text-center py-20 px-8 bg-gray-800/50 rounded-2xl border border-dashed border-gray-700">
                <h2 className="text-2xl font-bold text-white mb-2">The World is Quiet... For Now</h2>
                <p className="text-gray-400 mb-6 max-w-md mx-auto">No trips have been shared by other users yet. Be the first to explore and create a trip!</p>
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


const VideoPlayerModal: React.FC<{ videoUrl: string; onClose: () => void; tripTitle: string; }> = ({ videoUrl, onClose, tripTitle }) => (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={onClose} role="dialog" aria-modal="true" aria-labelledby="video-modal-title">
        <div className="bg-gray-800 rounded-2xl shadow-2xl w-full max-w-4xl overflow-hidden border border-gray-700" onClick={e => e.stopPropagation()}>
            <div className="p-4 flex justify-between items-center border-b border-gray-700">
                <h3 id="video-modal-title" className="text-lg font-bold text-white">{tripTitle} - Highlight Reel</h3>
                <button onClick={onClose} className="text-gray-400 hover:text-white" aria-label="Close video player">
                    <XMarkIcon className="w-6 h-6" />
                </button>
            </div>
            <div className="aspect-video bg-black">
                <video src={videoUrl} controls autoPlay className="w-full h-full object-contain">
                    Your browser does not support the video tag.
                </video>
            </div>
        </div>
    </div>
);

interface PhotoSourceModalProps {
    onClose: () => void;
    onUploadFromDevice: () => void;
    onSelectFromLibrary: () => void;
}

const PhotoSourceModal: React.FC<PhotoSourceModalProps> = ({ onClose, onUploadFromDevice, onSelectFromLibrary }) => (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={onClose}>
        <div className="bg-gray-800 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden border border-gray-700" onClick={e => e.stopPropagation()}>
            <div className="p-5 border-b border-gray-700">
                <h3 className="text-lg font-bold text-white text-center">Add More Photos</h3>
                <p className="text-sm text-gray-400 text-center mt-1">Choose a source for your new photos.</p>
            </div>
            <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                <button onClick={onUploadFromDevice} className="flex flex-col items-center justify-center p-6 bg-gray-700/50 hover:bg-purple-600/30 rounded-lg border border-gray-600 hover:border-purple-500 transition-all duration-200">
                    <DevicePhoneMobileIcon className="w-12 h-12 text-purple-400 mb-2"/>
                    <span className="font-semibold text-white">Upload from Device</span>
                    <span className="text-xs text-gray-400">Select new photos</span>
                </button>
                <button onClick={onSelectFromLibrary} className="flex flex-col items-center justify-center p-6 bg-gray-700/50 hover:bg-purple-600/30 rounded-lg border border-gray-600 hover:border-purple-500 transition-all duration-200">
                    <ArchiveBoxIcon className="w-12 h-12 text-purple-400 mb-2"/>
                    <span className="font-semibold text-white">My Library</span>
                    <span className="text-xs text-gray-400">Reuse past photos</span>
                </button>
            </div>
        </div>
    </div>
);


interface TripDetailProps {
  trip: TripStory;
  userTrips: TripStory[];
  onBack: () => void;
  onUpdateTrip: (updatedTrip: TripStory) => void;
  onUserClick: (userId: string) => void;
  currentUser: User | null;
  mode: 'detail' | 'preview';
  onPublish?: () => void;
  onDiscard?: () => void;
}


const TripDetail: React.FC<TripDetailProps> = ({ trip, userTrips, onBack, onUpdateTrip, onUserClick, currentUser, mode, onPublish, onDiscard }) => {
  const [highlightedLocationId, setHighlightedLocationId] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editableTrip, setEditableTrip] = useState<TripStory>(trip);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingMessage, setProcessingMessage] = useState('');
  const [generatedVideoUrl, setGeneratedVideoUrl] = useState<string | null>(null);
  const [showVideoModal, setShowVideoModal] = useState(false);
  const [selectedPhoto, setSelectedPhoto] = useState<UploadedFile | null>(null);
  const [processingError, setProcessingError] = useState<string | null>(null);
  const [isPhotoSourceModalOpen, setIsPhotoSourceModalOpen] = useState(false);
  const [isLibraryPickerOpen, setIsLibraryPickerOpen] = useState(false);

  const commentsRef = useRef<HTMLDivElement>(null);
  const addPhotosInputRef = useRef<HTMLInputElement>(null);
  const itineraryDisplayRef = useRef<ItineraryDisplayHandle>(null);

  useEffect(() => { setEditableTrip(trip); }, [trip]);

  const handleSave = () => { onUpdateTrip(editableTrip); setIsEditing(false); };
  const handleCancel = () => { setEditableTrip(trip); setIsEditing(false); };
  
  const handleTripLike = () => {
    if (!currentUser || mode === 'preview') return;
    const updatedTrip = {...editableTrip};
    const likeIndex = updatedTrip.likes.findIndex(l => l.userId === currentUser.id);
    if(likeIndex > -1) {
        updatedTrip.likes.splice(likeIndex, 1);
    } else {
        updatedTrip.likes.push({ userId: currentUser.id });
    }
    setEditableTrip(updatedTrip);
    onUpdateTrip(updatedTrip);
  };

  const handleTripRating = (value: number) => {
    if (!currentUser || mode === 'preview') return;
    const updatedTrip = { ...editableTrip };
    const userRatingIndex = updatedTrip.ratings.findIndex(r => r.userId === currentUser.id);

    if (userRatingIndex > -1) {
      if (updatedTrip.ratings[userRatingIndex].value === value) {
        updatedTrip.ratings.splice(userRatingIndex, 1);
      } else {
        updatedTrip.ratings[userRatingIndex].value = value;
      }
    } else {
      updatedTrip.ratings.push({ userId: currentUser.id, value });
    }
    setEditableTrip(updatedTrip);
    onUpdateTrip(updatedTrip);
  };

  const handleGenerateVideo = async () => {
      setIsProcessing(true);
      setProcessingError(null);
      setProcessingMessage("Preparing your assets...");
      try {
          const url = await generateTripVideo(trip, setProcessingMessage);
          setGeneratedVideoUrl(url);
          setShowVideoModal(true);
      } catch (error) {
          console.error("Video generation failed:", error);
          setProcessingError((error as Error).message);
      } finally {
          setIsProcessing(false);
      }
  };

    const handleAddPhotosClick = () => {
        setIsPhotoSourceModalOpen(true);
    };

    const handleNewFilesSelected = async (event: React.ChangeEvent<HTMLInputElement>) => {
        if (!event.target.files || event.target.files.length === 0 || !currentUser) return;

        setIsProcessing(true);
        setProcessingError(null);
        
        try {
            setProcessingMessage("Processing new photos...");
            const newRawFiles = Array.from(event.target.files);
            // FIX: Explicitly type `file` as `File` to resolve TypeScript inference errors where it was being treated as `unknown`.
            // This corrects issues with accessing `file.type` and using `file` in `URL.createObjectURL`.
            let newUploadedFiles: UploadedFile[] = newRawFiles
                .filter((file: File) => file.type.startsWith('image/'))
                .map((file: File) => ({
                    id: crypto.randomUUID(), file, previewUrl: URL.createObjectURL(file), likes: [], comments: []
                }));

            if (newUploadedFiles.length === 0) return;

            setProcessingMessage("Uploading your photos securely...");
            const uploadedUrls = await Promise.all(
                newUploadedFiles.map(async (uploadedFile) => {
                    const file = uploadedFile.file;
                    const filePath = `${currentUser.id}/${crypto.randomUUID()}-${file.name}`;
                    const { error: uploadError } = await supabase.storage.from('trip-photos').upload(filePath, file);
                    if (uploadError) throw uploadError;
                    return `${supabaseUrl}/storage/v1/object/public/trip-photos/${filePath}`;
                })
            );

            setProcessingMessage("Reading photo locations...");
            const filesWithMetadata = await Promise.all(newUploadedFiles.map(async (f, index) => {
                const { coords, cameraDetails } = await extractFileMetadata(f.file);
                return { ...f, previewUrl: uploadedUrls[index], coords, cameraDetails };
            }));
            
            setProcessingMessage("Integrating into your story...");
            const updatedTrip = await addPhotosToTripStory(editableTrip, filesWithMetadata as any);
            setEditableTrip(updatedTrip);

        } catch (err) {
            console.error("Error adding new photos:", err);
            setProcessingError((err as Error).message || "Could not add the new photos.");
        } finally {
            setIsProcessing(false);
            if(addPhotosInputRef.current) addPhotosInputRef.current.value = "";
        }
    };
  
    const handleLibraryPhotosSelected = async (selectedFiles: UploadedFile[]) => {
        if (selectedFiles.length === 0) return;
        setIsProcessing(true);
        setProcessingError(null);
        try {
            setProcessingMessage("Integrating into your story...");
            const filesToAdd = selectedFiles.filter(
                newFile => !editableTrip.files.some(existingFile => existingFile.previewUrl === newFile.previewUrl)
            );
            if(filesToAdd.length === 0) return;

            const updatedTrip = await addPhotosToTripStory(editableTrip, filesToAdd as any);
            setEditableTrip(updatedTrip);
        } catch (err) {
            console.error("Error adding library photos:", err);
            setProcessingError((err as Error).message || "Could not add the selected photos.");
        } finally {
            setIsProcessing(false);
        }
    };

  const handleAddTripComment = (content: string) => {
    if (!currentUser || mode === 'preview') return;
    const updatedTrip = { ...editableTrip };
    const newComment: Comment = {
      id: crypto.randomUUID(),
      user: currentUser,
      content,
      createdAt: new Date().toISOString(),
    };
    updatedTrip.comments.push(newComment);
    setEditableTrip(updatedTrip);
    onUpdateTrip(updatedTrip);
  };

  const handleDeleteTripComment = (commentId: string) => {
    if (mode === 'preview') return;
    const updatedTrip = { ...editableTrip };
    updatedTrip.comments = updatedTrip.comments.filter(c => c.id !== commentId);
    setEditableTrip(updatedTrip);
    onUpdateTrip(updatedTrip);
  };

  const handlePhotoClick = (photoId: string) => {
    const photo = trip.files.find(f => f.id === photoId);
    if (photo) {
      setSelectedPhoto(photo);
    }
  };

  const scrollToComments = () => {
    commentsRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleMarkerClick = useCallback((locationId: string) => {
      setHighlightedLocationId(locationId);
      itineraryDisplayRef.current?.scrollToLocation(locationId);
  }, []);


  return (
    <div>
      <input type="file" multiple accept="image/*" ref={addPhotosInputRef} onChange={handleNewFilesSelected} className="hidden" />
      {isPhotoSourceModalOpen && (
          <PhotoSourceModal 
              onClose={() => setIsPhotoSourceModalOpen(false)}
              onUploadFromDevice={() => {
                  setIsPhotoSourceModalOpen(false);
                  addPhotosInputRef.current?.click();
              }}
              onSelectFromLibrary={() => {
                  setIsPhotoSourceModalOpen(false);
                  setIsLibraryPickerOpen(true);
              }}
          />
      )}
      {isLibraryPickerOpen && (
          <LibraryImagePicker 
              userTrips={userTrips}
              onClose={() => setIsLibraryPickerOpen(false)}
              onConfirm={(selectedPhotos) => {
                  setIsLibraryPickerOpen(false);
                  handleLibraryPhotosSelected(selectedPhotos);
              }}
          />
      )}
      {isProcessing && <Loader message={processingMessage} />}
      {showVideoModal && generatedVideoUrl && (
          <VideoPlayerModal videoUrl={generatedVideoUrl} onClose={() => setShowVideoModal(false)} tripTitle={trip.title} />
      )}
      {selectedPhoto && (
          <PhotoModal photo={selectedPhoto} onClose={() => setSelectedPhoto(null)} />
      )}
      <div className="mb-8">
        <div className="flex justify-between items-center mb-4">
            <button onClick={onBack} className="flex items-center gap-2 text-gray-300 hover:text-white transition-colors">
              <ArrowLeftIcon className="w-5 h-5" /> {mode === 'preview' ? 'Back to Upload' : 'Back'}
            </button>
            <div className="flex items-center gap-4">
                {mode === 'preview' ? (
                    <>
                        <button onClick={onDiscard} className="flex items-center gap-2 bg-gray-700 hover:bg-gray-600 text-white font-bold py-2 px-4 rounded-full">
                            <DiscardIcon className="w-5 h-5" /> Discard
                        </button>
                        <button onClick={onPublish} className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700 text-white font-bold py-2 px-4 rounded-full transition-all transform hover:scale-105 shadow-lg">
                            <GlobeAltIcon className="w-5 h-5" /> Publish Trip
                        </button>
                    </>
                ) : (
                    currentUser && trip.user.id === currentUser.id && (
                        isEditing ? (
                             <div className="flex items-center gap-2">
                                <button onClick={handleCancel} className="flex items-center gap-2 bg-gray-700 hover:bg-gray-600 text-white font-bold py-2 px-4 rounded-full">
                                    <XMarkIcon className="w-5 h-5" /> Cancel
                                </button>
                                <button onClick={handleSave} className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700 text-white font-bold py-2 px-4 rounded-full">
                                    <CheckIcon className="w-5 h-5" /> Save Changes
                                </button>
                            </div>
                        ) : (
                            <>
                                <div className="flex flex-col items-center">
                                    <button
                                        onClick={generatedVideoUrl ? () => setShowVideoModal(true) : handleGenerateVideo}
                                        disabled={isProcessing}
                                        className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700 disabled:bg-purple-800 disabled:cursor-not-allowed text-white font-bold py-2 px-4 rounded-full transition-all transform hover:scale-105 shadow-lg"
                                    >
                                        <VideoCameraIcon className={`w-5 h-5 ${isProcessing ? 'animate-pulse' : ''}`} />
                                        {isProcessing ? processingMessage : (processingError ? 'Retry Generation' : (generatedVideoUrl ? 'View Reel' : 'Generate Reel'))}
                                    </button>
                                    {processingError && <p className="text-red-400 text-xs mt-2">{processingError}</p>}
                                </div>
                              <button onClick={() => setIsEditing(true)} className="flex items-center gap-2 bg-gray-700 hover:bg-gray-600 text-white font-bold py-2 px-4 rounded-full">
                                  <PencilIcon className="w-5 h-5" /> Edit Trip
                              </button>
                            </>
                        )
                    )
                )}
            </div>
        </div>
        <div className="text-center space-y-4">
            <h1 className="text-4xl md:text-5xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-cyan-400">{editableTrip.title}</h1>
             {mode === 'detail' && (
                <div onClick={() => onUserClick(trip.user.id)} className="flex items-center justify-center gap-2 cursor-pointer group/user">
                    <img src={trip.user.avatarUrl} alt={trip.user.username} className="w-8 h-8 rounded-full" />
                    <span className="font-semibold text-gray-300 group-hover/user:text-purple-400 transition-colors">by {trip.user.username}</span>
                </div>
            )}
            <p className="max-w-2xl mx-auto text-lg text-gray-300">{editableTrip.summary}</p>
        </div>
        
        {mode === 'detail' && !isEditing && (
            <>
                <div className="flex flex-col items-center gap-2 my-6">
                    <div className="flex items-center gap-3">
                        {[...Array(5)].map((_, i) => {
                        const ratingValue = i + 1;
                        const userRating = editableTrip.ratings.find(r => r.userId === currentUser?.id)?.value || 0;
                        return (
                            <button key={i} onClick={() => handleTripRating(ratingValue)} aria-label={`Rate ${ratingValue} stars`}>
                            <StarIcon className={`w-8 h-8 transition-colors duration-200 ${ratingValue <= userRating ? 'text-yellow-400' : 'text-gray-600 hover:text-yellow-300'}`} filled={ratingValue <= userRating} />
                            </button>
                        )
                        })}
                    </div>
                    <p className="text-sm text-gray-400 h-5">
                        { editableTrip.ratings.length > 0
                            ? `Average: ${(editableTrip.ratings.reduce((acc, r) => acc + r.value, 0) / editableTrip.ratings.length).toFixed(1)}/5 from ${editableTrip.ratings.length} vote${editableTrip.ratings.length > 1 ? 's' : ''}`
                            : 'Be the first to rate this trip!'
                        }
                    </p>
                </div>

                <div className="flex justify-center items-center gap-6 p-3 bg-gray-800/50 border border-gray-700 rounded-full max-w-xs mx-auto">
                    <button onClick={handleTripLike} className="flex items-center gap-2 text-gray-300 hover:text-white">
                        <HeartIcon className={`w-6 h-6 transition-colors ${currentUser && editableTrip.likes.some(l=>l.userId === currentUser.id) ? 'text-red-500 fill-current' : ''}`}/> 
                        <span>{editableTrip.likes.length}</span>
                    </button>
                    <button onClick={scrollToComments} className="flex items-center gap-2 text-gray-300 hover:text-white">
                        <ChatBubbleIcon className="w-6 h-6"/> 
                        <span>{editableTrip.comments.length}</span>
                    </button>
                    <button className="flex items-center gap-2 text-gray-300 hover:text-white">
                        <ShareIcon className="w-6 h-6"/> 
                        <span>Share</span>
                    </button>
                </div>
            </>
        )}
      </div>
    
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
        <div className="lg:col-span-3 bg-gray-800/50 p-4 rounded-2xl shadow-2xl border border-gray-700">
          <MapView 
            locations={editableTrip.locations} 
            highlightedLocationId={highlightedLocationId}
            onMarkerClick={handleMarkerClick}
          />
        </div>
        <div className="lg:col-span-2">
          <ItineraryDisplay 
            ref={itineraryDisplayRef}
            trip={editableTrip} isEditing={isEditing} onPhotoHover={setHighlightedLocationId} 
            currentUser={currentUser!} onUpdateTrip={onUpdateTrip} onAddPhotos={handleAddPhotosClick} 
            onLocationChange={() => {}} onPhotoDescriptionChange={() => {}}
            onPhotoClick={handlePhotoClick}
            mode={mode}
          />
        </div>
      </div>
       {mode === 'detail' && currentUser && (
            <div ref={commentsRef} className="mt-8 max-w-4xl mx-auto">
                <CommentSection
                    title="Trip Story Comments"
                    comments={editableTrip.comments}
                    currentUser={currentUser}
                    onAddComment={handleAddTripComment}
                    onDeleteComment={handleDeleteTripComment}
                    placeholder="Share your thoughts on the trip..."
                />
            </div>
        )}
    </div>
  );
};


// --- COMPETITION COMPONENTS ---

const CreateCompetitionModal: React.FC<{
    onClose: () => void;
    onCreate: (details: { title: string; description: string; endDate: string; maxEntries: number }) => void;
}> = ({ onClose, onCreate }) => {
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    
    const getTomorrow = () => {
        const d = new Date();
        d.setDate(d.getDate() + 1);
        return d;
    }
    const [endDate, setEndDate] = useState(getLocalDateISOString(getTomorrow()));
    const [maxEntries, setMaxEntries] = useState(1);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onCreate({ title, description, endDate, maxEntries: Number(maxEntries) });
    };

    return (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={onClose}>
            <div className="bg-gray-800 rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden border border-gray-700" onClick={e => e.stopPropagation()}>
                <form onSubmit={handleSubmit}>
                    <div className="p-5 border-b border-gray-700">
                        <h3 className="text-lg font-bold text-white text-center">Create New Competition</h3>
                    </div>
                    <div className="p-6 space-y-4">
                        <div>
                            <label className="text-sm font-bold text-gray-300 block mb-2" htmlFor="comp-title">Title</label>
                            <input id="comp-title" type="text" value={title} onChange={e => setTitle(e.target.value)} className="w-full p-3 bg-gray-700 rounded-lg border border-gray-600 focus:ring-2 focus:ring-purple-500 focus:outline-none" placeholder="e.g., 'Golden Hour Landscapes'" required />
                        </div>
                        <div>
                            <label className="text-sm font-bold text-gray-300 block mb-2" htmlFor="comp-desc">Theme / Description</label>
                            <textarea id="comp-desc" value={description} onChange={e => setDescription(e.target.value)} className="w-full p-3 bg-gray-700 rounded-lg border border-gray-600 focus:ring-2 focus:ring-purple-500 focus:outline-none" placeholder="Describe the competition's theme..." required />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="text-sm font-bold text-gray-300 block mb-2" htmlFor="comp-end-date">Submission Deadline</label>
                                <input id="comp-end-date" type="date" value={endDate} onChange={e => setEndDate(e.target.value)} min={getLocalDateISOString(new Date())} className="w-full p-3 bg-gray-700 rounded-lg border border-gray-600 focus:ring-2 focus:ring-purple-500 focus:outline-none" required />
                            </div>
                             <div>
                                <label className="text-sm font-bold text-gray-300 block mb-2" htmlFor="comp-max-entries">Max Entries Per User</label>
                                <input id="comp-max-entries" type="number" min="1" max="10" value={maxEntries} onChange={e => setMaxEntries(parseInt(e.target.value, 10))} className="w-full p-3 bg-gray-700 rounded-lg border border-gray-600 focus:ring-2 focus:ring-purple-500 focus:outline-none" required />
                            </div>
                        </div>
                    </div>
                    <div className="p-4 flex justify-end items-center border-t border-gray-700 bg-gray-800/50">
                        <button type="button" onClick={onClose} className="font-semibold text-gray-300 hover:text-white px-4 py-2 rounded-lg">Cancel</button>
                        <button type="submit" className="bg-purple-600 hover:bg-purple-700 text-white font-bold py-2 px-6 rounded-full transition-colors">Create Competition</button>
                    </div>
                </form>
            </div>
        </div>
    );
};


const CompetitionListPage: React.FC<{
    competitions: Competition[];
    onSelectCompetition: (id: string) => void;
    onUserClick: (id: string) => void;
    onCreateCompetition: () => void;
}> = ({ competitions, onSelectCompetition, onUserClick, onCreateCompetition }) => {
    return (
        <div>
            <div className="flex justify-between items-center mb-8">
                <h1 className="text-3xl font-bold">Photo Competitions</h1>
                <button onClick={onCreateCompetition} className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700 text-white font-bold py-2 px-4 rounded-full transition-all transform hover:scale-105 shadow-lg">
                    <TrophyIcon className="w-5 h-5" /> Create Competition
                </button>
            </div>
             {competitions.length === 0 ? (
                <div className="text-center py-20 px-8 bg-gray-800/50 rounded-2xl border border-dashed border-gray-700">
                    <h2 className="text-2xl font-bold text-white mb-2">No Competitions Yet</h2>
                    <p className="text-gray-400 mb-6 max-w-md mx-auto">Be the first to start a new photo competition and challenge the community!</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {competitions.map(comp => (
                        <div key={comp.id} className="bg-gray-800/50 rounded-2xl overflow-hidden border border-gray-700 shadow-lg group transform transition-all duration-300 hover:shadow-purple-500/20 hover:-translate-y-1 cursor-pointer" onClick={() => onSelectCompetition(comp.id)}>
                            <div className="p-5">
                                <h3 className="text-xl font-bold text-white truncate group-hover:text-purple-400 transition-colors">{comp.title}</h3>
                                <p className="text-gray-400 text-sm mt-2 line-clamp-3">{comp.description}</p>
                            </div>
                             <div className="px-5 pb-4 border-t border-gray-700/50">
                                 <div className="flex justify-between items-center mt-3">
                                    <div onClick={(e) => { e.stopPropagation(); onUserClick(comp.creator.id); }} className="flex items-center gap-2 cursor-pointer group/user">
                                        <img src={comp.creator.avatarUrl} alt={comp.creator.username} className="w-8 h-8 rounded-full"/>
                                        <span className="text-sm font-semibold text-gray-300 group-hover/user:text-purple-400 transition-colors">{comp.creator.username}</span>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-xs text-gray-400">Ends On</p>
                                        <p className="font-semibold text-sm text-white">{parseUTCDate(comp.endDate).toLocaleDateString(undefined, { timeZone: 'UTC' })}</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};


const CompetitionDetailPage: React.FC<{
    competition: Competition;
    entries: CompetitionEntry[];
    currentUser: User;
    onBack: () => void;
    onUserClick: (id: string) => void;
    onSubmit: (file: File) => void;
    onRankEntry: (entryId: string, rank: number) => void;
    isSubmitting: boolean;
}> = ({ competition, entries, currentUser, onBack, onUserClick, onSubmit, onRankEntry, isSubmitting }) => {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [submitError, setSubmitError] = useState<string | null>(null);

    const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
        setSubmitError(null);
        const file = event.target.files?.[0];
        if (!file) return;

        const { isOriginal } = await extractFileMetadata(file);
        if (!isOriginal) {
            setSubmitError("Submission failed: Please upload an original photo with camera metadata (EXIF). Edited photos or screenshots are not allowed.");
            return;
        }
        onSubmit(file);
    };

    const deadline = parseUTCDate(competition.endDate);
    deadline.setUTCHours(23, 59, 59, 999); // Competition ends at the end of the specified day in UTC.
    const isCompetitionActive = deadline > new Date();

    const userEntries = entries.filter(e => e.user.id === currentUser.id);
    const canSubmit = isCompetitionActive && userEntries.length < competition.maxEntriesPerUser;
    const isCreator = currentUser.id === competition.creator.id;

    return (
        <div>
            <input type="file" accept="image/*" ref={fileInputRef} onChange={handleFileSelect} className="hidden" />
            <div className="mb-8">
                <button onClick={onBack} className="flex items-center gap-2 text-gray-300 hover:text-white transition-colors mb-4">
                  <ArrowLeftIcon className="w-5 h-5" /> Back to Competitions
                </button>
                <div className="text-center space-y-4">
                    <h1 className="text-4xl md:text-5xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-cyan-400">{competition.title}</h1>
                     <div onClick={() => onUserClick(competition.creator.id)} className="flex items-center justify-center gap-2 cursor-pointer group/user">
                        <img src={competition.creator.avatarUrl} alt={competition.creator.username} className="w-8 h-8 rounded-full" />
                        <span className="font-semibold text-gray-300 group-hover/user:text-purple-400 transition-colors">Hosted by {competition.creator.username}</span>
                    </div>
                    <p className="max-w-2xl mx-auto text-lg text-gray-300">{competition.description}</p>
                    <div className="text-sm text-gray-400">Submission Deadline: {parseUTCDate(competition.endDate).toLocaleDateString(undefined, { timeZone: 'UTC', year: 'numeric', month: 'long', day: 'numeric' })}</div>
                </div>
            </div>

            <div className="p-4 bg-gray-800/50 border border-gray-700 rounded-2xl mb-8">
                 <div className="flex justify-between items-center">
                    <h2 className="text-xl font-bold">Submissions ({entries.length})</h2>
                    {canSubmit && (
                        <button onClick={() => fileInputRef.current?.click()} disabled={isSubmitting} className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700 disabled:bg-purple-800 disabled:cursor-not-allowed text-white font-bold py-2 px-4 rounded-full">
                            <PlusIcon className="w-5 h-5"/> Submit Photo ({userEntries.length}/{competition.maxEntriesPerUser})
                        </button>
                    )}
                 </div>
                 {submitError && <p className="text-red-400 text-sm mt-2">{submitError}</p>}
                 {!isCompetitionActive && <p className="text-yellow-400 text-sm mt-2 text-center">This competition has ended.</p>}
                 {isCreator && (
                    <p className="text-sm text-purple-300 bg-purple-900/50 p-3 rounded-lg text-center mt-4">
                        <b>Host Controls:</b> Hover over a photo and click a trophy icon to assign ranks.
                    </p>
                )}
            </div>

            {entries.length === 0 ? (
                 <div className="text-center py-20 px-8 bg-gray-800/50 rounded-2xl border border-dashed border-gray-700">
                    <h2 className="text-2xl font-bold text-white mb-2">No Submissions Yet</h2>
                    {isCompetitionActive && <p className="text-gray-400 mb-6 max-w-md mx-auto">Be the first to submit your photo!</p>}
                </div>
            ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {entries.map(entry => (
                        <div key={entry.id} className="group relative">
                            <div className="aspect-square rounded-lg overflow-hidden border-2 border-transparent group-hover:border-purple-500 transition-all">
                                <img src={entry.photoUrl} alt={`Submission by ${entry.user.username}`} className="w-full h-full object-cover" />
                            </div>
                            <div className="absolute bottom-0 left-0 right-0 bg-black/60 p-2 rounded-b-lg">
                                <div className="flex items-center gap-2">
                                    <img src={entry.user.avatarUrl} alt={entry.user.username} className="w-6 h-6 rounded-full" />
                                    <span className="text-xs font-semibold text-white truncate">{entry.user.username}</span>
                                </div>
                            </div>
                            
                            {/* RANK DISPLAY - for everyone */}
                            {entry.rank && (
                                <div className={`absolute -top-3 -right-3 p-1.5 rounded-full shadow-lg ${entry.rank === 1 ? 'bg-yellow-400' : entry.rank === 2 ? 'bg-gray-400' : 'bg-yellow-600'}`}>
                                    <TrophyIcon className="w-6 h-6 text-white"/>
                                </div>
                            )}

                            {/* RANKING CONTROLS - for creator */}
                            {isCreator && (
                                <div className="absolute top-2 right-2 flex flex-col gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                                    {[1, 2, 3].map(rank => {
                                        const isRanked = entry.rank === rank;
                                        const rankConfig: { [key: number]: { bg: string, label: string } } = {
                                            1: { bg: 'bg-yellow-400 hover:bg-yellow-500', label: '1st Place' },
                                            2: { bg: 'bg-gray-400 hover:bg-gray-500', label: '2nd Place' },
                                            3: { bg: 'bg-yellow-600 hover:bg-yellow-700', label: '3rd Place' },
                                        };
                                        return (
                                            <button
                                                key={rank}
                                                onClick={() => onRankEntry(entry.id, rank)}
                                                className={`p-1.5 rounded-full text-white transition-all shadow-md ${rankConfig[rank].bg} ${isRanked ? 'ring-2 ring-white/90' : 'hover:scale-110'}`}
                                                aria-label={`Assign ${rankConfig[rank].label}`}
                                                title={`Assign ${rankConfig[rank].label}${isRanked ? ' (Click again to un-rank)' : ''}`}
                                            >
                                                <TrophyIcon className="w-5 h-5" />
                                            </button>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};


const ErrorDisplay: React.FC<{ message: string; onRetry?: () => void }> = ({ message, onRetry }) => (
    <div className="text-center py-20 px-8 bg-red-900/20 rounded-2xl border border-dashed border-red-700/50">
        <h2 className="text-2xl font-bold text-red-300 mb-2">An Error Occurred</h2>
        <p className="text-red-400 mb-6 max-w-md mx-auto">{message}</p>
        {onRetry && (
            <button
                onClick={onRetry}
                className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700 text-white font-bold py-2 px-6 rounded-full transition-transform transform hover:scale-105 shadow-lg mx-auto"
            >
                <RefreshIcon className="w-5 h-5" />
                Try Again
            </button>
        )}
    </div>
);


// --- MAIN APP COMPONENT ---
type ViewState = 
    | { view: 'profile', userId: string } 
    | { view: 'explore' } 
    | { view: 'create' } 
    | { view: 'detail', tripId: string } 
    | { view: 'preview' }
    | { view: 'competitions' }
    | { view: 'competition_detail', id: string };

interface AppError {
    message: string;
    onRetry?: () => void;
}

const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [allTrips, setAllTrips] = useState<TripStory[]>([]); // Holds all trips for explore/cache
  const [profileData, setProfileData] = useState<Profile | null>(null);
  const [profileTrips, setProfileTrips] = useState<TripStory[]>([]);
  const [viewState, setViewState] = useState<ViewState | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [loadingMessage, setLoadingMessage] = useState<string>('');
  const [error, setError] = useState<AppError | null>(null);
  const [authError, setAuthError] = useState<string | null>(null);
  const [previewTrip, setPreviewTrip] = useState<TripStory | null>(null);
  const [competitions, setCompetitions] = useState<Competition[]>([]);
  const [currentCompetition, setCurrentCompetition] = useState<Competition | null>(null);
  const [competitionEntries, setCompetitionEntries] = useState<CompetitionEntry[]>([]);
  const [showCreateCompetitionModal, setShowCreateCompetitionModal] = useState(false);
  
  const fetchAndSetTrips = useCallback(async (queryBuilder: any, setter: React.Dispatch<React.SetStateAction<TripStory[]>>) => {
      const { data, error: queryError } = await queryBuilder;
      if (queryError) throw queryError;
  
      if (data) {
          const fetchedTrips: TripStory[] = data.map((trip: any) => ({
              id: trip.id,
              title: trip.title,
              summary: trip.summary,
              locations: trip.locations || [],
              files: trip.files || [],
              likes: trip.likes || [],
              comments: trip.comments || [],
              ratings: trip.ratings || [],
              coverImageUrl: trip.cover_image_url,
              user: trip.profiles ? {
                  id: trip.profiles.id,
                  username: trip.profiles.username,
                  avatarUrl: trip.profiles.avatar_url,
              } : { id: 'unknown', username: 'Anonymous', avatarUrl: `https://picsum.photos/seed/anonymous/100/100` }
          }));
          setter(fetchedTrips);
      }
  }, []);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
        setIsLoading(true);
        setLoadingMessage('Checking authentication...');
        
        if (event === 'SIGNED_IN' && window.location.hash.includes('access_token')) {
            window.history.replaceState({}, document.title, window.location.pathname + window.location.search);
        }

        const user = session?.user;

        if (!user) {
            setCurrentUser(null);
            setViewState(null);
            setAllTrips([]);
            setProfileData(null);
            setProfileTrips([]);
            setIsLoading(false);
            return;
        }

        const fetchAndSetProfile = async () => {
          const { data: profile, error: profileError } = await supabase.from('profiles').select('*').eq('id', user.id).single();
          if (profile) {
              const profileUser = { id: profile.id, username: profile.username, avatarUrl: profile.avatar_url };
              setCurrentUser(profileUser);
              if (!viewState) { // Only set default view if not already viewing something
                  setViewState({ view: 'profile', userId: user.id });
              }
              setAuthError(null);
          } else {
             // Handle new user profile creation
              const newUsername = user.user_metadata?.username || user.email?.split('@')[0] || `user_${user.id.substring(0, 6)}`;
              const newUser = { id: user.id, username: newUsername, avatarUrl: user.user_metadata?.avatar_url || `https://picsum.photos/seed/${newUsername}/100/100` };
              setCurrentUser(newUser);
              if (!viewState) {
                  setViewState({ view: 'profile', userId: user.id });
              }
          }
          setIsLoading(false);
        };
        fetchAndSetProfile();
    });

    return () => { subscription.unsubscribe(); };
  }, [viewState]);

  // Data fetching based on viewState
  useEffect(() => {
    const fetchDataForView = async () => {
        if (!viewState || !currentUser) return;
        
        setError(null);
        setIsLoading(true);

        try {
            if (viewState.view === 'profile') {
                setLoadingMessage('Loading profile...');
                const { data, error: profileError } = await supabase.from('profiles').select('*').eq('id', viewState.userId).single();
                if (profileError) throw profileError;
                
                // Construct full profile object with placeholder data
                setProfileData({
                    id: data.id,
                    username: data.username,
                    avatarUrl: data.avatar_url,
                    fullName: data.username, // Placeholder
                    bannerUrl: `https://picsum.photos/seed/${data.username}/1600/400`, // Placeholder
                    followers: Math.floor(Math.random() * 50000), // Placeholder
                    following: Math.floor(Math.random() * 2000), // Placeholder
                });

                const query = supabase.from('trips').select('*, profiles(id, username, avatar_url)').eq('user_id', viewState.userId).order('created_at', { ascending: false });
                await fetchAndSetTrips(query, setProfileTrips);
            } else if (viewState.view === 'explore') {
                setLoadingMessage('Loading all trips...');
                const query = supabase.from('trips').select('*, profiles(id, username, avatar_url)').order('created_at', { ascending: false });
                await fetchAndSetTrips(query, setAllTrips);
            } else if (viewState.view === 'competitions') {
                setLoadingMessage('Loading competitions...');
                const { data, error: compError } = await supabase.from('competitions').select('*, creator:profiles(id, username, avatar_url)').order('created_at', { ascending: false });
                if (compError) throw compError;
                const mappedCompetitions: Competition[] = data.map((c: any) => ({
                    id: c.id,
                    creatorId: c.creator_id,
                    title: c.title,
                    description: c.description,
                    endDate: c.end_date,
                    maxEntriesPerUser: c.max_entries_per_user,
                    createdAt: c.created_at,
                    creator: Array.isArray(c.creator) ? c.creator[0] : c.creator,
                }));
                setCompetitions(mappedCompetitions);
            } else if (viewState.view === 'competition_detail') {
                 setLoadingMessage('Loading competition details...');
                const { data: compData, error: compError } = await supabase.from('competitions').select('*, creator:profiles(id, username, avatar_url)').eq('id', viewState.id).single();
                if (compError) throw compError;
                const creatorObject = Array.isArray(compData.creator) ? compData.creator[0] : compData.creator;
                const mappedCompetition: Competition = {
                    id: compData.id,
                    creatorId: compData.creator_id,
                    title: compData.title,
                    description: compData.description,
                    endDate: compData.end_date,
                    maxEntriesPerUser: compData.max_entries_per_user,
                    createdAt: compData.created_at,
                    creator: creatorObject,
                };
                setCurrentCompetition(mappedCompetition);

                const { data: entriesData, error: entriesError } = await supabase.from('competition_entries').select('*, user:profiles(id, username, avatar_url)').eq('competition_id', viewState.id).order('submitted_at', { ascending: false });
                if (entriesError) throw entriesError;
                 const mappedEntries: CompetitionEntry[] = entriesData.map((e: any) => ({
                    id: e.id,
                    competitionId: e.competition_id,
                    photoUrl: e.photo_url,
                    submittedAt: e.submitted_at,
                    rank: e.rank,
                    votes: e.votes || [],
                    user: Array.isArray(e.user) ? e.user[0] : e.user,
                }));
                setCompetitionEntries(mappedEntries);
            }
        } catch (e) {
            setError({
                message: e instanceof Error ? e.message : 'Failed to load data.',
                onRetry: fetchDataForView,
            });
        } finally {
            setIsLoading(false);
        }
    };
    fetchDataForView();
  }, [viewState, currentUser, fetchAndSetTrips]);


  const handleLogin = async (email: string, pass: string): Promise<string | null> => {
      setIsLoading(true);
      setLoadingMessage('Logging in...');
      try {
          const { error: loginError } = await supabase.auth.signInWithPassword({ email, password: pass });
          if (loginError) return loginError.message;
          setError(null);
          return null;
      } catch (e) { return e instanceof Error ? e.message : 'An unexpected error occurred.'; } 
      finally { setIsLoading(false); }
  };

  const handleRegister = async (email: string, pass: string, username: string): Promise<string | null> => {
    setIsLoading(true);
    setLoadingMessage('Creating your account...');
    try {
        const { data, error: registerError } = await supabase.auth.signUp({
            email, password: pass,
            options: { data: { username, avatar_url: `https://picsum.photos/seed/${username}/100/100` }, emailRedirectTo: window.location.origin }
        });
        if (registerError) return registerError.message;
        if (data.user?.identities?.length === 0) return "Email already in use but not confirmed. Check your inbox.";
        return null;
    } catch (e) { return e instanceof Error ? e.message : 'An unexpected error occurred.'; } 
    finally { setIsLoading(false); }
  };

    const handleResendConfirmation = async (email: string): Promise<string | null> => {
        setIsLoading(true); setLoadingMessage('Resending confirmation...');
        try {
            const { error } = await supabase.auth.resend({ type: 'signup', email, options: { emailRedirectTo: window.location.origin } });
            return error ? error.message : null;
        } catch (e) { return e instanceof Error ? e.message : 'An unexpected error occurred.'; } 
        finally { setIsLoading(false); }
    };

  const handleLogout = async () => { 
      await supabase.auth.signOut();
      setCurrentUser(null);
      setViewState(null); 
  };
  
  const handleUserSelect = (userId: string) => {
      setViewState({ view: 'profile', userId });
  };

  const handleFileProcessing = useCallback(async (uploadedFiles: UploadedFile[]) => {
    if (!currentUser) return;
    setIsLoading(true); 
    try {
        setLoadingMessage("Uploading photos...");
        const uploadedUrls = await Promise.all(
            uploadedFiles.map(async (uploadedFile) => {
                const filePath = `${currentUser.id}/${crypto.randomUUID()}-${uploadedFile.file.name}`;
                const { error } = await supabase.storage.from('trip-photos').upload(filePath, uploadedFile.file);
                if (error) throw error;
                return `${supabaseUrl}/storage/v1/object/public/trip-photos/${filePath}`;
            })
        );
        
        setLoadingMessage("Reading metadata...");
        const filesWithMetadata = await Promise.all(uploadedFiles.map(async (f, i) => {
            const { coords, cameraDetails } = await extractFileMetadata(f.file);
            const { file, ...rest } = f;
            return { ...rest, previewUrl: uploadedUrls[i], coords, cameraDetails, likes: [], comments: [] };
        }));

        if (!filesWithMetadata.some(f => f.coords)) throw new Error("No photos with location data found.");
        
        setLoadingMessage("Crafting your story...");
        const newTrip = await generateTripStory(filesWithMetadata as any, currentUser);
        
        setPreviewTrip(newTrip);
        setViewState({ view: 'preview' });

    } catch (err) {
        setError({
            message: (err as Error).message,
            onRetry: () => { setError(null); setViewState({ view: 'create' }); }
        });
    } finally { setIsLoading(false); }
  }, [currentUser]);

  const handlePublishTrip = async () => {
    if (!previewTrip || !currentUser) return;
    setIsLoading(true); setLoadingMessage('Publishing...');
    try {
        const { user, ...rest } = previewTrip;
        const tripToInsert = { ...rest, user_id: currentUser.id, files: previewTrip.files.map(({ file, ...f }: any) => f) };

        const { error } = await supabase.from('trips').insert(tripToInsert);
        if (error) throw error;
        
        setProfileTrips(prev => [previewTrip, ...prev]);
        setViewState({ view: 'detail', tripId: previewTrip.id });
        setPreviewTrip(null);
    } catch (err) {
        setError({
            message: (err as Error).message,
            onRetry: () => { setError(null); handlePublishTrip(); }
        });
    } finally { setIsLoading(false); }
  };

  const handleDiscardTrip = () => {
    setPreviewTrip(null);
    setViewState({ view: 'create' });
  };

  const handleUpdateTrip = async (updatedTrip: TripStory) => {
      const tripUpdater = (setter: React.Dispatch<React.SetStateAction<TripStory[]>>) => 
          setter(prev => prev.map(t => t.id === updatedTrip.id ? updatedTrip : t));
      
      tripUpdater(setAllTrips);
      tripUpdater(setProfileTrips);

      try {
          const { user, ...tripForDb } = updatedTrip;
          const payload = { ...tripForDb, files: tripForDb.files.map(({ file, ...rest }: any) => rest) };
          const { error } = await supabase.from('trips').update(payload).eq('id', updatedTrip.id);
          if (error) throw error;
      } catch (e) {
          setError({ message: e instanceof Error ? e.message : 'Could not save changes.', onRetry: () => { setError(null); handleUpdateTrip(updatedTrip); } });
      }
  };

   const handleCreateCompetition = async (details: { title: string; description: string; endDate: string; maxEntries: number }) => {
        if (!currentUser) return;
        setIsLoading(true);
        setLoadingMessage("Creating competition...");
        try {
            const { error } = await supabase.from('competitions').insert({
                creator_id: currentUser.id,
                title: details.title,
                description: details.description,
                end_date: details.endDate,
                max_entries_per_user: details.maxEntries
            });
            if (error) throw error;
            setShowCreateCompetitionModal(false);
            setViewState({ view: 'competitions' }); // force reload
        } catch(e) {
            setError({ message: (e as Error).message, onRetry: () => { setError(null); handleCreateCompetition(details); }});
        } finally {
            setIsLoading(false);
        }
    };

    const handleSubmitToCompetition = async (file: File) => {
        if (!currentUser || !currentCompetition) return;
        setIsLoading(true);
        setLoadingMessage("Submitting your entry...");
        try {
            const filePath = `competition-entries/${currentCompetition.id}/${currentUser.id}/${crypto.randomUUID()}-${file.name}`;
            const { error: uploadError } = await supabase.storage.from('trip-photos').upload(filePath, file);
            if (uploadError) throw uploadError;

            const photoUrl = `${supabaseUrl}/storage/v1/object/public/trip-photos/${filePath}`;

            const { error: insertError } = await supabase.from('competition_entries').insert({
                competition_id: currentCompetition.id,
                user_id: currentUser.id,
                photo_url: photoUrl,
                votes: [],
            });
            if (insertError) throw insertError;
            
            // Force reload of entries
            setViewState({ view: 'competition_detail', id: currentCompetition.id });

        } catch(e) {
            setError({ message: (e as Error).message, onRetry: () => { setError(null); handleSubmitToCompetition(file); }});
        } finally {
            setIsLoading(false);
        }
    };

    const handleRankEntry = async (entryId: string, rank: number) => {
        if (!currentUser || !currentCompetition || currentUser.id !== currentCompetition.creator.id) return;

        const entryToUpdate = competitionEntries.find(e => e.id === entryId);
        if (!entryToUpdate) return;
        
        // If the user clicks the same rank again, un-rank it. Otherwise, set the new rank.
        const newRank = entryToUpdate.rank === rank ? null : rank;

        // Find if another entry already has this rank (and is not the current entry)
        const conflictingEntry = newRank ? competitionEntries.find(e => e.rank === newRank && e.id !== entryId) : null;

        const updatesToPerform: { id: string; rank: number | null }[] = [{ id: entryId, rank: newRank }];
        if (conflictingEntry) {
            updatesToPerform.push({ id: conflictingEntry.id, rank: null });
        }

        setIsLoading(true);
        setLoadingMessage("Updating ranks...");
        try {
            const promises = updatesToPerform.map(update =>
                supabase.from('competition_entries').update({ rank: update.rank }).eq('id', update.id)
            );

            const results = await Promise.all(promises);
            for (const result of results) {
                if (result.error) throw result.error;
            }

            // Update local state for immediate UI feedback
            setCompetitionEntries(prevEntries => {
                const newEntries = [...prevEntries];
                updatesToPerform.forEach(update => {
                    const index = newEntries.findIndex(e => e.id === update.id);
                    if (index > -1) {
                        newEntries[index] = { ...newEntries[index], rank: update.rank };
                    }
                });
                return newEntries;
            });

        } catch (e) {
            setError({ message: (e as Error).message, onRetry: () => { setError(null); handleRankEntry(entryId, rank); } });
        } finally {
            setIsLoading(false);
        }
    };
  
  if (isLoading) return <Loader message={loadingMessage || 'Initializing...'} />;
  if (!currentUser || !viewState) return <Auth onLogin={handleLogin} onRegister={handleRegister} onResendConfirmation={handleResendConfirmation} initialError={authError} />;

  const renderContent = () => {
    switch (viewState.view) {
      case 'profile':
        return profileData ? <ProfilePage profile={profileData} trips={profileTrips} currentUser={currentUser} onSelectTrip={(id) => setViewState({ view: 'detail', tripId: id })} onUserClick={handleUserSelect} onNewTrip={() => setViewState({ view: 'create' })} /> : <Loader message="Loading profile..." />;
      case 'explore':
          return <ExplorePage trips={allTrips} onSelectTrip={(id) => setViewState({ view: 'detail', tripId: id })} onUserClick={handleUserSelect} currentUser={currentUser} />;
      case 'create':
        return <FileUpload onFilesSelect={handleFileProcessing} />;
      case 'preview':
        return previewTrip ? <TripDetail trip={previewTrip} userTrips={[]} onBack={() => setViewState({ view: 'create' })} onUpdateTrip={() => {}} onUserClick={handleUserSelect} currentUser={currentUser} mode="preview" onPublish={handlePublishTrip} onDiscard={handleDiscardTrip} /> : null;
      case 'detail':
        const trip = [...profileTrips, ...allTrips].find(t => t.id === viewState.tripId);
        const userTrips = allTrips.filter(t => t.user.id === currentUser.id); // for library picker
        return trip ? <TripDetail trip={trip} userTrips={userTrips} onBack={() => setViewState({ view: 'profile', userId: trip.user.id })} onUpdateTrip={handleUpdateTrip} onUserClick={handleUserSelect} currentUser={currentUser} mode="detail" /> : <Loader message="Loading trip..." />;
      case 'competitions':
        return <CompetitionListPage competitions={competitions} onSelectCompetition={(id) => setViewState({ view: 'competition_detail', id })} onUserClick={handleUserSelect} onCreateCompetition={() => setShowCreateCompetitionModal(true)} />;
      case 'competition_detail':
        return currentCompetition ? <CompetitionDetailPage competition={currentCompetition} entries={competitionEntries} currentUser={currentUser} onBack={() => setViewState({ view: 'competitions' })} onUserClick={handleUserSelect} onSubmit={handleSubmitToCompetition} onRankEntry={handleRankEntry} isSubmitting={isLoading} /> : <Loader message="Loading competition..." />;
    }
  };

  return (
    <div className="bg-gray-900 text-white min-h-screen antialiased">
      <Header 
        onTitleClick={() => setViewState({ view: 'profile', userId: currentUser.id })}
        onExploreClick={() => setViewState({ view: 'explore' })}
        onCompetitionsClick={() => setViewState({ view: 'competitions' })}
        onLogout={handleLogout} 
        user={currentUser} 
      />
      <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {showCreateCompetitionModal && <CreateCompetitionModal onClose={() => setShowCreateCompetitionModal(false)} onCreate={handleCreateCompetition} />}
        {error ? <ErrorDisplay message={error.message} onRetry={error.onRetry} /> : renderContent()}
      </main>
    </div>
  );
};

export default App;
