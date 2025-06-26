# ClimbCapacity Development Guide

## Project Overview
ClimbCapacity is a climbing performance tracking web application that allows users to record, analyze, and compare their climbing metrics. Built with TypeScript, Express.js, DCGView, and MongoDB.

## Architecture
- **Monorepo**: Four main packages - `backend/`, `client/`, `iso/`, `scripts/`
- **Backend**: Express.js API server with MongoDB
- **Frontend**: DCGView application built with Vite
- **Shared**: `iso/` package contains shared types and utilities
- **Scripts**: Database management and data import utilities

### Environment Variables
Create `.env` files in both `backend/` and `client/` directories:

**Backend `.env`:**
```
MONGODB_URL=mongodb://localhost:27018/climbcapacity
RESEND_API_KEY=your_resend_api_key
BASE_URL=http://localhost:3000
RELEASE_STAGE=dev
```

**Client `.env`:**
```
VITE_API_BASE_URL=http://localhost:3000
```

### Database Setup
```bash
# Update measure statistics
cd scripts & npx tsx update-measure-stats.ts
```

## Testing

### Backend Tests
```bash
cd backend
npm test              # Run all tests
npm run test:watch    # Watch mode
```
- Uses Vitest with MongoDB Memory Server
- Tests located in `backend/__tests__/`

### Frontend E2E Tests
```bash
cd client
npm run test:e2e      # Run Playwright tests
```
- Playwright tests with screenshot capture
- Tests located in `client/e2e/`

### Unit Tests (Shared utilities)
```bash
cd iso
npm test              # Test shared utilities
```

## TypeScript

### Type Checking
```bash
# Check all packages
npm run typecheck

# Individual packages
cd backend && npx tsc --noEmit
cd client && npx tsc --noEmit
cd iso && npx tsc --noEmit
```

### Configuration
- **Root**: NodeNext module resolution, strict mode enabled
- **Backend**: Compiles to `dist/` directory
- **Frontend**: Vite handles TypeScript compilation
- **Shared**: `iso/` package exports shared types

## Authentication System

### Magic Link Authentication
- Passwordless login via email using Resend API
- Rate limited: 5 attempts/hour per IP, 3 attempts/hour per email
- Session-based with CSRF protection

### Testing Authentication Locally
1. Start the server with a valid `RESEND_API_KEY`
2. Navigate to `/login`
3. Enter your email address
4. Check your email for the magic link
5. Click the link to authenticate

### Auth API Endpoints
- `POST /api/send-login-link` - Request magic link
- `GET /api/login` - Process magic link
- `POST /api/logout` - End session
- `GET /api/auth` - Check auth status

## Database

### MongoDB Collections
- **snapshots**: User performance data with measures
- **users**: User authentication records
- **sessions**: User session data
- **magic_links**: Temporary authentication tokens
- **measure_stats**: Aggregated statistics

### Data Models (backend/models/)
- **SnapshotsModel**: Primary model for climbing performance data
- Key methods: `getUsersSnapshots()`, `updateMeasure()`, `querySnapshots()`

### Data Utilities
```bash
cd scripts

# Reset database (development only)
MONGODB_URL="mongodb://localhost:27018/climbcapacity" npx tsx refresh-db.ts

# Import new datasets
npx tsx import-[dataset].ts

# Update statistics after data changes
npx tsx update-measure-stats.ts
```

## API Structure

### Core Endpoints
- **Authentication**: `/api/auth`, `/api/send-login-link`, `/api/login`, `/api/logout`
- **Snapshots**: `/api/my-snapshots`, `/api/snapshot`, `/api/snapshots/new`, `/api/snapshots/update`
- **Queries**: `/api/snapshots/query`, `/api/measure-stats`

### Route Patterns
- **apiRoute**: JSON API endpoints with structured error handling
- **asyncRoute**: General async route wrapper
- **HandledError**: Custom error class for user-facing messages

Example:
```typescript
app.post('/api/example', apiRoute(async (req, res) => {
  const user = await auth.assertLoggedIn(req, res);
  // API logic here
  return responseData;
}));
```

## Code Organization

### Backend Structure
```
backend/
├── auth/           # Authentication system (Lucia + magic links)
├── db/             # Database connection
├── models/         # MongoDB data models
├── __tests__/      # Test files
├── app.ts          # Main Express application
├── env.ts          # Environment variable handling
└── utils.ts        # Utility functions
```

### Frontend Structure
```
client/
├── src/
│   ├── components/ # DCGView UI components
│   ├── util/       # Frontend utilities
│   ├── App.tsx     # Main DCGView application entry
│   └── main.tsx    # Application entry point
├── e2e/            # Playwright E2E tests
└── dist/           # Built assets (generated)
```

### Shared Code (iso/)
```
iso/
├── measures/       # Climbing measure definitions
├── units.ts        # Unit conversion system
├── protocol.ts     # API request/response types
└── types.ts        # Shared type definitions
```

## Key Utilities

### Backend Utils (backend/utils.ts)
- `assertEnv(key)`: Validate required environment variables
- `HandledError`: Structured error handling for APIs
- `asyncRoute/apiRoute`: Express route wrappers with error handling

