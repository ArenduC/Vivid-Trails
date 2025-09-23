
import React, { useState, useCallback, useEffect, useRef } from 'react';
import { UploadedFile, TripStory, CameraDetails, LocationPin, User, Comment } from './types';
import { generateTripStory, generateTripVideo } from './services/geminiService';
import Header from './components/Header';
import FileUpload from './components/FileUpload';
import Loader from './components/Loader';
import MapView from './components/MapView';
import ItineraryDisplay from './components/ItineraryDisplay';
import Auth from './Auth';
import { supabase } from './supabaseClient'; // Import the supabase client
import { PlusIcon, ArrowLeftIcon, SparklesIcon, PencilIcon, CheckIcon, XMarkIcon, HeartIcon, ChatBubbleIcon, ShareIcon, VideoCameraIcon } from './components/IconComponents';

declare const EXIF: any;

// --- EXIF HELPERS ---
const toDecimal = (gpsData: number[], ref: string): number => {
    return (gpsData[0] + gpsData[1] / 60 + gpsData[2] / 3600) * (ref === 'S' || ref === 'W' ? -1 : 1);
};
const extractFileMetadata = (file: File): Promise<{ coords: { lat: number; lng: number } | null; cameraDetails: CameraDetails | null }> => {
    return new Promise((resolve) => {
        EXIF.getData(file, function(this: any) {
            try {
                const lat = EXIF.getTag(this, 'GPSLatitude');
                const latRef = EXIF.getTag(this, 'GPSLatitudeRef');
                const lng = EXIF.getTag(this, 'GPSLongitude');
                const lngRef = EXIF.getTag(this, 'GPSLongitudeRef');
                const coords = (lat && latRef && lng && lngRef) ? { lat: toDecimal(lat, latRef), lng: toDecimal(lng, lngRef) } : null;
                const model = EXIF.getTag(this, 'Model');
                const exposureTime = EXIF.getTag(this, 'ExposureTime');
                const fNumber = EXIF.getTag(this, 'FNumber');
                const iso = EXIF.getTag(this, 'ISOSpeedRatings');
                const cameraDetails = (model || exposureTime || fNumber || iso) ? { model: model?.toString().trim(), exposureTime: exposureTime ? `${exposureTime.numerator}/${exposureTime.denominator}s` : undefined, fNumber: fNumber ? `f/${fNumber.toString()}`: undefined, iso: iso?.toString() } : null;
                resolve({ coords, cameraDetails });
            } catch (error) { console.error('Error reading EXIF data:', error); resolve({ coords: null, cameraDetails: null }); }
        });
    });
};


// --- MOCK DATA ---
const MOCK_TRIPS_DATA: TripStory[] = [
    {
      id: 'mock-trip-1',
      user: { id: 'user-2', username: 'globetrotter', avatarUrl: 'https://picsum.photos/seed/user2/100/100' },
      title: 'A Taste of Japan',
      summary: 'From the bustling streets of Tokyo to the serene temples of Kyoto, a journey through the heart of Japan.',
      coverImageUrl: 'https://picsum.photos/seed/japan/800/600',
      files: [
        { id: 'f1', file: new File([], ""), previewUrl: 'https://picsum.photos/seed/japan/800/600', coords: { lat: 35.6595, lng: 139.7005 }, description: "Shibuya's famous scramble crossing!", cameraDetails: { model: 'Sony ILCE-7M3' }, likes: [{userId: 'user-1'}], comments: [] },
        { id: 'f2', file: new File([], ""), previewUrl: 'https://picsum.photos/seed/kyoto/400/400', coords: { lat: 34.9671, lng: 135.7727 }, likes: [], comments: [{id: 'c1', user: {id: 'user-1', username: 'you_travel', avatarUrl: 'https://picsum.photos/seed/user1/100/100'}, content: 'Amazing shot!', createdAt: '2d ago'}] },
        { id: 'f3', file: new File([], ""), previewUrl: 'https://picsum.photos/seed/osaka/400/400', coords: { lat: 34.6690, lng: 135.5015 }, likes: [], comments: [] },
      ],
      locations: [
        { id: 'l1', name: 'Shibuya Crossing, Tokyo', story: 'Felt the electric energy...', coords: { lat: 35.6595, lng: 139.7005 }, photoIds: ['f1'] },
        { id: 'l2', name: 'Fushimi Inari Shrine, Kyoto', story: 'Walked through thousands of red gates.', coords: { lat: 34.9671, lng: 135.7727 }, photoIds: ['f2'] },
        { id: 'l3', name: 'Dotonbori, Osaka', story: 'Indulged in amazing street food.', coords: { lat: 34.6690, lng: 135.5015 }, photoIds: ['f3'] },
      ],
      likes: [{userId: 'user-1'}, {userId: 'user-3'}],
      comments: [{id: 'c2', user: {id: 'user-1', username: 'you_travel', avatarUrl: 'https://picsum.photos/seed/user1/100/100'}, content: 'This looks like an incredible trip!', createdAt: '1d ago'}]
    }
];

