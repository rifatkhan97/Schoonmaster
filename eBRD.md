Enterprise Business Requirements Document (eBRD)
Product: Schoonmaster Operations Automation & Commercial Platform
Target Phase: Phase 1 (MVP) & Architectural Scalability Foundation
Prepared For: Schoonmaster BV & Engineering / Executive Leadership
Author: Principal SaaS Product Manager & Enterprise Systems Architect
1. Executive Summary & Strategic Vision
1.1 Business Goals & Executive Context
Schoonmaster BV operates a distributed cleaning workforce across multi-site commercial projects. Operations face significant friction caused by manual scheduling coordination, unstructured communication (WhatsApp/phone dependency), and reactive material fulfillment.
The primary business mandate for the Schoonmaster Operations Automation Platform (Phase 1) is to digitize and structure daily operations to reduce operational support calls and messages from cleaners by 60% to 75%. Concurrently, Schoonmaster is introducing a customer-facing portal and revenue stream for service bookings and commercial supply sales, paired with a modern digital marketing foundation.
1.2 Target Ideal Customer Profile (ICP) & Scope Boundaries
Internal Users (Operations): Commercial cleaning technicians, field supervisors, and operational admins.
External Users (Commercial Ordering): B2B facility managers, property managers, and residential clients requiring cleaning services or purchasing commercial supply inventory.
Explicit Phase 1 Exclusions: Native mobile apps (PWA required), customer accounts/portals for operations tracking, client dashboards, automated cleaner assignment algorithms, financial payroll/invoicing logic, and automated GPS/photo time-tracking.
1.3 Strategic Success Metrics (KPIs)
Metric Category
Baseline Target / KPI
Verification Method
 
Operational Efficiency
60%–75% reduction in inbound support calls/messages
Support ticket/call log auditing
System Adoption
≥ 90% weekly active cleaner log-ins
In-app user activity telemetry
Service Performance
Average web app page load time < 3.0 seconds on 3G/4G networks
Synthetic performance monitoring
Order Processing
100% digital capture of supply and service ordering details
Admin checkout conversion audit

2. User Personas & Permission Roles
2.1 Persona Definitions
System Administrator (ADM): Central office manager or ops executive managing global configurations, site master data, users, and catalog items.
Field Supervisor / Operations Manager (MGR): Regional manager overseeing shift allocations, material approvals, and site-level issue resolution.
Field Technician / Cleaner (CLN): Mobile field employee performing on-site services, viewing shifts, updating task checklists, and requesting inventory.
Platform Auditor & Compliance Officer (AUD): Internal/external stakeholder reviewing operational access trails, security posture, and GDPR compliance logs.
External Client - Service Requestor (C-SVC): Guest customer purchasing standard or custom cleaning services online.
External Client - Supply Purchaser (C-SUP): Guest customer purchasing physical cleaning inventory via online checkout.
2.2 Roles & Permissions Matrix (RBAC)
Functional Area
Admin (ADM)
Supervisor (MGR)
Field Cleaner (CLN)
Auditor (AUD)
Guest Customer (C-SVC / C-SUP)
 
Schedule & Shift Management
Full Control (C/R/U/D)
Edit & Assign (R/U)
Read Only (Assigned)
Read Only (R)
No Access
Task Checklist Definitions
Full Control (C/R/U/D)
Edit Tasks (R/U)
Toggle Checkboxes
Read Only (R)
No Access
Material Catalog & Requests
Full Catalog Control
Approve / Fulfill
Request & View Status
Read Only (R)
View Public Store
Issue Reports & SOPs
Manage & Resolve
Review & Resolve
Submit Report / View SOP
Read Only (R)
No Access
Audit Logs & Telemetry
Full Read
No Access
No Access
Full Read
No Access

