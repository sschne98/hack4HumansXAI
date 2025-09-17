import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { MapPin, X, AlertTriangle } from 'lucide-react';
import { useAuth } from '@/lib/auth';

interface LocationModalProps {
  open: boolean;
  onClose: () => void;
  onShareLocation: (location: { lat: number; lng: number; address: string }) => void;
}

export default function LocationModal({ open, onClose, onShareLocation }: LocationModalProps) {
  const { user } = useAuth();
  const [currentLocation, setCurrentLocation] = useState<{
    lat: number;
    lng: number;
    address: string;
  } | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showWarning, setShowWarning] = useState(true);
  const [confirmedSharing, setConfirmedSharing] = useState(false);

  useEffect(() => {
    if (open) {
      setShowWarning(true);
      setConfirmedSharing(false);
      getCurrentLocation();
    }
  }, [open]);

  const getCurrentLocation = async () => {
    setIsLoading(true);
    setError(null);

    try {
      if (!navigator.geolocation) {
        throw new Error('Geolocation is not supported by this browser');
      }

      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject);
      });

      const lat = position.coords.latitude;
      const lng = position.coords.longitude;

      // In a real app, you would use a geocoding service to get the address
      // For demo purposes, we'll use a placeholder
      const address = "Current Location";

      setCurrentLocation({ lat, lng, address });
    } catch (error: any) {
      setError(error.message || 'Failed to get location');
      // Fallback to a demo location (Berlin)
      setCurrentLocation({
        lat: 52.5200,
        lng: 13.4050,
        address: "Berlin, Germany"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleConfirmWarning = () => {
    setShowWarning(false);
    setConfirmedSharing(true);
  };

  const handleShareLocation = () => {
    if (currentLocation) {
      onShareLocation(currentLocation);
    }
  };

  const getAgeAppropriateWarning = () => {
    if (!user?.age) return null;
    
    if (user.age < 18) {
      return {
        title: "Location Sharing Safety",
        message: "Sharing your location lets others know exactly where you are. Only share with people you trust, like family members. Never share your location with strangers or people you only know online. Your safety is the most important thing!"
      };
    } else if (user.age < 25) {
      return {
        title: "Think Before You Share",
        message: "Sharing your location reveals your exact whereabouts to others in this conversation. Consider whether everyone in this chat should know where you are. Your location data can be sensitive information."
      };
    } else {
      return {
        title: "Location Privacy Notice",
        message: "You're about to share your precise location with others in this conversation. This information can reveal personal details about your whereabouts, routines, and activities. Please ensure you trust all participants."
      };
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg" data-testid="location-modal">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="text-xl font-semibold">Share Your Location</DialogTitle>
            <Button variant="ghost" size="icon" onClick={onClose} data-testid="button-close-location">
              <X className="h-5 w-5" />
            </Button>
          </div>
        </DialogHeader>

        <div className="space-y-4">
          {/* Warning Message */}
          {showWarning && getAgeAppropriateWarning() && (
            <Alert className="border-orange-200 bg-orange-50">
              <AlertTriangle className="h-4 w-4 text-orange-600" />
              <AlertDescription className="space-y-3">
                <div>
                  <h4 className="font-semibold text-orange-800 mb-2">
                    {getAgeAppropriateWarning()?.title}
                  </h4>
                  <p className="text-orange-700 text-sm leading-relaxed">
                    {getAgeAppropriateWarning()?.message}
                  </p>
                </div>
                <div className="flex gap-2 pt-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={onClose}
                    className="text-orange-700 border-orange-300 hover:bg-orange-100"
                  >
                    Cancel
                  </Button>
                  <Button
                    size="sm"
                    onClick={handleConfirmWarning}
                    className="bg-orange-600 hover:bg-orange-700 text-white"
                  >
                    I Understand, Continue
                  </Button>
                </div>
              </AlertDescription>
            </Alert>
          )}

          {/* Map Placeholder */}
          {!showWarning && (
            <div className="w-full h-64 bg-gray-200 rounded-lg relative overflow-hidden">
            {isLoading ? (
              <div className="flex items-center justify-center h-full">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : currentLocation ? (
              <>
                {/* Simple map-like background */}
                <div className="w-full h-full bg-gradient-to-br from-blue-100 to-green-100"></div>
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-8 h-8 bg-primary rounded-full border-4 border-white shadow-lg flex items-center justify-center animate-pulse">
                    <MapPin className="h-4 w-4 text-white" />
                  </div>
                </div>
              </>
            ) : (
              <div className="flex items-center justify-center h-full">
                <div className="text-center">
                  <MapPin className="h-12 w-12 text-muted-foreground mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">Unable to load map</p>
                </div>
              </div>
            )}
            </div>
          )}

          {/* Location Info */}
          {!showWarning && (
            <>
              <div className="text-center">
                <p className="font-medium text-foreground">Current Location</p>
                <p className="text-sm text-muted-foreground">
                  {error ? error : (currentLocation?.address || 'Loading...')}
                </p>
              </div>

              {/* Action Buttons */}
              <div className="flex space-x-3">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={onClose}
                  data-testid="button-cancel-location"
                >
                  Cancel
                </Button>
                <Button
                  className="flex-1 telekom-gradient text-white hover:opacity-90 transition-opacity"
                  onClick={handleShareLocation}
                  disabled={!currentLocation}
                  data-testid="button-confirm-share-location"
                >
                  Share Location
                </Button>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
