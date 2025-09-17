import { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/lib/auth';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { X, Camera } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';

interface ProfileModalProps {
  open: boolean;
  onClose: () => void;
}

export default function ProfileModal({ open, onClose }: ProfileModalProps) {
  const { user, logout } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [formData, setFormData] = useState({
    displayName: '',
    statusMessage: '',
  });

  useEffect(() => {
    if (user) {
      setFormData({
        displayName: user.displayName || '',
        statusMessage: user.statusMessage || '',
      });
    }
  }, [user]);

  const updateProfileMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const response = await apiRequest('PUT', '/api/users/profile', data);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Profile updated successfully",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/auth/me'] });
      onClose();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const logoutMutation = useMutation({
    mutationFn: logout,
    onSuccess: () => {
      toast({
        title: "Signed out",
        description: "You have been signed out successfully",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateProfileMutation.mutate(formData);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  if (!user) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md" data-testid="profile-modal">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="text-xl font-semibold">Profile Settings</DialogTitle>
            <Button variant="ghost" size="icon" onClick={onClose} data-testid="button-close-profile">
              <X className="h-5 w-5" />
            </Button>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Profile Photo */}
          <div className="text-center">
            <div className="relative inline-block">
              <Avatar className="w-20 h-20">
                <AvatarImage src={user.avatar || undefined} />
                <AvatarFallback className="text-lg">
                  {user.displayName.split(' ').map(n => n[0]).join('').toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="absolute -bottom-2 -right-2 rounded-full h-8 w-8"
                data-testid="button-change-photo"
              >
                <Camera className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Form Fields */}
          <div className="space-y-4">
            <div>
              <Label htmlFor="displayName" className="block text-sm font-medium mb-2">
                Display Name
              </Label>
              <Input
                id="displayName"
                name="displayName"
                type="text"
                value={formData.displayName}
                onChange={handleInputChange}
                data-testid="input-display-name"
              />
            </div>

            <div>
              <Label htmlFor="statusMessage" className="block text-sm font-medium mb-2">
                Status Message
              </Label>
              <Input
                id="statusMessage"
                name="statusMessage"
                type="text"
                value={formData.statusMessage}
                onChange={handleInputChange}
                placeholder="Available"
                data-testid="input-status-message"
              />
            </div>

            <div>
              <Label className="block text-sm font-medium mb-2">
                Email
              </Label>
              <Input
                type="email"
                value={user.email}
                disabled
                className="bg-muted"
                data-testid="input-email-readonly"
              />
            </div>

          </div>

          {/* Action Buttons */}
          <div className="space-y-3">
            <div className="flex space-x-3">
              <Button
                type="button"
                variant="outline"
                className="flex-1"
                onClick={onClose}
                data-testid="button-cancel-profile"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="flex-1 telekom-gradient text-white hover:opacity-90 transition-opacity"
                disabled={updateProfileMutation.isPending}
                data-testid="button-save-profile"
              >
                Save Changes
              </Button>
            </div>

            <Button
              type="button"
              variant="destructive"
              className="w-full"
              onClick={() => logoutMutation.mutate()}
              disabled={logoutMutation.isPending}
              data-testid="button-sign-out"
            >
              Sign Out
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
