# Admin Access Control & Permission Matrix System

## Overview

This document describes the complete access control system implemented for the MUISC platform admin dashboard. The system provides a two-level approval workflow where **Super Admins input actions** and **System Admins approve** them, ensuring proper authorization and audit trails for all critical admin operations.

## Architecture

### Permission Model

The system uses a **two-tier permission model**:

1. **Inputter Permissions** - Users who can create/input actions
   - Super Admin can input ALL admin actions
   - Other admin roles can input specific actions based on their role

2. **Authorizer Permissions** - Users who can approve/reject actions
   - System Admin can authorize ALL actions inputted by Super Admin
   - Department admins can approve specific actions within their domain

### Role Hierarchy

```
Super Admin (Inputter of all actions)
    ↓ submits actions for approval
System Admin (Authorizer of all actions)
    ├── Admin Finance (Finance operations)
    ├── Admin Content (Content management)
    ├── Admin Support (Support tickets)
    ├── Admin Fraud (Fraud detection)
    ├── Admin Analytics (Analytics)
    ├── Admin Operations (Operations)
    ├── HR Manager (HR operations)
    ├── HR Specialist (HR staff)
    ├── HR Coordinator (HR support)
    ├── Payroll Manager (Payroll operations)
    └── Recruitment Officer (Hiring)
```

## Permission Categories

### 1. System Administration (18 permissions)
- `system.settings.view` / `system.settings.edit`
- `system.users.manage`, `system.roles.manage`, `system.permissions.manage`
- `system.audit.view` / `system.audit.export`
- `system.database.view` / `system.database.backup` / `system.database.restore`
- `system.logs.view` / `system.logs.export`
- `system.email.configure` / `system.email.send`
- `system.integrations.manage`, `system.api.manage`, `system.security.configure`

### 2. Finance Administration (15 permissions)
- **Transactions**: view, create, approve, reject, export
- **Reports**: view, generate
- **Accounting**: view, edit
- **Reconciliation**: view, approve
- **Budgets**: view, create, approve
- **Payments**: view, process, approve

### 3. Content Administration (12 permissions)
- **Operations**: view, create, edit, delete, approve, reject, publish, unpublish
- **Management**: categories.manage, tags.manage, comments.moderate
- **Reporting**: reports.view

### 4. Support Administration (8 permissions)
- **Tickets**: view, create, edit, resolve, close
- **Management**: templates.manage, categories.manage
- **Reporting**: reports.view

### 5. Fraud Detection (7 permissions)
- **Monitoring**: view, configure
- **Alerts**: view, investigate, resolve
- **Management**: rules.manage
- **Reporting**: reports.view

### 6. Analytics (8 permissions)
- **Operations**: dashboard.view, reports.view, reports.generate, data.export
- **Configuration**: dimensions.configure, metrics.configure
- **Management**: alerts.manage

### 7. Operations (8 permissions)
- **Monitoring**: monitoring.view
- **Processes**: view, start, stop
- **Queue**: view, manage
- **Jobs**: view, retry, cancel
- **Reporting**: reports.view

### 8. HR Permissions (44 permissions)
- **Staff**: view, create, edit, delete, activate, deactivate, transfer, promote
- **Leave**: view, approve, reject
- **Attendance**: view, mark, edit
- **Payroll**: view, create, approve, process, release
- **Salary**: view, edit, approve
- **Benefits**: view, edit, approve
- **Recruitment**: view, create, edit, approve, close
- **Onboarding**: view, create, edit
- **Performance**: view, create, review, approve
- **Training**: view, create, approve
- **Reports**: view, export
- **Audit**: view
- **Settings**: manage

## Workflow

### 1. Action Submission (Inputter)

**Super Admin** submits an action:
```typescript
await submitAccessAction({
  actionType: 'create', // or 'update', 'delete', 'approve', 'reject', 'execute'
  permission: 'system.settings.edit',
  resourceType: 'SystemSetting',
  resourceId: 'email-config-001',
  resourceName: 'Email Configuration Update',
  metadata: { oldValue: '...', newValue: '...' }
});
```

Status: `pending_approval`

### 2. Action Review (System Admin Dashboard)

