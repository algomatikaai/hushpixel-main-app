'use client';

import { useState } from 'react';
import { Button } from '@kit/ui/button';
import { Card, CardContent } from '@kit/ui/card';
import Image from 'next/image';
import { trackFBQuizStep } from './facebook-pixel';

interface CharacterOption {
  id: string;
  name: string;
  description: string;
  imageUrl: string;
  percentage: string;
}

// TOP 4 data-driven character selection based on CSV analysis
// Ordered as requested: brunette & redhead (top row), asian & blonde (bottom row)
const characterOptions: CharacterOption[] = [
  {
    id: 'brunette-beauty',
    name: 'Brunette Beauty', 
    description: 'Sophisticated and alluring',
    imageUrl: '/images/character/brunette.webp',
    percentage: '24.3%'
  },
  {
    id: 'redhead-model',
    name: 'Redhead Model',
    description: 'Fiery and captivating',
    imageUrl: '/images/character/Redhead Model.webp',
    percentage: '23.1%'
  },
  {
    id: 'asian-beauty',
    name: 'Asian Beauty',
    description: 'Elegant and graceful',
    imageUrl: '/images/character/asian.webp',
    percentage: '26.8%' // Top performer
  },
  {
    id: 'blonde-companion',
    name: 'Blonde Companion',
    description: 'Classic and charming',
    imageUrl: '/images/character/blonde.webp',
    percentage: '22.4%'
  }
];

interface CharacterSelectionProps {
  onSelect: (characterType: string) => void;
}

export function CharacterSelection({ onSelect }: CharacterSelectionProps) {
  const [selectedCharacter, setSelectedCharacter] = useState<string>('');

  const handleSelect = (characterId: string) => {
    setSelectedCharacter(characterId);
    
    // Track Facebook Pixel event
    const selectedOption = characterOptions.find(option => option.id === characterId);
    trackFBQuizStep('Character Selection', {
      character_type: characterId,
      character_name: selectedOption?.name,
      percentage: selectedOption?.percentage,
      content_category: 'character_selection'
    });
    
    // Small delay for visual feedback
    setTimeout(() => {
      onSelect(characterId);
    }, 150);
  };

  return (
    <div className="space-y-6">
      <div className="text-center mb-6">
        <p className="text-muted-foreground text-sm">
          Select the character type that appeals to you most
        </p>
      </div>
      
      <div className="grid grid-cols-2 gap-4">
        {characterOptions.map((character, index) => (
          <Card
            key={character.id}
            className={`relative group cursor-pointer hover:scale-105 transition-all duration-200 overflow-hidden border-2 ${
              selectedCharacter === character.id 
                ? 'border-primary ring-2 ring-primary/20' 
                : 'border-border hover:border-primary/50'
            }`}
            onClick={() => handleSelect(character.id)}
          >
            <CardContent className="p-0">
              <div className="relative h-48">
                <Image
                  src={character.imageUrl}
                  alt={character.name}
                  fill
                  className="object-cover"
                  loading={index < 2 ? 'eager' : 'lazy'}
                  priority={index < 2}
                  sizes="(max-width: 768px) 50vw, 25vw"
                />
                {/* Popular badge for top performer */}
                {character.id === 'brunette-beauty' && (
                  <div className="absolute top-2 right-2 bg-primary text-primary-foreground text-xs px-2 py-1 rounded-full font-semibold">
                    Most Popular
                  </div>
                )}
                
                {/* Selection indicator */}
                {selectedCharacter === character.id && (
                  <div className="absolute inset-0 bg-primary/10 flex items-center justify-center">
                    <div className="bg-primary text-primary-foreground rounded-full p-2">
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    </div>
                  </div>
                )}
              </div>
              
              <div className="p-3 bg-background">
                <p className="font-medium text-sm text-center text-foreground">
                  {character.name}
                </p>
                <p className="text-muted-foreground text-xs text-center mt-1">
                  {character.description}
                </p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}