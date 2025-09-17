import { useEffect, useRef, useState } from 'react';
import { useAuth } from '@/lib/auth';
import { useQueryClient } from '@tanstack/react-query';
import type { MessageWithSender } from '@shared/schema';

interface WebSocketMessage {
  type: string;
  data?: any;
  conversationId?: string;
  senderId?: string;
  isTyping?: boolean;
  userId?: string;
  isOnline?: boolean;
}

export function useWebSocket() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const wsRef = useRef<WebSocket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [typingUsers, setTypingUsers] = useState<Record<string, Set<string>>>({});

  useEffect(() => {
    if (!user) return;

    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = `${protocol}//${window.location.host}/ws`;
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      setIsConnected(true);
      // Authenticate WebSocket connection
      ws.send(JSON.stringify({
        type: 'auth',
        userId: user.id,
      }));
    };

    ws.onmessage = (event) => {
      try {
        const message: WebSocketMessage = JSON.parse(event.data);
        
        switch (message.type) {
          case 'message':
            // Add new message to cache
            queryClient.setQueryData<MessageWithSender[]>(
              ['/api/conversations', message.data.conversationId, 'messages'],
              (old = []) => [...old, message.data]
            );
            
            // Invalidate conversations to update last message
            queryClient.invalidateQueries({
              queryKey: ['/api/conversations']
            });
            break;

          case 'typing':
            if (message.conversationId && message.senderId) {
              setTypingUsers(prev => {
                const newState = { ...prev };
                if (!newState[message.conversationId!]) {
                  newState[message.conversationId!] = new Set();
                }
                
                if (message.isTyping) {
                  newState[message.conversationId!].add(message.senderId!);
                } else {
                  newState[message.conversationId!].delete(message.senderId!);
                }
                
                return newState;
              });
            }
            break;

          case 'userStatus':
            // Update user online status in cache
            queryClient.setQueryData<any[]>(
              ['/api/users'],
              (old = []) => old.map(u => 
                u.id === message.userId 
                  ? { ...u, isOnline: message.isOnline }
                  : u
              )
            );
            break;
        }
      } catch (error) {
        console.error('Error parsing WebSocket message:', error);
      }
    };

    ws.onclose = () => {
      setIsConnected(false);
    };

    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
      setIsConnected(false);
    };

    return () => {
      ws.close();
      wsRef.current = null;
    };
  }, [user, queryClient]);

  const sendMessage = (conversationId: string, content: string, messageType = 'text', metadata?: any) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN && user) {
      wsRef.current.send(JSON.stringify({
        type: 'message',
        conversationId,
        senderId: user.id,
        content,
        messageType,
        metadata,
      }));
    }
  };

  const sendTypingIndicator = (conversationId: string, isTyping: boolean) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN && user) {
      wsRef.current.send(JSON.stringify({
        type: 'typing',
        conversationId,
        senderId: user.id,
        isTyping,
      }));
    }
  };

  return {
    isConnected,
    sendMessage,
    sendTypingIndicator,
    typingUsers,
  };
}
