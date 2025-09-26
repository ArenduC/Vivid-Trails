import { User as SupabaseUser } from '@supabase/supabase-js';

export interface User {
  id: string;
  username: string;
  avatarUrl: string;
}

// A more detailed profile object for the profile page view
export interface Profile extends User {
  fullName: string;
  bannerUrl: string;
  following: number;
  followers: number;
  bio?: string;
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

export interface Rating {
    userId: string;
    value: number;
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
  ratings: Rating[];
  videoUrl?: string;
}

export interface CompetitionEntry {
  id: string;
  user: User;
  competitionId: string;
  photoUrl: string;
  submittedAt: string;
  rank?: number; // 1 for 1st, 2 for 2nd etc.
  votes: Like[];
}

export interface Competition {
  id: string;
  creatorId: string;
  creator: User;
  title: string;
  description: string;
  endDate: string;
  maxEntriesPerUser: number;
  createdAt: string;
  // Entries are fetched separately
}