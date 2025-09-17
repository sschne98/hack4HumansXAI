import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/lib/auth';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { OnlineStatus } from '@/components/ui/online-status';
import { Search, X, MessageCircle } from 'lucide-react';
import type { User } from '@shared/schema';

interface NewChatModalProps {
  open: boolean;
  onClose: () => void;
  onStartChat: (participantId: string) => void;
}

export default function NewChatModal({ open, onClose, onStartChat }: NewChatModalProps) {
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');

  const { data: users = [] } = useQuery<User[]>({
    queryKey: ['/api/users'],
    enabled: open,
  });

  // Filter out current user and apply search filter
  const filteredUsers = users
    .filter(u => u.id !== user?.id)
    .filter(u => {
      if (!searchQuery.trim()) return true;
      const search = searchQuery.toLowerCase();
      return (
        u.displayName.toLowerCase().includes(search) ||
        u.email.toLowerCase().includes(search)
      );
    });

  const handleStartChat = (participantId: string) => {
    onStartChat(participantId);
    setSearchQuery('');
  };

  const handleClose = () => {
    onClose();
    setSearchQuery('');
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md" data-testid="new-chat-modal">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="text-xl font-semibold">Start New Chat</DialogTitle>
            <Button variant="ghost" size="icon" onClick={handleClose} data-testid="button-close-new-chat">
              <X className="h-5 w-5" />
            </Button>
          </div>
        </DialogHeader>

        <div className="space-y-4">
          {/* Search Input */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search by name or email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
              data-testid="input-search-users"
            />
          </div>

          {/* Users List */}
          <div className="max-h-96 overflow-y-auto" data-testid="users-list">
            {filteredUsers.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                {searchQuery ? (
                  <>
                    <Search className="h-12 w-12 mx-auto mb-3 opacity-50" />
                    <p>No users found matching "{searchQuery}"</p>
                  </>
                ) : (
                  <>
                    <MessageCircle className="h-12 w-12 mx-auto mb-3 opacity-50" />
                    <p>No other users available</p>
                  </>
                )}
              </div>
            ) : (
              <div className="space-y-1">
                {filteredUsers.map((user) => (
                  <div
                    key={user.id}
                    className="flex items-center space-x-3 p-3 rounded-lg hover:bg-accent cursor-pointer transition-colors"
                    onClick={() => handleStartChat(user.id)}
                    data-testid={`user-item-${user.id}`}
                  >
                    <div className="relative">
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={user.avatar || undefined} />
                        <AvatarFallback>
                          {user.displayName.split(' ').map(n => n[0]).join('').toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <OnlineStatus 
                        isOnline={user.isOnline || false}
                        className="absolute -bottom-1 -right-1"
                      />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <h3 className="text-sm font-medium text-foreground truncate">
                          {user.displayName}
                        </h3>
                        {user.isOnline && (
                          <span className="text-xs text-green-600 font-medium">Online</span>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground truncate">
                        {user.email}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="border-t pt-4">
            <Button
              variant="outline"
              className="w-full"
              onClick={handleClose}
              data-testid="button-cancel-new-chat"
            >
              Cancel
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
