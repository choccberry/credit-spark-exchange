import React, { useState, useEffect } from 'react';
import AdSenseAd from '@/components/AdSenseAd';
import { Link, Navigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { useAuth } from '@/contexts/SupabaseAuthProvider';
import { useToast } from '@/hooks/use-toast';
import { getAdsWithCampaigns, mockCampaigns } from '@/data/mockData';
import { Ad, Campaign } from '@/types';
import { ArrowLeft, ExternalLink, Coins } from 'lucide-react';

const ViewAds = () => {
  const { authState, updateCredits } = useAuth();
  const { toast } = useToast();
  const [currentAd, setCurrentAd] = useState<(Ad & { campaign?: Campaign }) | null>(null);
  const [timeRemaining, setTimeRemaining] = useState(30);
  const [canClaim, setCanClaim] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [adsViewed, setAdsViewed] = useState(() => {
    const saved = localStorage.getItem('adsViewed');
    return saved ? parseInt(saved) : 0;
  });
  const [showAdSense, setShowAdSense] = useState(false);

  if (!authState.isAuthenticated) {
    return <Navigate to="/auth" replace />;
  }

  const loadRandomAd = () => {
    const adsWithCampaigns = getAdsWithCampaigns();
    const availableAds = adsWithCampaigns.filter(ad => {
      return ad.campaign && 
             ad.campaign.status === 'active' && 
             ad.campaign.remainingBudgetCredits > 0 &&
             ad.campaign.userId.toString() !== authState.profile?.user_id;
    });

    if (availableAds.length === 0) {
      setCurrentAd(null);
      return;
    }

    const randomIndex = Math.floor(Math.random() * availableAds.length);
    setCurrentAd(availableAds[randomIndex]);
    setTimeRemaining(30);
    setCanClaim(false);
  };

  useEffect(() => {
    loadRandomAd();
  }, []);

  useEffect(() => {
    if (timeRemaining > 0 && currentAd) {
      const timer = setTimeout(() => {
        setTimeRemaining(prev => prev - 1);
      }, 1000);
      return () => clearTimeout(timer);
    } else if (timeRemaining === 0) {
      setCanClaim(true);
    }
  }, [timeRemaining, currentAd]);

  const handleClaimCredits = async () => {
    if (!currentAd || !authState.user) return;

    setIsLoading(true);
    
    try {
      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 500));

      // Update user credits
      const newBalance = (authState.profile?.credits || 0) + 5;
      updateCredits(newBalance);

      // Update campaign budget
      const campaignIndex = mockCampaigns.findIndex(c => c.id === currentAd.campaignId);
      if (campaignIndex !== -1) {
        mockCampaigns[campaignIndex].remainingBudgetCredits -= 5;
        if (mockCampaigns[campaignIndex].remainingBudgetCredits <= 0) {
          mockCampaigns[campaignIndex].status = 'completed';
        }
      }

      // Increment ads viewed counter
      const newAdsViewed = adsViewed + 1;
      setAdsViewed(newAdsViewed);
      localStorage.setItem('adsViewed', newAdsViewed.toString());

      // Show AdSense ad every 30 views
      if (newAdsViewed % 30 === 0) {
        setShowAdSense(true);
        toast({
          title: 'Credits earned!',
          description: 'You have successfully earned 5 credits. Watch our sponsor message!',
        });
      } else {
        toast({
          title: 'Credits earned!',
          description: 'You have successfully earned 5 credits.',
        });
      }

      // Load next ad
      setTimeout(() => {
        if (newAdsViewed % 30 !== 0) {
          loadRandomAd();
        }
      }, 1000);

    } finally {
      setIsLoading(false);
    }
  };

  const handleCloseAdSense = () => {
    setShowAdSense(false);
    loadRandomAd();
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card">
        <div className="max-w-4xl mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center gap-4">
            <Button variant="outline" size="sm" asChild>
              <Link to="/dashboard">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Dashboard
              </Link>
            </Button>
            <h1 className="text-2xl font-bold">View Ads</h1>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <Coins className="h-4 w-4 text-yellow-500" />
            <span className="font-medium">{authState.profile?.credits || 0} Credits</span>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8">
        {/* Platform AdSense Ad */}
        <AdSenseAd adType="viewAds" className="mb-8" />
        {currentAd ? (
          <Card className="max-w-2xl mx-auto">
            <CardHeader>
              <CardTitle className="text-center">
                {currentAd.campaign?.campaignName}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="relative">
                <div className="aspect-video bg-muted rounded-lg flex items-center justify-center overflow-hidden">
                  <img 
                    src={`https://images.unsplash.com/photo-1649972904349-6e44c42644a7?w=600&h=400&fit=crop&crop=center`}
                    alt="Advertisement"
                    className="w-full h-full object-cover cursor-pointer"
                    onClick={() => window.open(currentAd.targetUrl, '_blank')}
                  />
                  <div className="absolute inset-0 bg-black bg-opacity-0 hover:bg-opacity-10 transition-all cursor-pointer flex items-center justify-center">
                    <ExternalLink className="text-white opacity-0 hover:opacity-100 transition-opacity h-8 w-8" />
                  </div>
                </div>
                {!canClaim && (
                  <div className="absolute top-4 right-4 bg-black bg-opacity-75 text-white px-3 py-2 rounded-lg">
                    <div className="text-sm font-medium">Watch Time</div>
                    <div className="text-xl font-bold">{timeRemaining}s</div>
                  </div>
                )}
              </div>

              <div className="text-center space-y-4">
                <p className="text-muted-foreground">
                  Watch this ad for 30 seconds to earn 5 credits
                </p>

                <Button 
                  onClick={handleClaimCredits}
                  disabled={!canClaim || isLoading}
                  size="lg"
                  className="w-full"
                >
                  {isLoading ? 'Processing...' : canClaim ? 'Claim 5 Credits' : `Wait ${timeRemaining}s`}
                </Button>

                {canClaim && (
                  <p className="text-sm text-green-600 font-medium">
                    Ad viewing complete! You can now claim your credits.
                  </p>
                )}
              </div>

              <div className="text-center">
                <Button 
                  variant="outline" 
                  onClick={loadRandomAd}
                  disabled={timeRemaining > 0 && timeRemaining < 30}
                >
                  Load Different Ad
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card className="max-w-2xl mx-auto">
            <CardContent className="text-center py-12">
              <h3 className="text-xl font-semibold mb-4">No Ads Available</h3>
              <p className="text-muted-foreground mb-6">
                There are currently no active ads available for viewing. Check back later!
              </p>
              <Button asChild>
                <Link to="/dashboard">Return to Dashboard</Link>
              </Button>
            </CardContent>
          </Card>
        )}

        {/* AdSense Modal - Shows every 30 ads */}
        {showAdSense && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <Card className="max-w-lg mx-4">
              <CardHeader>
                <CardTitle className="text-center">Sponsor Message</CardTitle>
                <p className="text-center text-muted-foreground">
                  Thank you for using our platform! Here's a message from our sponsor.
                </p>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="bg-muted rounded-lg p-4 min-h-[200px] flex items-center justify-center">
                  <AdSenseAd adType="viewAds" />
                </div>
                <div className="text-center">
                  <p className="text-sm text-muted-foreground mb-4">
                    You've viewed {adsViewed} ads so far. Keep watching to earn more credits!
                  </p>
                  <Button onClick={handleCloseAdSense} className="w-full">
                    Continue Watching Ads
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </main>
    </div>
  );
};

export default ViewAds;