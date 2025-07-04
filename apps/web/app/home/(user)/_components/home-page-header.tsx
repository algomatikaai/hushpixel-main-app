'use client';

import { PageHeader } from '@kit/ui/page';
import { Button } from '@kit/ui/button';
import { Badge } from '@kit/ui/badge';
import { Crown, Sparkles, Zap } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface HomeLayoutPageHeaderProps {
  title: string | React.ReactNode;
  description: string | React.ReactNode;
  showUpgradeCTA?: boolean;
  userStatus?: 'free' | 'trial' | 'premium';
}

export function HomeLayoutPageHeader({
  title,
  description,
  showUpgradeCTA = true,
  userStatus = 'free',
  ...props
}: React.PropsWithChildren<HomeLayoutPageHeaderProps>) {
  const router = useRouter();

  const handleUpgrade = () => {
    router.push('/home/billing');
  };

  return (
    <PageHeader description={description}>
      <div className="flex items-center justify-between w-full">
        <div className="flex-1">
          {props.children}
        </div>
        
        {showUpgradeCTA && userStatus !== 'premium' && (
          <div className="flex items-center gap-3">
            {/* Status indicator */}
            {userStatus === 'free' && (
              <Badge variant="outline" className="border-purple-500/50 text-purple-200 bg-purple-900/20">
                <Sparkles className="w-3 h-3 mr-1" />
                Free User
              </Badge>
            )}
            
            {userStatus === 'trial' && (
              <Badge variant="outline" className="border-yellow-500/50 text-yellow-200 bg-yellow-900/20">
                <Zap className="w-3 h-3 mr-1" />
                Trial Active
              </Badge>
            )}

            {/* Upgrade CTA */}
            <Button
              onClick={handleUpgrade}
              className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 shadow-lg hover:shadow-xl transition-all duration-200"
              size="sm"
            >
              <Crown className="w-4 h-4 mr-2" />
              {userStatus === 'free' ? 'Upgrade to Premium' : 'Upgrade Now'}
            </Button>
          </div>
        )}
      </div>
    </PageHeader>
  );
}
