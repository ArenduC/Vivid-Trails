import { GoogleGenAI } from "@google/genai";
import { TripStory, LocationPin, UploadedFile, User } from '../types';
import { config } from '../config';

const ai = new GoogleGenAI({ apiKey: config.geminiApiKey });

export async function generateTripStory(files: UploadedFile[], user: User): Promise<TripStory> {
  // This function is using a mock implementation.
  // In a real application, this would be a call to a backend service 
  // which would perform reverse geocoding on the coordinates and then call the Gemini API.
  return mockGeminiResponse(files, user);
}

// Mock function to simulate Gemini API response for frontend development
async function mockGeminiResponse(files: UploadedFile[], user: User): Promise<TripStory> {
  console.log("Using mock Gemini response for files with coordinates:", files);
  await new Promise(resolve => setTimeout(resolve, 1000));

  const locationPins: LocationPin[] = files
    .filter(file => file.coords)
    .map((file, index) => ({
      id: crypto.randomUUID(),
      name: `Stop ${index + 1}: A Scenic View`,
      story: 'A memory captured at this beautiful, AI-identified location.',
      coords: file.coords!,
      photoIds: [file.id],
    }));

  return {
      id: crypto.randomUUID(),
      user: user,
      title: "My Awesome New Adventure",
      summary: "A journey traced through the locations of my photos, automatically creating a visual travel diary.",
      locations: locationPins,
      files: files.map(f => ({ ...f, likes: [], comments: [] })),
      coverImageUrl: files.length > 0 ? files[0].previewUrl : `https://picsum.photos/seed/adventure/800/600`,
      likes: [],
      comments: []
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

    if (coverImage.file && coverImage.file.size > 0) {
        mimeType = coverImage.file.type;
        base64CoverImage = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(coverImage.file);
            reader.onload = () => resolve((reader.result as string).split(',')[1]);
            reader.onerror = error => reject(error);
        });
    } else {
        const response = await fetch(coverImage.previewUrl);
        const blob = await response.blob();
        mimeType = blob.type;
        base64CoverImage = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(blob);
            reader.onload = () => resolve((reader.result as string).split(',')[1]);
            reader.onerror = error => reject(error);
        });
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

    const videoResponse = await fetch(`${downloadLink}&key=${config.geminiApiKey}`);
    if (!videoResponse.ok) {
        throw new Error(`Failed to download the generated video. Status: ${videoResponse.statusText}`);
    }
    const videoBlob = await videoResponse.blob();
    return URL.createObjectURL(videoBlob);
}