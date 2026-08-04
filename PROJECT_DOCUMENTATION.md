# Game Server Administration Panel - Complete Documentation

## Overview

The **Game Server Administration Panel** is a comprehensive, production-ready web application for managing game servers. Built with **Node.js**, **Express**, **SQLite**, and **Bootstrap** (via Tailwind CSS), it features a stunning **neon-noir cinematographic design** with hot pink titles, electric blue accents, and a deep midnight blue background.

The system provides complete server management capabilities including authentication, role-based access control, real-time status monitoring, activity logging, and comprehensive API documentation.

---

## Technology Stack

| Component | Technology | Version |
|-----------|-----------|---------|
| **Frontend** | React 19 + Tailwind CSS 4 | Latest |
| **Backend** | Node.js + Express 4 | Latest |
| **API Layer** | tRPC 11 | Latest |
| **Database** | SQLite (via Drizzle ORM) | Latest |
| **Authentication** | Manus OAuth | Integrated |
| **Build Tool** | Vite | Latest |
| **UI Components** | shadcn/ui | Latest |

---

## Features Implemented

### ✅ Authentication & Authorization
- **Manus OAuth Integration**: Secure, passwordless authentication
- **Role-Based Access Control**: Admin and User roles
- **Session Management**: Automatic session handling with cookies
- **Protected Routes**: All dashboard routes require authentication

### ✅ Dashboard & Statistics
- **Real-time Statistics**: Total servers, online servers, active users, player utilization
- **Server Status Overview**: Visual breakdown of server states (online, offline, maintenance, error)
- **Player Statistics**: Current players, capacity, utilization percentage
- **Recent Activity Feed**: Latest server events and user actions

### ✅ Server Management
- **List All Servers**: Browse all configured game servers with search functionality
- **Create Servers**: Add new game servers with custom configuration
- **Edit Servers**: Modify server settings (name, region, max players, etc.)
- **Delete Servers**: Remove servers with confirmation dialog
- **Server Controls**: Start, stop, and restart servers with one click
- **Server Details**: View detailed server information and configuration

### ✅ User Management (Admin Only)
- **User Directory**: List all registered users with detailed information
- **Role Management**: Promote users to admin or demote to regular users
- **Account Control**: Enable/disable user accounts
- **User Statistics**: Track total users, admins, active accounts, and disabled accounts
- **Search & Filter**: Find users by name or email

### ✅ Activity Logging
- **Comprehensive Logging**: All server actions and user activities are logged
- **Detailed Records**: Timestamp, action type, description, user, and affected server
- **Filtering**: Filter logs by action type
- **Export Functionality**: Export logs as JSON or CSV
- **Activity Summary**: Statistics on different action types

### ✅ API Documentation
- **Complete tRPC Reference**: All procedures documented with descriptions
- **Input/Output Schemas**: Clear specification of expected data formats
- **Usage Examples**: Code examples for each endpoint
- **Error Codes**: Comprehensive error handling documentation
- **Response Format**: Standard response structure documentation

### ✅ Design & UX
- **Neon-Noir Aesthetic**: 
  - Deep midnight blue background (oklch(0.08 0.01 280))
  - Hot pink titles with electric blue glow (oklch(0.65 0.3 320))
  - Electric blue accents (oklch(0.65 0.3 290))
  - Cyan and magenta accent lines
- **Responsive Design**: Mobile-first approach with Tailwind CSS
- **Status Indicators**: Visual indicators for server status (online, offline, maintenance)
- **Smooth Animations**: Pulsing status indicators and hover effects
- **Accessibility**: Semantic HTML, keyboard navigation, focus states

---

## Database Schema

