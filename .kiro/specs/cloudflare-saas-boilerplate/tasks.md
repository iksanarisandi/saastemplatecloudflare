# Implementation Plan

## Phase 1: Project Foundation

- [x] 1. Initialize monorepo structure and configuration






  - [x] 1.1 Create root package.json with pnpm workspace configuration

    - Initialize pnpm workspace with turbo for build orchestration
    - Configure TypeScript base config for shared settings
    - _Requirements: 1.1, 1.2_

  - [x] 1.2 Create apps/api package for Hono.js Workers

    - Set up Hono.js with TypeScript
    - Configure wrangler.toml with D1, R2, KV bindings
    - _Requirements: 1.2, 1.3_

  - [x] 1.3 Create apps/web package for SvelteKit frontend

    - Initialize SvelteKit with adapter-cloudflare
    - Configure Tailwind CSS and shadcn/svelte
    - _Requirements: 1.1, 11.1_
  - [x] 1.4 Create packages/shared for shared types and utilities


    - Define TypeScript interfaces for all entities
    - Create Zod schemas for validation
    - _Requirements: 1.1_

  - [x] 1.5 Create packages/db for database schema and repositories

    - Define SQL migration files
    - Create repository interfaces
    - _Requirements: 1.1, 10.1_

  - [x] 1.6 Create environment configuration files

    - Create .env.example with all required variables
    - Create wrangler.toml templates for dev/prod
    - _Requirements: 1.4, 1.5_


- [x] 2. Checkpoint - Ensure project builds successfully




  - Ensure all tests pass, ask the user if questions arise.

## Phase 2: Database Layer

- [x] 3. Implement database schema and migrations





  - [x] 3.1 Create initial migration with all tables


    - Write SQL for tenants, users, sessions, subscription_plans, subscriptions, payments, stored_files, notifications, migrations tables
    - Add indexes for performance
    - _Requirements: 10.1, 10.2_

  - [x] 3.2 Implement migration runner utility

    - Create migrate.ts script for applying migrations
    - Support up/down migrations
    - Track applied migrations in migrations table
    - _Requirements: 10.1, 10.3, 10.4, 10.5_
  - [ ]* 3.3 Write property test for migration order
    - **Property 33: Migration Order Preservation**
    - **Validates: Requirements 10.1**
  - [ ]* 3.4 Write property test for migration rollback
    - **Property 34: Migration Rollback Round-Trip**
    - **Validates: Requirements 10.3**


- [x] 4. Implement base repository pattern





  - [x] 4.1 Create BaseRepository class with CRUD operations

    - Implement prepared statements for all queries
    - Add tenant scoping to all queries
    - _Requirements: 4.2, 4.5, 14.2_
  - [ ]* 4.2 Write property test for tenant data isolation
    - **Property 9: Tenant Data Isolation**
    - **Validates: Requirements 4.2, 4.5**

  - [x] 4.3 Implement TenantRepository
    - CRUD operations for tenants
    - Settings management
    - _Requirements: 4.1, 4.3_
  - [ ]* 4.4 Write property test for tenant ID uniqueness
    - **Property 10: Tenant ID Uniqueness**
    - **Validates: Requirements 4.1**
  - [ ]* 4.5 Write property test for tenant settings persistence
    - **Property 12: Tenant Settings Persistence**

    - **Validates: Requirements 4.3**
  - [x] 4.6 Implement UserRepository
    - CRUD operations for users
    - Search and pagination
    - _Requirements: 3.1, 3.2, 3.5_
  - [ ]* 4.7 Write property test for user pagination
    - **Property 6: User Pagination Invariant**
    - **Validates: Requirements 3.1**
  - [x]* 4.8 Write property test for user search

    - **Property 7: User Search Filter Accuracy**
    - **Validates: Requirements 3.5**
  - [x] 4.9 Implement SessionRepository
    - Create, validate, delete sessions
    - _Requirements: 2.2, 2.5, 2.6_


- [x] 5. Checkpoint - Database layer complete




  - Ensure all tests pass, ask the user if questions arise.

## Phase 3: Authentication System



