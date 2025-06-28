# ClimbCapacity Development Guide

## Project Overview

ClimbCapacity is a climbing performance tracking web application that allows users to record, analyze, and compare their climbing metrics. Built with TypeScript, Express.js, DCGView, and MongoDB.

**Current Status**: The project has been successfully refactored from React to DCGView. The refactor is largely complete with all major components converted to DCGView patterns, including proper controller/view separation and DCGView's reactive data binding system.

## Architecture

- **Yarn Workspaces Monorepo**: Centralized dependency management with scoped packages
- **Application Packages**: `@climbcapacity/backend`, `@climbcapacity/frontend`, `@climbcapacity/iso`, `@climbcapacity/scripts`, `@climbcapacity/eslint-rules`
- **Build Tools Package**: `@climbcapacity/build-tools` contains all build configurations and dependencies
- **Backend**: Express.js API server with MongoDB
- **Frontend**: DCGView application built with Vite (renamed from client)
- **Shared**: `iso/` package contains shared types and utilities
- **Scripts**: Database management and data import utilities

### Package Structure

```
ClimbCapacity/
├── packages/
│   ├── backend/           # Server application (runtime + test deps)
│   ├── frontend/          # Browser application (runtime deps only, renamed from client)
│   ├── build-tools/       # Build tooling hub (Vite, Playwright, TypeScript)
│   ├── iso/               # Shared code between frontend/backend
│   ├── scripts/           # Database utilities and maintenance scripts
│   └── eslint-rules/      # Custom ESLint rules for DCGView
├── eslint.config.js       # Root ESLint configuration (flat config)
├── package.json           # Root workspace configuration
└── yarn.lock              # Centralized dependency lock file
```

### Yarn Workspaces Organization

Dependencies are managed centrally through yarn workspaces:

- **Root package.json**: Defines `workspaces: ["packages/*"]` and orchestration scripts
- **Scoped Package Names**: All packages use `@climbcapacity/[package-name]` naming
- **Workspace Commands**: Use `yarn workspace @climbcapacity/[package] <command>` to run commands in specific packages
- **Cross-workspace Dependencies**: Packages can depend on each other using workspace protocol
- **Centralized Lock File**: Single `yarn.lock` at root manages all dependencies

### Build Tools Organization

All build-time tooling is centralized in `packages/build-tools/`:

- **Configurations**: `vite.config.ts`, `playwright.config.ts`, `tsconfig.base.json`
- **Dependencies**: Vite, Playwright, TypeScript, Vitest, etc.
- **Base Config**: `tsconfig.base.json` inherited by all packages
- **Custom Plugins**: `const-wrap-tsx.ts` for DCGView JSX transformation

**ESLint Configuration**: Located at root `eslint.config.js` (not in build-tools)

- Uses flat config format with multiple configuration objects
- Imports custom DCGView rules from `@climbcapacity/eslint-rules`

### Environment Variables

Create `.env` files in both `backend/` and `frontend/` directories:

**Backend `.env`:** (in `packages/backend/`)

```
MONGODB_URL=mongodb://localhost:27018/climbcapacity
RESEND_API_KEY=your_resend_api_key
BASE_URL=http://localhost:3000
RELEASE_STAGE=dev
```

**Frontend `.env`:** (in `packages/frontend/`)

```
VITE_API_BASE_URL=http://localhost:3000
```

### Database Setup

```bash
# Update measure statistics
yarn workspace @climbcapacity/scripts exec tsx update-measure-stats.ts
```

## Testing

### Backend Tests

```bash
yarn workspace @climbcapacity/backend test              # Run all tests
yarn workspace @climbcapacity/backend test:watch        # Watch mode (if available)
```

- Uses Vitest with MongoDB Memory Server
- Tests located in `packages/backend/__tests__/`

### Frontend E2E Tests

```bash
yarn test:e2e         # Run Playwright tests (via build-tools)
yarn test:e2e:ui      # Run with UI (via build-tools)
```

- Playwright tests with screenshot capture
- Tests located in `packages/frontend/e2e/`
- Configured in `packages/build-tools/playwright.config.ts`

### Unit Tests (Shared utilities)

```bash
yarn workspace @climbcapacity/iso test              # Test shared utilities
```

### All Tests

```bash
yarn test             # Run tests in all workspaces
```

## TypeScript

### Type Checking

```bash
# Check all packages
yarn typecheck

# Individual packages
yarn workspace @climbcapacity/backend exec tsc --noEmit
yarn workspace @climbcapacity/frontend exec tsc --noEmit
yarn workspace @climbcapacity/iso exec tsc --noEmit
```

### Configuration

- **Base Config**: `packages/build-tools/tsconfig.base.json` - NodeNext module resolution, strict mode enabled
- **Backend**: Extends base config, compiles to `dist/` directory
- **Frontend**: Extends base config, Vite handles TypeScript compilation with JSX transform
- **Shared**: `iso/` package exports shared types, extends base config

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
# Reset database (development only)
MONGODB_URL="mongodb://localhost:27018/climbcapacity" yarn workspace @climbcapacity/scripts exec tsx refresh-db.ts

# Import new datasets
yarn workspace @climbcapacity/scripts exec tsx import-[dataset].ts

