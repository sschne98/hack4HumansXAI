import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { OnlineStatus } from '@/components/ui/online-status';
import { Search, Settings, User, Plus, Users } from 'lucide-react';
import ProfileModal from './profile-modal';
import NewChatModal from './new-chat-modal';
import { apiRequest } from '@/lib/queryClient';
import type { ConversationWithLastMessage } from '@shared/schema';

interface SidebarProps {
  selectedConversationId?: string;
  onSelectConversation?: (conversationId: string) => void;
}

export default function Sidebar({ selectedConversationId, onSelectConversation }: SidebarProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState('');
  const [showProfile, setShowProfile] = useState(false);
  const [showNewChat, setShowNewChat] = useState(false);

  const { data: conversations = [] } = useQuery<ConversationWithLastMessage[]>({
    queryKey: ['/api/conversations'],
  });

  const createConversationMutation = useMutation({
    mutationFn: async (participantId: string) => {
      const response = await apiRequest('POST', '/api/conversations', { participantId });
      return response.json();
    },
    onSuccess: (conversation) => {
      queryClient.invalidateQueries({ queryKey: ['/api/conversations'] });
      onSelectConversation?.(conversation.id);
      setShowNewChat(false);
    },
  });

  const filteredConversations = conversations.filter(conv => {
    if (!searchQuery) return true;
    
    const searchLower = searchQuery.toLowerCase();
    return conv.otherParticipants.some(user => 
      user.displayName.toLowerCase().includes(searchLower) ||
      user.email.toLowerCase().includes(searchLower)
    ) || conv.name?.toLowerCase().includes(searchLower);
  });

  const formatTime = (dateString: string | undefined) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);
    
    if (diffInHours < 24) {
      return date.toLocaleTimeString('en-US', { 
        hour: 'numeric', 
        minute: '2-digit',
        hour12: true 
      });
    }
    
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric' 
    });
  };

  const getConversationName = (conversation: ConversationWithLastMessage) => {
    if (conversation.name) return conversation.name;
    if (conversation.otherParticipants.length === 1) {
      return conversation.otherParticipants[0].displayName;
    }
    return conversation.otherParticipants.map(u => u.displayName).join(', ');
  };

  const getConversationAvatar = (conversation: ConversationWithLastMessage) => {
    if (conversation.isGroup) {
      return (
        <div className="w-12 h-12 bg-primary rounded-full flex items-center justify-center">
          <Users className="h-6 w-6 text-white" />
        </div>
      );
    }
    if (conversation.otherParticipants.length === 1) {
      const participant = conversation.otherParticipants[0];
      return (
        <div className="relative">
          <Avatar className="h-12 w-12">
            <AvatarImage src={participant.avatar || undefined} />
            <AvatarFallback>
              {participant.displayName.split(' ').map(n => n[0]).join('').toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <OnlineStatus 
            isOnline={participant.isOnline || false} 
            className="absolute -bottom-1 -right-1"
          />
        </div>
      );
    }
    return (
      <div className="w-12 h-12 bg-primary rounded-full flex items-center justify-center">
        <Users className="h-6 w-6 text-white" />
      </div>
    );
  };

  const handleNewChat = (participantId: string) => {
    createConversationMutation.mutate(participantId);
  };

  return (
    <>
      <div className="w-80 bg-card border-r border-border flex flex-col" data-testid="sidebar">
        {/* Header */}
        <div className="p-4 border-b border-border">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-foreground">Messages</h2>
            <div className="flex items-center space-x-2">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setShowProfile(true)}
                data-testid="button-profile"
              >
                <User className="h-5 w-5" />
              </Button>
              <Button variant="ghost" size="icon" data-testid="button-settings">
                <Settings className="h-5 w-5" />
              </Button>
            </div>
          </div>

          {/* Search */}
          <div className="mt-4 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search conversations..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
              data-testid="input-search"
            />
          </div>
        </div>

        {/* Conversations List */}
        <div className="flex-1 overflow-y-auto" data-testid="conversations-list">
          {filteredConversations.map((conversation) => (
            <div
              key={conversation.id}
              className={`sidebar-item p-4 border-b border-border cursor-pointer transition-colors ${
                selectedConversationId === conversation.id ? 'bg-accent' : ''
              }`}
              onClick={() => onSelectConversation?.(conversation.id)}
              data-testid={`conversation-${conversation.id}`}
            >
              <div className="flex items-center space-x-3">
                {getConversationAvatar(conversation)}
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-medium text-foreground truncate">
                      {getConversationName(conversation)}
                    </h3>
                    <span className="text-xs text-muted-foreground">
                      {formatTime(conversation.lastMessage?.createdAt?.toString())}
                    </span>
                  </div>
                  
                  {conversation.lastMessage && (
                    <p className="text-sm text-muted-foreground truncate">
                      {conversation.lastMessage.messageType === 'location' 
                        ? '📍 Location shared'
                        : conversation.lastMessage.content}
                    </p>
                  )}
                  
                  <div className="flex items-center justify-between mt-1">
                    {!conversation.isGroup && conversation.otherParticipants.length === 1 && (
                      <span className="text-xs text-primary">
                        {conversation.otherParticipants[0].department || 'Team Member'}
                      </span>
                    )}
                    {conversation.isGroup && (
                      <span className="text-xs text-primary">
                        Group • {conversation.participants.length} members
                      </span>
                    )}
                    
                    {conversation.unreadCount > 0 && (
                      <span className="bg-primary text-white text-xs rounded-full px-2 py-1 min-w-[20px] text-center">
                        {conversation.unreadCount}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}

          {filteredConversations.length === 0 && (
            <div className="p-8 text-center text-muted-foreground">
              {searchQuery ? 'No conversations found' : 'No conversations yet'}
            </div>
          )}
        </div>

        {/* New Chat Button */}
        <div className="p-4 border-t border-border">
          <Button 
            className="w-full telekom-gradient text-white font-medium hover:opacity-90 transition-opacity"
            onClick={() => setShowNewChat(true)}
            data-testid="button-new-chat"
          >
            <Plus className="h-4 w-4 mr-2" />
            New Chat
          </Button>
        </div>
      </div>

      <ProfileModal 
        open={showProfile} 
        onClose={() => setShowProfile(false)} 
      />

      <NewChatModal
        open={showNewChat}
        onClose={() => setShowNewChat(false)}
        onStartChat={handleNewChat}
      />
    </>
  );
}