- [x] 6. Implement authentication service with Lucia



  - [x] 6.1 Configure Lucia adapter for D1


    - Set up Lucia with D1 session storage
    - Configure session expiration
    - _Requirements: 2.1, 2.2_

  - [x] 6.2 Implement user registration

    - Email validation, password hashing
    - Create user and tenant (if new)
    - _Requirements: 2.1_

  - [x] 6.3 Implement login/logout functionality
    - Credential validation
    - Session creation and invalidation
    - _Requirements: 2.2, 2.3, 2.5_
  - [ ]* 6.4 Write property test for login creates valid session
    - **Property 2: Login Creates Valid Session**
    - **Validates: Requirements 2.2, 2.6**
  - [ ]* 6.5 Write property test for invalid credentials rejection
    - **Property 3: Invalid Credentials Rejection**
    - **Validates: Requirements 2.3**
  - [ ]* 6.6 Write property test for logout invalidates session
    - **Property 4: Logout Invalidates Session**

    - **Validates: Requirements 2.5**
  - [x] 6.7 Implement session serialization/deserialization
    - JSON encoding for session data
    - _Requirements: 2.7, 2.8_
  - [x]* 6.8 Write property test for session round-trip

    - **Property 1: Session Data Round-Trip**
    - **Validates: Requirements 2.7, 2.8**
  - [x] 6.9 Implement password reset flow
    - Token generation and validation
    - _Requirements: 2.4_
  - [ ]* 6.10 Write property test for reset token uniqueness
    - **Property 5: Password Reset Token Uniqueness**
    - **Validates: Requirements 2.4**


- [x] 7. Implement authentication middleware





  - [x] 7.1 Create auth middleware for Hono


    - Session validation
    - User context injection
    - _Requirements: 9.1_

  - [x] 7.2 Create tenant middleware

    - Tenant scoping for requests
    - Tenant status validation
    - _Requirements: 4.2, 4.4_
  - [ ]* 7.3 Write property test for deactivated tenant access denial
    - **Property 11: Deactivated Tenant Access Denial**
    - **Validates: Requirements 4.4**





- [x] 8. Implement user management service


  - [x] 8.1 Create UserService with admin operations

    - List, create, update, deactivate users
    - Role management
    - _Requirements: 3.1, 3.2, 3.3, 3.4_
  - [ ]* 8.2 Write property test for user deactivation cascades
    - **Property 8: User Deactivation Cascades to Sessions**
    - **Validates: Requirements 3.4**




- [x] 9. Checkpoint - Authentication complete


  - Ensure all tests pass, ask the user if questions arise.

## Phase 4: Core Business Logic


- [x] 10. Implement subscription plan management




  - [x] 10.1 Create SubscriptionPlanRepository


    - CRUD for subscription plans
    - Active plans filtering
    - _Requirements: 6.1, 6.5_

  - [x] 10.2 Create SubscriptionService

    - Plan management
    - Feature access checking
    - _Requirements: 6.1, 6.4_
  - [ ]* 10.3 Write property test for active plans filter
    - **Property 18: Active Plans Filter**
    - **Validates: Requirements 6.1**
  - [ ]* 10.4 Write property test for feature access
    - **Property 19: Feature Access Matches Subscription**
    - **Validates: Requirements 6.4**

- [x] 11. Implement subscription management






  - [x] 11.1 Create SubscriptionRepository

    - CRUD for subscriptions
    - Expiration handling
    - _Requirements: 6.2, 6.3_

  - [x] 11.2 Implement subscription lifecycle

    - Create subscription on payment confirmation
    - Handle expiration
    - _Requirements: 6.2, 6.3_
  - [ ]* 11.3 Write property test for expired subscription access
    - **Property 20: Expired Subscription Restricts Access**
    - **Validates: Requirements 6.3**


