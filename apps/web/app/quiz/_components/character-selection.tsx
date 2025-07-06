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
const characterOptions: CharacterOption[] = [
  {
    id: 'asian-beauty',
    name: 'Asian Beauty',
    description: 'Elegant and graceful',
    imageUrl: '/images/quiz/5b6787b5-37d5-4b41-8b00-72f6da3f86dd.png',
    percentage: '26.8%' // Top performer
  },
  {
    id: 'brunette-beauty',
    name: 'Brunette Beauty', 
    description: 'Sophisticated and alluring',
    imageUrl: '/images/quiz/487244c4-b3c9-4500-86dd-c372a1872873.png',
    percentage: '14.3%'
  },
  {
    id: 'redhead-model',
    name: 'Redhead Model',
    description: 'Fiery and captivating',
    imageUrl: '/images/quiz/23ce552f-7688-4789-b92f-dd809addcd10.png',
    percentage: '14.3%'
  },
  {
    id: 'blonde-companion',
    name: 'Blonde Companion',
    description: 'Classic and charming',
    imageUrl: '/images/quiz/1f881da4-493c-4a6f-ac50-b55a69d00bbe.png',
    percentage: '14.3%'
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
      <div className="grid grid-cols-2 gap-4">
        {characterOptions.map((character, index) => (
          <button
            key={character.id}
            onClick={() => handleSelect(character.id)}
            className={`relative group bg-white rounded-2xl overflow-hidden hover:scale-105 transition-transform duration-200 min-h-48 ${
              selectedCharacter === character.id ? 'ring-2 ring-purple-500' : ''
            }`}
          >
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
              {character.id === 'asian-beauty' && (
                <div className="absolute top-2 right-2 bg-purple-600 text-white text-xs px-2 py-1 rounded-full font-semibold">
                  Most Popular
                </div>
              )}
            </div>
            <div className="absolute bottom-0 left-0 right-0 bg-white p-3">
              <p className="text-gray-900 font-medium text-sm text-center">
                {character.name}
              </p>
              <p className="text-purple-600 text-xs font-medium text-center mt-1">
                {character.percentage} choose this
              </p>
            </div>
          </button>
        ))}
      </div>
      
      <div className="text-center">
        <p className="text-gray-400 text-sm">
          Select the character type that appeals to you most
        </p>
      </div>
    </div>
  );
}