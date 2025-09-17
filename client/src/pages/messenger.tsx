import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth';
import { useLocation } from 'wouter';
import { useWebSocket } from '@/hooks/use-websocket';
import Sidebar from '@/components/sidebar';
import ChatArea from '@/components/chat-area';

export default function MessengerPage() {
  const { user, isLoading } = useAuth();
  const [, setLocation] = useLocation();
  const { isConnected } = useWebSocket();
  const [selectedConversationId, setSelectedConversationId] = useState<string | undefined>();

  useEffect(() => {
    if (!isLoading && !user) {
      setLocation('/');
    }
  }, [user, isLoading, setLocation]);

  if (isLoading) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="h-screen flex" data-testid="messenger-app">
      {!isConnected && (
        <div className="fixed top-0 left-0 right-0 bg-yellow-500 text-white px-4 py-2 text-center z-50">
          Connecting to chat server...
        </div>
      )}
      
      <Sidebar 
        selectedConversationId={selectedConversationId}
        onSelectConversation={setSelectedConversationId}
      />
      <ChatArea conversationId={selectedConversationId} />
    </div>
  );
}
