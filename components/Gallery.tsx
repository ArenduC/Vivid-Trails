import React, { useState, useMemo } from 'react';
import { TripStory, UploadedFile } from '../types';
import { CheckIcon, XMarkIcon } from './IconComponents';

interface LibraryImagePickerProps {
    userTrips: TripStory[];
    onClose: () => void;
    onConfirm: (selectedPhotos: UploadedFile[]) => void;
}

const LibraryImagePicker: React.FC<LibraryImagePickerProps> = ({ userTrips, onClose, onConfirm }) => {
    const [selectedUrls, setSelectedUrls] = useState<Set<string>>(new Set());

    const allPhotos = useMemo(() => {
        const photoMap = new Map<string, UploadedFile>();
        userTrips.forEach(trip => {
            // Ensure files is an array before iterating
            (trip.files || []).forEach(file => {
                if (file.previewUrl && !photoMap.has(file.previewUrl)) {
                    photoMap.set(file.previewUrl, file);
                }
            });
        });
        // Sort by the original file's last modified date if available, otherwise by an arbitrary property like ID
        return Array.from(photoMap.values()).sort((a, b) => 
            (b.file?.lastModified || 0) - (a.file?.lastModified || 0)
        );
    }, [userTrips]);

    const toggleSelection = (url: string) => {
        setSelectedUrls(prev => {
            const newSet = new Set(prev);
            if (newSet.has(url)) {
                newSet.delete(url);
            } else {
                newSet.add(url);
            }
            return newSet;
        });
    };

    const handleConfirm = () => {
        const selectedPhotos = allPhotos.filter(photo => selectedUrls.has(photo.previewUrl));
        onConfirm(selectedPhotos);
    };

    return (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={onClose} role="dialog" aria-modal="true">
            <div className="bg-slate-800 rounded-2xl shadow-2xl w-full max-w-4xl h-[90vh] flex flex-col overflow-hidden border border-slate-700" onClick={e => e.stopPropagation()}>
                <div className="p-4 flex justify-between items-center border-b border-slate-700 flex-shrink-0">
                    <h3 className="text-lg font-bold text-white">Select Photos from Your Library</h3>
                    <button onClick={onClose} className="text-slate-400 hover:text-white" aria-label="Close library picker">
                        <XMarkIcon className="w-6 h-6" />
                    </button>
                </div>
                
                {allPhotos.length === 0 ? (
                    <div className="flex-grow flex items-center justify-center text-center">
                        <p className="text-slate-400">Your photo library is empty.<br/>Create some trips to start building it!</p>
                    </div>
                ) : (
                     <div className="flex-grow p-4 overflow-y-auto">
                        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-2">
                            {allPhotos.map(photo => {
                                const isSelected = selectedUrls.has(photo.previewUrl);
                                return (
                                    <div key={photo.previewUrl} onClick={() => toggleSelection(photo.previewUrl)} className="aspect-square rounded-md overflow-hidden group cursor-pointer relative">
                                        <img 
                                            src={photo.previewUrl} 
                                            alt={photo.description || 'Library photo'} 
                                            className={`w-full h-full object-cover transition-transform duration-200 ${isSelected ? 'scale-90' : 'group-hover:scale-105'}`}
                                        />
                                        <div className={`absolute inset-0 transition-all duration-200 ${isSelected ? 'bg-yellow-600/50 ring-4 ring-yellow-500' : 'bg-black/50 opacity-0 group-hover:opacity-100'}`}></div>
                                        {isSelected && (
                                            <div className="absolute top-2 right-2 bg-yellow-600 text-white rounded-full p-1">
                                                <CheckIcon className="w-4 h-4" />
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}

                <div className="p-4 flex justify-end items-center border-t border-slate-700 flex-shrink-0 bg-slate-800/50">
                     <div className="flex items-center gap-4">
                        <button onClick={onClose} className="font-semibold text-slate-300 hover:text-white px-4 py-2 rounded-lg">Cancel</button>
                        <button 
                            onClick={handleConfirm}
                            disabled={selectedUrls.size === 0}
                            className="bg-yellow-600 hover:bg-yellow-700 disabled:bg-slate-600 disabled:cursor-not-allowed text-white font-bold py-2 px-6 rounded-full transition-colors"
                        >
                            Add {selectedUrls.size > 0 ? `${selectedUrls.size} ` : ''}Photo{selectedUrls.size !== 1 && 's'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default LibraryImagePicker;
