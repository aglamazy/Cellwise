# Agents Documentation

## Build Commands

```bash
npm install    # Install dependencies
npm run build  # Build for production
npm run lint   # Run ESLint
npm run dev    # Start development server
```

## Build Requirements

- **Node.js** with npm
- **Database connection**: The build requires a `DATABASE_URL` environment variable for the Neon PostgreSQL database. Without it, the build will fail during page data collection.

## Common Build Errors

### 1. TypeScript Errors
Run `npm run build` to check for TypeScript compilation errors. Fix any type errors before deploying.

### 2. Lint Warnings
Run `npm run lint` to check for ESLint issues. Address warnings about unused variables and other code quality issues.

### 3. Database Connection Error
```
Error: Database connection string not found
```
This occurs when `DATABASE_URL` is not set. Ensure `.env` file exists with valid database credentials.

## Project Structure

- `src/components/` - React components (PuzzleEditor, Crown, etc.)
- `src/app/` - Next.js App Router pages and API routes
- `src/types/` - TypeScript type definitions
- `scripts/` - Database setup scripts
