import 'server-only';

import { cache } from 'react';

import { getSupabaseServerClient } from '@kit/supabase/server-client';

export interface GalleryPageData {
  generations: Array<{
    id: string;
    prompt: string;
    image_url: string;
    character_name: string;
    is_first_generation: boolean;
    quality: string;
    processing_time: number | null;
    metadata: any;
    created_at: string;
    updated_at: string;
  }>;
  stats: {
    total: number;
    today: number;
    thisWeek: number;
    thisMonth: number;
  };
  characterCounts: Array<{
    character_name: string;
    count: number;
  }>;
}

/**
 * Load the gallery page data for the given user.
 * This function is cached per-request.
 */
export const loadGalleryPageData = cache(galleryPageDataLoader);

async function galleryPageDataLoader(
  userId: string,
  page: number = 1,
  limit: number = 20,
  search?: string,
  characterFilter?: string,
  dateFilter?: 'today' | 'week' | 'month' | 'all'
): Promise<GalleryPageData> {
  const client = getSupabaseServerClient();

  // Build the query for generations
  let query = client
    .from('generations')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  // Apply search filter
  if (search) {
    query = query.ilike('prompt', `%${search}%`);
  }

  // Apply character filter
  if (characterFilter && characterFilter !== 'all') {
    query = query.eq('character_name', characterFilter);
  }

  // Apply date filter
  if (dateFilter && dateFilter !== 'all') {
    const now = new Date();
    let startDate: Date;

    switch (dateFilter) {
      case 'today':
        startDate = new Date(now.setHours(0, 0, 0, 0));
        break;
      case 'week':
        startDate = new Date(now.setDate(now.getDate() - 7));
        break;
      case 'month':
        startDate = new Date(now.setMonth(now.getMonth() - 1));
        break;
      default:
        startDate = new Date(0);
    }

    query = query.gte('created_at', startDate.toISOString());
  }

  // Apply pagination
  const start = (page - 1) * limit;
  const end = start + limit - 1;
  query = query.range(start, end);

  // Fetch generations
  const { data: generations, error: generationsError } = await query;

  if (generationsError) {
    console.error('Error fetching generations:', generationsError);
    throw generationsError;
  }

  // Fetch stats in parallel
  const [statsResult, characterCountsResult] = await Promise.all([
    fetchUserStats(client, userId),
    fetchCharacterCounts(client, userId),
  ]);

  return {
    generations: generations || [],
    stats: statsResult,
    characterCounts: characterCountsResult,
  };
}

async function fetchUserStats(client: any, userId: string) {
  const now = new Date();
  const today = new Date(now.setHours(0, 0, 0, 0));
  const weekAgo = new Date(now.setDate(now.getDate() - 7));
  const monthAgo = new Date(now.setMonth(now.getMonth() - 1));

  const { data, error } = await client
    .from('generations')
    .select('created_at')
    .eq('user_id', userId);

  if (error || !data) {
    return { total: 0, today: 0, thisWeek: 0, thisMonth: 0 };
  }

  const stats = {
    total: data.length,
    today: data.filter((g: any) => new Date(g.created_at) >= today).length,
    thisWeek: data.filter((g: any) => new Date(g.created_at) >= weekAgo).length,
    thisMonth: data.filter((g: any) => new Date(g.created_at) >= monthAgo).length,
  };

  return stats;
}

async function fetchCharacterCounts(client: any, userId: string) {
  const { data, error } = await client
    .from('generations')
    .select('character_name')
    .eq('user_id', userId);

  if (error || !data) {
    return [];
  }

  // Count occurrences of each character
  const counts = data.reduce((acc: Record<string, number>, curr: any) => {
    acc[curr.character_name] = (acc[curr.character_name] || 0) + 1;
    return acc;
  }, {});

  // Convert to array and sort by count
  return Object.entries(counts)
    .map(([character_name, count]) => ({ character_name, count: count as number }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10); // Top 10 characters
}