# Update statistics after data changes
yarn workspace @climbcapacity/scripts exec tsx update-measure-stats.ts
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
app.post(
  "/api/example",
  apiRoute(async (req, res) => {
    const user = await auth.assertLoggedIn(req, res);
    // API logic here
    return responseData;
  }),
);
```

## Code Organization

### Backend Structure

```
packages/backend/
├── auth/           # Authentication system (Lucia + magic links)
├── db/             # Database connection
├── models/         # MongoDB data models
├── __tests__/      # Test files
├── app.ts          # Main Express application
├── env.ts          # Environment variable handling
└── utils.ts        # Utility functions
```

### Frontend Structure (renamed from client)

```
packages/frontend/
├── dcgview/        # DCGView framework code
├── pages/          # Application pages
├── views/          # DCGView UI components
├── util/           # Frontend utilities
├── parser/         # Data parsing utilities
├── e2e/            # Playwright E2E tests
├── main.tsx        # Application entry point
├── index.html      # HTML template
└── dist/           # Built assets (generated by Vite)
```

### Shared Code (iso/)

```
packages/iso/
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
3. Add DCGView components in `frontend/src/components/`

### Error Handling

- Use `HandledError` for user-facing errors
- All API routes automatically handle errors and return proper HTTP status codes
- Frontend should handle loading states and error messages

### DCGView Component Patterns

DCGView is a one-directional view library that renders data to DOM and updates it efficiently. Views are class-based with getter functions for dynamic data binding. **JSX is transformed by Vite** (not DCGView.createElement) for modern build integration.

**Refactor Status**: The codebase has been successfully refactored from React to DCGView. Key changes include:

- Controller/View separation pattern implemented throughout
- Event handlers changed from `onPointerDown` to `onClick` for better accessibility
- Proper use of DCGView's `If` component instead of conditional rendering
- Controllers now use `context: { myDispatch }` pattern instead of direct dispatch props
- View components broken into smaller, focused components for better maintainability

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
        <button onClick={() => this.handleClick()}>
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

        {/* Dynamic lists with keys - For has full type support */}
        <For each={() => this.props.items()} key={(item) => item.id}>
          {(item) => <ItemView item={() => item} />}
        </For>

        {/* Simple lists without keys */}
        <For.Simple each={() => this.props.items()}>
          {(item) => <span>{() => item.name}</span>}
        </For.Simple>

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

**List Rendering:**

- **`For`**: Full-featured list rendering with keys and type safety
- **`For.Simple`**: Simplified list rendering without keys (use for static/simple lists)
- **No more `Each`**: Replaced by `For` with adequate type support

**Type Safety:**

- Use `DCGView.Components.IfDefined` for nullable props
- `SwitchUnion` provides automatic type narrowing for union types
- Manual type casts may be needed when TypeScript can't infer getter consistency

**JSX Transformation:**

- Vite handles JSX transformation to `jsx`/`jsxs` calls
- Custom Vite plugin (`const-wrap-tsx.ts`) handles DCGView-specific transformations
- No longer uses `DCGView.createElement` directly

See [DCGView Introduction](packages/frontend/dcgview/introduction.md) and [Components](packages/frontend/dcgview/components.md) for complete documentation.

## Common Commands

```bash
# Development
yarn dev                     # Start both frontend and backend
yarn dev:frontend           # Frontend only (via build-tools)
yarn dev:backend            # Backend only

# Testing
yarn test                   # Run all tests across workspaces
yarn workspace @climbcapacity/backend test # Backend tests only
yarn test:e2e              # E2E tests (via build-tools)
yarn test:e2e:ui           # E2E tests with UI (via build-tools)

# TypeScript
yarn typecheck             # Check all packages (via build-tools)

# Linting
yarn lint                  # Lint entire monorepo (root eslint.config.js)
yarn lint:fix              # Auto-fix lint issues

# ESLint Rules Development
yarn workspace @climbcapacity/eslint-rules build       # Compile custom ESLint rules to JavaScript
yarn workspace @climbcapacity/eslint-rules build:watch # Watch mode for rule development
yarn workspace @climbcapacity/eslint-rules test        # Test custom ESLint rules

# Workspace Management
yarn install               # Install all workspace dependencies
yarn workspace @climbcapacity/<name> add <pkg>    # Add dependency to specific workspace
yarn workspace @climbcapacity/<name> <command>    # Run command in specific workspace
yarn workspaces foreach <command>  # Run command in all workspaces

# Database
docker-compose up -d       # Start MongoDB
yarn workspace @climbcapacity/scripts exec tsx refresh-db.ts  # Reset database (dev only)

# Build
yarn build                 # Build for production (build-tools handles frontend)
yarn build:frontend        # Frontend build only (via build-tools)
```

### Command Flow

Root scripts delegate to workspace commands which execute build tools:

- `yarn dev:frontend` → `yarn workspace @climbcapacity/build-tools dev:frontend` → `vite --config vite.config.ts` (root: ../frontend)
- `yarn build:frontend` → `yarn workspace @climbcapacity/build-tools build:frontend` → `vite build --config vite.config.ts`
- `yarn test:e2e` → `yarn workspace @climbcapacity/build-tools test:e2e` → `playwright test --config playwright.config.ts`
- `yarn lint` → `eslint .` (uses root eslint.config.js, not via build-tools)

## Troubleshooting

### Common Issues

1. **MongoDB Connection**: Ensure Docker is running and port 27018 is available
2. **Authentication**: Verify `RESEND_API_KEY` is set and valid
3. **Port Conflicts**: Frontend (5173) and backend (3000) ports must be available
4. **Environment Variables**: Check both backend and frontend `.env` files

### Database Issues

- Reset database: `MONGODB_URL="mongodb://localhost:27018/climbcapacity" yarn workspace @climbcapacity/scripts exec tsx refresh-db.ts`
- Check connection: `docker-compose logs mongodb`
- Verify indexes: `yarn workspace @climbcapacity/scripts exec tsx create-indexes.ts`

### Type Errors

- Run `npm run typecheck` to see all TypeScript errors
- Shared types are in `iso/` - update both frontend and backend when modifying
- Use `Backend<T>` and `Frontend<T>` for serialization type transformations
