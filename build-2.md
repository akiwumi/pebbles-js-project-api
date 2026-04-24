# Build 2

## What changed

Implemented in the current codebase:

- Create thoughts
- Read recent thoughts
- Update your own thoughts
- Delete your own thoughts
- Like thoughts
- Persist a unique liked-thought count in `localStorage`
- Show loading states for fetch, submit, update, and delete
- Show friendly validation errors when a thought is empty, too short, or too long
- Decode JWT auth state on the frontend
- Verify JWT auth on the backend for protected routes
- Animate newly submitted thoughts when they enter the list
- Improve responsiveness from small mobile widths up through large desktop widths

## CRUD endpoints

Current backend endpoints:

- `POST /auth/register`
- `POST /auth/login`
- `GET /thoughts`
- `POST /thoughts`
- `PUT /thoughts/:thoughtId`
- `DELETE /thoughts/:thoughtId`
- `POST /thoughts/:thoughtId/like`

Ownership rules:

- Anyone can read thoughts
- Authenticated users can create thoughts
- Only the owner of a thought can edit it
- Only the owner of a thought can delete it
- Deleting a thought removes it for everyone who can see it

## Frontend behavior

The UI now includes:

- Live remaining-character counter under the thought input
- Red remaining-character counter when the user types past `140`
- Friendly inline validation messages
- Edit and delete controls on the current user’s own thoughts
- Loading copy such as `Sending...`, `Saving...`, and `Deleting...`
- A persistent “different thoughts liked” counter stored in `localStorage`
- A responsive layout with better spacing, clearer hierarchy, and improved mobile behavior

## Current environment variables

### Backend local or Render

```env
MONGO_URI=your_mongodb_connection_string
JWT_SECRET=your_long_random_jwt_secret
PORT=3000
CORS_ORIGIN=https://your-vercel-app.vercel.app,http://localhost:5173
```

### Frontend local or Vercel

```env
VITE_API_BASE_URL=https://your-render-api.onrender.com
VITE_USE_MOCK_API=false
```

### Vercel variables

Set these in the Vercel dashboard for the frontend project:

```env
VITE_API_BASE_URL=https://your-render-api.onrender.com
VITE_USE_MOCK_API=false
```

### Render variables

Set these in the Render dashboard for the backend service:

```env
MONGO_URI=your_mongodb_connection_string
JWT_SECRET=your_long_random_jwt_secret
PORT=3000
CORS_ORIGIN=https://your-vercel-app.vercel.app,http://localhost:5173
```

## Notes

- Passwords in the current implementation are hashed with `bcryptjs`; they are not decryptable, which is the correct behavior for passwords.
- Authentication tokens are decoded on the frontend and verified on the backend.
- The app is MongoDB-only. There is no Supabase dependency or configuration in the intended deployment setup.
- Lighthouse was not run inside this task, so the current goal should be treated as “structured to target strong Lighthouse scores” rather than a measured final percentage.
