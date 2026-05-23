# Admin Panel Stability Issues - Investigation Guide

## Recently Implemented Improvements

### 1. ✅ Admin Role Hierarchy System
**File**: `/supabase/migrations/20260215_add_admin_roles_hierarchy.sql`

- Added three admin levels: `admin_principal`, `admin`, `moderator`
- Main admin (`ahdybau@gmail.com`) automatically assigned `admin_principal` role
- Helper functions created:
  - `is_admin()`: Checks if user is admin_principal or admin
  - `is_main_admin()`: Checks if user is the main admin
- Updated RLS policies to support new role hierarchy

### 2. ✅ Enhanced Admin User Management
**File**: `/src/pages/admin/AdminUsers.tsx`

**Features Implemented**:
- Role dropdown selector: User → Moderator → Admin (main admin only)
- User deletion functionality with confirmation dialog
- User profile viewing and management
- Admin principal label (👑) display
- Full role management interface for main admin

**Permissions**:
- Only `admin_principal` can change roles and delete users
- Regular admins can view user list but cannot modify
- Proper access control with navigation redirect

### 3. ✅ Prayer Forum - Admin Principal Label
**File**: `/src/pages/PrayerForum.tsx`

**Changes**:
- Prayer requests now show "👑 Admin Principal" when posted by main admin
- Prayer responses show "👑 Admin Principal" for main admin replies
- User role data fetched from `user_roles` table
- Helper functions:
  - `getAuthorDisplay()`: Shows proper label for authors
  - `getResponseAuthorDisplay()`: Shows proper label for respondents

### 4. ✅ Admin Status Display
**File**: `/src/pages/Admin.tsx`

- Main admin sees 👑 emoji in header
- "Admin Principal" badge displayed in admin dashboard
- Role information visible to all admins

### 5. ✅ Enhanced Admin Hook
**File**: `/src/hooks/useAdmin.tsx`

- New `adminRole` state returns: `'admin_principal' | 'admin' | 'moderator' | null`
- Updated to check multiple role types
- Backward compatible with existing admin pages

---

## Known Stability Issues Reported

### Issue 1: Admin Page Crashes
**Description**: Application sometimes crashes when in admin section

**Possible Causes**:
- Unhandled promise rejections in data loading
- Missing error boundaries
- Component unmounting errors
- Race conditions in useEffect hooks

**Last Location Mentioned**: General admin section
**Frequency**: Sometimes (intermittent)

### Issue 2: Raw HTML Display Without Styling
**Description**: Admin pages display raw HTML without CSS styling

**Possible Causes**:
- CSS/Tailwind not loading
- Component rendering failure
- Missing imports
- Style sheet reference broken
- Build system issue

**Last Mentioned**: General admin pages
**Impact**: Pages become unusable

### Issue 3: Modification Operations Fail
**Description**: When trying to modify data in admin pages, operations fail

**Possible Causes**:
- Supabase query errors
- Missing RLS permissions
- Data validation issues
- Network problems
- State management bugs

**Last Mentioned**: Unspecified admin page
**Frequency**: Inconsistent

---

## Troubleshooting Checklist

### For Developers
- [ ] Check browser console for JavaScript errors
- [ ] Check network tab for failed API requests
- [ ] Verify Supabase connectivity
- [ ] Check RLS policies applied correctly
- [ ] Verify user roles exist in database
- [ ] Check for missing environment variables

### For Users Reporting Issues
When reporting an admin issue, include:
1. Which admin page were you on? (Home, About, Carême, etc...)
2. What action triggered the problem? (Load, Save, Delete, etc...)
3. What device/browser? (Chrome, Firefox, Safari, etc...)
4. Screenshot of error message (if any)
5. Check browser console for errors (F12 → Console tab)

### Build Verification
```bash
npm run build
```
Should complete with: `✓ built in XXs`

---

## Next Steps for Stability Improvements

1. **Error Boundary Implementation**
   - Add error boundary component to admin pages
   - Catch render errors gracefully
   - Display user-friendly error messages

2. **Logging System**
   - Add error logging to track failures
   - Log API errors with context
   - Create error analytics dashboard

3. **Data Validation**
   - Validate all form inputs
   - Check role permissions before operations
   - Verify data exists before modifying

4. **Network Resilience**
   - Implement retry logic
   - Add loading states
   - Handle offline scenarios

5. **Testing**
   - Add E2E tests for admin workflows
   - Test all admin pages
   - Simulate various user roles
   - Test error scenarios

---

## Admin Panel URLs
- Main: `/admin`
- Users: `/admin/users`
- About: `/admin/about`
- Carême: `/admin/careme2026`
- Chemin de Croix: `/admin/chemin-de-croix`
- Activities: `/admin/activities`
- Readings: `/admin/readings`
- Prayers: `/admin/prayers`
- Gallery: `/admin/gallery`
- FAQ: `/admin/faq`
- Contact: `/admin/contact`
- AI: `/admin/ai`
- Home: `/admin/home`

---

## Database Schema
Database has been updated to support:
- `user_roles` table with roles: `admin_principal`, `admin`, `moderator`, `user`
- RLS policies checking new role types
- Helper functions for permission checking

**Note**: Ensure Supabase migrations are applied:
`20260215_add_admin_roles_hierarchy.sql`