- [x] 12. Implement payment system




  - [x] 12.1 Create PaymentRepository


    - CRUD for payments
    - Status filtering
    - _Requirements: 5.1, 5.3_

  - [x] 12.2 Create PaymentService

    - Payment creation with pending status
    - Confirmation and rejection flows
    - _Requirements: 5.1, 5.4, 5.5_
  - [ ]* 12.3 Write property test for payment creation status
    - **Property 14: Payment Creation Sets Pending Status**
    - **Validates: Requirements 5.1**
  - [ ]* 12.4 Write property test for pending payments filter
    - **Property 17: Pending Payments Filter**
    - **Validates: Requirements 5.3**
  - [ ]* 12.5 Write property test for payment confirmation
    - **Property 15: Payment Confirmation Updates Status**
    - **Validates: Requirements 5.4**
  - [ ]* 12.6 Write property test for payment rejection
    - **Property 16: Payment Rejection Preserves Reason**
    - **Validates: Requirements 5.5**


  - [x] 12.7 Implement payment serialization

    - JSON encoding for API responses
    - _Requirements: 5.7, 5.8_
  - [ ]* 12.8 Write property test for payment round-trip
    - **Property 13: Payment Data Round-Trip**
    - **Validates: Requirements 5.7, 5.8**


- [x] 13. Checkpoint - Core business logic complete




  - Ensure all tests pass, ask the user if questions arise.


## Phase 5: Storage & Notifications

- [x] 14. Implement file storage service





  - [x] 14.1 Create StorageService with R2 integration


    - File upload with validation
    - Signed URL generation
    - File deletion
    - _Requirements: 8.1, 8.2, 8.3_
  - [x] 14.2 Create StoredFileRepository


    - CRUD for file metadata
    - Tenant-scoped listing
    - _Requirements: 8.4_
  - [ ]* 14.3 Write property test for file type validation
    - **Property 24: File Type Validation**
    - **Validates: Requirements 8.1**
  - [ ]* 14.4 Write property test for file size validation
    - **Property 25: File Size Validation**
    - **Validates: Requirements 8.5**
  - [ ]* 14.5 Write property test for signed URL expiration
    - **Property 26: Signed URL Expiration**
    - **Validates: Requirements 8.2**
  - [ ]* 14.6 Write property test for file deletion consistency
    - **Property 27: File Deletion Consistency**
    - **Validates: Requirements 8.3**
  - [ ]* 14.7 Write property test for file listing tenant scope
    - **Property 28: File Listing Tenant Scope**
    - **Validates: Requirements 8.4**


- [x] 15. Implement notification system




  - [x] 15.1 Create NotificationService with channel abstraction


    - Channel routing logic
    - Retry mechanism
    - _Requirements: 7.1, 7.4, 7.5_

  - [x] 15.2 Implement TelegramChannel adapter

    - Telegram Bot API integration
    - Message formatting
    - _Requirements: 7.2_

  - [x] 15.3 Implement EmailChannel adapter

    - Email provider API integration
    - Template support
    - _Requirements: 7.3_

  - [x] 15.4 Implement notification payload serialization

    - JSON encoding for channel APIs
    - _Requirements: 7.6_
  - [ ]* 15.5 Write property test for channel routing
    - **Property 21: Notification Channel Routing**
    - **Validates: Requirements 7.1, 7.5**
  - [ ]* 15.6 Write property test for notification serialization
    - **Property 22: Notification Payload Serialization**
    - **Validates: Requirements 7.6**
  - [ ]* 15.7 Write property test for failed notification retry
    - **Property 23: Failed Notification Retry**
    - **Validates: Requirements 7.4**

- [x] 16. Checkpoint - Storage and notifications complete





  - Ensure all tests pass, ask the user if questions arise.

## Phase 6: API Layer

- [ ] 17. Implement API infrastructure


  - [x] 17.1 Create API response utilities



    - Consistent response format
    - Error response helpers
    - _Requirements: 9.2, 9.3_
  - [ ]* 17.2 Write property test for API response consistency
    - **Property 29: API Response Consistency**
    - **Validates: Requirements 9.2, 9.6**
  - [ ]* 17.3 Write property test for error status codes
    - **Property 30: API Error Status Codes**
    - **Validates: Requirements 9.3**
  - [ ] 17.4 Implement rate limiting middleware
    - Request counting with KV
    - Rate limit headers
    - _Requirements: 9.4_
  - [ ]* 17.5 Write property test for rate limit response
    - **Property 31: Rate Limit Response**
    - **Validates: Requirements 9.4**
  - [ ] 17.6 Implement request validation middleware
    - JSON body parsing
    - Zod schema validation
    - _Requirements: 9.5_
  - [ ]* 17.7 Write property test for request body validation
    - **Property 32: Request Body Validation**
    - **Validates: Requirements 9.5**



