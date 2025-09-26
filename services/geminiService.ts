import { GoogleGenAI, Type } from "@google/genai";
import { TripStory, LocationPin, UploadedFile, User } from '../types';

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const responseSchema = {
  type: Type.OBJECT,
  properties: {
    title: {
      type: Type.STRING,
      description: "A captivating, short title for the trip (e.g., 'An Alpine Adventure in Switzerland')."
    },
    summary: {
      type: Type.STRING,
      description: "A brief, engaging summary of the entire journey, written in a personal, narrative style."
    },
    locations: {
      type: Type.ARRAY,
      description: "An array of significant locations visited during the trip.",
      items: {
        type: Type.OBJECT,
        properties: {
          name: {
            type: Type.STRING,
            description: "A descriptive name for this location (e.g., 'Sunrise over Lake Brienz')."
          },
          story: {
            type: Type.STRING,
            description: "A short, narrative paragraph (2-3 sentences) describing the experience at this stop."
          },
          photoIndexes: {
            type: Type.ARRAY,
            description: "An array of zero-based indexes corresponding to the input photos that belong to this location.",
            items: {
              type: Type.INTEGER
            }
          }
        }
      }
    }
  }
};


export async function generateTripStory(files: UploadedFile[], user: User): Promise<TripStory> {
  const fileCoordinates = files.map(f => f.coords ? `{ "lat": ${f.coords.lat}, "lng": ${f.coords.lng} }` : '{"lat": null, "lng": null}');
  const prompt = `
You are an expert travel writer and itinerary creator. I have been on a trip and have a series of photos with GPS coordinates.
Your task is to analyze these locations, group nearby photos into logical "stops", and create a compelling travel story based on the journey's path.

Here is a JSON array of GPS coordinates for each photo, in order:
[${fileCoordinates.join(',\n')}]

Based on this path, please generate a JSON response. The response must follow the provided schema.
Group photos that are geographically close into a single location stop. A single photo can be its own stop if it's far from others.
For each stop, identify which photos (by their zero-based index from the list above) belong to it.
Craft a creative and engaging title, summary, and story for each location.

Generate the JSON response now.
`;

  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: responseSchema,
    },
  });
  
  const generatedData = JSON.parse(response.text);

  // Sanitize strings from AI to remove null characters and trim whitespace.
  const sanitize = (str: string | undefined | null): string => (str || '').replace(/\u0000/g, '').trim();
  
  // Validate AI response and provide fallbacks to prevent database errors
  const title = sanitize(generatedData.title) || `My Trip on ${new Date().toLocaleDateString()}`;
  const summary = sanitize(generatedData.summary) || "An amazing trip documented by Vivid Trails.";


  if (!generatedData.locations || !Array.isArray(generatedData.locations)) {
      throw new Error("The AI response is missing a valid 'locations' array.");
  }

  const locationPins: LocationPin[] = generatedData.locations.map((loc: any) => {
    if (!loc.photoIndexes || !Array.isArray(loc.photoIndexes)) {
        return null;
    }
    
    // Filter out of-bounds or invalid indexes from the AI response for robustness
    const validPhotoIndexes = loc.photoIndexes.filter((index: any) => 
        typeof index === 'number' && index >= 0 && index < files.length
    );

    if (validPhotoIndexes.length === 0) {
        return null;
    }

    const firstPhotoIndex = validPhotoIndexes[0];
    const primaryPhoto = files[firstPhotoIndex];
    
    if (!primaryPhoto || !primaryPhoto.coords) {
        return null;
    }
    
    return {
      id: crypto.randomUUID(),
      name: sanitize(loc.name) || "Memorable Stop",
      story: sanitize(loc.story) || "A beautiful moment captured.",
      coords: primaryPhoto.coords,
      photoIds: validPhotoIndexes.map((index: number) => files[index].id),
    };
  }).filter((pin: LocationPin | null): pin is LocationPin => pin !== null);
  
  if (locationPins.length === 0) {
      throw new Error("The AI could not identify any valid locations from the photos provided. Please ensure your photos have GPS data.");
  }
  
  // Select the cover image. Prioritize the first photo of the first location.
  // If that fails for any reason, default to the very first uploaded photo.
  const firstPhotoOfFirstLocationId = locationPins[0]?.photoIds?.[0];
  const coverFile = files.find(f => f.id === firstPhotoOfFirstLocationId);

  // Use the found cover file's URL, or the first file's URL as a fallback.
  // The final fallback to a picsum URL handles the edge case of an empty file list.
  const coverImageUrl = coverFile?.previewUrl || files[0]?.previewUrl || `https://picsum.photos/seed/adventure/800/600`;

  return {
      id: crypto.randomUUID(),
      user: user,
      title: title,
      summary: summary,
      locations: locationPins,
      files: files,
      coverImageUrl: coverImageUrl,
      likes: [],
      comments: [],
      ratings: []
  };
}