**System Admin** views pending actions in the Access Control dashboard:
- Tab: "Pending Approvals"
- Shows all pending actions awaiting authorization
- Displays resource details, permission type, and submission timestamp

### 3. Action Authorization

**System Admin** either approves or rejects:

**Approve:**
```typescript
await approveAccessAction(actionId, notes?: string);
```
Status: `approved` → Execution proceeds

**Reject:**
```typescript
await rejectAccessAction(actionId, rejectionReason: string);
```
Status: `rejected` → Action is blocked with reason logged

### 4. Audit Logging

All actions are logged with:
- User ID and role performing the action
- Permission required
- Resource type and ID
- Timestamp
- IP address (if available)
- Status (success/denied/error)

## Admin Role Permissions Matrix

### Super Admin
- **Inputter**: ALL 75+ admin permissions
- **Authorizer**: None (requires System Admin approval)
- **Workflow**: Inputs actions → System Admin approves → Executes

### System Admin
- **Inputter**: Limited to auditing/monitoring
  - system.audit.view / export
  - system.logs.view / export
  - analytics.dashboard.view
  - analytics.reports.view
  - operations.monitoring.view
- **Authorizer**: ALL 75+ admin permissions
- **Workflow**: Reviews and approves all Super Admin actions

### Admin Finance
- **Inputter**: Transaction view/create, reports, accounting, reconciliation view, budgets view/create, payments view
- **Authorizer**: Transaction approve/reject, reconciliation approve, budgets approve, payments process/approve

### Admin Content
- **Inputter**: Content view/create/edit, categories/tags management, reports
- **Authorizer**: Content approve/reject/publish/unpublish/delete

### Admin Support
- **Inputter**: Ticket view/create/edit, templates/categories, reports
- **Authorizer**: Ticket resolve/close

### Admin Fraud
- **Inputter**: Monitoring view, alerts view/investigate, reports
- **Authorizer**: Monitoring configure, alerts resolve, rules manage

### Admin Analytics
- **Inputter**: Dashboard/reports view/generate, data export
- **Authorizer**: Dimensions/metrics configure, alerts manage

### Admin Operations
- **Inputter**: Monitoring/processes/queue/jobs view, reports
- **Authorizer**: Processes start/stop, queue manage, jobs retry/cancel

## API Functions

### Access Control Management

```typescript
// Submit action for approval
submitAccessAction(data: {
  actionType: 'create' | 'update' | 'delete' | 'approve' | 'reject' | 'execute',
  permission: AdminPermission,
  resourceType: string,
  resourceId: string,
  resourceName: string,
  metadata?: Record<string, unknown>
}): Promise<AdminAccessAction>

// Get pending actions
getPendingAccessActions(): Promise<AdminAccessAction[]>

// Get actions with filters
getAccessActions(filters?: {
  status?: 'pending_approval' | 'approved' | 'rejected' | 'executed' | 'failed',
  userId?: string,
  permission?: AdminPermission,
  fromDate?: string,
  toDate?: string
}): Promise<AdminAccessAction[]>

// Approve action
approveAccessAction(actionId: string, notes?: string): Promise<AdminAccessAction>

// Reject action
rejectAccessAction(actionId: string, reason: string): Promise<AdminAccessAction>

// Get access logs
getAccessLogs(filters?: {
  userId?: string,
  action?: string,
  status?: 'success' | 'denied' | 'error',
  fromDate?: string,
  toDate?: string,
  limit?: number
}): Promise<AdminAccessLog[]>

// Check if user has permission
checkPermission(userId: string, permission: AdminPermission): 
  Promise<{ allowed: boolean, reason?: string }>

// Get role permissions
getRolePermissions(role: InternalUserRole): Promise<{
  role: InternalUserRole,
  inputterPermissions: AdminPermission[],
  authorizerPermissions: AdminPermission[]
}>

// Update role permissions
updateRolePermissions(
  role: InternalUserRole,
  data: {
    inputterPermissions?: AdminPermission[],
    authorizerPermissions?: AdminPermission[]
  }
): Promise<any>
```

## AdminAccessControl Component

Located at: `src/app/components/admin/AdminAccessControl.tsx`

### Features

