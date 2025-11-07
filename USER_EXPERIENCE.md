# User Experience Guide

Complete user experience flows for Authentication and Sync modules - what users see and experience at each step.

## Table of Contents

- [Overview](#overview)
- [Authentication User Experience](#authentication-user-experience)
- [Sync User Experience](#sync-user-experience)
- [Combined Workflows](#combined-workflows)
- [Error Scenarios](#error-scenarios)
- [Offline Experience](#offline-experience)

---

## Overview

This guide describes the user experience from the perspective of different user types:
- **Super Admin** - System administrator setting up stores
- **Store Manager** - Managing branches and terminals
- **Terminal Operator** - Setting up and using POS terminals
- **Cashier/User** - Daily operations on terminals

---

## Authentication User Experience

### 1. Initial System Setup (Super Admin)

#### Step 0: Create Initial Super Admin (First Time Only)
**What the user sees:**
- Setup screen with form:
  - Username field
  - Email field
  - Password field
  - First name and last name fields
  - Optional phone field
- "Create Super Admin" button
- Information message: "This is the initial setup. Create your super admin account."

**What happens:**
- User fills out the form
- System checks if any super admin exists
- If no super admin exists: Account is created with SUPER_ADMIN role
- If super admin exists: Error message appears
- Welcome email sent to new super admin
- Success message appears

**User experience:**
- Clear setup process
- One-time operation
- Immediate confirmation
- Ready to log in

---

#### Step 1: Super Admin Login
**What the user sees:**
- Login screen with username and password fields
- "Sign In" button
- Optional "Forgot Password?" link

**What happens:**
- User enters credentials
- System validates and checks account status
- If successful: User sees dashboard with store management options
- If failed: Error message appears, attempt counter increments
- After 5 failures: Account locks, email notification sent

**User experience:**
- Smooth login process
- Clear error messages
- Security feedback on failed attempts
- Immediate access to dashboard on success

---

#### Step 2: Register Store
**What the user sees:**
- Store registration form with fields:
  - Store code (e.g., "STORE001")
  - Store name
  - Legal name
  - Contact information (email, phone)
  - Address details
  - Timezone and currency settings
- "Register Store" button

**What happens:**
- User fills out form
- System validates data
- Store is created in database
- User sees success message with store ID
- User can now register branches for this store

**User experience:**
- Clear form with helpful labels
- Validation feedback on invalid fields
- Success confirmation with next steps
- Store appears in store list immediately

---

#### Step 3: Register Branch
**What the user sees:**
- Branch registration form:
  - Store selection (dropdown of available stores)
  - Branch code
  - Branch name
  - Contact information
  - Address details
  - Tax and currency settings
- "Register Branch" button

**What happens:**
- User selects store and fills branch details
- System validates and creates branch
- Success message appears
- Branch is now available for terminal registration

**User experience:**
- Intuitive form flow
- Store selection shows only accessible stores
- Immediate confirmation
- Branch ready for terminal setup

---

#### Step 4: Register Terminal
**What the user sees:**
- Terminal registration form:
  - Store and branch selection
  - Terminal code and name
  - Hardware information (MAC address, serial number)
  - Feature selection (POS, Inventory, etc.)
  - IP restrictions (optional)
- "Register Terminal" button

**What happens:**
- User enters terminal details
- System generates:
  - Unique activation code (6 digits)
  - API key for authentication
- Success screen shows:
  - Activation code (prominently displayed)
  - API key (for reference)
  - Expiration time (24 hours)
- Email sent to admin with activation details

**User experience:**
- Clear activation code display
- Warning about 24-hour expiration
- Email confirmation received
- Ready to activate terminal

---

#### Step 5: Activate Terminal (First Time)
**What the terminal operator sees:**
- Terminal startup screen
- "Terminal Not Activated" message
- Activation form with:
  - Activation code input field
  - "Activate Terminal" button
  - Optional: Hardware info display (MAC address)

**What happens:**
- Operator enters activation code from registration
- System verifies code and hardware
- Terminal activates successfully
- Operator sees:
  - Success message
  - Terminal information (store, branch, location)
  - "Login Required" screen

**User experience:**
- Simple activation process
- Clear instructions
- Immediate feedback
- Smooth transition to login

---

#### Step 6: Terminal Authentication (Normal Operation)
**What the terminal operator sees:**
- Terminal startup screen
- "Connecting to server..." message
- Automatic authentication in progress

**What happens:**
- Terminal automatically authenticates using stored API key
- System verifies terminal status and hardware
- Terminal receives authentication token
- If successful: User login screen appears
- If failed: Error message with retry option

**User experience:**
- Seamless automatic authentication
- Fast connection process
- Clear error messages if connection fails
- Option to retry or work offline

---

#### Step 7: Create User Account
**What the admin sees:**
- User creation form:
  - Username and email
  - Password (or generate temporary)
  - Personal information (name, phone)
  - Role selection (dropdown)
  - Permission checkboxes
  - "Must change password on first login" option
- "Create User" button

**What happens:**
- Admin fills form and submits
- System creates user account
- Success message appears
- Welcome email sent to new user
- User appears in user list

**User experience:**
- Intuitive user creation
- Role selection with descriptions
- Immediate confirmation
- Email notification to new user

---

#### Step 8: User Login
**What the user sees:**
- Login screen with:
  - Username field
  - Password field
  - "Sign In" button
  - Optional: "Forgot Password?" link
  - Optional: PIN login option (for quick access)

**What happens:**
- User enters credentials
- System validates and checks permissions
- If successful:
  - Dashboard loads with user-specific features
  - User sees their role and permissions
  - Session starts
- If failed:
  - Error message appears
  - Attempt counter increments
  - After 5 failures: Account locks, email sent

**User experience:**
- Quick login process
- Personalized dashboard
- Clear permission indicators
- Security feedback on failures

---

#### Step 9: Password Management
**Change Password:**
- User navigates to "Change Password" section
- Enters current password and new password
- Confirms new password
- System validates and updates
- Success message appears
- Email notification sent with security details

**Request Password Reset:**
- User clicks "Forgot Password?"
- Enters email address
- System sends reset email (if account exists)
- User receives email with reset link
- User clicks link and sets new password
- Confirmation message appears

**User experience:**
- Easy password management
- Clear security notifications
- Helpful reset process
- Email confirmations for peace of mind

---

### 2. Daily Operations

#### Morning Routine
**Terminal Startup:**
- Terminal operator turns on terminal
- Automatic authentication happens
- User login screen appears
- Cashier logs in with credentials or PIN
- Dashboard loads with today's tasks

**User experience:**
- Fast startup process
- Minimal waiting time
- Quick login options
- Ready to work immediately

---

#### Session Management
**Active Session:**
- User sees session timer
- Automatic token refresh happens in background
- No interruption to work
- Session remains active during use

**Session Expiry:**
- Warning appears before expiration
- Option to extend session
- If expired: Graceful logout
- User can log back in quickly

**User experience:**
- Uninterrupted workflow
- Clear session status
- Smooth token refresh
- Easy re-authentication

---

#### Logout
**What the user sees:**
- "Logout" button in user menu
- Confirmation dialog (optional)
- Logout confirmation message

**What happens:**
- User session ends
- Token is invalidated
- User returns to login screen
- Security: All tokens revoked

**User experience:**
- Simple logout process
- Clear confirmation
- Secure session termination
- Quick return to login

---

## Sync User Experience

### 1. Automatic Sync Experience

#### Background Sync
**What the user sees:**
- No visible interruption
- Small sync indicator (optional) showing sync status
- Data updates happen automatically

**What happens:**
- Terminal syncs with central server periodically
- Product prices update automatically
- Inventory levels refresh
- Customer data syncs
- All happens in background

**User experience:**
- Seamless operation
- Always up-to-date data
- No manual intervention needed
- Uninterrupted workflow

---

#### Real-Time Updates
**What the user sees:**
- Data appears to update instantly
- No loading delays
- Smooth transitions

**What happens:**
- Server pushes updates via WebSocket
- Terminal receives updates immediately
- UI refreshes automatically
- No user action required

**User experience:**
- Instant data updates
- No refresh needed
- Always current information
- Professional feel

---

### 2. Manual Sync Experience

#### Trigger Manual Sync
**What the user sees:**
- "Sync Now" button in settings or toolbar
- Sync progress indicator
- Status messages:
  - "Syncing products..."
  - "Syncing inventory..."
  - "Syncing customers..."
  - "Sync complete!"

**What happens:**
- User clicks sync button
- System syncs all pending changes
- Progress updates in real-time
- Success message appears
- Data refreshes automatically

**User experience:**
- Clear sync status
- Progress feedback
- Completion confirmation
- Immediate data refresh

---

#### Sync Status Screen
**What the user sees:**
- Dashboard showing:
  - Last sync time
  - Sync status (Success, Pending, Failed)
  - Pending changes count
  - Failed syncs list (if any)
  - Sync statistics

**What happens:**
- User views sync status
- Can see what needs syncing
- Can retry failed syncs
- Can view sync history

**User experience:**
- Transparent sync status
- Easy to understand
- Actionable information
- Control over sync process

---

### 3. Conflict Resolution Experience

#### Conflict Detection
**What the user sees:**
- Notification: "Data conflict detected"
- Conflict details screen showing:
  - What data conflicted
  - Terminal version vs. Central version
  - Side-by-side comparison
  - Resolution options

**What happens:**
- System detects conflict during sync
- User is notified
- Conflict details displayed
- User chooses resolution

**User experience:**
- Clear conflict notification
- Easy to understand differences
- Simple resolution process
- Confidence in data integrity

---

#### Resolving Conflicts
**What the user sees:**
- Conflict resolution screen with:
  - Terminal data (left side)
  - Central data (right side)
  - "Use Terminal Data" button
  - "Use Central Data" button
  - "Merge" option (if applicable)
  - "Cancel" button

**What happens:**
- User reviews both versions
- Selects preferred version or merge
- System applies resolution
- Sync continues automatically
- Confirmation message appears

**User experience:**
- Clear comparison view
- Easy decision making
- Quick resolution
- Immediate confirmation

---

### 4. Sync Priority Experience

#### High Priority Sync
**What the user sees:**
- Immediate sync for critical data:
  - Sales orders
  - Payments
  - Inventory changes
- Automatic sync happens instantly
- No user action needed

**What happens:**
- Critical operations trigger immediate sync
- Data syncs in real-time
- No delay in updates
- Central server always current

**User experience:**
- Instant updates for important data
- No waiting
- Reliable sync
- Peace of mind

---

#### Medium Priority Sync
**What the user sees:**
- Periodic sync for:
  - Product updates
  - Customer changes
  - Category updates
- Happens automatically every few minutes
- No interruption

**What happens:**
- System syncs at regular intervals
- Updates accumulate and sync together
- Efficient batch processing
- Background operation

**User experience:**
- Regular updates
- No manual intervention
- Efficient operation
- Always current data

---

#### Low Priority Sync
**What the user sees:**
- Occasional sync for:
  - Reference data
  - Historical records
  - Non-critical updates
- Happens less frequently
- No visible impact

**What happens:**
- System syncs when convenient
- Doesn't impact performance
- Ensures data consistency
- Background operation

**User experience:**
- Unnoticeable operation
- No performance impact
- Complete data consistency
- Efficient resource usage

---

## Combined Workflows

### 1. New Terminal Setup Flow

**Day 1: Registration**
1. Admin registers terminal in system
2. Receives activation code via email
3. Terminal operator sees activation screen
4. Operator enters activation code
5. Terminal activates successfully
6. Terminal authenticates automatically
7. Initial data sync begins
8. User login screen appears

**Day 1: First Use**
1. Cashier logs in
2. System syncs user permissions
3. Dashboard loads
4. Product data syncs in background
5. Terminal ready for operations

**User experience:**
- Smooth setup process
- Clear instructions at each step
- Automatic data synchronization
- Ready to use quickly

---

### 2. Daily Operations Flow

**Morning:**
1. Terminal starts automatically
2. Authenticates with server
3. User logs in
4. System syncs overnight changes
5. Dashboard shows current data
6. Ready for sales

**During Day:**
1. Sales transactions sync immediately
2. Inventory updates in real-time
3. Product changes sync automatically
4. Customer data stays current
5. All operations seamless

**Evening:**
1. Final sync before closing
2. All data synchronized
3. User logs out
4. Terminal ready for next day

**User experience:**
- Smooth daily operations
- No manual sync needed
- Always current data
- Reliable system

---

### 3. New User Onboarding

**Admin Side:**
1. Admin creates user account
2. Sets initial password
3. Assigns role and permissions
4. User receives welcome email

**User Side:**
1. User receives email with credentials
2. Logs in for first time
3. System prompts password change (if required)
4. User sets new password
5. Dashboard loads with appropriate features
6. User can start working

**User experience:**
- Clear onboarding process
- Helpful welcome email
- Easy first login
- Immediate productivity

---

## Error Scenarios

### 1. Authentication Errors

**Account Locked:**
- User sees: "Account locked. Please try again in 30 minutes."
- Email notification sent
- Clear unlock time displayed
- Option to contact admin

**Invalid Credentials:**
- User sees: "Invalid username or password"
- Attempt counter shown (if applicable)
- Clear error message
- Option to reset password

**Token Expired:**
- User sees: "Session expired. Please log in again."
- Smooth redirect to login
- No data loss
- Quick re-authentication

**User experience:**
- Clear error messages
- Helpful guidance
- Easy recovery
- No frustration

---

### 2. Sync Errors

**Connection Lost:**
- User sees: "Connection lost. Working offline..."
- System continues in offline mode
- Changes queued for sync
- Automatic retry when connection restored

**Sync Failed:**
- User sees: "Sync failed. Retrying..."
- Automatic retry attempts
- Manual retry option available
- Clear error details

**Data Conflict:**
- User sees: "Data conflict detected"
- Clear conflict explanation
- Easy resolution options
- Confidence in resolution

**User experience:**
- Graceful error handling
- Clear status messages
- Easy recovery
- No data loss

---

### 3. Terminal Errors

**Activation Failed:**
- User sees: "Activation failed. Please check activation code."
- Clear error message
- Option to retry
- Contact admin option

**Terminal Not Active:**
- User sees: "Terminal not activated. Please contact administrator."
- Clear instructions
- Help contact information
- No confusion

**Hardware Mismatch:**
- User sees: "Terminal hardware verification failed."
- Clear explanation
- Contact admin option
- Security message

**User experience:**
- Helpful error messages
- Clear next steps
- Easy support access
- Professional handling

---

## Offline Experience

### 1. Terminal Goes Offline

**What the user sees:**
- "Offline Mode" indicator appears
- System continues working normally
- Changes are queued
- Sync status shows "Pending"

**What happens:**
- Terminal detects connection loss
- Switches to offline mode
- Uses local data
- Queues changes for sync
- Automatic retry when online

**User experience:**
- Seamless transition
- No interruption
- Clear status indication
- Confidence in data safety

---

### 2. Working Offline

**Sales Operations:**
- User can process sales normally
- Local inventory updates
- Customer data available
- All operations work

**Data Access:**
- Cached product data available
- Customer information accessible
- Historical data viewable
- Full functionality maintained

**User experience:**
- Uninterrupted operations
- No limitations
- Reliable offline mode
- Professional experience

---

### 3. Coming Back Online

**What the user sees:**
- "Reconnecting..." message
- "Syncing changes..." indicator
- Sync progress updates
- "Back online" confirmation

**What happens:**
- Connection restored
- Automatic authentication
- Queued changes sync
- Latest data downloads
- System fully synchronized

**User experience:**
- Automatic reconnection
- Clear sync progress
- Seamless transition
- No manual intervention

---

## User Interface Elements

### 1. Status Indicators

**Authentication Status:**
- Green dot: Authenticated
- Yellow dot: Token expiring soon
- Red dot: Authentication required
- Lock icon: Account locked

**Sync Status:**
- Green: Synced
- Yellow: Syncing
- Red: Sync failed
- Gray: Offline

**User experience:**
- Clear visual indicators
- Instant status understanding
- Color-coded for quick recognition
- Always visible

---

### 2. Notifications

**Success Notifications:**
- Green toast message
- Brief display
- Auto-dismiss
- Non-intrusive

**Error Notifications:**
- Red toast message
- Clear error text
- Action buttons if needed
- Dismissible

**Warning Notifications:**
- Yellow toast message
- Important information
- Action required
- Persistent until action

**User experience:**
- Appropriate notification types
- Clear messaging
- Actionable when needed
- Professional appearance

---

### 3. Progress Indicators

**Sync Progress:**
- Progress bar
- Percentage complete
- Current operation
- Time remaining (if applicable)

**Loading States:**
- Spinner for quick operations
- Progress bar for longer operations
- Skeleton screens for content loading
- Smooth transitions

**User experience:**
- Clear progress indication
- Appropriate for operation length
- Professional appearance
- Reduces perceived wait time

---

## Summary

### Key User Experience Principles

1. **Simplicity** - Clear, intuitive interfaces
2. **Transparency** - Users always know what's happening
3. **Reliability** - Consistent, predictable behavior
4. **Speed** - Fast operations, minimal waiting
5. **Feedback** - Clear status and error messages
6. **Recovery** - Easy error recovery
7. **Offline Support** - Uninterrupted operations
8. **Security** - Clear security indicators
9. **Automation** - Minimal manual intervention
10. **Professional** - Polished, production-ready experience

### User Journey Highlights

- **Setup**: Smooth, guided process from store registration to terminal activation
- **Daily Use**: Seamless authentication and automatic synchronization
- **Error Handling**: Clear messages with easy recovery
- **Offline Mode**: Full functionality without connection
- **Data Integrity**: Automatic conflict resolution and sync management

The system is designed to be invisible to users - authentication and sync happen automatically, allowing users to focus on their work without technical concerns.

---

**Last Updated**: 2025
**Version**: 1.0.0

