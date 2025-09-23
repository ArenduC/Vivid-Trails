

import React, { useState, useCallback } from 'react';
import { UploadedFile } from '../types';
import { UploadCloudIcon, SparklesIcon } from './IconComponents';

interface FileUploadProps {
  onFilesSelect: (files: UploadedFile[]) => void;
}

const FileUpload: React.FC<FileUploadProps> = ({ onFilesSelect }) => {
  const [isDragOver, setIsDragOver] = useState(false);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files) {
      processFiles(event.target.files);
    }
  };

  const handleDrop = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setIsDragOver(false);
    if (event.dataTransfer.files) {
      processFiles(event.dataTransfer.files);
    }
  }, []);

  const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setIsDragOver(true);
  };
  
  const handleDragLeave = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setIsDragOver(false);
  };

  const processFiles = (files: FileList) => {
    const uploadedFiles: UploadedFile[] = Array.from(files)
      .filter(file => file.type.startsWith('image/'))
      .map(file => ({
        id: crypto.randomUUID(),
        file: file,
        previewUrl: URL.createObjectURL(file),
        // FIX: Added missing properties `likes` and `comments` to conform to the UploadedFile type.
        likes: [],
        comments: [],
      }));
    if (uploadedFiles.length > 0) {
      onFilesSelect(uploadedFiles);
    } else {
        alert("Please upload at least one image file.");
    }
  };

  return (
    <div className="text-center p-8">
        <div className="flex items-center justify-center gap-2 mb-4">
            <SparklesIcon className="w-8 h-8 text-purple-400"/>
            <h2 className="text-3xl sm:text-4xl font-bold text-white tracking-tight">Create Your AI-Powered Travel Story</h2>
        </div>
      <p className="text-lg text-gray-300 max-w-xl mx-auto mb-8">
        Upload photos from your latest adventure, and our AI will automatically craft an interactive map and a captivating narrative from your photo locations.
      </p>

      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        className={`relative border-2 border-dashed rounded-2xl p-12 transition-all duration-300 ${isDragOver ? 'border-purple-400 bg-gray-800' : 'border-gray-600 bg-gray-800/50'}`}
      >
        <input
          type="file"
          multiple
          accept="image/*"
          onChange={handleFileChange}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          id="file-upload"
        />
        <label htmlFor="file-upload" className="flex flex-col items-center justify-center space-y-4 cursor-pointer">
          <UploadCloudIcon className="w-16 h-16 text-gray-500" />
          <p className="text-xl font-semibold text-white">Drag & drop your photos here</p>
          <p className="text-gray-400">or click to browse</p>
          <p className="text-xs text-gray-500">For best results, use original photos with location data enabled.</p>
        </label>
      </div>
    </div>
  );
};

export default FileUpload;