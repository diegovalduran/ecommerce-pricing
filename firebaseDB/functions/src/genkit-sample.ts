// Import the Genkit core libraries and plugins.
import { genkit } from "genkit";
import { googleAI } from "@genkit-ai/googleai";
import { enableFirebaseTelemetry } from "@genkit-ai/firebase";

// Import models from the Google AI plugin. The Google AI API provides access to
// several generative models. Here, we import Gemini 1.5 Flash.
import { gemini15Flash } from "@genkit-ai/googleai";

// Enable Firebase telemetry
enableFirebaseTelemetry();

const ai = genkit({
  plugins: [
    // Load the Google AI plugin. You can optionally specify your API key
    // by passing in a config object; if you don't, the Google AI plugin uses
    // the value from the GOOGLE_GENAI_API_KEY environment variable, which is
    // the recommended practice.
    googleAI(),
  ],
});

// Define a simple flow that prompts an LLM to generate menu suggestions.
export const menuSuggestionFlow = async (subject: string) => {
  // Construct a request and send it to the model API.
  const prompt =
    `Suggest an item for the menu of a ${subject} themed restaurant`;
  const llmResponse = await ai.generate({
    model: gemini15Flash,
    prompt: prompt,
    config: {
      temperature: 1,
    },
  });

  // Handle the response from the model API. In this sample, we just
  // convert it to a string, but more complicated flows might coerce the
  // response into structured output or chain the response into another
  // LLM call, etc.
  return llmResponse.text;
};
