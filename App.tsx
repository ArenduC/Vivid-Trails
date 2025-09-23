
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
  const [trips, setTrips] = useState<TripStory[]>([]);
  const [viewState, setViewState] = useState<ViewState>({ view: 'feed' });
  const [isLoading, setIsLoading] = useState<boolean>(true); // Start loading to check session
  const [loadingMessage, setLoadingMessage] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [authError, setAuthError] = useState<string | null>(null);

  const fetchTrips = useCallback(async () => {
    setIsLoading(true);
    setLoadingMessage('Loading trips...');
    try {
        const { data, error } = await supabase
            .from('trips')
            .select('*, user:profiles(id, username, avatar_url)')
            .order('created_at', { ascending: false });

        if (error) throw error;

        if (data) {
            const fetchedTrips: TripStory[] = data.map((trip: any) => ({
                ...trip,
                user: {
                    id: trip.user.id,
                    username: trip.user.username,
                    avatarUrl: trip.user.avatar_url,
                }
            }));
            setTrips(fetchedTrips);
        }
    } catch (e) {
        console.error("Error fetching trips:", e);
        setError(e instanceof Error ? e.message : 'Could not fetch trips.');
    } finally {
        setIsLoading(false);
    }
  }, []);

 useEffect(() => {
    // Check for errors in the URL hash on initial load.
    const params = new URLSearchParams(window.location.hash.substring(1));
    const errorCode = params.get('error_code');
    if (errorCode === 'otp_expired') {
      setAuthError('Your confirmation link has expired or is invalid. Please try signing up again.');
      // It's safe to clean the hash now since we've handled this error.
      window.history.replaceState({}, document.title, window.location.pathname + window.location.search);
    }
      
    const fetchProfile = async (user: any): Promise<User | null> => {
        const { data: profile, error } = await supabase
            .from('profiles')
            .select('id, username, avatar_url')
            .eq('id', user.id)
            .single();

        if (error && error.code !== 'PGRST116') { // 'PGRST116' means no rows found
            console.error('Error fetching profile:', error);
            return null;
        }

        if (profile) {
            return { id: profile.id, username: profile.username, avatarUrl: profile.avatar_url };
        }
        return null;
    };
    
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
        // If a session is detected (user is logged in) and the URL still has auth tokens from the redirect,
        // it means we just returned from a magic link. We should clean the URL.
        if (session && window.location.hash.includes('access_token')) {
            window.history.replaceState({}, document.title, window.location.pathname + window.location.search);
        }
        
        setIsLoading(true);
        setLoadingMessage('Checking authentication...');
        const user = session?.user;

        if (user) {
            let profile = await fetchProfile(user);

            // If no profile exists, this is a first-time sign-in (e.g., from a magic link).
            if (!profile) {
                setLoadingMessage('Welcome! Creating your profile...');
                const username = user.email?.split('@')[0] || `user_${user.id.substring(0, 6)}`;
                const avatar_url = `https://picsum.photos/seed/${username}/100/100`;

                const { error: insertError } = await supabase.from('profiles').insert({
                    id: user.id,
                    username,
                    avatar_url,
                });

                if (insertError) {
                    console.error("Error creating profile:", insertError);
                    setAuthError('We couldn\'t create your profile. Please sign out and try again.');
                    await supabase.auth.signOut();
                    setCurrentUser(null);
                } else {
                    profile = { id: user.id, username, avatarUrl: avatar_url };
                }
            }
            setCurrentUser(profile);
        } else {
            setCurrentUser(null);
            setTrips([]);
        }
        setIsLoading(false);
        setLoadingMessage('');
    });

    return () => subscription.unsubscribe();
  }, []);


  useEffect(() => {
      if (currentUser && viewState.view === 'feed') {
          fetchTrips();
      }
  }, [currentUser, fetchTrips, viewState.view]);


  const handleLogin = async (email: string, pass: string): Promise<string | null> => {
      setIsLoading(true);
      setLoadingMessage('Logging in...');
      try {
          const { error } = await supabase.auth.signInWithPassword({ email, password: pass });
          if (error) {
              return error.message;
          }
          setError(null);
          return null;
      } catch (e) {
          console.error("Login error:", e);
          if (e instanceof Error) {
              return e.message;
          }
          return 'An unexpected error occurred during login.';
      } finally {
          setIsLoading(false);
      }
  };

  const handleSendOtp = async (email: string): Promise<string | null> => {
    setIsLoading(true);
    setLoadingMessage('Sending confirmation code...');
    try {
        const { error } = await supabase.auth.signInWithOtp({
            email,
            options: {
                shouldCreateUser: true,
                // This makes the link generated in the email point to the current page,
                // which works for both localhost and your live domain.
                emailRedirectTo: window.location.origin,
            },
        });
        if (error) return error.message;
        return null;
    } catch (e) {
        console.error("OTP send error:", e);
        if (e instanceof Error) return e.message;
        return 'An unexpected error occurred.';
    } finally {
        setIsLoading(false);
    }
  };
  
  const handleVerifyAndRegister = async (email: string, token: string, username: string): Promise<string | null> => {
    setIsLoading(true);
    setLoadingMessage('Verifying and creating account...');
    try {
        const { data, error } = await supabase.auth.verifyOtp({
            email,
            token,
            type: 'email',
        });

        if (error) {
            if (error.message.toLowerCase().includes('expired') || error.message.toLowerCase().includes('invalid')) {
                return 'That code is invalid or has expired. Please request a new one.';
            }
            return error.message;
        }
        
        if (data.session) {
            const user = data.session.user;
            const avatar_url = `https://picsum.photos/seed/${username}/100/100`;

            const { error: profileError } = await supabase.from('profiles').insert({
                id: user.id,
                username,
                avatar_url,
            });

            if (profileError) return profileError.message;
            
            // onAuthStateChange will handle setting the user, but we can set it here for a faster UI update.
            setCurrentUser({ id: user.id, username, avatarUrl: avatar_url });
        } else {
            return "Could not verify OTP. It might be incorrect or expired."
        }
        
        setError(null);
        return null;

    } catch (e) {
        console.error("Verification error:", e);
        if (e instanceof Error) return e.message;
        return 'An unexpected error occurred during verification.';
    } finally {
        setIsLoading(false);
    }
  };

  const handleLogout = async () => { 
      await supabase.auth.signOut();
      setCurrentUser(null);
      setViewState({ view: 'feed' }); 
  };

  const handleFileProcessing = useCallback(async (uploadedFiles: UploadedFile[]) => {
    if (!currentUser) return;
    setIsLoading(true); 
    
    try {
        setLoadingMessage("Uploading your photos securely...");
        const uploadedUrls = await Promise.all(
            uploadedFiles.map(async (uploadedFile) => {
                const file = uploadedFile.file;
                const filePath = `${currentUser.id}/${crypto.randomUUID()}-${file.name}`;
                const { error: uploadError } = await supabase.storage.from('trip-photos').upload(filePath, file);
                if (uploadError) throw uploadError;
                const { data: { publicUrl } } = supabase.storage.from('trip-photos').getPublicUrl(filePath);
                return publicUrl;
            })
        );
        
        setLoadingMessage("Reading photo locations...");
        const filesWithMetadata = await Promise.all(uploadedFiles.map(async (f, index) => {
            const { coords, cameraDetails } = await extractFileMetadata(f.file);
            const { file, ...rest } = f;
            return { ...rest, previewUrl: uploadedUrls[index], coords, cameraDetails, likes: [], comments: [] };
        }));

        const locatedFiles = filesWithMetadata.filter(f => f.coords);
        if (locatedFiles.length === 0) throw new Error("No photos with location data found. Please use original photos with location data enabled.");
        
        setLoadingMessage("Crafting your travel story...");
        const newTrip = await generateTripStory(locatedFiles as any, currentUser);
        
        const tripToInsert = { ...newTrip, user_id: currentUser.id, files: newTrip.files.map(({file, ...rest}: any) => rest) };
        delete (tripToInsert as any).user;

        const { data: insertedTrip, error: insertError } = await supabase.from('trips').insert(tripToInsert).select('*, user:profiles(id, username, avatar_url)').single();

        if (insertError) throw insertError;
        
        const createdTrip: TripStory = { ...insertedTrip, user: { id: insertedTrip.user.id, username: insertedTrip.user.username, avatarUrl: insertedTrip.user.avatar_url } };

        setTrips(prev => [createdTrip, ...prev]);
        setViewState({ view: 'detail', tripId: createdTrip.id });

    } catch (err) { setError((err as Error).message); setViewState({ view: 'create' }); } 
    finally { setIsLoading(false); }
  }, [currentUser]);

  const handleUpdateTrip = async (updatedTrip: TripStory) => {
      setTrips(prev => prev.map(t => t.id === updatedTrip.id ? updatedTrip : t));

      try {
          const { user, ...tripForDb } = updatedTrip;
          const payload = { ...tripForDb, files: tripForDb.files.map(({ file, ...rest }: any) => rest) };
          const { error } = await supabase.from('trips').update(payload).eq('id', updatedTrip.id);
          if (error) throw error;
      } catch (e) {
          console.error("Error updating trip:", e);
          setError(e instanceof Error ? e.message : 'Could not save changes.');
          fetchTrips(); // Revert optimistic update on failure
      }
  };
  
  if (isLoading) {
    return <Loader message={loadingMessage || 'Initializing...'} />;
  }

  if (!currentUser) {
    return (
        <div className="bg-gray-900 min-h-screen">
            <Auth 
              onLogin={handleLogin} 
              onSendOtp={handleSendOtp} 
              onVerifyAndRegister={handleVerifyAndRegister} 
              initialError={authError}
            />
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
        {error && <div className="text-red-400 text-center p-4 bg-red-900/50 rounded-lg">{error}</div>}
        {!error && renderContent()}
      </main>
    </div>
  );
};

export default App;
