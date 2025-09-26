// This file documents the required Supabase schema for Vivid Trails.
// You should execute the SQL below in your Supabase project's SQL Editor.
// NOTE: This schema has been updated to a denormalized structure to match the app's code.
//
// --- IMPORTANT SETUP FOR PHOTO UPLOADS ---
// This app requires a Supabase Storage bucket to store photos.
// If this is not configured correctly, you will see a "Bucket not found" error.
//
// To fix this, follow these steps precisely:
// 1. Go to the "Storage" section in your Supabase project dashboard.
// 2. Create a new bucket. The name must be exactly: 'trip-photos'
// 3. **THIS IS THE CRITICAL STEP:** After creating the bucket, click on it, go to "Bucket settings",
//    and toggle the "Public bucket" switch to ON. This is what allows images to be viewed in the app.
// 4. Finally, go to the "Policies" tab for the `trip-photos` bucket and add the policies documented
//    at the end of this SQL script. These policies will allow users to upload, update, and delete their own photos.
// ---

/*
-- VIVID TRAILS - SUPABASE SCHEMA (Updated with Competitions Feature)
--

-- 1. PROFILES TABLE
-- Stores public user data linked to Supabase's auth system.
CREATE TABLE public.profiles (
    id uuid NOT NULL PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    username text UNIQUE,
    avatar_url text,
    updated_at timestamptz DEFAULT timezone('utc'::text, now()),
    CONSTRAINT username_length CHECK (char_length(username) >= 3)
);
COMMENT ON TABLE public.profiles IS 'Public profile information for each user.';

-- 2. TRIPS TABLE
-- Stores travel stories with denormalized data (locations, files, etc.).
CREATE TABLE public.trips (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    title text NOT NULL,
    summary text,
    cover_image_url text,
    locations jsonb,
    files jsonb,
    likes jsonb,
    comments jsonb,
    ratings jsonb DEFAULT '[]'::jsonb,
    created_at timestamptz DEFAULT timezone('utc'::text, now())
);
COMMENT ON TABLE public.trips IS 'Represents a single travel journey, with denormalized data.';

-- 3. COMPETITIONS TABLE (NEW)
-- Stores information about photo competitions.
CREATE TABLE public.competitions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    creator_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    title text NOT NULL,
    description text,
    end_date timestamptz NOT NULL,
    max_entries_per_user integer DEFAULT 1,
    created_at timestamptz DEFAULT timezone('utc'::text, now())
);
COMMENT ON TABLE public.competitions IS 'Stores photo competition details.';


-- 4. COMPETITION ENTRIES TABLE (NEW)
-- Stores user submissions for competitions.
CREATE TABLE public.competition_entries (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    competition_id uuid NOT NULL REFERENCES public.competitions(id) ON DELETE CASCADE,
    user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    photo_url text NOT NULL,
    submitted_at timestamptz DEFAULT timezone('utc'::text, now()),
    rank integer,
    votes jsonb,
    UNIQUE(competition_id, user_id, photo_url) -- prevent duplicate photo submissions
);
COMMENT ON TABLE public.competition_entries IS 'User photo submissions for competitions.';


-- 5. SETUP TRIGGERS AND FUNCTIONS
-- Creates a profile for a new user.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, username, avatar_url)
  VALUES (new.id, new.raw_user_meta_data->>'username', new.raw_user_meta_data->>'avatar_url');
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();


-- 6. SETUP ROW LEVEL SECURITY (RLS)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trips ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.competitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.competition_entries ENABLE ROW LEVEL SECURITY;

-- 7. DEFINE RLS POLICIES

-- PROFILES POLICIES
CREATE POLICY "Public profiles are viewable by everyone." ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Users can insert their own profile." ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "Users can update their own profile." ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- TRIPS POLICIES
CREATE POLICY "Trips are viewable by everyone." ON public.trips FOR SELECT USING (true);
CREATE POLICY "Users can create trips." ON public.trips FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own trips." ON public.trips FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own trips." ON public.trips FOR DELETE USING (auth.uid() = user_id);

-- COMPETITIONS POLICIES (NEW)
CREATE POLICY "Competitions are viewable by everyone." ON public.competitions FOR SELECT USING (true);
CREATE POLICY "Authenticated users can create competitions." ON public.competitions FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Competition creators can update their competitions." ON public.competitions FOR UPDATE USING (auth.uid() = creator_id);
CREATE POLICY "Competition creators can delete their competitions." ON public.competitions FOR DELETE USING (auth.uid() = creator_id);

-- COMPETITION ENTRIES POLICIES (NEW)
CREATE POLICY "Competition entries are viewable by everyone." ON public.competition_entries FOR SELECT USING (true);
CREATE POLICY "Authenticated users can submit entries." ON public.competition_entries FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete their own entries." ON public.competition_entries FOR DELETE USING (auth.uid() = user_id);
-- Policy for ranking: only the competition creator can update an entry's rank.
CREATE POLICY "Competition creators can rank entries." ON public.competition_entries FOR UPDATE
  USING (
    (SELECT creator_id FROM public.competitions WHERE id = competition_id) = auth.uid()
  );


-- 8. SETUP STORAGE BUCKET POLICIES
-- NOTE: Apply these policies in the Supabase Dashboard for the 'trip-photos' bucket.
-- These policies now cover both trip photos and competition entries.

-- POLICY NAME: Allow authenticated users to upload.
-- FOR: INSERT
-- WITH CHECK: auth.role() = 'authenticated'

-- POLICY NAME: Allow users to update their own photos.
-- FOR: UPDATE
-- USING: (bucket_id = 'trip-photos' AND (storage.foldername(name))[1] = auth.uid()::text OR (storage.foldername(name))[2] = auth.uid()::text)

-- POLICY NAME: Allow users to delete their own photos.
-- FOR: DELETE
-- USING: (bucket_id = 'trip-photos' AND (storage.foldername(name))[1] = auth.uid()::text OR (storage.foldername(name))[2] = auth.uid()::text)


-- --- END OF SCRIPT ---
*/