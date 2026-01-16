# Consulting OS Implementation Guide

## Overview
This document outlines the comprehensive transformation of your admin dashboard into a full-featured consulting OS with CRM, project delivery, task management, messaging, and secure data intake.

## Architecture

### Database Schema
- **clients** - Core CRM with company info, status, follow-up tracking
- **client_contacts** - Contact persons within client companies
- **client_notes** - Internal notes (admin/manager only)
- **projects** - Delivery pipeline with status tracking
- **tasks** - Actionable items linked to clients or projects
- **messages** - Thread-based communication with internal/external flags
- **client_uploads** - S3-backed file uploads with status tracking
- **activity_log** - Complete audit trail

### Status Enums
- **Client Status**: lead, active, on_hold, completed
- **Project Status**: discovery, build, validate, deliver, maintenance
- **Task Status**: open, in_progress, complete
- **Task Priority**: low, medium, high
- **Upload Status**: received, validated, issue, processing, done, error

### Security Model
- **Roles**: admin, manager, client
- **Permissions**:
  - Admin: Full access to all features
  - Manager: Clients, projects, tasks, messages, uploads
  - Client: Messages (non-internal), uploads only
- **RLS Policies**: Row-level security on all tables

## Implementation Status

### ✅ Completed
1. Database migration with all tables and RLS policies
2. Reusable UI components:
   - StatusBadge (client, project, task, upload)
   - PriorityBadge (low, medium, high)
   - EmptyState (with CTA)
   - QuickActionButton (primary, secondary)
3. Email notification system (welcome, document requests, uploads, updates)
4. AWS S3 integration for client data uploads

### 🚧 In Progress
1. Client management system
2. Project management system
3. Task management system
4. Messaging system
5. Enhanced admin dashboard

### 📋 Remaining Tasks

#### 1. Client Management System
**Files to Create:**
- `/src/app/admin/clients/page.jsx` - Client list with search/filter
- `/src/app/admin/clients/[id]/page.jsx` - Client detail page
- `/src/app/api/admin/clients/route.js` - CRUD operations
- `/src/app/api/admin/clients/[id]/contacts/route.js` - Contact management
- `/src/app/api/admin/clients/[id]/notes/route.js` - Notes management

**Features:**
- Client list with status filters
- Search by company name
- "Add Client" modal
- Client detail page with tabs: Info, Contacts, Notes, Projects, Tasks, Uploads
- Last contacted / Next follow-up tracking
- Status dropdown with color coding

#### 2. Project Management System
**Files to Create:**
- `/src/app/admin/projects/page.jsx` - Project list
- `/src/app/admin/projects/[id]/page.jsx` - Project detail
- `/src/app/api/admin/projects/route.js` - CRUD operations

**Features:**
- Project list grouped by status
- Progress indicators
- Link to client
- Start/end date tracking
- Status pipeline view

#### 3. Task Management System
**Files to Create:**
- `/src/app/admin/tasks/page.jsx` - Task list with filters
- `/src/app/api/admin/tasks/route.js` - CRUD operations

**Features:**
- Task list with priority/status filters
- Due date sorting
- Quick status updates
- Assign to team members
- Link to client or project

#### 4. Messaging System
**Files to Create:**
- `/src/app/admin/messages/page.jsx` - Message inbox (already exists, enhance)
- `/src/app/api/admin/messages/route.js` - Thread-based messages (enhance existing)
- `/src/app/portal/messages/page.jsx` - Client message view (already exists, enhance)

**Features:**
- Thread view per client
- Internal vs client-visible toggle
- File attachments
- Unread indicators
- Real-time updates

#### 5. Enhanced Admin Dashboard
**Files to Modify:**
- `/src/app/admin/page.jsx` - Complete redesign

**Features:**
- Quick action buttons: Add Client, Create Project, Create Task, Request Upload
- Live task counts (not static 0s)
- "Tasks Due Soon" with real data
- "Recent Activity" panel
- "Outreach Queue" sorted by next_followup
- Status distribution charts

#### 6. Profile Enhancements
**Files to Modify:**
- `/src/app/admin/profile/page.jsx`
- `/src/app/portal/profile/page.jsx`

**Features:**
- Remove "Project" field
- Add avatar upload
- Add timezone selector
- Add notification preferences
- Show role badge

