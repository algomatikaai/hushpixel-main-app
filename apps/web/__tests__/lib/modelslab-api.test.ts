import { describe, it, expect, vi, beforeEach } from 'vitest';
import { generateCompanionImage, getGenerationErrorMessage } from '../../lib/modelslab-api';

// Mock fetch globally
global.fetch = vi.fn();

describe('ModelsLab API', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    // Set up environment variables
    process.env.MODELSLAB_API_KEY = 'test-api-key';
    process.env.MODELSLAB_BASE_URL = 'https://api.test.com';
    process.env.MODELSLAB_DEFAULT_MODEL = 'test-model';
  });

  describe('generateCompanionImage', () => {
    it('should generate image successfully with valid prompt', async () => {
      const mockResponse = {
        status: 'success',
        output: ['https://example.com/generated-image.jpg'],
        meta: {
          prompt: 'beautiful woman, professional photography',
          seed: 12345,
          guidance_scale: 7.5
        }
      };

      (fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const result = await generateCompanionImage({
        prompt: 'beautiful woman, professional photography',
        quality: 'standard',
        isFirstGeneration: true,
        characterSeed: 'test-seed'
      });

      expect(result.success).toBe(true);
      expect(result.imageUrl).toBe('https://example.com/generated-image.jpg');
      expect(result.metadata).toEqual({
        prompt: 'beautiful woman, professional photography',
        seed: 12345,
        guidance_scale: 7.5
      });
    });

    it('should handle API errors gracefully', async () => {
      (fetch as any).mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: async () => ({ error: 'Invalid prompt' }),
      });

      const result = await generateCompanionImage({
        prompt: 'invalid prompt',
        quality: 'standard',
        isFirstGeneration: false,
        characterSeed: 'test-seed'
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid prompt');
    });

    it('should handle network errors', async () => {
      (fetch as any).mockRejectedValueOnce(new Error('Network error'));

      const result = await generateCompanionImage({
        prompt: 'test prompt',
        quality: 'standard',
        isFirstGeneration: false,
        characterSeed: 'test-seed'
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Network error');
    });

    it('should enhance prompts for better quality', async () => {
      const mockResponse = {
        status: 'success',
        output: ['https://example.com/enhanced-image.jpg'],
        meta: { prompt: 'enhanced prompt' }
      };

      (fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      await generateCompanionImage({
        prompt: 'simple prompt',
        quality: 'hd',
        isFirstGeneration: true,
        characterSeed: 'test-seed'
      });

      const fetchCall = (fetch as any).mock.calls[0];
      const requestBody = JSON.parse(fetchCall[1].body);
      
      // Should enhance the prompt with quality terms
      expect(requestBody.prompt).toContain('masterpiece');
      expect(requestBody.prompt).toContain('best quality');
    });
  });

  describe('getGenerationErrorMessage', () => {
    it('should return user-friendly error messages', () => {
      expect(getGenerationErrorMessage('Invalid API key')).toContain('authentication');
      expect(getGenerationErrorMessage('Rate limit exceeded')).toContain('too many requests');
      expect(getGenerationErrorMessage('NSFW content detected')).toContain('content policy');
      expect(getGenerationErrorMessage('Unknown error')).toContain('please try again');
    });
  });
});