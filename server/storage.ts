import { type User, type InsertUser, type Conversation, type InsertConversation, type Message, type InsertMessage, type ConversationWithLastMessage, type MessageWithSender } from "@shared/schema";
import { randomUUID } from "crypto";

export interface IStorage {
  // User methods
  getUser(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: string, updates: Partial<User>): Promise<User | undefined>;
  getAllUsers(): Promise<User[]>;
  setUserOnlineStatus(id: string, isOnline: boolean): Promise<void>;

  // Conversation methods
  getConversation(id: string): Promise<Conversation | undefined>;
  createConversation(conversation: InsertConversation): Promise<Conversation>;
  getUserConversations(userId: string): Promise<ConversationWithLastMessage[]>;
  findOrCreateDirectConversation(userId1: string, userId2: string): Promise<Conversation>;

  // Message methods
  getMessage(id: string): Promise<Message | undefined>;
  createMessage(message: InsertMessage): Promise<Message>;
  getConversationMessages(conversationId: string, limit?: number): Promise<MessageWithSender[]>;
  getUnreadMessageCount(conversationId: string, userId: string): Promise<number>;
}

export class MemStorage implements IStorage {
  private users: Map<string, User>;
  private conversations: Map<string, Conversation>;
  private messages: Map<string, Message>;

  constructor() {
    this.users = new Map();
    this.conversations = new Map();
    this.messages = new Map();
  }

  // User methods
  async getUser(id: string): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(user => user.email === email);
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = randomUUID();
    const user: User = {
      ...insertUser,
      id,
      avatar: insertUser.avatar || null,
      statusMessage: insertUser.statusMessage || "Available",
      isOnline: false,
      lastSeen: new Date(),
      createdAt: new Date(),
    };
    this.users.set(id, user);
    return user;
  }

  async updateUser(id: string, updates: Partial<User>): Promise<User | undefined> {
    const user = this.users.get(id);
    if (!user) return undefined;
    
    const updatedUser = { ...user, ...updates };
    this.users.set(id, updatedUser);
    return updatedUser;
  }

  async getAllUsers(): Promise<User[]> {
    return Array.from(this.users.values());
  }

  async setUserOnlineStatus(id: string, isOnline: boolean): Promise<void> {
    const user = this.users.get(id);
    if (user) {
      user.isOnline = isOnline;
      user.lastSeen = new Date();
      this.users.set(id, user);
    }
  }

  // Conversation methods
  async getConversation(id: string): Promise<Conversation | undefined> {
    return this.conversations.get(id);
  }

  async createConversation(insertConversation: InsertConversation): Promise<Conversation> {
    const id = randomUUID();
    const conversation: Conversation = {
      ...insertConversation,
      id,
      name: insertConversation.name || null,
      isGroup: insertConversation.isGroup || false,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.conversations.set(id, conversation);
    return conversation;
  }

  async getUserConversations(userId: string): Promise<ConversationWithLastMessage[]> {
    const userConversations = Array.from(this.conversations.values())
      .filter(conv => conv.participants.includes(userId));

    const result: ConversationWithLastMessage[] = [];

    for (const conversation of userConversations) {
      const messages = Array.from(this.messages.values())
        .filter(msg => msg.conversationId === conversation.id)
        .sort((a, b) => new Date(b.createdAt!).getTime() - new Date(a.createdAt!).getTime());

      const lastMessage = messages[0];
      const unreadCount = await this.getUnreadMessageCount(conversation.id, userId);
      
      const otherParticipants = (await Promise.all(
        conversation.participants
          .filter(id => id !== userId)
          .map(id => this.getUser(id))
      )).filter(Boolean) as User[];

      result.push({
        ...conversation,
        lastMessage,
        unreadCount,
        otherParticipants,
      });
    }

    return result.sort((a, b) => {
      const aTime = a.lastMessage?.createdAt ? new Date(a.lastMessage.createdAt).getTime() : 0;
      const bTime = b.lastMessage?.createdAt ? new Date(b.lastMessage.createdAt).getTime() : 0;
      return bTime - aTime;
    });
  }

  async findOrCreateDirectConversation(userId1: string, userId2: string): Promise<Conversation> {
    const existing = Array.from(this.conversations.values()).find(conv => 
      !conv.isGroup && 
      conv.participants.length === 2 &&
      conv.participants.includes(userId1) && 
      conv.participants.includes(userId2)
    );

    if (existing) return existing;

    return this.createConversation({
      participants: [userId1, userId2],
      isGroup: false,
    });
  }

  // Message methods
  async getMessage(id: string): Promise<Message | undefined> {
    return this.messages.get(id);
  }

  async createMessage(insertMessage: InsertMessage): Promise<Message> {
    const id = randomUUID();
    const message: Message = {
      ...insertMessage,
      id,
      messageType: insertMessage.messageType || "text",
      metadata: insertMessage.metadata || null,
      createdAt: new Date(),
    };
    this.messages.set(id, message);

    // Update conversation timestamp
    const conversation = this.conversations.get(message.conversationId);
    if (conversation) {
      conversation.updatedAt = new Date();
      this.conversations.set(conversation.id, conversation);
    }

    return message;
  }

  async getConversationMessages(conversationId: string, limit = 50): Promise<MessageWithSender[]> {
    const messages = Array.from(this.messages.values())
      .filter(msg => msg.conversationId === conversationId)
      .sort((a, b) => new Date(a.createdAt!).getTime() - new Date(b.createdAt!).getTime())
      .slice(-limit);

    const result: MessageWithSender[] = [];
    for (const message of messages) {
      const sender = await this.getUser(message.senderId);
      if (sender) {
        result.push({ ...message, sender });
      }
    }

    return result;
  }

  async getUnreadMessageCount(conversationId: string, userId: string): Promise<number> {
    // For simplicity, we'll return 0 for now
    // In a real app, you'd track read receipts
    return 0;
  }
}

export const storage = new MemStorage();
