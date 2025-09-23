// config.ts

export const config = {
  geminiApiKey: 'YOUR_GEMINI_API_KEY_HERE', 
};

// It's a good practice to prevent the app from running with the placeholder key.
if (config.geminiApiKey === 'YOUR_GEMINI_API_KEY_HERE') {
  const message = "Gemini API key is not configured. Please add it to config.ts";
  // In a real app, you might throw an error, but for this context, a console error is sufficient.
  console.error(message);
  // You could also render an error message to the user.
  // For now, we'll alert the developer.
  alert(message);
}
