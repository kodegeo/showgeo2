# Showgeo 2.0

A next-generation live LIVE and event streaming platform that connects fans, creators ("Entities"), and managers through immersive, real-time experiences.

## 🏗️ Architecture

- **Frontend**: React (Vite + TypeScript) + TailwindCSS
- **Backend**: NestJS (Node.js + TypeScript)
- **Database**: PostgreSQL with Prisma ORM
- **Streaming**: LiveKit Cloud
- **Payments**: Stripe
- **Storage**: Supabase or S3
- **Hosting**: Render

## 📁 Project Structure

```
showgeo-2/
├── backend/          # NestJS API
│   ├── src/
│   │   ├── modules/  # Feature modules (auth, users, entities, events, etc.)
│   │   ├── common/  # Guards, filters, decorators
│   │   └── prisma/  # Prisma service
│   └── prisma/      # Database schema and migrations
├── frontend/         # React + Vite application
│   └── src/
│       ├── features/  # Feature-based folders
│       ├── components/  # Shared components
│       ├── pages/     # Top-level pages
│       ├── services/  # API integration
│       └── hooks/     # Custom hooks
├── shared/           # Shared TypeScript types
│   └── types/       # Common interfaces
└── docs/            # Documentation and requirements
```

## 🚀 Getting Started

### Prerequisites

- Node.js 18+ and npm/yarn
- PostgreSQL database
- Environment variables configured (see `.env.example` files)

### Backend Setup

```bash
cd backend
npm install
npm run prisma:generate
npm run prisma:migrate
npm run start:dev
```

Backend will run on `http://localhost:3000`
API docs available at `http://localhost:3000/api/docs`

### Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

Frontend will run on `http://localhost:5173`

### Shared Types

The `shared/` folder contains TypeScript types used across both frontend and backend.

## 📚 Documentation

- Architecture: `docs/system_architecture.md`
- Requirements: `docs/*_requirements.md`
- Coding Standards: `docs/cursorrules`

## 🔧 Development

### Code Style

- TypeScript strict mode enabled
- ESLint + Prettier configured
- Follow `.cursorrules` for naming conventions

### Database

Prisma is used for database management:

```bash
# Generate Prisma Client
npm run prisma:generate

# Create migration
npm run prisma:migrate

# Open Prisma Studio
npm run prisma:studio
```

## 📝 License

Private - Khalid Morris