1. **Pending Approvals Tab**
   - Lists all pending actions awaiting approval
   - Search by resource name, type, or user
   - Click to view details
   - Approve or reject with optional notes
   - Real-time status updates

2. **Access Logs Tab**
   - Complete audit trail of all admin actions
   - Filter by status (success/denied/error)
   - Search by user, action, or resource
   - Export capability
   - Timestamp and IP tracking

3. **Permission Matrix Tab**
   - View inputter/authorizer permissions for each role
   - Visual separation of permission tiers
   - Role documentation
   - Explanation of workflow

### Usage

```tsx
import { AdminAccessControl } from './components/admin/AdminAccessControl';

export function AccessControlPage() {
  return <AdminAccessControl />;
}
```

## Database Schema

### AdminAccessAction
```typescript
{
  id: string;                    // Unique identifier
  userId: string;                // Who inputted the action
  userRole: InternalUserRole;    // Their role
  actionType: string;            // create|update|delete|approve|reject|execute
  permission: AdminPermission;   // Required permission
  resourceType: string;          // What was affected
  resourceId: string;            // Specific resource
  resourceName: string;          // Display name
  inputtedBy: string;            // User who inputted
  inputtedAt: string;            // When inputted
  status: string;                // pending|approved|rejected|executed|failed
  approverRole?: InternalUserRole; // Who approved
  approvedBy?: string;           // User who approved
  approvedAt?: string;           // When approved
  rejectionReason?: string;      // Why rejected
  executedAt?: string;           // When executed
  metadata?: Record<string, any>; // Additional context
}
```

### AdminAccessLog
```typescript
{
  id: string;                    // Unique identifier
  userId: string;                // User performing action
  userRole: InternalUserRole;    // Their role
  action: string;                // What they did
  permission: AdminPermission;   // Permission used
  resourceType: string;          // What was affected
  resourceId: string;            // Specific resource
  status: 'success'|'denied'|'error'; // Result
  timestamp: string;             // When it happened
  ipAddress?: string;            // Their IP
  userAgent?: string;            // Their browser/client
  errorMessage?: string;         // If error, why
}
```

## Implementation Status

✅ **Completed**
- System Admin role created
- Permission matrix with 75+ permissions
- Two-tier inputter/authorizer workflow
- AdminAccessControl component with full UI
- API functions for managing actions and logs
- Audit logging infrastructure
- Role-based permission assignment
- Real-time dashboard updates

## Security Considerations

1. **Separation of Duties**: Super Admin cannot self-approve actions
2. **Audit Trail**: All actions logged with user, timestamp, IP
3. **Permission Validation**: Each action checked against role permissions
4. **Rejection Tracking**: Rejected actions tracked with reasons
5. **Execution Logging**: Actions logged when executed
6. **Metadata Capture**: Changes tracked with before/after values

## Next Steps

1. Backend API endpoints implementation
2. Email notifications for pending approvals
3. Scheduled action execution (e.g., batch operations)
4. Export functionality for compliance reports
5. Integration with external systems for actions
6. Custom permission rules engine
7. Time-based access restrictions
8. Multi-approver workflows for sensitive actions

## Testing

### Test Scenario 1: Super Admin Updates Email Config
1. Super Admin submits action to update email configuration
2. Action created in pending state
3. System Admin sees pending action in dashboard
4. System Admin approves
5. Action executed and logged

### Test Scenario 2: Super Admin Deletes User
1. Super Admin submits delete user action
2. System Admin reviews with metadata showing deleted user details
3. System Admin rejects with reason "User still has active subscriptions"
4. Super Admin sees rejection and addresses issue
5. Super Admin resubmits with updated metadata
6. System Admin approves
7. Action executed with full audit trail

### Test Scenario 3: Finance Admin Approves Bulk Transactions
1. Finance Admin (inputter) creates bulk transaction action
2. System Admin (authorizer) or Finance Admin (as appropriate) reviews
3. Approval triggers batch processing
4. Transaction log created for each item
5. Export option available for reports

## Support & Maintenance

For issues or questions about the access control system:
1. Review AdminAccessControl component documentation
2. Check Access Logs for failure reasons
3. Verify role permissions in Permission Matrix
4. Ensure user has required inputter/authorizer permissions