- [-] 18. Implement API routes


  - [-] 18.1 Create auth routes

    - POST /auth/register, /auth/login, /auth/logout
    - POST /auth/password-reset, /auth/password-reset/confirm
    - GET /auth/me
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5_
  - [-] 18.2 Create user management routes

    - GET /users, POST /users
    - GET /users/:id, PATCH /users/:id, DELETE /users/:id
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_
  - [-] 18.3 Create tenant routes

    - GET /tenants/:id, PATCH /tenants/:id
    - GET /tenants/:id/settings, PATCH /tenants/:id/settings
    - _Requirements: 4.1, 4.3_
  - [-] 18.4 Create subscription routes

    - GET /plans
    - GET /subscriptions, POST /subscriptions
    - GET /subscriptions/:id
    - _Requirements: 6.1, 6.2_
  - [-] 18.5 Create payment routes

    - GET /payments, POST /payments
    - POST /payments/:id/proof
    - POST /payments/:id/confirm, POST /payments/:id/reject
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5_
  - [x] 18.6 Create file storage routes


    - GET /files, POST /files
    - GET /files/:id, DELETE /files/:id
    - GET /files/:id/url
    - _Requirements: 8.1, 8.2, 8.3, 8.4_


- [x] 19. Implement webhook handlers





  - [x] 19.1 Create webhook infrastructure

    - Signature validation
    - Payload parsing
    - Handler routing
    - _Requirements: 12.1, 12.2, 12.5_
  - [ ]* 19.2 Write property test for webhook signature validation
    - **Property 36: Webhook Signature Validation**
    - **Validates: Requirements 12.1**
  - [ ]* 19.3 Write property test for webhook payload parsing
    - **Property 37: Webhook Payload Parsing**
    - **Validates: Requirements 12.5**
  - [ ]* 19.4 Write property test for webhook routing
    - **Property 38: Webhook Routing**
    - **Validates: Requirements 12.2**

  - [x] 19.5 Create payment webhook handler (for future gateway integration)

    - Handle payment status updates
    - _Requirements: 12.2, 12.4_


- [x] 20. Checkpoint - API layer complete




  - Ensure all tests pass, ask the user if questions arise.

## Phase 7: Logging & Security



- [x] 21. Implement logging system




  - [x] 21.1 Create structured logging service

    - JSON log format
    - Log levels
    - Context injection
    - _Requirements: 13.1, 13.2, 13.5_

  - [x] 21.2 Implement request logging middleware

    - Request/response logging
    - Duration tracking
    - _Requirements: 13.1_
  - [ ]* 21.3 Write property test for log entry completeness
    - **Property 39: Log Entry Completeness**
    - **Validates: Requirements 13.1**
  - [ ]* 21.4 Write property test for error log stack trace
    - **Property 40: Error Log Stack Trace**
    - **Validates: Requirements 13.2**
  - [ ]* 21.5 Write property test for log serialization
    - **Property 42: Log Entry Serialization**
    - **Validates: Requirements 13.5**


- [x] 22. Implement security features





  - [x] 22.1 Create input sanitization utilities


    - XSS prevention
    - HTML escaping
    - _Requirements: 14.1_
  - [ ]* 22.2 Write property test for XSS sanitization
    - **Property 43: XSS Sanitization**
    - **Validates: Requirements 14.1**

  - [x] 22.3 Implement security headers middleware

    - CSP, HSTS, X-Frame-Options
    - _Requirements: 14.3_
  - [ ]* 22.4 Write property test for security headers
    - **Property 44: Security Headers Presence**
    - **Validates: Requirements 14.3**

  - [x] 22.5 Implement CORS middleware

    - Origin validation
    - Preflight handling
    - _Requirements: 14.4_
  - [ ]* 22.6 Write property test for CORS validation
    - **Property 45: CORS Origin Validation**
    - **Validates: Requirements 14.4**

  - [x] 22.7 Implement data encryption utilities

    - Encrypt sensitive fields
    - Key management
    - _Requirements: 14.5_
  - [ ]* 22.8 Write property test for data encryption
    - **Property 46: Sensitive Data Encryption**
    - **Validates: Requirements 14.5**

