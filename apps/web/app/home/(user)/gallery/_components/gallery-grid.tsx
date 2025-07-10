'use client';

import { useState, useCallback, useTransition } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Image from 'next/image';
import { Card, CardContent } from '@kit/ui/card';
import { Button } from '@kit/ui/button';
import { Input } from '@kit/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@kit/ui/select';
import { Badge } from '@kit/ui/badge';
import { EmptyState, EmptyStateHeading, EmptyStateText, EmptyStateButton } from '@kit/ui/empty-state';
import { Spinner } from '@kit/ui/spinner';
import { Download, Search, Filter, Calendar, User, Sparkles, ChevronLeft, ChevronRight } from 'lucide-react';
import { toast } from 'sonner';

interface Generation {
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
}

interface GalleryGridProps {
  generations: Generation[];
  characterCounts: Array<{
    character_name: string;
    count: number;
  }>;
  currentPage: number;
  searchParams: {
    search?: string;
    character?: string;
    period?: 'today' | 'week' | 'month' | 'all';
  };
}

export function GalleryGrid({ 
  generations, 
  characterCounts, 
  currentPage,
  searchParams: initialSearchParams 
}: GalleryGridProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [selectedImage, setSelectedImage] = useState<Generation | null>(null);
  const [searchInput, setSearchInput] = useState(initialSearchParams.search || '');

  const updateSearchParams = useCallback((updates: Record<string, string | undefined>) => {
    const params = new URLSearchParams(searchParams.toString());
    
    Object.entries(updates).forEach(([key, value]) => {
      if (value) {
        params.set(key, value);
      } else {
        params.delete(key);
      }
    });

    startTransition(() => {
      router.push(`/home/gallery?${params.toString()}`);
    });
  }, [router, searchParams]);

  const handleSearch = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    updateSearchParams({ search: searchInput || undefined, page: '1' });
  }, [searchInput, updateSearchParams]);

  const handleDownload = async (generation: Generation) => {
    try {
      const response = await fetch(generation.image_url);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${generation.character_name}-${generation.id}.png`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      toast.success('Image downloaded successfully');
    } catch (error) {
      toast.error('Failed to download image');
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const hasMore = generations.length === 20; // Assuming 20 per page

  if (generations.length === 0 && !initialSearchParams.search && !initialSearchParams.character && initialSearchParams.period === 'all') {
    return (
      <EmptyState>
        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-primary/10 flex items-center justify-center">
          <Sparkles className="w-8 h-8 text-primary" />
        </div>
        <EmptyStateHeading>No generations yet</EmptyStateHeading>
        <EmptyStateText>
          Start creating amazing AI companions to see them here
        </EmptyStateText>
        <EmptyStateButton onClick={() => router.push('/home/generate')}>
          Generate Your First Companion
        </EmptyStateButton>
      </EmptyState>
    );
  }

  return (
    <div className="space-y-6">
      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col lg:flex-row gap-4">
            <form onSubmit={handleSearch} className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                <Input
                  type="search"
                  placeholder="Search by prompt..."
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  className="pl-10"
                  disabled={isPending}
                />
              </div>
            </form>

            <Select
              value={initialSearchParams.character || 'all'}
              onValueChange={(value) => updateSearchParams({ character: value === 'all' ? undefined : value, page: '1' })}
              disabled={isPending}
            >
              <SelectTrigger className="w-full lg:w-[200px]">
                <User className="w-4 h-4 mr-2" />
                <SelectValue placeholder="All characters" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All characters</SelectItem>
                {characterCounts.map((char) => (
                  <SelectItem key={char.character_name} value={char.character_name}>
                    {char.character_name} ({char.count})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={initialSearchParams.period || 'all'}
              onValueChange={(value) => updateSearchParams({ period: value as any, page: '1' })}
              disabled={isPending}
            >
              <SelectTrigger className="w-full lg:w-[150px]">
                <Calendar className="w-4 h-4 mr-2" />
                <SelectValue placeholder="All time" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All time</SelectItem>
                <SelectItem value="today">Today</SelectItem>
                <SelectItem value="week">This week</SelectItem>
                <SelectItem value="month">This month</SelectItem>
              </SelectContent>
            </Select>

            {(initialSearchParams.search || initialSearchParams.character || initialSearchParams.period !== 'all') && (
              <Button
                variant="outline"
                onClick={() => {
                  setSearchInput('');
                  updateSearchParams({ search: undefined, character: undefined, period: 'all', page: '1' });
                }}
                disabled={isPending}
              >
                Clear filters
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Gallery Grid */}
      {isPending ? (
        <div className="flex justify-center py-12">
          <Spinner className="w-8 h-8" />
        </div>
      ) : generations.length === 0 ? (
        <EmptyState>
          <EmptyStateHeading>No results found</EmptyStateHeading>
          <EmptyStateText>
            Try adjusting your search or filters to find what you're looking for
          </EmptyStateText>
          <EmptyStateButton onClick={() => {
            setSearchInput('');
            updateSearchParams({ search: undefined, character: undefined, period: 'all', page: '1' });
          }}>
            Clear filters
          </EmptyStateButton>
        </EmptyState>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {generations.map((generation) => (
              <Card 
                key={generation.id} 
                className="overflow-hidden group cursor-pointer hover:shadow-lg transition-shadow"
                onClick={() => setSelectedImage(generation)}
              >
                <div className="aspect-square relative bg-secondary">
                  <Image
                    src={generation.image_url}
                    alt={generation.character_name}
                    fill
                    className="object-cover"
                    sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, (max-width: 1280px) 33vw, 25vw"
                    loading="lazy"
                  />
                  {generation.is_first_generation && (
                    <Badge className="absolute top-2 right-2 bg-primary">
                      First Generation
                    </Badge>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-background/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
                    <div className="absolute bottom-0 left-0 right-0 p-4">
                      <h3 className="text-sm font-semibold text-white mb-1">
                        {generation.character_name}
                      </h3>
                      <p className="text-xs text-white/80 line-clamp-2">
                        {generation.prompt}
                      </p>
                    </div>
                  </div>
                </div>
                <CardContent className="p-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">
                      {formatDate(generation.created_at)}
                    </span>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDownload(generation);
                      }}
                    >
                      <Download className="w-4 h-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => updateSearchParams({ page: String(currentPage - 1) })}
              disabled={currentPage === 1 || isPending}
            >
              <ChevronLeft className="w-4 h-4" />
              Previous
            </Button>
            <span className="text-sm text-muted-foreground px-4">
              Page {currentPage}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => updateSearchParams({ page: String(currentPage + 1) })}
              disabled={!hasMore || isPending}
            >
              Next
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </>
      )}

      {/* Image Modal */}
      {selectedImage && (
        <div 
          className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={() => setSelectedImage(null)}
        >
          <div 
            className="max-w-4xl max-h-[90vh] bg-background rounded-lg overflow-hidden shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="relative">
              <Image
                src={selectedImage.image_url}
                alt={selectedImage.character_name}
                width={800}
                height={800}
                className="object-contain max-h-[70vh]"
              />
              <Button
                className="absolute top-4 right-4"
                size="sm"
                variant="secondary"
                onClick={() => handleDownload(selectedImage)}
              >
                <Download className="w-4 h-4 mr-2" />
                Download
              </Button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <h3 className="text-xl font-bold mb-2">{selectedImage.character_name}</h3>
                <p className="text-muted-foreground">{selectedImage.prompt}</p>
              </div>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Quality:</span>{' '}
                  <Badge variant="secondary">{selectedImage.quality}</Badge>
                </div>
                <div>
                  <span className="text-muted-foreground">Created:</span>{' '}
                  {formatDate(selectedImage.created_at)}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}