3. Functional Requirements (FR)
3.1 Authentication & Multi-Tenant Access Control Module
Architectural Note: Phase 1 requires role separation between operational users (Admin/Cleaner) and guest checkout. The data schema must enforce multi-tenant isolation patterns (tenant_id partitioning) to support future white-label commercial expansion without structural database refactoring.
FR-101: Secure Role-Based Authentication
Requirement: The system shall authenticate internal users (ADM, MGR, CLN) using zero-trust session management and encrypted token standards (JWT/OIDC).
Acceptance Criteria:
User login requires a valid email/username and password via an encrypted HTTPS connection.
System returns an authenticated session context with explicit claims restricting interface capabilities to the assigned role.
System routes the user to their designated portal view immediately post-authentication (e.g., Cleaner Dashboard vs. Operations Center).
FR-102: Password Reset & Account Recovery
Requirement: The system shall provide an automated, self-service password recovery flow for internal staff.
Acceptance Criteria:
Clicking "Forgot Password?" triggers a single-use, time-bound (15-minute validity) reset link sent to the user's verified email address.
All password reset attempts must be recorded in system audit logs with originating IP addresses.
3.2 Field Operations & Cleaner Portal Module
FR-201: Dynamic Shift Schedule & Map Navigation Integration
Requirement: The system shall display the authenticated cleaner’s assigned weekly schedule, complete with site location details and Google Maps deep-linking.
Acceptance Criteria:
The system shall present shifts sorted chronologically, displaying: Project Name, Work Address, Shift Hours, and Special Notes.
Selecting the "Navigate" action triggers an external protocol launch to Google Maps passing the site's geo-coordinates/address string.
FR-202: Location Checklist Execution Engine
Requirement: The system shall present location-specific cleaning checklists for assigned shifts, allowing cleaners to toggle completion states.
Acceptance Criteria:
Checklists are configured dynamically per project site by Admins and are read-only regarding text content for cleaners.
Cleaner interaction is limited to state changes (Checked / Unchecked).
State transitions trigger real-time asynchronous API calls persisting completion timestamps and user IDs.
FR-203: Material Request & Status Lifecycle Management
Requirement: The system shall enable cleaners to select items from an active inventory catalog, request specific quantities, and track approval status.
Acceptance Criteria:
Cleaner selects items from an approved list, inputs positive integer quantities, and attaches optional notes.
Request status transitions dynamically through strict state nodes: Pending → Approved → Ready / Delivered.
The request history log must be readable by the submitting user at all times.
FR-204: Shift Availability & Unavailability Log
Requirement: The system shall capture cleaner availability states and specific time-block unavailability entries.
Acceptance Criteria:
Cleaner can mark specific dates/times as Not Available with an optional structural reason field.
Unavailability entries must immediately flag operational conflicts on the Admin schedule planning board.
FR-205: Structured Incident & Exception Reporting
Requirement: The system shall provide a rapid issue reporting workflow allowing cleaners to submit categorized incidents from site locations.
Acceptance Criteria:
Cleaner selects from predefined categories (e.g., Equipment Broken, Missing Key/Access, Safety Concern, Area Inaccessible).
Supports optional text notes and binary image payload attachments (JPEG/PNG, max 10MB).
Generates a trackable incident ticket with status indicators (Sent / Seen) updated when an Admin accesses the ticket.
FR-206: Standard Operating Procedures (SOP) Viewer
Requirement: The system shall store and present read-only instructions and safety protocols indexed per project.
Acceptance Criteria:
Instructions display distinct subsections: Cleaning Procedures, Safety Protocols, and Site Do's & Don'ts.
Content updates made by Admins must reflect instantly across field views without client-side cache refresh delays.
FR-207: Read-Receipt Audited Announcements
Requirement: The system shall broadcast global or targeted announcements to field staff and record verified read timestamps.
Acceptance Criteria:
When a cleaner opens an announcement, the system captures an immutable timestamp payload confirming receipt.
FR-208: Peer Coverage View ("Who's on Duty")
Requirement: The system shall display peer technicians assigned to overlapping shift windows at the same site.
Acceptance Criteria:
Interface displays only full name and functional role of shift peers to preserve privacy while enabling operational team awareness.
3.3 Operations Management & Admin Control Module
FR-301: Visual Shift Planning & Automated Assignment Audit
Requirement: The system shall provide a visual scheduler for Admins to create, update, and reassign shifts across projects.
Acceptance Criteria:
Admins can assign one or more cleaners to a project site with start/end time windows.
Audit Trail Mandate: The system shall record and display immutable audit logs identifying which Admin user assigned which cleaner to a specific task, including exact microsecond timestamps.
System automatically triggers schedule update notifications to affected cleaners upon publishing changes.
FR-302: Site & Project Master Data Management
Requirement: The system shall serve as the central repository for project locations, baseline checklists, and SOP documentation.
Acceptance Criteria:
Admins can create sites with required fields: Project Name, Physical Address, Default Task Checklist items, and Custom SOP text.
FR-303: Material Fulfillment & Catalog Control
Requirement: The system shall empower Admins to manage stock item definitions and approve/fulfill cleaner supply requisitions.
Acceptance Criteria:
Admins can add/edit/disable catalog items (defining item name and unit measurement types).
Admins can toggle request statuses (Approved, Rejected, Fulfilled) with status transitions triggering automatic notifications to field users.
3.4 External Commercial Ordering & Checkout Module
FR-401: Unified Service & Product Catalog Checkout
Requirement: The system shall provide a guest-accessible checkout engine accepting orders for cleaning services, physical supplies, or combined carts.
Acceptance Criteria:
Customer can add scheduled cleaning services (specifying site address, target date/time, and special instructions) and physical supplies to a unified cart.
System computes taxes, line items, and total amount payable dynamically.
FR-402: Dual Payment Processing Engine
Requirement: The system shall support online credit/debit card processing via gateway integration and Cash on Delivery/Service options.
Business Rule Enforcement: Physical products parcelled to a customer address strictly require successful online payment authorization prior to order fulfillment processing. Cash payment options are limited exclusively to local service delivery or direct pickup options.
4. Non-Functional & Technical Requirements (NFR)
4.1 System Architecture & Scalability
NFR-101: Web-First Architecture & PWA Specification: The application shall be built as a Progressive Web Application (PWA) with responsive layouts optimized for low-end mobile viewports. The PWA must support offline asset caching (Service Workers) to ensure baseline accessibility during temporary connectivity drops.
NFR-102: Latency & Performance SLA: Page load times and interactive states shall achieve a complete render time under 3.0 seconds on standard mobile networks (3G/4G). Database query execution times for shift and checklist rendering must perform at p95 < 150 ms.
4.2 Security, Privacy & Data Compliance
NFR-201: Cryptographic Protection: All communications shall enforce TLS 1.3 encryption in transit. Sensitive database entities (user PII, authentication tokens) must be encrypted at rest using AES-256 standards.
NFR-202: GDPR Compliance & Data Privacy: The platform must enforce strict data minimization, maintaining anonymized activity trails and granting users data extraction/deletion rights in full compliance with EU GDPR regulations.
NFR-203: Role-Based Scope Enforcement: The system application boundary must enforce strict server-side authorization checks on every endpoint, preventing horizontal or vertical privilege escalation.
4.3 Service Levels & Operational Availability
NFR-301: System Availability: The production platform shall achieve an operational uptime SLA of 99.9% (excluding scheduled maintenance windows communicated 48 hours in advance).
NFR-302: Disaster Recovery Targets: Recovery Time Objective (RTO) ≤ 2 hours. Recovery Point Objective (RPO) ≤ 15 minutes (enforced via continuous database log replication and automated daily snapshots).
5. Integrations & API Requirements
5.1 External Service Interfaces
INT-101: Mapping & Geolocation API
Provider: Google Maps Platform Services.
Interface Method: Universal deep-linking URI protocol formatting structured addresses into lat/long routing parameters.
INT-102: Payment Gateway Interface
Provider: Stripe / Mollie Payments.
Interface Method: Secure webhook-driven credit card transaction authorization for online ecommerce orders.
INT-103: Transactional Communication Engine
Provider: SendGrid / Firebase Cloud Messaging (FCM).
Interface Method: RESTful webhooks dispatching transactional order confirmation emails and schedule modification push alerts.
5.2 Enterprise API Framework (Future Extensibility)
INT-201: REST API & Webhook Infrastructure: The system architecture shall expose open, documented OpenAPI 3.0 (Swagger) endpoints for shift management, staff master records, and inventory data to facilitate future ERP, CRM, and payroll platform integrations.
6. Billing, Administration & Observability
6.1 Multi-Tenant Subscriptions & Metering (White-Label Foundation)
ADM-101: Metered Usage Tracking: To support future commercial white-label licensing, the platform telemetry service shall log monthly active users (MAUs), active projects managed, and transactional order volumes per tenant organization.
6.2 Audit Logging & System Observability
ADM-201: Centralized System Audit Trail: The platform shall maintain an immutable append-only audit log capturing all system mutations.
Timestamp (UTC)
User ID & Role
Action Category
Context Payload
 