export async function addPhotosToTripStory(existingTrip: TripStory, newFiles: UploadedFile[]): Promise<TripStory> {
  const combinedFiles = [...existingTrip.files, ...newFiles];
  const fileCoordinates = combinedFiles.map(f => f.coords ? `{ "lat": ${f.coords.lat}, "lng": ${f.coords.lng} }` : '{"lat": null, "lng": null}');
  
  // Create a clean version of the trip to send to the AI, removing File objects
  const { user, files: existingFiles, ...restOfTrip } = existingTrip;
  const serializableTrip = {
    ...restOfTrip,
    files: existingFiles.map(({ file, ...f }) => f) // remove File object
  };

  const prompt = `
You are an expert travel writer who is updating an existing travel story.
I have an existing trip, and I'm adding some new photos. Your task is to intelligently integrate the new photos into the story.
You can add them to existing locations or create new location stops if they are geographically distinct.

Here is the JSON object for the existing trip:
${JSON.stringify(serializableTrip, null, 2)}

Here is a complete, ordered list of GPS coordinates for ALL photos (old and new combined). The original photos are first, followed by the new ones.
[${fileCoordinates.join(',\n')}]

Based on this combined data, please generate a complete, updated JSON response for the entire trip.
The response must follow the provided schema.
- Re-evaluate all photo groupings. A new photo might form a new location stop or join an existing one.
- Preserve the original title and summary unless the new photos drastically change the trip's scope.
- Ensure all photos, old and new, are assigned to a location using their zero-based index from the combined list above.

Generate the complete, updated JSON response now.
`;
  
  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: responseSchema,
    },
  });
  
  const generatedData = JSON.parse(response.text);

  const sanitize = (str: string | undefined | null): string => (str || '').replace(/\u0000/g, '').trim();
  
  const title = sanitize(generatedData.title) || existingTrip.title;
  const summary = sanitize(generatedData.summary) || existingTrip.summary;

  if (!generatedData.locations || !Array.isArray(generatedData.locations)) {
      throw new Error("The AI response is missing a valid 'locations' array.");
  }

  const locationPins: LocationPin[] = generatedData.locations.map((loc: any) => {
    if (!loc.photoIndexes || !Array.isArray(loc.photoIndexes)) return null;
    
    const validPhotoIndexes = loc.photoIndexes.filter((index: any) => 
        typeof index === 'number' && index >= 0 && index < combinedFiles.length
    );

    if (validPhotoIndexes.length === 0) return null;

    const primaryPhoto = combinedFiles[validPhotoIndexes[0]];
    if (!primaryPhoto || !primaryPhoto.coords) return null;
    
    return {
      id: crypto.randomUUID(),
      name: sanitize(loc.name) || "Memorable Stop",
      story: sanitize(loc.story) || "A beautiful moment captured.",
      coords: primaryPhoto.coords,
      photoIds: validPhotoIndexes.map((index: number) => combinedFiles[index].id),
    };
  }).filter((pin: LocationPin | null): pin is LocationPin => pin !== null);
  
  if (locationPins.length === 0) {
      throw new Error("The AI could not identify any valid locations from the photos provided.");
  }

  // Preserve original cover image unless it's no longer part of the trip
  const isCoverImageStillValid = combinedFiles.some(f => f.previewUrl === existingTrip.coverImageUrl);
  const coverImageUrl = isCoverImageStillValid ? existingTrip.coverImageUrl : (combinedFiles.find(f => f.id === locationPins[0]?.photoIds?.[0])?.previewUrl || combinedFiles[0].previewUrl);

  return {
    ...existingTrip, // Preserve IDs, user, likes, comments, ratings etc.
    title: title,
    summary: summary,
    locations: locationPins,
    files: combinedFiles, // Return the full combined list
    coverImageUrl: coverImageUrl,
  };
}


