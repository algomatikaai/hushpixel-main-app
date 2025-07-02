'use client';

import { useState } from 'react';
import { Button } from '@kit/ui/button';
import { Card, CardContent } from '@kit/ui/card';
import Image from 'next/image';

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
    imageUrl: '/images/quiz/body-types/slim.webp', // You'll provide
    percentage: '28.6%' // Top performer
  },
  {
    id: 'athletic',
    name: 'Athletic',
    description: 'Fit and toned',
    imageUrl: '/images/quiz/body-types/athletic.webp', // You'll provide
    percentage: '19.6%'
  },
  {
    id: 'curvy',
    name: 'Curvy',
    description: 'Feminine curves',
    imageUrl: '/images/quiz/body-types/curvy.webp', // You'll provide
    percentage: '17.9%'
  }
];

interface BodyTypeSelectionProps {
  onSelect: (bodyType: string) => void;
}

export function BodyTypeSelection({ onSelect }: BodyTypeSelectionProps) {
  const [selectedBodyType, setSelectedBodyType] = useState<string>('');

  const handleSelect = (bodyTypeId: string) => {
    setSelectedBodyType(bodyTypeId);
    // Small delay for visual feedback
    setTimeout(() => {
      onSelect(bodyTypeId);
    }, 150);
  };

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        {bodyTypeOptions.map((bodyType) => (
          <button
            key={bodyType.id}
            onClick={() => handleSelect(bodyType.id)}
            className={`w-full h-16 p-4 bg-white rounded-2xl hover:bg-gray-100 transition-colors duration-200 flex items-center justify-between ${
              selectedBodyType === bodyType.id ? 'ring-2 ring-purple-500 bg-purple-50' : ''
            }`}
          >
            <div className="text-left flex-1">
              <div className="flex items-center gap-3">
                <div>
                  <h3 className="text-lg font-bold text-gray-900">{bodyType.name}</h3>
                  <p className="text-gray-600 text-sm">{bodyType.description}</p>
                </div>
                {/* Popular badge for top performer */}
                {bodyType.id === 'slim' && (
                  <div className="bg-purple-600 text-white text-xs px-2 py-1 rounded-full font-semibold">
                    Most Popular
                  </div>
                )}
              </div>
            </div>
            <div className="text-right">
              <p className="text-purple-600 text-xs font-medium">
                {bodyType.percentage}
              </p>
              <div className="text-gray-400 text-lg">→</div>
            </div>
          </button>
        ))}
      </div>
      
      <div className="text-center">
        <p className="text-gray-400 text-sm">
          Select your preferred body type
        </p>
      </div>
    </div>
  );
}