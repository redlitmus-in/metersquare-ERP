# Notification System Testing Guide

## Overview
This guide provides comprehensive testing scenarios for the MeterSquare ERP notification system, ensuring all roles receive proper notifications for new and existing purchases.

## System Components

### 1. Core Services
- **NotificationService** (`/services/notificationService.ts`)
  - Handles browser/system notifications
  - Role-based filtering
  - Permission management

- **PurchaseNotificationService** (`/services/purchaseNotificationService.ts`)
  - Purchase Requisition specific notifications
  - Workflow-based notifications

- **NotificationStore** (`/store/notificationStore.ts`)
  - State management with Zustand
  - Persistence across sessions

### 2. UI Components
- **NotificationSystem** (`/components/NotificationSystem.tsx`)
  - Bell icon with unread count
  - Notification panel
  - Toast notifications

## Testing Commands

### Browser Console Commands

```javascript
// Test notifications for current user role
testAllRoles.testCurrentUserRole()

// Test all roles sequentially (admin testing)
testAllRoles.testAllRolesSequentially()

// Check notification statistics
testAllRoles.checkNotificationStats()

// Clear all notifications
testAllRoles.clearAllNotifications()

// Mark all as read
testAllRoles.markAllAsRead()

// Test complete PR workflow
testPRWorkflow.testFullPRWorkflow()

// Test rejection workflow
testPRWorkflow.testRejectionWorkflow()

// Test role-based filtering
testPRWorkflow.testRoleBasedNotifications()
```

## Role-Specific Test Scenarios

### 1. Site Supervisor
**Receives Notifications When:**
- Their PR is finally approved by Technical Director
- Their PR is rejected by any approver
- System-wide announcements

**Test Command:**
```javascript
testAllRoles.testSiteSupervisor()
```

### 2. MEP Supervisor
**Receives Notifications When:**
- Their PR is finally approved
- Their PR is rejected
- System-wide announcements

**Test Command:**
```javascript
testAllRoles.testMEPSupervisor()
```

### 3. Procurement
**Receives Notifications When:**
- New PR submitted by Site/MEP Supervisor
- PR finally approved (ready for execution)
- PR rejected back to them for revision
- System-wide announcements

**Test Command:**
```javascript
testAllRoles.testProcurement()
```

### 4. Project Manager
**Receives Notifications When:**
- PR forwarded from Procurement for approval
- PR rejected back from Estimation/TD
- System-wide announcements

**Test Command:**
```javascript
testAllRoles.testProjectManager()
```

### 5. Estimation
**Receives Notifications When:**
- PR approved by PM and needs cost analysis
- High-value PRs requiring special attention
- System-wide announcements

**Test Command:**
```javascript
testAllRoles.testEstimation()
```

### 6. Technical Director
**Receives Notifications When:**
- PR requiring final approval
- Urgent PRs needing immediate attention
- System-wide announcements

**Test Command:**
```javascript
testAllRoles.testTechnicalDirector()
```

## Complete Workflow Testing

### Normal Approval Flow
1. Site Supervisor submits PR
2. Procurement receives notification → approves
3. Project Manager receives notification → approves
4. Estimation receives notification → approves
5. Technical Director receives notification → approves
6. Site Supervisor & Procurement receive approval notification

**Test Command:**
```javascript
testPRWorkflow.testFullPRWorkflow()
```

### Rejection Flow
1. PR gets rejected at any stage
2. Notification sent back to previous role
3. Revision and resubmission

**Test Command:**
```javascript
testPRWorkflow.testRejectionWorkflow()
```

## Debug Information

### Enable Debug Logging
Debug logging is automatically enabled and shows:
- Role filtering decisions
- Notification creation
- Store updates
- Permission status

### Check Console Logs
Look for these debug indicators:
- 🔍 Processing approval notification
- ✅ Notification passed role filter
- 🚫 Notification filtered
- 📥 Adding new notification
- 📊 Notification stats

## Verification Checklist

### For Each Role:
1. ✅ Login as the specific role
2. ✅ Run role-specific test command
3. ✅ Verify bell icon shows unread count
4. ✅ Click bell to see notification panel
5. ✅ Verify toast notifications appear
6. ✅ Check browser/system notifications (if enabled)
7. ✅ Verify notifications persist after refresh
8. ✅ Test marking as read/deleting

### System-Wide:
1. ✅ Notifications persist across sessions (no auto-clear)
2. ✅ Role-based filtering works correctly
3. ✅ No duplicate notifications
4. ✅ Browser tab title updates with count
5. ✅ Toast auto-dismiss after timeout
6. ✅ Urgent notifications require interaction

## Troubleshooting

### Common Issues:

1. **No Notifications Appearing**
   - Check user role in localStorage: `JSON.parse(localStorage.getItem('user'))`
   - Verify notification permissions: `Notification.permission`
   - Check console for filtering logs

2. **Notifications Cleared on Refresh**
   - Fixed: Auto-clear removed from notificationStore.ts
   - Notifications now persist across sessions

3. **Wrong Role Receiving Notifications**
   - Check targetRole in notification data
   - Verify role matching logic in notificationService.ts

4. **Duplicate Notifications**
   - Store checks for duplicate IDs
   - Check console for duplicate warnings

### Manual Cleanup:
```javascript
// Clear all notifications
testAllRoles.clearAllNotifications()

// Reset notification store
localStorage.removeItem('notification-store')

// Check current stats
testAllRoles.checkNotificationStats()
```

## Production Considerations

1. **Performance**
   - Notifications are batched
   - Old notifications auto-archived after 30 days
   - Maximum 100 notifications stored

2. **Security**
   - Role-based filtering on client and server
   - Sanitization of notification content
   - XSS protection in display

3. **User Experience**
   - Clear visual indicators
   - Sound for urgent notifications
   - Accessibility support

## API Integration

When backend is connected, notifications will trigger automatically on:
- POST `/purchase` - New PR creation
- GET `/purchase_email/{id}` - Email sent (approval request)
- PUT `/purchase/{id}` - Status updates (approval/rejection)

The frontend is ready to receive these notifications through the existing service architecture.