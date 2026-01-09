import * as FileSystem from 'expo-file-system';

const OPENAI_API_KEY = process.env.EXPO_PUBLIC_OPENAI_API_KEY || '';

export interface FoodAnalysisResult {
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  confidence?: number;
}

export const analyzeFoodImage = async (imageUri: string): Promise<FoodAnalysisResult> => {
  if (!OPENAI_API_KEY || OPENAI_API_KEY === 'sk-abcdef1234567890abcdef1234567890abcdef12') {
    throw new Error('OpenAI API key is not configured. Please set EXPO_PUBLIC_OPENAI_API_KEY in your .env file.');
  }

  try {
    // Read the image file and convert to base64
    const base64Image = await FileSystem.readAsStringAsync(imageUri, {
      encoding: FileSystem.EncodingType.Base64,
    });

    // Call OpenAI Vision API
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: `Analyze this food image and provide the nutritional information in the following JSON format:
{
  "name": "food name",
  "calories": number,
  "protein": number in grams,
  "carbs": number in grams,
  "fat": number in grams
}

Be as accurate as possible. Estimate portion sizes if visible. If you can't identify specific macros, provide reasonable estimates based on the food type. Always return valid JSON only, no additional text.`,
              },
              {
                type: 'image_url',
                image_url: {
                  url: `data:image/jpeg;base64,${base64Image}`,
                  detail: 'high',
                },
              },
            ],
          },
        ],
        max_tokens: 500,
        temperature: 0.3,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error?.message || `API Error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices[0]?.message?.content || '';

    // Parse the JSON response - extract JSON from markdown code blocks if present
    let jsonString = content.trim();
    
    // Remove markdown code blocks if present
    jsonString = jsonString.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    
    // Try to extract JSON object
    const jsonMatch = jsonString.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('Invalid response format from API');
    }

    const result: FoodAnalysisResult = JSON.parse(jsonMatch[0]);

    // Validate and ensure all required fields are present with default values
    return {
      name: result.name || 'Unknown Food',
      calories: Math.round(result.calories || 0),
      protein: Math.round(result.protein || 0),
      carbs: Math.round(result.carbs || 0),
      fat: Math.round(result.fat || 0),
      confidence: result.confidence,
    };
  } catch (error: any) {
    console.error('Error analyzing food image:', error);
    
    if (error.message.includes('API key')) {
      throw new Error('OpenAI API key is missing or invalid. Please configure EXPO_PUBLIC_OPENAI_API_KEY.');
    }
    
    if (error.message.includes('Invalid response')) {
      throw new Error('Could not parse food information from the image. Please try again with a clearer photo.');
    }
    
    if (error.message.includes('rate limit')) {
      throw new Error('API rate limit exceeded. Please try again in a moment.');
    }
    
    throw new Error(error.message || 'Failed to analyze food image. Please check your internet connection and try again.');
  }
};
