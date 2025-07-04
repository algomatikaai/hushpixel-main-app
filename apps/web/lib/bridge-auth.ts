import jwt from 'jsonwebtoken';
import { cookies } from 'next/headers';

// Bridge token payload interface
export interface BridgeTokenPayload {
  userId: string;
  email: string;
  quizCompleted: boolean;
  characterData: {
    type: string;
    body: string;
    personality: string;
    scene: string;
  };
  timestamp: number;
  source: string;
}

// Bridge token verification
export async function verifyBridgeToken(token: string): Promise<BridgeTokenPayload | null> {
  try {
    const secret = process.env.BRIDGE_SECRET;
    if (!secret) {
      console.error('BRIDGE_SECRET environment variable is not set');
      return null;
    }

    const decoded = jwt.verify(token, secret, {
      issuer: 'start.hushpixel.com',
      audience: 'app.hushpixel.com'
    }) as BridgeTokenPayload;

    // Verify token is not too old (1 hour max)
    const tokenAge = Date.now() - decoded.timestamp;
    if (tokenAge > 60 * 60 * 1000) { // 1 hour in milliseconds
      console.warn('Bridge token expired', { tokenAge });
      return null;
    }

    return decoded;
  } catch (error) {
    console.error('Bridge token verification failed:', error);
    return null;
  }
}

// Set bridge token in cookies for client-side access
export async function setBridgeTokenCookie(token: string) {
  const cookieStore = await cookies();
  cookieStore.set('hushpixel_bridge_token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60, // 1 hour
    path: '/'
  });
}

// Get bridge token from cookies
export async function getBridgeTokenFromCookies(): Promise<string | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get('hushpixel_bridge_token')?.value;
  return token || null;
}

// Clear bridge token cookie
export async function clearBridgeTokenCookie() {
  const cookieStore = await cookies();
  cookieStore.delete('hushpixel_bridge_token');
}

// Generate character name from quiz data
export function generateCharacterName(characterData: BridgeTokenPayload['characterData']): string {
  const namesByType: Record<string, string[]> = {
    blonde: ['Aria', 'Luna', 'Stella', 'Aurora', 'Chloe'],
    latina: ['Sofia', 'Valentina', 'Isabella', 'Camila', 'Lucia'],
    redhead: ['Scarlett', 'Ruby', 'Autumn', 'Phoenix', 'Rose'],
    brunette: ['Maya', 'Zara', 'Nova', 'Ivy', 'Sage']
  };
  
  const names = namesByType[characterData.type] || namesByType.blonde;
  return names[Math.floor(Math.random() * names.length)];
}

// Build AI prompt from quiz data
export function buildPromptFromQuizData(characterData: BridgeTokenPayload['characterData']): string {
  const characterMap: Record<string, string> = {
    'blonde_confident': "beautiful blonde woman, confident expression, alluring smile",
    'blonde_playful': "beautiful blonde woman, playful expression, bright smile",
    'blonde_mysterious': "beautiful blonde woman, mysterious expression, captivating eyes",
    'latina_confident': "beautiful latina woman, confident expression, warm smile",
    'latina_playful': "beautiful latina woman, playful expression, joyful smile",
    'latina_mysterious': "beautiful latina woman, mysterious expression, alluring eyes",
    'redhead_confident': "beautiful redhead woman, confident expression, striking smile",
    'redhead_playful': "beautiful redhead woman, playful expression, mischievous smile",
    'redhead_mysterious': "beautiful redhead woman, mysterious expression, captivating eyes",
    'brunette_confident': "beautiful brunette woman, confident expression, sophisticated smile",
    'brunette_playful': "beautiful brunette woman, playful expression, warm smile",
    'brunette_mysterious': "beautiful brunette woman, mysterious expression, enigmatic eyes"
  };
  
  const bodyMap: Record<string, string> = {
    slim: "slim figure, toned body",
    curvy: "curvy figure, hourglass shape",
    athletic: "athletic build, fit physique"
  };
  
  const sceneMap: Record<string, string> = {
    beach: "beach setting, ocean background, golden hour lighting",
    bedroom: "bedroom setting, soft lighting, intimate atmosphere",
    office: "modern office setting, professional lighting",
    garden: "garden setting, natural lighting, flowers in background",
    city: "urban setting, city lights, modern background"
  };
  
  const characterKey = `${characterData.type}_${characterData.personality}`;
  const basePrompt = characterMap[characterKey] || characterMap[`${characterData.type}_confident`];
  const bodyDescription = bodyMap[characterData.body] || bodyMap.curvy;
  const sceneDescription = sceneMap[characterData.scene] || sceneMap.bedroom;
  
  return `${basePrompt}, ${bodyDescription}, ${sceneDescription}, professional photography, high detail, realistic style, 8k quality, masterpiece`;
}

// Create character seed for consistency
export function createCharacterSeed(characterData: BridgeTokenPayload['characterData']): string {
  const characteristics = [
    characterData.type,
    characterData.body,
    characterData.personality,
    characterData.scene
  ].join('_');
  
  // Create a simple hash for seed consistency
  let hash = 0;
  for (let i = 0; i < characteristics.length; i++) {
    const char = characteristics.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  
  return Math.abs(hash).toString().slice(0, 8);
}