### Users Table
```sql
CREATE TABLE users (
  id INT PRIMARY KEY AUTO_INCREMENT,
  openId VARCHAR(64) UNIQUE NOT NULL,
  name TEXT,
  email VARCHAR(320),
  loginMethod VARCHAR(64),
  role ENUM('admin', 'user') DEFAULT 'user',
  isDisabled BOOLEAN DEFAULT FALSE,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  lastSignedIn TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### Game Servers Table
```sql
CREATE TABLE gameServers (
  id INT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(255) NOT NULL,
  gameType VARCHAR(100),
  ipAddress VARCHAR(45),
  port INT,
  maxPlayers INT,
  currentPlayers INT DEFAULT 0,
  region VARCHAR(100),
  status ENUM('online', 'offline', 'maintenance', 'error') DEFAULT 'offline',
  description TEXT,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
```

### Activity Logs Table
```sql
CREATE TABLE activityLogs (
  id INT PRIMARY KEY AUTO_INCREMENT,
  serverId INT,
  userId INT,
  action VARCHAR(50),
  description TEXT,
  oldValue JSON,
  newValue JSON,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (serverId) REFERENCES gameServers(id),
  FOREIGN KEY (userId) REFERENCES users(id)
);
```

### Server Configurations Table
```sql
CREATE TABLE serverConfigs (
  id INT PRIMARY KEY AUTO_INCREMENT,
  serverId INT NOT NULL,
  key VARCHAR(255) NOT NULL,
  value TEXT,
  description TEXT,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (serverId) REFERENCES gameServers(id)
);
```

### Database Backups Table
```sql
CREATE TABLE databaseBackups (
  id INT PRIMARY KEY AUTO_INCREMENT,
  backupName VARCHAR(255) NOT NULL,
  backupSize DECIMAL(10, 2),
  backupPath VARCHAR(500),
  createdBy INT,
  description TEXT,
  restoredAt TIMESTAMP,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (createdBy) REFERENCES users(id)
);
```

### User Sessions Table
```sql
CREATE TABLE userSessions (
  id INT PRIMARY KEY AUTO_INCREMENT,
  userId INT NOT NULL,
  sessionToken VARCHAR(500),
  ipAddress VARCHAR(45),
  userAgent TEXT,
  lastActivity TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  expiresAt TIMESTAMP,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (userId) REFERENCES users(id)
);
```

---

## API Documentation

### Authentication Procedures

#### `auth.me`
**Type**: Query  
**Description**: Get current user profile  
**Input**: `{}`  
**Output**: `User | null`  
**Example**:
```typescript
const { data: user } = trpc.auth.me.useQuery();
```

#### `auth.logout`
**Type**: Mutation  
**Description**: Logout current user  
**Input**: `{}`  
**Output**: `{ success: true }`  
**Example**:
```typescript
const logout = trpc.auth.logout.useMutation();
await logout.mutateAsync();
```

---

### Dashboard Procedures

#### `dashboard.getStats`
**Type**: Query  
**Description**: Get overall dashboard statistics  
**Input**: `{}`  
**Output**:
```typescript
{
  totalServers: number;
  onlineServers: number;
  totalUsers: number;
  recentActivity: ActivityLog[];
}
```

#### `dashboard.getServerStats`
**Type**: Query  
**Description**: Get server status distribution  
**Input**: `{}`  
**Output**:
```typescript
{
  online: number;
  offline: number;
  maintenance: number;
  error: number;
  total: number;
}
```

#### `dashboard.getPlayerStats`
**Type**: Query  
**Description**: Get player statistics  
**Input**: `{}`  
**Output**:
```typescript
{
  totalPlayers: number;
  totalCapacity: number;
  utilizationPercentage: number;
  serverCount: number;
}
```

---

### Server Management Procedures

#### `servers.list`
**Type**: Query  
**Description**: List all game servers  
**Input**: `{ limit?: number, offset?: number }`  
**Output**: `GameServer[]`  
**Example**:
```typescript
const { data: servers } = trpc.servers.list.useQuery({ limit: 50 });
```

#### `servers.getById`
**Type**: Query  
**Description**: Get a specific server by ID  
**Input**: `{ id: number }`  
**Output**: `GameServer`

#### `servers.create`
**Type**: Mutation  
**Description**: Create a new game server (admin only)  
**Input**:
```typescript
{
  name: string;
  gameType: string;
  ipAddress: string;
  port: number;
  maxPlayers: number;
  region: string;
  description?: string;
}
```
**Output**: `{ success: true, serverId: number }`

#### `servers.update`
**Type**: Mutation  
**Description**: Update server configuration (admin only)  
**Input**:
```typescript
{
  id: number;
  name?: string;
  gameType?: string;
  maxPlayers?: number;
  region?: string;
  description?: string;
}
```
**Output**: `{ success: true }`

#### `servers.delete`
**Type**: Mutation  
**Description**: Delete a game server (admin only)  
**Input**: `{ id: number }`  
**Output**: `{ success: true }`

#### `servers.start`
**Type**: Mutation  
**Description**: Start a game server (admin only)  
**Input**: `{ id: number }`  
**Output**: `{ success: true }`

#### `servers.stop`
**Type**: Mutation  
**Description**: Stop a game server (admin only)  
**Input**: `{ id: number }`  
**Output**: `{ success: true }`

#### `servers.restart`
**Type**: Mutation  
**Description**: Restart a game server (admin only)  
**Input**: `{ id: number }`  
**Output**: `{ success: true }`

---

### User Management Procedures

#### `users.me`
**Type**: Query  
**Description**: Get current user profile  
**Input**: `{}`  
**Output**: `User`

#### `users.list`
**Type**: Query  
**Description**: List all users (admin only)  
**Input**: `{ limit?: number, offset?: number }`  
**Output**: `User[]`

#### `users.updateRole`
**Type**: Mutation  
**Description**: Update user role (admin only)  
**Input**: `{ userId: number, role: 'admin' | 'user' }`  
**Output**: `{ success: true }`

#### `users.disable`
**Type**: Mutation  
**Description**: Disable user account (admin only)  
**Input**: `{ userId: number }`  
**Output**: `{ success: true }`

#### `users.enable`
**Type**: Mutation  
**Description**: Enable user account (admin only)  
**Input**: `{ userId: number }`  
**Output**: `{ success: true }`

---

### Activity Log Procedures

#### `logs.list`
**Type**: Query  
**Description**: List activity logs  
**Input**: `{ serverId?: number, limit?: number }`  
**Output**: `ActivityLog[]`

#### `logs.exportJSON`
**Type**: Query  
**Description**: Export logs as JSON  
**Input**: `{ limit?: number }`  
**Output**:
```typescript
{
  data: ActivityLog[];
  exportedAt: Date;
  format: 'json';
}
```

#### `logs.exportCSV`
**Type**: Query  
**Description**: Export logs as CSV  
**Input**: `{ limit?: number }`  
**Output**:
```typescript
{
  data: string;
  filename: string;
  format: 'csv';
}
```

---

### Configuration Procedures

#### `config.getServerConfig`
**Type**: Query  
**Description**: Get server configuration  
**Input**: `{ serverId: number }`  
**Output**: `ServerConfig[]`

#### `config.setServerConfig`
**Type**: Mutation  
**Description**: Set server configuration (admin only)  
**Input**:
```typescript
{
  serverId: number;
  key: string;
  value: string;
  description?: string;
}
```
**Output**: `{ success: true }`

---

### Backup Procedures

#### `backups.create`
**Type**: Mutation  
**Description**: Create a database backup (admin only)  
**Input**: `{ description?: string }`  
**Output**: `{ success: true, backupName: string }`

#### `backups.list`
**Type**: Query  
**Description**: List all backups (admin only)  
**Input**: `{ limit?: number, offset?: number }`  
**Output**: `DatabaseBackup[]`

#### `backups.restore`
**Type**: Mutation  
**Description**: Restore from a backup (admin only)  
**Input**: `{ backupId: number }`  
**Output**: `{ success: true }`

#### `backups.delete`
**Type**: Mutation  
**Description**: Delete a backup (admin only)  
**Input**: `{ id: number }`  
**Output**: `{ success: true }`

---

## Project Structure

```
game-admin-panel/
├── client/
│   ├── src/
│   │   ├── pages/
│   │   │   ├── Home.tsx              # Landing page
│   │   │   ├── Dashboard.tsx         # Main dashboard
│   │   │   ├── Servers.tsx           # Server management
│   │   │   ├── ActivityLogs.tsx      # Activity logs
│   │   │   ├── Users.tsx             # User management (admin)
│   │   │   ├── ApiDocs.tsx           # API documentation
│   │   │   └── NotFound.tsx          # 404 page
│   │   ├── components/
│   │   │   ├── DashboardLayout.tsx   # Main layout with sidebar
│   │   │   ├── ui/                   # shadcn/ui components
│   │   │   └── ...
│   │   ├── lib/
│   │   │   └── trpc.ts               # tRPC client
│   │   ├── App.tsx                   # Main app router
│   │   ├── index.css                 # Global styles with neon-noir
│   │   └── main.tsx                  # React entry point
│   ├── public/
│   │   └── index.html                # HTML template
│   └── package.json
├── server/
│   ├── routers/
│   │   ├── servers.ts                # Server management procedures
│   │   ├── users.ts                  # User management procedures
│   │   ├── logs.ts                   # Activity log procedures
│   │   ├── dashboard.ts              # Dashboard procedures
│   │   ├── config.ts                 # Configuration procedures
│   │   └── backups.ts                # Backup procedures
│   ├── db.ts                         # Database helpers
│   ├── routers.ts                    # Main router
│   ├── _core/                        # Framework core
│   │   ├── index.ts                  # Server entry point
│   │   ├── context.ts                # tRPC context
│   │   ├── trpc.ts                   # tRPC setup
│   │   └── ...
│   └── package.json
├── drizzle/
│   ├── schema.ts                     # Database schema
│   └── migrations/                   # Generated migrations
├── shared/
│   └── types.ts                      # Shared types
└── todo.md                           # Project tracking
```

---

## Running the Application

### Development

```bash
# Install dependencies
pnpm install

# Start development server
pnpm dev

# The app will be available at http://localhost:3000
```

### Building for Production

```bash
# Build the application
pnpm build

# Start production server
pnpm start
```

### Running Tests

```bash
# Run test suite
pnpm test
```

---

## Design System

### Color Palette (Neon-Noir)

| Color | OKLCH | Usage |
|-------|-------|-------|
| **Deep Midnight Blue** | `oklch(0.08 0.01 280)` | Background |
| **Hot Pink** | `oklch(0.65 0.3 320)` | Titles, primary accent |
| **Electric Blue** | `oklch(0.65 0.3 290)` | Primary buttons, glows |
| **Cyan** | `oklch(0.7 0.28 290)` | Status online, accents |
| **Magenta** | `oklch(0.65 0.3 320)` | Secondary accent |
| **Muted Blue** | `oklch(0.25 0.08 280)` | Borders, subtle elements |
| **Near White** | `oklch(0.95 0 0)` | Text, foreground |

### Typography

- **Titles**: Bold, sans-serif, letter-spacing: 0.05em
- **Body**: Regular, sans-serif, ample spacing
- **Code**: Monospace, dark background

### Effects

- **Neon Glow**: `text-shadow: 0 0 10px oklch(0.65 0.3 290), 0 0 20px oklch(0.65 0.3 290)`
- **Box Glow**: `box-shadow: 0 0 20px oklch(0.65 0.3 290 / 0.5)`
- **Pulsing Animation**: Smooth opacity animation for status indicators

---

## Security Features

### Authentication
- **Manus OAuth**: Secure, passwordless authentication
- **Session Cookies**: HTTP-only, secure cookies
- **CSRF Protection**: Built-in tRPC protection

### Authorization
- **Role-Based Access Control**: Admin and User roles
- **Protected Procedures**: All admin procedures require admin role
- **Route Protection**: Dashboard routes require authentication

### Data Protection
- **SQL Injection Prevention**: Parameterized queries via Drizzle ORM
- **XSS Prevention**: React escaping, sanitized inputs
- **CORS**: Configured for secure cross-origin requests

---

## Error Handling

### Error Codes

| Code | Meaning | HTTP Status |
|------|---------|------------|
| `UNAUTHORIZED` | User not authenticated | 401 |
| `FORBIDDEN` | Insufficient permissions | 403 |
| `NOT_FOUND` | Resource not found | 404 |
| `BAD_REQUEST` | Invalid input | 400 |
| `INTERNAL_SERVER_ERROR` | Server error | 500 |

### Error Response Format

```typescript
{
  error: {
    code: "UNAUTHORIZED" | "FORBIDDEN" | "NOT_FOUND" | "BAD_REQUEST",
    message: "Error description"
  }
}
```

---

## Performance Considerations

- **Pagination**: All list endpoints support pagination
- **Caching**: tRPC query caching via React Query
- **Lazy Loading**: Components load on demand
- **Optimistic Updates**: UI updates before server confirmation
- **Code Splitting**: Route-based code splitting with Vite

---

## Future Enhancements

1. **WebSocket Support**: Real-time server status updates
2. **Advanced Analytics**: Charts and graphs for performance metrics
3. **Server Templates**: Pre-configured server templates
4. **Automated Backups**: Scheduled backup system
5. **Notifications**: Email/SMS alerts for critical events
6. **Multi-Language Support**: i18n support
7. **Dark/Light Theme Toggle**: Theme switching
8. **Advanced Filtering**: Complex query builder
9. **Bulk Operations**: Batch server actions
10. **Custom Reports**: Exportable reports and analytics

---

## Support & Troubleshooting

### Common Issues

**Q: Authentication not working**  
A: Ensure Manus OAuth is properly configured and the callback URL is registered.

**Q: Database connection error**  
A: Check DATABASE_URL environment variable and ensure SQLite is accessible.

**Q: Styling not applied**  
A: Clear browser cache and rebuild with `pnpm build`.

---

## License

This project is built with Node.js, Express, and tRPC. All components are open-source and available under their respective licenses.

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 2026-08-04 | Initial release with all core features |

---

## Contact & Support

For issues, feature requests, or support, please refer to the project documentation or contact the development team.

---

**Last Updated**: August 4, 2026  
**Project Status**: Production Ready ✅
