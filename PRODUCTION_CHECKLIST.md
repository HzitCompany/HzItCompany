# Production Checklist

## 1. Supabase Configuration
- [ ] **Run SQL Script**: Execute the contents of `supabase_setup.sql` in the Supabase SQL Editor.
- [ ] **Auth Providers**:
  - Enable **Email/Password** provider.
  - Enable **Google** provider.
    - Set `Authorized Client IDs`.
    - Set `Authorized Redirect URIs` (e.g., `https://your-domain.com`, `http://localhost:5173`).
- [ ] **Redirect URLs**: Add your production domain to "Site URL" and "Redirect URLs" in Supabase Auth settings.

## 2. Environment Variables (.env)
Ensure these are set in your production environment (e.g., Render, Vercel):

```env
# Public (Frontend)
VITE_SUPABASE_URL=your_project_url
VITE_SUPABASE_ANON_KEY=your_anon_key
VITE_API_URL=https://your-backend-domain.com/api

# Private (Backend)
PORT=8080
NODE_ENV=production
SUPABASE_URL=your_project_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key  <-- CRITICAL for admin operations
CORS_ORIGINS=https://your-frontend-domain.com
```

## 3. Deployment
- [ ] **Backend**: Deploy Node.js app.
  - Build Command: `npm install && npm run build`
  - Start Command: `npm start`
- [ ] **Frontend**: Deploy React app (Vite).
  - Build Command: `npm install && npm run build`
  - Publish Directory: `dist`
  - Ensure SPA rewrite rule (redirect all to `index.html`).

## 4. Security & Hardening
- [ ] **RLS**: Verify RLS is enabled on `profiles` and logic is correct.
- [ ] **CORS**: Ensure `CORS_ORIGINS` strictly matches your frontend domain.
- [ ] **Rate Limiting**: Verify `apiRateLimit` is active in `app.ts`.
- [ ] **Service Role Key**: NEVER expose `SUPABASE_SERVICE_ROLE_KEY` in the frontend or public repos.

## 5. Verification
1. Sign up with `hzitcompany@gmail.com` -> Should be **Admin**.
2. Sign up with another email -> Should be **User**.
3. As Admin, go to `/admin` -> Check stats appearing.
4. As Admin, go to `/admin` -> "Users" tab -> Promote a user.
5. As User, go to `/profile` -> Update name/avatar.
6. As User, try accessing `/admin` -> Should receive 403 or redirect.
