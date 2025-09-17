# Replit.md

## Overview

This is a real-time chat messenger application built with React and Express.js. The application provides instant messaging capabilities with support for text messages, location sharing, and typing indicators. Users can register, log in, create conversations, and communicate in real-time through WebSocket connections.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React with TypeScript for type safety and modern development
- **Styling**: Tailwind CSS with shadcn/ui component library for consistent, professional UI components
- **State Management**: TanStack Query for server state management and caching
- **Routing**: Wouter for lightweight client-side routing
- **Build Tool**: Vite for fast development and optimized production builds
- **Real-time Communication**: WebSocket integration for live messaging and presence indicators

### Backend Architecture
- **Framework**: Express.js with TypeScript for type-safe server development
- **Session Management**: Express sessions with configurable storage for user authentication
- **Real-time Communication**: WebSocket server for instant messaging and user presence
- **Authentication**: Session-based authentication with bcrypt for password hashing
- **API Design**: RESTful API endpoints for user management, conversations, and messages

### Data Storage Solutions
- **ORM**: Drizzle ORM for type-safe database operations and schema management
- **Database**: PostgreSQL with Neon serverless database support
- **Schema**: Well-defined database schema with users, conversations, and messages tables
- **In-Memory Storage**: Development storage implementation for rapid prototyping

### Authentication and Authorization
- **Session-based Authentication**: Secure session management with configurable secrets
- **Password Security**: bcrypt hashing for secure password storage
- **Middleware Protection**: Route-level authentication middleware for protected endpoints
- **User Context**: React context for managing authentication state across components

### Real-time Features
- **WebSocket Integration**: Bidirectional communication for instant messaging
- **Typing Indicators**: Real-time typing status updates across conversations
- **Online Presence**: User online/offline status tracking and display
- **Message Delivery**: Instant message broadcasting to conversation participants

## External Dependencies

### Database Services
- **Neon Database**: Serverless PostgreSQL database for production deployment
- **Drizzle Kit**: Database migration and schema management tools

### UI Framework
- **Radix UI**: Accessible, unstyled UI primitives for building the component library
- **Tailwind CSS**: Utility-first CSS framework for rapid styling
- **Lucide React**: Icon library for consistent iconography

### Development Tools
- **TypeScript**: Static type checking for both frontend and backend
- **ESBuild**: Fast JavaScript bundler for production builds
- **Replit Integration**: Development environment plugins for enhanced debugging

### Third-party Libraries
- **TanStack Query**: Server state management and caching
- **React Hook Form**: Form handling with validation
- **Date-fns**: Date manipulation and formatting utilities
- **Class Variance Authority**: Type-safe utility for component variants

### WebSocket Infrastructure
- **ws**: WebSocket server implementation for real-time communication
- **Built-in WebSocket API**: Browser WebSocket client for frontend connectivity

### Session Storage
- **connect-pg-simple**: PostgreSQL session store for persistent sessions
- **express-session**: Session middleware for user authentication state