export async function generateTripVideo(trip: TripStory, onProgress: (message: string) => void): Promise<string> {
    if (!trip.files || trip.files.length === 0) {
        throw new Error("This trip has no photos to generate a video from.");
    }

    const coverImage = trip.files.find(f => f.previewUrl === trip.coverImageUrl);
    if (!coverImage) {
        throw new Error("Cover image not found for video generation.");
    }

    onProgress("Fetching cover image...");
    let base64CoverImage: string;
    let mimeType: string;

    // Helper function to convert a blob to a base64 string
    const blobToBase64 = (blob: Blob): Promise<string> => {
        return new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(blob);
            reader.onload = () => resolve((reader.result as string).split(',')[1]);
            reader.onerror = error => reject(error);
        });
    }

    if (coverImage.file && coverImage.file.size > 0) {
        mimeType = coverImage.file.type;
        base64CoverImage = await blobToBase64(coverImage.file);
    } else {
        const response = await fetch(coverImage.previewUrl);
        const blob = await response.blob();
        mimeType = blob.type;
        base64CoverImage = await blobToBase64(blob);
    }

    const prompt = `A cinematic travel video about "${trip.title}". A short, exciting highlight reel of this trip: ${trip.summary}. Make it feel epic and inspiring.`;
    onProgress("🎬 Kicking off your highlight reel...");

    let operation = await ai.models.generateVideos({
      model: 'veo-2.0-generate-001',
      prompt: prompt,
      image: {
        imageBytes: base64CoverImage,
        mimeType: mimeType,
      },
      config: {
        numberOfVideos: 1
      }
    });

    const progressMessages = [
        "✨ Analyzing your beautiful photos...",
        "🤖 Our AI director is framing the shots...",
        "🎨 Applying cinematic color grading...",
        "🎶 Adding the perfect soundtrack (almost!)...",
        "⏳ This can take a few minutes, hang tight!"
    ];
    let messageIndex = 0;

    while (!operation.done) {
      onProgress(progressMessages[messageIndex % progressMessages.length]);
      messageIndex++;
      await new Promise(resolve => setTimeout(resolve, 10000));
      operation = await ai.operations.getVideosOperation({operation: operation});
    }

    onProgress("✅ Your highlight reel is ready!");

    const downloadLink = operation.response?.generatedVideos?.[0]?.video?.uri;
    if (!downloadLink) {
        throw new Error("Video generation failed to produce a download link.");
    }
    
    // We must append the API key to the download link provided by the VEO API
    const videoResponse = await fetch(`${downloadLink}&key=${process.env.API_KEY}`);
    if (!videoResponse.ok) {
        const errorBody = await videoResponse.text();
        console.error("Video download failed:", errorBody);
        throw new Error(`Failed to download the generated video. Status: ${videoResponse.statusText}`);
    }
    const videoBlob = await videoResponse.blob();
    return URL.createObjectURL(videoBlob);
}