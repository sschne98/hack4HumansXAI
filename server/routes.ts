import type { Express } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import session from "express-session";
import { storage } from "./storage";
import { insertUserSchema, insertMessageSchema } from "@shared/schema";
import bcrypt from "bcrypt";
import { detectPIIWithAI, getAgeAppropriatePIIWarning } from "./ai-pii-detection";

interface AuthenticatedUser {
  id: string;
  email: string;
  displayName: string;
}

declare module "express-session" {
  interface SessionData {
    user?: AuthenticatedUser;
  }
}

interface WebSocketClient extends WebSocket {
  userId?: string;
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Session middleware
  app.use(session({
    secret: process.env.SESSION_SECRET || require('crypto').randomBytes(32).toString('hex'),
    resave: false,
    saveUninitialized: false,
    cookie: { secure: false, maxAge: 24 * 60 * 60 * 1000 } // 24 hours
  }));

  // Authentication middleware
  const requireAuth = (req: any, res: any, next: any) => {
    if (!req.session.user) {
      return res.status(401).json({ message: "Authentication required" });
    }
    next();
  };

  // Auth routes
  app.post("/api/auth/register", async (req, res) => {
    try {
      const userData = insertUserSchema.parse(req.body);
      
      // Check if user already exists
      const existingUser = await storage.getUserByEmail(userData.email);
      if (existingUser) {
        return res.status(400).json({ message: "User already exists" });
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(userData.password, 10);
      const user = await storage.createUser({
        ...userData,
        password: hashedPassword,
      });

      // Remove password from response
      const { password, ...userResponse } = user;
      req.session.user = {
        id: user.id,
        email: user.email,
        displayName: user.displayName,
      };

      res.json(userResponse);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.post("/api/auth/login", async (req, res) => {
    try {
      const { email, password } = req.body;
      
      const user = await storage.getUserByEmail(email);
      if (!user) {
        return res.status(401).json({ message: "Invalid credentials" });
      }

      const isValid = await bcrypt.compare(password, user.password);
      if (!isValid) {
        return res.status(401).json({ message: "Invalid credentials" });
      }

      // Set user online
      await storage.setUserOnlineStatus(user.id, true);

      req.session.user = {
        id: user.id,
        email: user.email,
        displayName: user.displayName,
      };

      const { password: _, ...userResponse } = user;
      res.json(userResponse);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.post("/api/auth/logout", requireAuth, async (req, res) => {
    const userId = req.session.user!.id;
    await storage.setUserOnlineStatus(userId, false);
    
    req.session.destroy((err) => {
      if (err) {
        return res.status(500).json({ message: "Could not log out" });
      }
      res.json({ message: "Logged out successfully" });
    });
  });

  app.get("/api/auth/me", requireAuth, async (req, res) => {
    const user = await storage.getUser(req.session.user!.id);
    if (user) {
      const { password, ...userResponse } = user;
      res.json(userResponse);
    } else {
      res.status(404).json({ message: "User not found" });
    }
  });

  // User routes
  app.get("/api/users", requireAuth, async (req, res) => {
    const users = await storage.getAllUsers();
    const usersWithoutPasswords = users.map(({ password, ...user }) => user);
    res.json(usersWithoutPasswords);
  });

  app.put("/api/users/profile", requireAuth, async (req, res) => {
    try {
      const userId = req.session.user!.id;
      const updates = req.body;
      
      const updatedUser = await storage.updateUser(userId, updates);
      if (updatedUser) {
        const { password, ...userResponse } = updatedUser;
        res.json(userResponse);
      } else {
        res.status(404).json({ message: "User not found" });
      }
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  // Conversation routes
  app.get("/api/conversations", requireAuth, async (req, res) => {
    const userId = req.session.user!.id;
    const conversations = await storage.getUserConversations(userId);
    res.json(conversations);
  });

  app.post("/api/conversations", requireAuth, async (req, res) => {
    try {
      const userId = req.session.user!.id;
      const { participantId } = req.body;
      
      console.log(`Creating conversation between ${userId} and ${participantId}`);
      
      // Validate that both users exist
      const currentUser = await storage.getUser(userId);
      const otherUser = await storage.getUser(participantId);
      
      if (!currentUser || !otherUser) {
        return res.status(400).json({ message: "One or both users not found" });
      }
      
      const conversation = await storage.findOrCreateDirectConversation(userId, participantId);
      console.log(`Created conversation:`, conversation);
      res.json(conversation);
    } catch (error: any) {
      console.error('Conversation creation error:', error);
      res.status(400).json({ message: error.message });
    }
  });

  // Message routes
  app.get("/api/conversations/:id/messages", requireAuth, async (req, res) => {
    const conversationId = req.params.id;
    const messages = await storage.getConversationMessages(conversationId);
    res.json(messages);
  });

  app.post("/api/conversations/:id/messages", requireAuth, async (req, res) => {
    try {
      const conversationId = req.params.id;
      const userId = req.session.user!.id;
      
      console.log(`Creating message in conversation ${conversationId} from user ${userId}`);
      
      // Validate conversation exists
      const conversation = await storage.getConversation(conversationId);
      if (!conversation) {
        return res.status(404).json({ message: "Conversation not found" });
      }
      
      // Validate user is participant
      if (!conversation.participants.includes(userId)) {
        return res.status(403).json({ message: "User not a participant in this conversation" });
      }
      
      const messageData = insertMessageSchema.parse({
        ...req.body,
        conversationId,
        senderId: userId,
      });
      
      const newMessage = await storage.createMessage(messageData);
      const messageWithSender = {
        ...newMessage,
        sender: await storage.getUser(newMessage.senderId),
      };
      
      console.log(`Created message:`, newMessage);
      res.json(messageWithSender);
    } catch (error: any) {
      console.error('Message creation error:', error);
      res.status(400).json({ message: error.message });
    }
  });

  const httpServer = createServer(app);

  // WebSocket server
  const wss = new WebSocketServer({ server: httpServer, path: '/ws' });
  const clients = new Map<string, WebSocketClient>();

  wss.on('connection', (ws: WebSocketClient, request) => {
    ws.on('message', async (data) => {
      try {
        const message = JSON.parse(data.toString());
        
        switch (message.type) {
          case 'auth':
            // Authenticate WebSocket connection
            ws.userId = message.userId;
            clients.set(message.userId, ws);
            await storage.setUserOnlineStatus(message.userId, true);
            
            // Broadcast online status
            broadcastUserStatus(message.userId, true);
            break;
            
          case 'message':
            // Handle new message
            const newMessage = await storage.createMessage({
              conversationId: message.conversationId,
              senderId: message.senderId,
              content: message.content,
              messageType: message.messageType || 'text',
              metadata: message.metadata,
            });
            
            const messageWithSender = {
              ...newMessage,
              sender: await storage.getUser(newMessage.senderId),
            };
            
            // Send to all participants
            const conversation = await storage.getConversation(message.conversationId);
            if (conversation) {
              conversation.participants.forEach(participantId => {
                const client = clients.get(participantId);
                if (client && client.readyState === WebSocket.OPEN) {
                  client.send(JSON.stringify({
                    type: 'message',
                    data: messageWithSender,
                  }));
                }
              });
            }
            break;
            
          case 'typing':
            // Handle typing indicators
            const conv = await storage.getConversation(message.conversationId);
            if (conv) {
              conv.participants
                .filter(id => id !== message.senderId)
                .forEach(participantId => {
                  const client = clients.get(participantId);
                  if (client && client.readyState === WebSocket.OPEN) {
                    client.send(JSON.stringify({
                      type: 'typing',
                      conversationId: message.conversationId,
                      senderId: message.senderId,
                      isTyping: message.isTyping,
                    }));
                  }
                });
            }
            break;
        }
      } catch (error) {
        console.error('WebSocket message error:', error);
      }
    });

    ws.on('close', async () => {
      if (ws.userId) {
        clients.delete(ws.userId);
        await storage.setUserOnlineStatus(ws.userId, false);
        broadcastUserStatus(ws.userId, false);
      }
    });
  });

  function broadcastUserStatus(userId: string, isOnline: boolean) {
    clients.forEach((client, clientId) => {
      if (clientId !== userId && client.readyState === WebSocket.OPEN) {
        client.send(JSON.stringify({
          type: 'userStatus',
          userId,
          isOnline,
        }));
      }
    });
  }

  // PII Detection endpoint
  app.post('/api/detect-pii', requireAuth, async (req, res) => {
    try {
      const { text, userAge } = req.body;
      
      if (!text || typeof text !== 'string') {
        return res.status(400).json({ error: 'Text is required' });
      }

      const piiResult = await detectPIIWithAI(text);
      
      let warning = null;
      if (piiResult.hasPII) {
        warning = getAgeAppropriatePIIWarning(userAge, piiResult.detectedTypes);
      }

      res.json({
        ...piiResult,
        warning
      });
    } catch (error) {
      console.error('PII detection error:', error);
      res.status(500).json({ error: 'PII detection failed' });
    }
  });


  return httpServer;
}
