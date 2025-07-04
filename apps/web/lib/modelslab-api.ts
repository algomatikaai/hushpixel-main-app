// ModelsLab API integration for NSFW AI image generation

export interface GenerationRequest {
  prompt: string;
  characterSeed?: string;
  isFirstGeneration?: boolean;
  quality?: 'standard' | 'hd';
  style?: string;
  negativePrompt?: string;
}

export interface GenerationResponse {
  success: boolean;
  imageUrl?: string;
  processingTime?: number;
  error?: string;
  metadata?: {
    model: string;
    seed: string;
    steps: number;
  };
}

// Default negative prompt for better quality
const DEFAULT_NEGATIVE_PROMPT = "blurry, low quality, distorted, deformed, ugly, bad anatomy, bad proportions, cloned face, disfigured, fused fingers, fused limbs, extra fingers, extra limbs, extra arms, extra legs, malformed limbs, missing arms, missing legs, mutated hands, poorly drawn hands, poorly drawn face, mutation, mutilated, out of frame, bad body, bad legs, bad hands, bad eyes, watermark, signature, username, text";

// ModelsLab API client
class ModelsLabAPI {
  private apiKey: string;
  private baseUrl: string;

  constructor() {
    this.apiKey = process.env.MODELSLAB_API_KEY || '';
    this.baseUrl = process.env.MODELSLAB_BASE_URL || 'https://modelslab.com/api/v6';
    
    // Allow mock mode for development
    const isMockMode = this.apiKey === "mock_key_for_development";
    
    if (!this.apiKey) {
      throw new Error('MODELSLAB_API_KEY is required');
    }
    
    if (isMockMode) {
      console.log('ModelsLab API initialized in MOCK MODE - will return Unsplash placeholders');
    }
  }

  async generateImage(request: GenerationRequest): Promise<GenerationResponse> {
    const startTime = Date.now();
    
    // Check if we're in mock mode for development
    const isMockMode = this.apiKey === "mock_key_for_development";
    
    if (isMockMode) {
      console.log('ModelsLab API: Running in mock mode, returning Unsplash placeholder');
      
      // Realistic API delay simulation
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Curated Unsplash images for realistic placeholder testing
      const placeholderImages = [
        'https://images.unsplash.com/photo-1494790108755-2616c80545e5?w=800&h=800&fit=crop&crop=face',
        'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=800&h=800&fit=crop&crop=face',
        'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=800&h=800&fit=crop&crop=face',
        'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=800&h=800&fit=crop&crop=face',
        'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=800&h=800&fit=crop&crop=face',
        'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=800&h=800&fit=crop&crop=face'
      ];
      
      const selectedImage = placeholderImages[Math.floor(Math.random() * placeholderImages.length)];
      const processingTime = Date.now() - startTime;
      
      return {
        success: true,
        imageUrl: selectedImage,
        message: 'Your AI companion has been generated! (Demo mode with placeholder)',
        processingTime,
        metadata: {
          model: 'demo-mode-unsplash',
          seed: request.characterSeed || 'random',
          steps: 25
        }
      };
    }
    
    try {
      // Build the request payload for real API
      const payload = {
        prompt: this.enhancePrompt(request.prompt),
        model_id: this.selectModel(request.quality),
        width: request.quality === 'hd' ? 1024 : 512,
        height: request.quality === 'hd' ? 1024 : 512,
        num_inference_steps: request.isFirstGeneration ? 35 : 25, // Higher quality for first generation
        guidance_scale: 7.5,
        negative_prompt: request.negativePrompt || DEFAULT_NEGATIVE_PROMPT,
        nsfw: true,
        enhance_prompt: true,
        seed: request.characterSeed ? parseInt(request.characterSeed) : undefined,
        scheduler: "DPMSolverMultistepScheduler",
        safety_checker: false,
        webhook: null,
        track_id: null
      };

      console.log('ModelsLab API request:', { 
        prompt: payload.prompt,
        model: payload.model_id,
        dimensions: `${payload.width}x${payload.height}`,
        seed: payload.seed
      });

      const response = await fetch(`${this.baseUrl}/realtime/text2img`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(`ModelsLab API error: ${response.status} - ${errorData.message || 'Unknown error'}`);
      }

      const data = await response.json();
      const processingTime = Date.now() - startTime;

      // Handle different response formats
      let imageUrl: string;
      if (data.output && Array.isArray(data.output) && data.output.length > 0) {
        imageUrl = data.output[0];
      } else if (data.image) {
        imageUrl = data.image;
      } else if (data.output && typeof data.output === 'string') {
        imageUrl = data.output;
      } else {
        throw new Error('No image URL in response');
      }

      console.log('ModelsLab generation successful:', { 
        processingTime, 
        imageUrl: imageUrl.substring(0, 50) + '...' 
      });

      return {
        success: true,
        imageUrl,
        processingTime,
        metadata: {
          model: payload.model_id,
          seed: payload.seed?.toString() || 'random',
          steps: payload.num_inference_steps
        }
      };

    } catch (error) {
      const processingTime = Date.now() - startTime;
      console.error('ModelsLab generation failed:', error);
      
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        processingTime
      };
    }
  }

  private selectModel(quality?: string): string {
    // Use different models based on quality preference
    switch (quality) {
      case 'hd':
        return 'realistic-vision-v5'; // High quality model
      default:
        return 'realistic-vision-v4'; // Standard model, faster
    }
  }

  private enhancePrompt(prompt: string): string {
    // Add quality enhancers to the prompt
    const qualityTags = [
      '(best quality:1.2)',
      '(realistic:1.2)', 
      'detailed skin texture',
      'professional photography',
      'sharp focus'
    ];

    return `${prompt}, ${qualityTags.join(', ')}`;
  }

  // Health check method
  async healthCheck(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/status`, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`
        }
      });
      return response.ok;
    } catch {
      return false;
    }
  }
}

// Singleton instance
let modelsLabAPI: ModelsLabAPI | null = null;

export function getModelsLabAPI(): ModelsLabAPI {
  if (!modelsLabAPI) {
    modelsLabAPI = new ModelsLabAPI();
  }
  return modelsLabAPI;
}

// High-level generation function
export async function generateCompanionImage(request: GenerationRequest): Promise<GenerationResponse> {
  const api = getModelsLabAPI();
  
  // Add retry logic for better reliability
  const maxRetries = 2;
  let lastError: string | undefined;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    const result = await api.generateImage(request);
    
    if (result.success) {
      return result;
    }
    
    lastError = result.error;
    
    // If it's the last attempt, don't retry
    if (attempt === maxRetries) {
      break;
    }
    
    // Wait before retry (exponential backoff)
    const delay = Math.pow(2, attempt) * 1000;
    await new Promise(resolve => setTimeout(resolve, delay));
    
    console.log(`Retrying ModelsLab generation (attempt ${attempt + 1}/${maxRetries})`);
  }
  
  return {
    success: false,
    error: lastError || 'Generation failed after retries'
  };
}

// Error handling helper
export function getGenerationErrorMessage(error: string): string {
  if (error.includes('NSFW')) {
    return 'Content policy violation. Please modify your request.';
  }
  if (error.includes('timeout')) {
    return 'Generation is taking longer than expected. Please try again.';
  }
  if (error.includes('quota') || error.includes('limit')) {
    return 'Service temporarily busy. Please try again in a moment.';
  }
  return 'Generation failed. Please try again.';
}