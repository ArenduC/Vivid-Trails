export interface User {
  id: string;
  username: string;
  avatarUrl: string;
}

export interface Comment {
    id: string;
    user: User;
    content: string;
    createdAt: string;
}

export interface Like {
    userId: string;
}

export interface CameraDetails {
  model?: string;
  exposureTime?: string;
  fNumber?: string;
  iso?: string;
}

export interface UploadedFile {
  id: string;
  file: File;
  previewUrl: string;
  coords?: { lat: number; lng: number };
  description?: string;
  cameraDetails?: CameraDetails;
  likes: Like[];
  comments: Comment[];
}

export interface LocationPin {
  id: string;
  name: string;
  story: string;
  coords: { lat: number; lng: number };
  photoIds: string[];
}

export interface TripStory {
  id:string;
  user: User;
  title: string;
  summary: string;
  locations: LocationPin[];
  coverImageUrl: string;
  files: UploadedFile[];
  likes: Like[];
  comments: Comment[];
  videoUrl?: string;
}