## API Routes Structure

```
/api/admin/
  /clients
    GET    - List all clients with filters
    POST   - Create new client
    /[id]
      GET    - Get client details
      PUT    - Update client
      DELETE - Delete client
      /contacts
        GET  - List contacts
        POST - Add contact
      /notes
        GET  - List notes
        POST - Add note
  
  /projects
    GET    - List all projects
    POST   - Create project
    /[id]
      GET    - Get project details
      PUT    - Update project
      DELETE - Delete project
  
  /tasks
    GET    - List tasks with filters
    POST   - Create task
    /[id]
      PUT    - Update task
      DELETE - Delete task
  
  /messages
    GET    - List messages by client
    POST   - Send message
    /[id]
      PUT    - Mark as read
  
  /activity
    GET    - Get activity log
```

## S3 Bucket Structure

```
mullen-analytics-client-intake/
  {client_id}/
    uploads/
      {timestamp}_{filename}
    processed/
      {timestamp}_{filename}
```

## Utility Functions Needed

**File:** `/src/lib/permissions.js`
```javascript
export function canAccessClients(role) {
  return ['admin', 'manager'].includes(role);
}

export function canAccessProjects(role) {
  return ['admin', 'manager'].includes(role);
}

export function canAccessTasks(role) {
  return ['admin', 'manager'].includes(role);
}

export function canAccessAllMessages(role) {
  return ['admin', 'manager'].includes(role);
}

export function canAccessActivityLog(role) {
  return role === 'admin';
}
```

**File:** `/src/lib/activityLogger.js`
```javascript
export async function logActivity(userId, action, entityType, entityId, details = {}) {
  // Insert into activity_log table
}
```

## Migration Steps

1. **Run Database Migration**
   ```sql
   -- Execute supabase_migration_consulting_os.sql in Supabase SQL Editor
   ```

2. **Update Environment Variables**
   ```bash
   # Already configured:
   AWS_REGION=us-east-1
   AWS_S3_BUCKET=mullen-analytics-client-intake
   AWS_ACCESS_KEY_ID=...
   AWS_SECRET_ACCESS_KEY=...
   ```

3. **Deploy in Phases**
   - Phase 1: Client Management (CRM core)
   - Phase 2: Projects & Tasks
   - Phase 3: Enhanced Messaging
   - Phase 4: Dashboard Redesign
   - Phase 5: Profile Updates

## Testing Checklist

### Client Management
- [ ] Create new client
- [ ] Update client status
- [ ] Add contacts
- [ ] Add internal notes
- [ ] Search and filter clients
- [ ] Track last contacted / next follow-up

### Project Management
- [ ] Create project for client
- [ ] Update project status
- [ ] View project timeline
- [ ] Link tasks to project

### Task Management
- [ ] Create task for client
- [ ] Create task for project
- [ ] Assign task to user
- [ ] Update task status
- [ ] Filter by priority/status
- [ ] Sort by due date

### Messaging
- [ ] Send message to client
- [ ] Add internal note
- [ ] Client can view non-internal messages
- [ ] Client cannot see internal messages
- [ ] Attach files to messages

### Uploads
- [ ] Request data from client
- [ ] Client uploads file
- [ ] Admin uploads file on behalf of client
- [ ] Email notifications sent
- [ ] Files organized in S3 by client

### Security
- [ ] Admin can access everything
- [ ] Manager can access clients/projects/tasks
- [ ] Client can only access their data
- [ ] RLS policies enforced
- [ ] Activity log captures all actions

## Performance Considerations

- All tables have appropriate indexes
- RLS policies use indexed columns
- Pagination on list views (50 items per page)
- Lazy loading for large datasets
- Caching for frequently accessed data

## Future Enhancements

- Real-time notifications via Supabase Realtime
- Calendar view for tasks and follow-ups
- Gantt chart for project timelines
- Advanced reporting and analytics
- Mobile app support
- API webhooks for integrations
- Automated follow-up reminders
- Client portal customization per client

## Support

For questions or issues during implementation:
1. Check Supabase logs for RLS policy issues
2. Verify AWS S3 permissions
3. Test API routes with Postman/curl
4. Review browser console for client-side errors
5. Check activity_log table for audit trail
