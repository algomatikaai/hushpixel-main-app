'use client';

import { useState } from 'react';
import { Button } from '@kit/ui/button';
import { Card, CardContent } from '@kit/ui/card';
import Image from 'next/image';
import { trackFBQuizStep } from './facebook-pixel';

interface BodyTypeOption {
  id: string;
  name: string;
  description: string;
  imageUrl: string;
  percentage: string;
}

// TOP 3 data-driven body type selection based on CSV analysis
const bodyTypeOptions: BodyTypeOption[] = [
  {
    id: 'slim',
    name: 'Slim',
    description: 'Petite and graceful',
    imageUrl: '/images/body/slim.webp',
    percentage: '28.6%' // Top performer
  },
  {
    id: 'fit',
    name: 'Fit',
    description: 'Athletic and toned',
    imageUrl: '/images/body/fit.webp',
    percentage: '26.8%'
  },
  {
    id: 'curvy',
    name: 'Curvy',
    description: 'Feminine curves',
    imageUrl: '/images/body/curvy.webp',
    percentage: '25.2%'
  }
];

interface BodyTypeSelectionProps {
  onSelect: (bodyType: string) => void;
}

export function BodyTypeSelection({ onSelect }: BodyTypeSelectionProps) {
  const [selectedBodyType, setSelectedBodyType] = useState<string>('');

  const handleSelect = (bodyTypeId: string) => {
    setSelectedBodyType(bodyTypeId);
    
    // Track Facebook Pixel event
    const selectedOption = bodyTypeOptions.find(option => option.id === bodyTypeId);
    trackFBQuizStep('Body Type Selection', {
      body_type: bodyTypeId,
      body_type_name: selectedOption?.name,
      percentage: selectedOption?.percentage,
      content_category: 'body_type_selection'
    });
    
    // Small delay for visual feedback
    setTimeout(() => {
      onSelect(bodyTypeId);
    }, 150);
  };

  return (
    <div className="space-y-6">
      <div className="text-center mb-6">
        <p className="text-muted-foreground text-sm">
          Select your preferred body type
        </p>
      </div>
      
      <div className="space-y-4">
        {bodyTypeOptions.map((bodyType) => (
          <Card
            key={bodyType.id}
            className={`cursor-pointer transition-all duration-200 border-2 ${
              selectedBodyType === bodyType.id 
                ? 'border-primary ring-2 ring-primary/20 bg-primary/5' 
                : 'border-border hover:border-primary/50'
            }`}
            onClick={() => handleSelect(bodyType.id)}
          >
            <CardContent className="p-4">
              <div className="flex items-center gap-4">
                {/* Body type preview image */}
                <div className="relative w-16 h-20 rounded-lg overflow-hidden flex-shrink-0">
                  <Image
                    src={bodyType.imageUrl}
                    alt={bodyType.name}
                    fill
                    className="object-cover"
                    sizes="(max-width: 768px) 64px, 64px"
                  />
                </div>
                
                {/* Content */}
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-1">
                    <h3 className="text-lg font-semibold text-foreground">{bodyType.name}</h3>
                    {/* Popular badge for top performer */}
                    {bodyType.id === 'slim' && (
                      <div className="bg-primary text-primary-foreground text-xs px-2 py-1 rounded-full font-semibold">
                        Most Popular
                      </div>
                    )}
                  </div>
                  <p className="text-muted-foreground text-sm">{bodyType.description}</p>
                </div>
                
                {/* Selection indicator */}
                <div className="flex-shrink-0">
                  {selectedBodyType === bodyType.id ? (
                    <div className="bg-primary text-primary-foreground rounded-full p-2">
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    </div>
                  ) : (
                    <div className="text-muted-foreground text-lg">→</div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}