### Measure System (iso/measures/)
- Extensible system for climbing performance metrics
- Supports multiple grade systems (V-grades, Font, YDS, etc.)
- Auto-generates measures with different parameters
- Unit conversion and normalization built-in

### Type Safety (iso/protocol.ts)
- `Backend<T>` / `Frontend<T>`: Transform types for serialization
- `ProtocolObjectId`, `ProtocolDate`: Serialization placeholders
- Ensures type safety across frontend/backend boundaries

## Development Patterns

### Adding New API Endpoints
1. Define request/response types in `iso/protocol.ts`
2. Add route in `backend/app.ts` using `apiRoute`
3. Implement frontend API calls with proper typing
4. Add tests in `backend/__tests__/`

### Adding New Measures
1. Define measure in `iso/measures/` directory
2. Update measure stats: `npx tsx scripts/update-measure-stats.ts`
3. Add DCGView components in `client/src/components/`

### Error Handling
- Use `HandledError` for user-facing errors
- All API routes automatically handle errors and return proper HTTP status codes
- Frontend should handle loading states and error messages

### DCGView Component Patterns

DCGView is a one-directional view library that renders data to DOM and updates it efficiently. Views are class-based with getter functions for dynamic data binding.

**Basic View Structure:**
```typescript
interface Props {
  user: () => User | undefined;
  dispatch: (action: Action) => void;
}

class UserView extends DCGView.Class<Props> {
  init() {
    // Initialize member variables here (never in constructor)
  }

  template() {
    return (
      <div class={() => ({ active: !!this.props.user() })}>
        {/* Dynamic text binding */}
        {() => this.props.user()?.name || 'Guest'}

        {/* Event handlers */}
        <button onTap={() => this.handleClick()}>
          Click me
        </button>
      </div>
    );
  }

  handleClick() {
    this.props.dispatch({ type: 'user-clicked' });
  }
}
```

**Control Flow & Type Safety:**
```typescript
const { If, For, SwitchUnion } = DCGView.Components;

class DataView extends DCGView.Class<{
  items: () => Item[];
  status: () => 'loading' | 'loaded' | 'error';
}> {
  template() {
    return (
      <div>
        {/* Conditional rendering */}
        <If predicate={() => this.props.items().length > 0}>
          {() => <span>Has items</span>}
        </If>

        {/* Dynamic lists with keys */}
        <For each={() => this.props.items()} key={(item) => item.id}>
          {(item) => <ItemView item={() => item} />}
        </For>

        {/* Type-safe switching - statusProp is narrowed to specific union member */}
        {SwitchUnion(() => this.props.status(), {
          loading: (statusProp) => <div>Status: {() => statusProp()}</div>, // statusProp: () => 'loading'
          loaded: (statusProp) => <div>Status: {() => statusProp()}</div>,   // statusProp: () => 'loaded'
          error: (statusProp) => <div>Error: {() => statusProp()}</div>      // statusProp: () => 'error'
        })}
      </div>
    );
  }
}
```

**Critical Rules:**
- **All dynamic props must be getter functions** - enables re-evaluation during updates
- **Never break the getter chain** - don't store `this.props.getter()` in variables
- **Use `init()` for initialization** - never use constructor or field initialization
- **Maintain unique keys** for dynamic lists to enable efficient DOM diffing

**Type Safety:**
- Use `DCGView.Components.IfDefined` for nullable props
- `SwitchUnion` provides automatic type narrowing for union types
- Manual type casts may be needed when TypeScript can't infer getter consistency

See [DCGView Introduction](client/dcgview/introduction.md) and [Components](client/dcgview/components.md) for complete documentation.

## Common Commands

```bash
# Development
npm run dev                    # Start both frontend and backend
npm run dev:frontend          # Frontend only
npm run dev:backend           # Backend only

# Testing
npm run test                  # Run all tests
cd backend && npm test        # Backend tests only
cd client && npm run test:e2e # E2E tests only

# TypeScript
npm run typecheck            # Check all packages
npx tsc --noEmit            # Check current directory

# Database
docker-compose up -d         # Start MongoDB
cd scripts && npx tsx reset-db.ts  # Reset database (dev only)

# Build
npm run build               # Build for production
```

## Troubleshooting

### Common Issues
1. **MongoDB Connection**: Ensure Docker is running and port 27018 is available
2. **Authentication**: Verify `RESEND_API_KEY` is set and valid
3. **Port Conflicts**: Frontend (5173) and backend (3000) ports must be available
4. **Environment Variables**: Check both backend and client `.env` files

### Database Issues
- Reset database: `cd scripts && MONGODB_URL="mongodb://localhost:27018/climbcapacity" npx tsx refresh-db.ts`
- Check connection: `docker-compose logs mongodb`
- Verify indexes: `cd scripts && npx tsx create-indexes.ts`

### Type Errors
- Run `npm run typecheck` to see all TypeScript errors
- Shared types are in `iso/` - update both frontend and backend when modifying
- Use `Backend<T>` and `Frontend<T>` for serialization type transformations
