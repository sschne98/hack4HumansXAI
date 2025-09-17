import { useState, useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/lib/auth';
import { useWebSocket } from '@/hooks/use-websocket';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { OnlineStatus } from '@/components/ui/online-status';
import { Send, Paperclip, MapPin, Mic, Video, Phone, Info, CheckCheck, MessageSquare } from 'lucide-react';
import LocationModal from './location-modal';
import PIIWarningModal from './pii-warning-modal';
import { detectPII, getAgeAppropriatePIIWarning } from '@/lib/pii-detection';
import type { MessageWithSender, ConversationWithLastMessage } from '@shared/schema';

interface ChatAreaProps {
  conversationId?: string;
}

export default function ChatArea({ conversationId }: ChatAreaProps) {
  const { user } = useAuth();
  const { sendMessage, sendTypingIndicator, typingUsers } = useWebSocket();
  const [message, setMessage] = useState('');
  const [showLocationModal, setShowLocationModal] = useState(false);
  const [showPIIWarning, setShowPIIWarning] = useState(false);
  const [pendingMessage, setPendingMessage] = useState('');
  const [piiWarningData, setPIIWarningData] = useState<{ title: string; message: string } | null>(null);
  const [typingTimeout, setTypingTimeout] = useState<NodeJS.Timeout | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const { data: conversations = [] } = useQuery<ConversationWithLastMessage[]>({
    queryKey: ['/api/conversations'],
  });

  const { data: messages = [] } = useQuery<MessageWithSender[]>({
    queryKey: ['/api/conversations', conversationId, 'messages'],
    enabled: !!conversationId,
  });

  const activeConversation = conversations.find(c => c.id === conversationId);
  const conversationTypingUsers = conversationId ? typingUsers[conversationId] : new Set();
  const otherUsersTyping = Array.from(conversationTypingUsers || []).filter(id => id !== user?.id);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim() || !conversationId || !user) return;

    // Check for PII in the message
    const piiResult = detectPII(message.trim());
    
    if (piiResult.hasPII) {
      const warning = getAgeAppropriatePIIWarning(user.age, piiResult.detectedTypes);
      if (warning) {
        setPendingMessage(message.trim());
        setPIIWarningData(warning);
        setShowPIIWarning(true);
        return;
      }
    }

    // Send message if no PII detected
    sendMessageNow(message.trim());
  };

  const sendMessageNow = (messageText: string) => {
    sendMessage(conversationId!, messageText);
    setMessage('');
    setPendingMessage('');

    // Stop typing indicator
    if (typingTimeout) {
      clearTimeout(typingTimeout);
      setTypingTimeout(null);
    }
    sendTypingIndicator(conversationId!, false);
  };

  const handlePIIWarningContinue = () => {
    setShowPIIWarning(false);
    sendMessageNow(pendingMessage);
    setPIIWarningData(null);
  };

  const handlePIIWarningAbort = () => {
    setShowPIIWarning(false);
    setPendingMessage('');
    setPIIWarningData(null);
  };

  const handleTyping = (value: string) => {
    setMessage(value);
    
    if (!conversationId || !user) return;

    // Clear existing timeout
    if (typingTimeout) {
      clearTimeout(typingTimeout);
    }

    // Send typing indicator if we have content
    if (value.trim()) {
      sendTypingIndicator(conversationId, true);

      // Set timeout to stop typing indicator
      const timeout = setTimeout(() => {
        sendTypingIndicator(conversationId, false);
        setTypingTimeout(null);
      }, 1000);
      
      setTypingTimeout(timeout);
    } else {
      // Stop typing indicator immediately if input is empty
      sendTypingIndicator(conversationId, false);
    }
  };

  const handleShareLocation = (location: { lat: number; lng: number; address: string }) => {
    if (!conversationId) return;
    
    sendMessage(
      conversationId,
      `📍 Shared location: ${location.address}`,
      'location',
      { latitude: location.lat, longitude: location.lng, address: location.address }
    );
    setShowLocationModal(false);
  };

  const formatTime = (dateString: string | undefined) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', { 
      hour: 'numeric', 
      minute: '2-digit',
      hour12: true 
    });
  };

  const getConversationName = (conversation: ConversationWithLastMessage) => {
    if (conversation.name) return conversation.name;
    if (conversation.otherParticipants.length === 1) {
      return conversation.otherParticipants[0].displayName;
    }
    return conversation.otherParticipants.map(u => u.displayName).join(', ');
  };

  const getConversationStatus = (conversation: ConversationWithLastMessage) => {
    if (conversation.isGroup) {
      return `Group • ${conversation.participants.length} members`;
    }
    if (conversation.otherParticipants.length === 1) {
      const participant = conversation.otherParticipants[0];
      if (participant.isOnline) {
        return 'Online • Last seen now';
      }
      return `Last seen ${formatTime(participant.lastSeen?.toString())}`;
    }
    return '';
  };

  if (!conversationId || !activeConversation) {
    return (
      <div className="flex-1 flex items-center justify-center bg-muted/20" data-testid="chat-empty-state">
        <div className="text-center">
          <div className="w-24 h-24 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
            <MessageSquare className="h-12 w-12 text-muted-foreground" />
          </div>
          <h3 className="text-xl font-semibold text-foreground mb-2">
            Select a conversation
          </h3>
          <p className="text-muted-foreground">
            Choose a conversation from the sidebar to start messaging
          </p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="flex-1 flex flex-col" data-testid="chat-area">
        {/* Chat Header */}
        <div className="p-4 border-b border-border bg-card">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              {activeConversation.isGroup ? (
                <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center">
                  <Info className="h-5 w-5 text-white" />
                </div>
              ) : (
                <div className="relative">
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={activeConversation.otherParticipants[0]?.avatar || undefined} />
                    <AvatarFallback>
                      {activeConversation.otherParticipants[0]?.displayName.split(' ').map(n => n[0]).join('').toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <OnlineStatus 
                    isOnline={activeConversation.otherParticipants[0]?.isOnline || false}
                    className="absolute -bottom-1 -right-1"
                  />
                </div>
              )}
              
              <div>
                <h3 className="font-semibold text-foreground">
                  {getConversationName(activeConversation)}
                </h3>
                <p className="text-sm text-primary">
                  {getConversationStatus(activeConversation)}
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <Button variant="ghost" size="icon" data-testid="button-video-call">
                <Video className="h-5 w-5" />
              </Button>
              <Button variant="ghost" size="icon" data-testid="button-voice-call">
                <Phone className="h-5 w-5" />
              </Button>
              <Button variant="ghost" size="icon" data-testid="button-chat-info">
                <Info className="h-5 w-5" />
              </Button>
            </div>
          </div>
        </div>

        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-muted/20" data-testid="messages-area">
          {messages.map((msg) => {
            const isOwnMessage = msg.senderId === user?.id;
            
            return (
              <div
                key={msg.id}
                className={`flex items-start space-x-3 ${isOwnMessage ? 'justify-end' : ''}`}
                data-testid={`message-${msg.id}`}
              >
                {!isOwnMessage && (
                  <Avatar className="w-8 h-8">
                    <AvatarImage src={msg.sender.avatar || undefined} />
                    <AvatarFallback className="text-xs">
                      {msg.sender.displayName.split(' ').map(n => n[0]).join('').toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                )}

                <div className="message-bubble">
                  <div className={`rounded-xl px-4 py-2 shadow-sm ${
                    isOwnMessage 
                      ? 'bg-primary text-white' 
                      : 'bg-white border border-border'
                  }`}>
                    {msg.messageType === 'location' && msg.metadata ? (
                      <div className="space-y-2">
                        <div className="flex items-center space-x-2">
                          <MapPin className={`h-4 w-4 ${isOwnMessage ? 'text-white' : 'text-primary'}`} />
                          <span className="text-sm font-medium">Location Shared</span>
                        </div>
                        <div className={`text-sm ${isOwnMessage ? 'text-white/90' : 'text-muted-foreground'}`}>
                          {(msg.metadata as any)?.address || 'Location shared'}
                        </div>
                        <Button 
                          variant={isOwnMessage ? "ghost" : "outline"}
                          size="sm" 
                          className={`text-xs ${
                            isOwnMessage 
                              ? 'text-white hover:bg-white/20' 
                              : 'text-primary hover:bg-primary/10'
                          }`}
                          onClick={() => window.open(
                            `https://maps.google.com/?q=${(msg.metadata as any)?.latitude},${(msg.metadata as any)?.longitude}`,
                            '_blank'
                          )}
                        >
                          Open in Maps
                        </Button>
                      </div>
                    ) : (
                      <p className={isOwnMessage ? 'text-white' : 'text-foreground'}>
                        {msg.content}
                      </p>
                    )}
                  </div>
                  
                  <div className={`flex items-center space-x-1 mt-1 ${
                    isOwnMessage ? 'justify-end' : ''
                  }`}>
                    <p className="text-xs text-muted-foreground">
                      {formatTime(msg.createdAt?.toString())}
                    </p>
                    {isOwnMessage && (
                      <CheckCheck className="h-3 w-3 text-primary" />
                    )}
                  </div>
                </div>
              </div>
            );
          })}

          {/* Typing Indicator */}
          {otherUsersTyping.length > 0 && (
            <div className="flex items-start space-x-3" data-testid="typing-indicator">
              <Avatar className="w-8 h-8">
                <AvatarFallback className="text-xs">...</AvatarFallback>
              </Avatar>
              <div className="bg-white rounded-xl px-4 py-3 shadow-sm border border-border">
                <div className="typing-indicator">
                  <div className="typing-dot"></div>
                  <div className="typing-dot"></div>
                  <div className="typing-dot"></div>
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Message Input */}
        <div className="p-4 border-t border-border bg-card">
          <form onSubmit={handleSendMessage} className="flex items-center space-x-3">
            <Button 
              type="button" 
              variant="ghost" 
              size="icon"
              data-testid="button-attach-file"
            >
              <Paperclip className="h-5 w-5" />
            </Button>
            
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => setShowLocationModal(true)}
              data-testid="button-share-location"
            >
              <MapPin className="h-5 w-5" />
            </Button>

            <div className="flex-1 relative">
              <Input
                type="text"
                placeholder="Type your message..."
                value={message}
                onChange={(e) => handleTyping(e.target.value)}
                className="message-input"
                data-testid="input-message"
              />
            </div>

            <Button 
              type="button" 
              variant="ghost" 
              size="icon"
              data-testid="button-voice-message"
            >
              <Mic className="h-5 w-5" />
            </Button>

            <Button 
              type="submit" 
              className="telekom-gradient text-white hover:opacity-90 transition-opacity"
              disabled={!message.trim()}
              data-testid="button-send-message"
            >
              <Send className="h-4 w-4" />
            </Button>
          </form>
        </div>
      </div>

      <LocationModal
        open={showLocationModal}
        onClose={() => setShowLocationModal(false)}
        onShareLocation={handleShareLocation}
      />

      {piiWarningData && (
        <PIIWarningModal
          open={showPIIWarning}
          onClose={handlePIIWarningAbort}
          onContinue={handlePIIWarningContinue}
          title={piiWarningData.title}
          message={piiWarningData.message}
        />
      )}
    </>
  );
}
