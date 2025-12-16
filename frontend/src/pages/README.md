# Pages

Top-level page components for each route.

## Pages

### Public Pages
- **HomePage** - Landing page with authentication options
- **LoginPage** - User login form
- **RegisterPage** - User registration form

### Protected Pages
- **DashboardPage** - User dashboard (requires authentication)

## Usage

Pages are used in the main `App.tsx` routing configuration. Protected pages should be wrapped with `ProtectedRoute` component.

```tsx
<Route
  path="/dashboard"
  element={
    <ProtectedRoute>
      <DashboardPage />
    </ProtectedRoute>
  }
/>
```