// --- SUB-COMPONENTS ---

const TripCard: React.FC<{ trip: TripStory; onClick: () => void; currentUser: User | null }> = ({ trip, onClick, currentUser }) => (
  <div className="bg-gray-800/50 rounded-2xl overflow-hidden border border-gray-700 shadow-lg group transform transition-all duration-300 hover:shadow-purple-500/20 hover:-translate-y-1">
    <div onClick={onClick} className="cursor-pointer">
      <div className="aspect-video overflow-hidden relative">
        <img src={trip.coverImageUrl} alt={trip.title} className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" />
      </div>
      <div className="p-4 sm:p-5">
        <h3 className="text-xl font-bold text-white truncate group-hover:text-purple-400 transition-colors">{trip.title}</h3>
        <p className="text-gray-400 text-sm mt-2 line-clamp-2">{trip.summary}</p>
      </div>
    </div>
    <div className="px-5 pb-4 border-t border-gray-700/50 flex justify-between items-center">
        <div className="flex items-center gap-2">
            <img src={trip.user.avatarUrl} alt={trip.user.username} className="w-8 h-8 rounded-full"/>
            <span className="text-sm font-semibold text-gray-300">{trip.user.username}</span>
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

const TripFeed: React.FC<{ trips: TripStory[]; onSelectTrip: (tripId: string) => void; onNewTrip: () => void; currentUser: User | null; }> = ({ trips, onSelectTrip, onNewTrip, currentUser }) => {
  return (
    <div>
        <div className="flex justify-between items-center mb-8">
            <h1 className="text-3xl font-bold">Vivid Trails Feed</h1>
            <button onClick={onNewTrip} className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700 text-white font-bold py-2 px-4 rounded-full transition-transform transform hover:scale-105 shadow-lg">
                <PlusIcon className="w-5 h-5"/> New Trip
            </button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {trips.map(trip => (
                <TripCard key={trip.id} trip={trip} onClick={() => onSelectTrip(trip.id)} currentUser={currentUser} />
            ))}
        </div>
    </div>
  );
};

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

const TripDetail: React.FC<{ trip: TripStory; onBack: () => void; onUpdateTrip: (updatedTrip: TripStory) => void; currentUser: User | null }> = ({ trip, onBack, onUpdateTrip, currentUser }) => {
  const [highlightedLocationId, setHighlightedLocationId] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editableTrip, setEditableTrip] = useState<TripStory>(trip);
  const [isGeneratingVideo, setIsGeneratingVideo] = useState(false);
  const [videoLoadingMessage, setVideoLoadingMessage] = useState('');
  const [generatedVideoUrl, setGeneratedVideoUrl] = useState<string | null>(null);
  const [showVideoModal, setShowVideoModal] = useState(false);

  useEffect(() => { setEditableTrip(trip); }, [trip]);

  const handleSave = () => { onUpdateTrip(editableTrip); setIsEditing(false); };
  const handleCancel = () => { setEditableTrip(trip); setIsEditing(false); };
  
  const handleTripLike = () => {
    if (!currentUser) return;
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

  const handleGenerateVideo = async () => {
      setIsGeneratingVideo(true);
      setVideoLoadingMessage("Preparing your assets...");
      try {
          const url = await generateTripVideo(trip, setVideoLoadingMessage);
          setGeneratedVideoUrl(url);
          setShowVideoModal(true);
      } catch (error) {
          console.error("Video generation failed:", error);
          alert(`Failed to generate video: ${(error as Error).message}`);
      } finally {
          setIsGeneratingVideo(false);
      }
  };

  return (
    <div>
      {isGeneratingVideo && <Loader message={videoLoadingMessage} />}
      {showVideoModal && generatedVideoUrl && (
          <VideoPlayerModal videoUrl={generatedVideoUrl} onClose={() => setShowVideoModal(false)} tripTitle={trip.title} />
      )}
      <div className="mb-8">
        <div className="flex justify-between items-center mb-4">
            <button onClick={onBack} className="flex items-center gap-2 text-gray-300 hover:text-white transition-colors">
              <ArrowLeftIcon className="w-5 h-5" /> Back to Feed
            </button>
            <div className="flex items-center gap-4">
              {currentUser && trip.user.id === currentUser.id && (
                isEditing ? (
                    <div className="flex items-center gap-2"> {/* Save/Cancel buttons would go here */} </div>
                ) : (
                    <>
                      <button 
                        onClick={generatedVideoUrl ? () => setShowVideoModal(true) : handleGenerateVideo}
                        disabled={isGeneratingVideo}
                        className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700 disabled:bg-purple-800 disabled:cursor-not-allowed text-white font-bold py-2 px-4 rounded-full transition-all transform hover:scale-105 shadow-lg"
                      >
                          <VideoCameraIcon className={`w-5 h-5 ${isGeneratingVideo ? 'animate-pulse' : ''}`} />
                          {isGeneratingVideo ? 'Generating...' : (generatedVideoUrl ? 'View Reel' : 'Generate Reel')}
                      </button>
                      <button onClick={() => setIsEditing(true)} className="flex items-center gap-2 bg-gray-700 hover:bg-gray-600 text-white font-bold py-2 px-4 rounded-full">
                          <PencilIcon className="w-5 h-5" /> Edit Trip
                      </button>
                    </>
                )
              )}
            </div>
        </div>
        <div className="text-center space-y-4">
            <h1 className="text-4xl md:text-5xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-cyan-400">{trip.title}</h1>
            <div className="flex items-center justify-center gap-2">
                <img src={trip.user.avatarUrl} alt={trip.user.username} className="w-8 h-8 rounded-full" />
                <span className="font-semibold text-gray-300">by {trip.user.username}</span>
            </div>
            <p className="max-w-2xl mx-auto text-lg text-gray-300">{trip.summary}</p>
        </div>
        <div className="flex justify-center items-center gap-6 mt-6 p-3 bg-gray-800/50 border border-gray-700 rounded-full max-w-xs mx-auto">
            <button onClick={handleTripLike} className="flex items-center gap-2 text-gray-300 hover:text-white">
                <HeartIcon className={`w-6 h-6 transition-colors ${currentUser && editableTrip.likes.some(l=>l.userId === currentUser.id) ? 'text-red-500 fill-current' : ''}`}/> 
                <span>{editableTrip.likes.length}</span>
            </button>
            <button className="flex items-center gap-2 text-gray-300 hover:text-white">
                <ChatBubbleIcon className="w-6 h-6"/> 
                <span>{editableTrip.comments.length}</span>
            </button>
            <button className="flex items-center gap-2 text-gray-300 hover:text-white">
                <ShareIcon className="w-6 h-6"/> 
                <span>Share</span>
            </button>
        </div>
      </div>
    
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
        <div className="lg:col-span-3 bg-gray-800/50 p-4 rounded-2xl shadow-2xl border border-gray-700">
          <MapView locations={trip.locations} highlightedLocationId={highlightedLocationId} />
        </div>
        <div className="lg:col-span-2">
          <ItineraryDisplay 
            trip={editableTrip} isEditing={isEditing} onPhotoHover={setHighlightedLocationId} 
            currentUser={currentUser!} onUpdateTrip={onUpdateTrip} onAddPhotos={() => {}} 
            onLocationChange={() => {}} onPhotoDescriptionChange={() => {}}
          />
        </div>
      </div>
      {/* Comment section would be rendered here */}
    </div>
  );
};


// --- MAIN APP COMPONENT ---
type ViewState = { view: 'feed' } | { view: 'create' } | { view: 'detail', tripId: string };

const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [trips, setTrips] = useState<TripStory[]>(MOCK_TRIPS_DATA);
  const [viewState, setViewState] = useState<ViewState>({ view: 'feed' });
  const [isLoading, setIsLoading] = useState<boolean>(true); // Start loading to check session
  const [loadingMessage, setLoadingMessage] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const checkSession = async () => {
        const { data: { session } } = await supabase.auth.getSession();
        if(session?.user) {
            // In a real app, you would fetch the user's profile from your 'profiles' table here
            setCurrentUser({
                id: session.user.id,
                username: session.user.user_metadata.username || session.user.email,
                avatarUrl: session.user.user_metadata.avatar_url || 'https://picsum.photos/seed/default/100/100'
            });
        }
        setIsLoading(false);
    };

    checkSession();
    
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      const user = session?.user;
       if(user) {
            setCurrentUser({
                id: user.id,
                username: user.user_metadata.username || user.email,
                avatarUrl: user.user_metadata.avatar_url || 'https://picsum.photos/seed/default/100/100'
            });
        } else {
            setCurrentUser(null);
        }
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleLogin = async (email: string, pass: string) => {
      setIsLoading(true); setLoadingMessage('Logging in...');
      // FIX: The password variable was named `pass` in the function signature, causing a shorthand property error.
      const { error } = await supabase.auth.signInWithPassword({ email, password: pass });
      if (error) setError(error.message);
      else setError(null);
      setIsLoading(false);
  };
  const handleRegister = async (email: string, pass: string, username: string) => {
      setIsLoading(true); setLoadingMessage('Creating your account...');
      // FIX: The password variable was named `pass` in the function signature, causing a shorthand property error.
      const { error } = await supabase.auth.signUp({ 
          email, 
          password: pass, 
          options: { data: { username, avatar_url: `https://picsum.photos/seed/${username}/100/100` } } 
      });
      if (error) setError(error.message);
      else setError(null);
      setIsLoading(false);
  };
  const handleLogout = async () => { 
      await supabase.auth.signOut();
      setCurrentUser(null);
      setViewState({ view: 'feed' }); 
  };

  const handleFileProcessing = useCallback(async (uploadedFiles: UploadedFile[]) => {
    if (!currentUser) return;
    setIsLoading(true); setLoadingMessage("Reading photo locations...");
    try {
        const filesWithMetadata = await Promise.all(uploadedFiles.map(async (f) => {
            const { coords, cameraDetails } = await extractFileMetadata(f.file);
            return { ...f, coords, cameraDetails, likes: [], comments: [] };
        }));
        const locatedFiles = filesWithMetadata.filter(f => f.coords);
        if (locatedFiles.length === 0) throw new Error("No photos with location data found.");
        
        setLoadingMessage("Crafting your travel story...");
        const newTrip = await generateTripStory(locatedFiles, currentUser);
        setTrips(prev => [newTrip, ...prev]);
        setViewState({ view: 'detail', tripId: newTrip.id });
    } catch (err) { setError((err as Error).message); setViewState({ view: 'create' }); } 
    finally { setIsLoading(false); }
  }, [currentUser]);

  const handleUpdateTrip = (updatedTrip: TripStory) => {
      setTrips(prev => prev.map(t => t.id === updatedTrip.id ? updatedTrip : t));
  };
  
  if (isLoading && !currentUser) {
    return <Loader message={loadingMessage || 'Initializing...'} />;
  }

  if (!currentUser) {
    return (
        <div className="bg-gray-900 min-h-screen">
            <Auth onLogin={handleLogin} onRegister={handleRegister} />
        </div>
    );
  }

  const renderContent = () => {
    switch (viewState.view) {
      case 'feed':
        return <TripFeed trips={trips} onSelectTrip={(id) => setViewState({view: 'detail', tripId: id})} onNewTrip={() => setViewState({view: 'create'})} currentUser={currentUser} />;
      case 'create':
        return <FileUpload onFilesSelect={handleFileProcessing} />;
      case 'detail':
        const trip = trips.find(t => t.id === viewState.tripId);
        return trip ? <TripDetail trip={trip} onBack={() => setViewState({view: 'feed'})} onUpdateTrip={handleUpdateTrip} currentUser={currentUser} /> : null;
    }
  };

  return (
    <div className="bg-gray-900 text-white min-h-screen antialiased">
      <Header onTitleClick={() => setViewState({view: 'feed'})} onLogout={handleLogout} user={currentUser} />
      <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {isLoading && <Loader message={loadingMessage} />}
        {!isLoading && renderContent()}
      </main>
    </div>
  );
};

export default App;