2026-02-04T08:12
ADM_8819 (Admin)
SCHEDULE_REASSIGN
Cleaner #41 -> Site A

ADM-202: Operational Health Dashboard: Administrators shall have real-time visual dashboards monitoring system operational states: Active Projects, Total Staff Count, Pending Inventory Stock Requests, and Unresolved Field Issues.
7. Gaps, Edge Cases, & Open Questions
The following operational edge cases and architectural ambiguities require explicit stakeholder sign-off prior to engineering sprint locking:
7.1 Identified Edge Cases & System Constraints
Concurrent Shift Overlap Conflict: How should the visual schedule builder handle situations where an Admin accidentally schedules a cleaner for two overlapping shifts at different project sites?
Proposed Rule: System blocks shift publishing and throws a validation error unless an explicit "Allow Overlap" administrative override is checked.
Offline Checklist Sync Discrepancies: If a cleaner completes task checkboxes in an offline state (e.g., basement cleaning site) and closes the PWA application before reconnecting to the internet, how are conflicting state changes merged?
Proposed Rule: Client app stores offline actions in IndexedDB with optimistic local updates, executing a timestamp-sorted reconciliation payload upon network restoration.
Partial Inventory Fulfillment: If an Admin approves 2 out of 5 requested supply items due to stock shortages, how is the cleaner notified of partial availability?
Proposed Rule: The status updates to Partially Approved, displaying line-item approval tags in the field view.
7.2 Open Architectural & Business Questions
Stakeholder Decisions Required:
Push Notification Channel Scope (Phase 1): Section 8 of the original draft notes that push notifications "may be considered in later phases" while listing Email/In-App for Phase 1. Given that PWA push notifications significantly increase schedule change compliance among field cleaners, should Web Push Notification support be included in Phase 1 engineering, or strictly constrained to transactional email/in-app banners?
Payment Gateway Selection: Which payment gateway (Stripe vs. Mollie) is preferred for processing Dutch market payment methods (e.g., iDEAL alongside standard credit cards) for the customer ordering portal?
Data Retention Policy: What is the legal retention timeframe for incident photos uploaded by cleaners under GDPR baseline requirements before automated purge execution?
