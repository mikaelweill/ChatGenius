As always baby steps. Always ask for my permission before approving code. 

Here's where we are and what we need. Please when implementing part of this checklist ask me to update this checklist as well. 

1. Create Central Auth Module (IN PROGRESS) ✅
   a. Create lib/auth.ts structure ✅
      - Define shared interfaces ✅
      - Set up server-side caching mechanism ✅
      - Create utility functions ✅
   b. Server-side utilities (IN PROGRESS) ✅
      - Implement cached getUser ✅
      - Handle API route auth ✅
      - Optimize cache validation ✅
        * Added cache invalidation on errors
        * Improved error handling with specific error types
        * Added error details for debugging
      - Add error handling for edge cases ✅

2. Server Implementation (NEXT UP) 👈 We are here
   a. Update server components
      - Modify layout.tsx to use new auth module
      - Update other authenticated pages
      - Ensure proper cache usage
   b. Update API routes
      - Standardize auth checks
      - Implement caching
      - Error handling

3. Testing & Optimization (TO DO)
   a. Verify auth flow
      - Test sign in persistence
      - Test API auth
      - Test cache invalidation
   b. Monitor performance
      - Track auth calls
      - Verify caching
      - Check rate limits

4. Cleanup & Documentation (TO DO)
   a. Remove old code
      - Clean up duplicate auth checks
      - Remove unused auth code
      - Update imports
   b. Document new system
      - Add comments
      - Update README
      - Document caching behavior

Key Learnings & Decisions:
1. Using a simple static cache key ('auth_user') for server-side caching
2. Caching only valid authenticated users (no errors)
3. 5-minute cache duration for security
4. Cache invalidation on any auth errors for security ✅
5. Specific error types with codes and details for debugging ✅
6. Relying on Supabase's built-in session management for client-side ✅
7. Removed redundant token management for better security ✅