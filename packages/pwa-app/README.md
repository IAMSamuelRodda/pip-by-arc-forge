# PWA App

Progressive Web App for Zero Agent.

## Overview

Mobile-first React application built with:
- React 18
- Vite 6
- TypeScript 5
- TailwindCSS 3
- React Router 7
- Zustand (state management)
- TanStack Query (data fetching)

## Features

- PWA with offline support
- Responsive mobile-first design
- Authentication with AWS Cognito
- Real-time chat interface
- Xero data visualization
- Voice input (premium tier)

## Development

```bash
# Install dependencies
pnpm install

# Run development server
pnpm dev

# Build for production
pnpm build

# Preview production build
pnpm preview

# Run tests
pnpm test
```

## Configuration

Copy `.env.example` to `.env.local` and configure:

```bash
VITE_API_URL=https://your-api.execute-api.us-east-1.amazonaws.com/prod
VITE_COGNITO_USER_POOL_ID=us-east-1_XXXXXXXXX
VITE_COGNITO_CLIENT_ID=your-client-id
```

## Project Structure

```
src/
├── pages/           # Page components (routes)
├── components/      # Reusable UI components
├── stores/          # Zustand state stores
├── hooks/           # Custom React hooks
├── lib/             # Utilities and API clients
├── types/           # TypeScript types
└── styles/          # Global styles
```

## Deployment

### S3 + CloudFront

```bash
# Build for production
pnpm build

# Deploy to S3
aws s3 sync dist/ s3://your-bucket-name

# Invalidate CloudFront cache
aws cloudfront create-invalidation \
  --distribution-id YOUR_DIST_ID \
  --paths "/*"
```

See `../../infrastructure/terraform/` for infrastructure setup.

## PWA Features

- Installable on mobile devices
- Offline support with service worker
- Push notifications (future)
- Background sync (future)

## Performance

- Lighthouse score target: 95+
- Code splitting by route
- Image optimization
- Lazy loading

## Browser Support

- Chrome/Edge (last 2 versions)
- Firefox (last 2 versions)
- Safari (last 2 versions)
- Mobile Safari (iOS 13+)
- Chrome Mobile (Android 8+)

## References

- [Vite Documentation](https://vitejs.dev/)
- [React Documentation](https://react.dev/)
- [TailwindCSS Documentation](https://tailwindcss.com/)
- Project Architecture: `../../ARCHITECTURE.md`
