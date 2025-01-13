# Socket Authentication Flow Fixes

## Overview
This document outlines the changes needed to ensure proper socket cleanup and initialization during authentication flows, with a focus on the login process to handle multiple scenarios:
- Normal login flow
- Browser close/reopen
- Cookie expiration
- Multiple tabs
- Failed previous logout

## Files to Modify

### 1. `hooks/useSocket.tsx`
- Add cleanup function for existing sockets
- Improve socket initialization with fresh state
- Add connection validation
```typescript
// Key changes needed:
- Add validateAndCleanupExistingSocket()
- Modify getSocket() to ensure fresh instance
- Add connection state validation
```

### 2. `contexts/AuthContext.tsx`
- Add pre-auth cleanup steps
- Improve token management
- Add socket state coordination
```typescript
// Key changes needed:
- Add preAuthCleanup()
- Modify auth state change handler
- Add socket state tracking
```

### 3. `lib/tokenManager.ts`
- Add comprehensive cleanup
- Add validation for stored data
- Add timestamp tracking
```typescript
// Key changes needed:
- Add cleanupAllStorage()
- Add validateStoredData()
- Add timestamp to stored data
```

### 4. `app/signin/page.tsx`
- Add pre-login cleanup
- Improve auth flow coordination
```typescript
// Key changes needed:
- Add cleanup before login
- Add proper flow coordination
```

## Implementation Steps

### Phase 1: Cleanup Functions
1. Create cleanup utilities
2. Add validation functions
3. Test cleanup in isolation

### Phase 2: Login Flow
1. Add pre-login checks
2. Implement storage cleanup
3. Add socket validation
4. Test login scenarios

### Phase 3: State Management
1. Improve auth state tracking
2. Add socket state coordination
3. Test state consistency

## Success Criteria
- [ ] No lingering sockets after auth changes
- [ ] Clean state on new login
- [ ] Proper handling of expired sessions
- [ ] Consistent behavior across tabs
- [ ] No ghost connections

## Testing Scenarios
1. Normal login/logout flow
2. Browser close/reopen
3. Session expiration
4. Multiple tabs
5. Network interruption
6. Failed logout recovery

## Implementation Notes
- Focus on login flow as it handles most edge cases
- Ensure atomic operations where possible
- Add logging for debugging
- Consider adding retry mechanisms
- Add error boundaries for recovery

## Rollout Plan
1. Implement cleanup functions
2. Add pre-login checks
3. Enhance socket initialization
4. Add validation steps
5. Test all scenarios
6. Monitor in production

## Fallback Mechanisms
- Auto-recovery for failed cleanup
- Forced cleanup on errors
- Session validation checks 