- [x] 23. Checkpoint - Logging and security complete





  - Ensure all tests pass, ask the user if questions arise.

## Phase 8: Frontend Implementation



- [x] 24. Implement frontend API client



  - [x] 24.1 Create typed API client


    - Fetch wrapper with auth headers
    - Error handling
    - Type-safe responses
    - _Requirements: 9.1, 9.2_

  - [x] 24.2 Create Svelte stores for state management

    - Auth store
    - User store
    - Notification store
    - _Requirements: 2.6_


- [x] 25. Implement authentication pages





  - [x] 25.1 Create login page

    - Email/password form
    - Error display
    - _Requirements: 2.2, 2.3_

  - [x] 25.2 Create registration page

    - Registration form with validation
    - _Requirements: 2.1_

  - [x] 25.3 Create password reset pages

    - Request reset form
    - Reset confirmation form
    - _Requirements: 2.4_



- [x] 26. Implement dashboard and admin pages




  - [x] 26.1 Create main dashboard layout

    - Navigation
    - User menu
    - _Requirements: 11.1_

  - [x] 26.2 Create user management page (admin)

    - User list with pagination
    - User CRUD modals
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 11.4_
  - [x] 26.3 Create payment management page (admin)


    - Pending payments list
    - Confirm/reject actions
    - _Requirements: 5.3, 5.4, 5.5_
  - [x] 26.4 Create subscription plans page


    - Plan listing
    - Subscribe flow
    - _Requirements: 6.1, 6.2_


- [x] 27. Implement payment flow pages




  - [x] 27.1 Create payment initiation page


    - Plan selection
    - QRIS display
    - _Requirements: 5.1_

  - [x] 27.2 Create payment proof upload page

    - File upload component
    - Status tracking
    - _Requirements: 5.2_

  - [x] 27.3 Create payment history page

    - Payment list
    - Status display
    - _Requirements: 5.3_

- [x] 28. Checkpoint - Frontend complete





  - Ensure all tests pass, ask the user if questions arise.


## Phase 9: UI Components & Theming

- [x] 29. Set up shadcn/svelte components






  - [x] 29.1 Configure shadcn/svelte with Tailwind

    - Install and configure components
    - Set up CSS variables for theming
    - _Requirements: 11.1, 11.2_

  - [x] 29.2 Create form components

    - Input, Select, Checkbox, Radio
    - Form validation display
    - _Requirements: 11.3_

  - [x] 29.3 Create data display components

    - Table with sorting and pagination
    - Cards, Badges
    - _Requirements: 11.4_

  - [x] 29.4 Create feedback components

    - Toast notifications
    - Loading states
    - Modals
    - _Requirements: 11.5_

  - [x] 29.5 Implement dark mode toggle

    - Theme switching
    - Persist preference
    - _Requirements: 11.2_

## Phase 10: Deployment & Documentation




- [x] 30. Create deployment configuration


  - [x] 30.1 Create production wrangler.toml


    - Production bindings
    - Environment variables
    - _Requirements: 1.2, 1.5_

  - [x] 30.2 Create deployment scripts

    - Deploy API to Workers
    - Deploy frontend to Pages
    - _Requirements: 1.5_

  - [x] 30.3 Create setup scripts

    - D1 database creation
    - R2 bucket creation
    - Initial migration
    - _Requirements: 1.3_



- [x] 31. Create seed data and examples




  - [x] 31.1 Create database seed script

    - Default admin user
    - Sample subscription plans
    - _Requirements: 1.3_

  - [x] 31.2 Create example .env files

    - Development configuration
    - Production configuration template
    - _Requirements: 1.4_



- [x] 32. Final Checkpoint - Ensure all tests pass



  - Ensure all tests pass, ask the user if questions arise.
