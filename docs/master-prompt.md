Claude Prompt: 

# PROMly 2.0 — BUILD THE LIVE TWO-SIDED MARKETING MARKETPLACE

You are the lead product architect, full-stack engineer, UX designer, and technical lead for Promly.

Your mission is to transform the existing Promly project into a fully functional two-sided marketing marketplace that can be demonstrated LIVE on stage at OsloSprint.

IMPORTANT: This is an update to the existing project, not a request to start over.

Inspect the current repository, database, architecture, UI, and integrations before making changes.

Preserve all working functionality.

The most important requirement is a REAL, RELIABLE, END-TO-END LIVE DEMONSTRATION between a business owner and a promoter, using two different authenticated accounts and devices.

Do not build a fake clickable prototype.

Do not merely create beautiful dashboards.

Build a functional system where actions performed by one user genuinely affect what another user sees.

---

# 1. THE PRODUCT

Promly is a performance-based marketing marketplace.

Businesses need more customers.

Promoters want opportunities to earn money.

Promly connects them.

Businesses publish campaigns for their products or services and offer commissions for verified customer acquisitions.

Promoters can use different marketing methods to attract customers.

Examples include:
- Creating promotional videos
- Creating social media posts
- Sharing personal referral links
- Sharing QR codes
- Recommending services to friends
- Creating their own marketing content
- Promoting offers through their own audiences
- Other lawful, business-approved marketing activities

Promly tracks attributable conversions and calculates commissions.

Core promise:

"Businesses get customers. People get paid."

Additional slogan:

"Anyone can be a marketer."

The platform must be simple enough for someone with zero marketing experience to start promoting a business.

---

# 2. CRITICAL STAGE DEMONSTRATION

Two founders will demonstrate the application live.

PERSON A — BUSINESS OWNER

The first founder represents a barbershop that needs more customers.

They log into Promly as a business.

They create a campaign:

Business: Demo Barber Club
Service: Premium Haircut
Price: 500 NOK
Total commission budget per verified sale: 100 NOK

The business publishes the campaign.

PERSON B — PROMOTER

The second founder is logged in on another device as a promoter.

Without refreshing the page, they see the newly published campaign appear.

They open the campaign and join it.

They can now:
- Generate a personal referral link
- Open Marketing Studio
- Create a promotional video
- Generate promotional text
- Share the campaign
- Monitor performance

CUSTOMER CONVERSION

A third browser session acts as the customer.

The customer opens the promoter's unique link.

They book the haircut through a functional demo booking page.

The booking is saved in the database and attributed to the correct promoter.

BUSINESS CONFIRMATION

The business owner receives a real-time notification.

They open the booking and confirm that the service has been completed.

In Demo Mode, a clearly labeled simulated funding/settlement step makes the commission eligible.

PROMOTER EARNINGS

The promoter's dashboard updates automatically.

The promoter sees:
- One new verified conversion
- New commission earnings
- Updated wallet balance
- Updated campaign performance

Both dashboards must update from actual database changes.

No hardcoded animations pretending that a sale occurred.

No browser refresh should be necessary.

---

# 3. DEVELOPMENT PRIORITY

The live demonstration is the highest priority.

Implement in this order:

P0 — Absolutely essential:
1. Two separate authenticated accounts
2. Business campaign creation
3. Real-time campaign discovery
4. Promoter enrollment
5. Unique referral link
6. Customer booking
7. Referral attribution
8. Business verification
9. Simulated settlement
10. Real-time commission updates

P1 — Important:
11. Marketing Studio
12. Functional video creation
13. Sharing tools
14. Professional dashboards
15. Demo reset functionality

P2 — After core functionality works:
16. Advanced analytics
17. Additional campaign categories
18. Expanded admin tools
19. More sophisticated content generation
20. External integrations

Do not sacrifice a working live demonstration for secondary features.

---

# 4. TECH STACK

Use the existing stack wherever practical.

Preferred:
- Next.js App Router
- TypeScript
- Tailwind CSS
- shadcn/ui
- Supabase Auth
- Supabase PostgreSQL
- Supabase Realtime
- Vercel
- GitHub

Use Zod for input validation.

Use transactional database operations for booking and commission workflows.

Use server-side authorization for sensitive actions.

Avoid introducing unnecessary services.

Do not overwrite unrelated repositories, projects, or databases.

---

# 5. DESIGN SYSTEM

Use the existing Promly visual identity.

Brand:
- Dark navy background
- Purple and electric blue gradient
- White typography
- Premium fintech-style dashboards
- Modern creator-economy design
- Large readable financial figures
- Clean campaign cards
- Smooth animations
- Mobile-first responsive layout

The product should look like a real startup ready to launch.

Not a generic admin template.

Use the existing Promly logo if available.

Both dashboards must feel like parts of the same platform while being optimized for their different users.

---

# 6. BUSINESS DASHBOARD

Build a beautiful, functional dashboard for business owners.

The main overview should contain:

KEY METRICS:
- Active campaigns
- Promoters participating
- Referral clicks
- Pending bookings
- Verified customers
- Attributed revenue
- Commission costs
- Conversion rate

CAMPAIGN MANAGEMENT:
- Create campaign
- Edit campaign
- Publish campaign
- Pause campaign
- View campaign details
- View participating promoters

BOOKING MANAGEMENT:
- New bookings
- Booking details
- Promoter attribution
- Confirm completed service
- Reject or cancel invalid bookings

MARKETING PERFORMANCE:
- Top promoters
- Campaign performance
- Sales generated
- Commission expenses
- Performance over time

REAL-TIME ACTIVITY:
Show notifications when:
- A promoter joins a campaign
- A referred customer makes a booking
- A booking is verified

Example:

"Alex joined your campaign."

"New booking received — Premium Haircut."

"Conversion verified — 100 NOK commission budget."

Financial figures must reflect actual database state.

---

# 7. PROMOTER DASHBOARD

Build a premium dashboard for promoters.

This is one of the most important interfaces.

Main navigation:

- Overview
- Explore Campaigns
- My Campaigns
- Marketing Studio
- My Links
- Earnings
- Profile

OVERVIEW:
- Total earned
- Pending earnings
- Available balance
- Clicks
- Bookings
- Verified conversions

MY CAMPAIGNS:
Show every campaign the promoter has joined.

Each campaign should have:
- Business name
- Campaign image
- Commission opportunity
- Personal referral link
- Marketing tools
- Click statistics
- Conversion statistics
- Earnings

MAIN ACTIONS:
"Find Campaigns"
"Create Content"
"Share Link"

The promoter should immediately understand what they can do to earn commissions.

---

# 8. CAMPAIGN MARKETPLACE

Build a marketplace where promoters discover businesses that want customers.

Campaign cards include:
- Business logo
- Business name
- Service name
- Location
- Service price
- Promoter commission
- Category
- Image
- Join Campaign button

Support:
- Norway
- Spain
- NOK
- EUR

Categories:
- Barbershops
- Beauty
- Restaurants
- Experiences
- Water sports
- Jet ski rentals
- Boat tours
- Fitness
- Other services

Newly published campaigns must appear in real time for active marketplace users.

Campaign joining must persist in the database.

---

# 9. MARKETING STUDIO — CORE NEW FEATURE

Create a dedicated marketing workspace inside the promoter dashboard.

This should be a major selling point of Promly.

Promoters should not only receive referral links.

They should receive tools that help them actually market businesses.

The Marketing Studio must include:

A. CREATE VIDEO
B. CREATE SOCIAL MEDIA CONTENT
C. CREATE PROMOTIONAL COPY
D. SHARE CAMPAIGN
E. CONTENT LIBRARY

Every content item should be connected to a specific campaign.

Only approved campaign assets and permitted claims may be used.

The business should be able to upload brand assets and define marketing guidelines.

---

# 10. VIDEO CREATOR

Build a genuinely functional promotional video creator.

For the sprint MVP, prioritize reliable template-based video creation over expensive AI video generation.

USER FLOW:

1. Promoter selects a campaign.
2. Promoter clicks "Create Video".
3. Promoter chooses a video template.
4. The application loads the business's available media.
5. The promoter selects images or video clips.
6. The application generates a promotional video with text overlays.
7. The promoter previews the result.
8. The promoter downloads the video.
9. The promoter shares it on social media.

TEMPLATES:

Template 1 — Quick Recommendation
A short vertical promotional video.

Template 2 — Special Offer
Highlights the service and its benefits.

Template 3 — Experience Showcase
Designed for jet ski tours, water sports, and travel experiences.

Template 4 — Before and After
Suitable for services where authorized before-and-after content exists.

VIDEO SPECIFICATIONS:
- 9:16 vertical format
- MP4 output
- Social-media-friendly resolution
- Campaign branding
- Service name
- Clear call to action
- Optional campaign URL or QR code

The application must actually produce a playable video file.

A preview that cannot be exported is insufficient.

Use a practical browser-based or server-side rendering solution compatible with the deployment environment.

A suitable approach may involve Remotion or another reliable rendering pipeline.

Evaluate performance and deployment limitations before choosing.

Provide a deterministic template-based fallback.

Do not rely on third-party generative video APIs for the stage demonstration.

AI-generated video can be added later.

IMPORTANT:
If video export becomes a blocker, complete the entire referral-to-commission flow first, then implement a smaller reliable video template using pre-approved assets.

Do not pretend a video was generated if rendering failed.

---

# 11. AI CONTENT ASSISTANT

Create a simple content generation assistant.

The promoter selects a campaign and a content type.

Content types:
- TikTok script
- Instagram caption
- Snapchat message
- WhatsApp recommendation
- Short promotional hook
- Video voiceover
- Direct message

Generate content based on:
- Business description
- Campaign details
- Service price
- Target audience
- Campaign terms
- Brand guidelines

Do not invent discounts, guarantees, customer reviews, or product claims.

Use a configured AI provider when available.

Provide editable, prewritten templates when no AI API is configured.

Users must be able to copy the generated content.

---

# 12. REFERRAL LINKS AND SHARING

Each promoter receives a unique referral link for every joined campaign.

Example:

promly.app/r/unique-code

Support:
- Copy link
- QR code
- Native mobile share
- WhatsApp sharing
- Other supported sharing destinations

Track:
- Referral visits
- Attributed bookings
- Verified conversions
- Earnings

Use secure attribution rules.

Do not treat every click as a sale.

Do not allow promoters to directly create approved commissions.

The promoter must be able to use any lawful and campaign-compliant marketing channel, rather than being restricted to a particular social network.

---

# 13. CUSTOMER BOOKING PAGE

Build a beautiful customer-facing booking experience.

When a customer opens a referral link:

Show:
- Business information
- Service
- Price
- Description
- Images
- Available demo appointment slots
- Booking form

Allow the customer to complete a booking without needing a promoter account.

Use an isolated demo booking calendar.

Avoid double booking.

Store the referral attribution server-side.

Create a pending booking and conversion record.

Do not automatically create withdrawable earnings.

---

# 14. REAL-TIME ENGINE

Implement Supabase Realtime or an equally reliable mechanism.

Required events:

EVENT 1:
Business publishes campaign.

RESULT:
Promoter marketplace updates.

EVENT 2:
Promoter joins campaign.

RESULT:
Business dashboard updates.

EVENT 3:
Customer books through referral.

RESULT:
Business receives booking notification.

EVENT 4:
Business verifies completed service.

RESULT:
Commission status updates.

EVENT 5:
Demo funding is confirmed.

RESULT:
Promoter wallet updates.

Use secure event subscriptions.

Ensure users cannot subscribe to unauthorized private data.

Provide a connection status indicator and safe reconnection behavior.

Include a manual refresh fallback if real-time connectivity fails.

Test with two separate browsers and authenticated accounts.

---

# 15. COMMISSION ENGINE

Implement correct financial calculations.

Example:

Service price: 500 NOK
Total business commission: 100 NOK
Promly platform fee: 15 NOK
Promoter earnings: 85 NOK

The 15% platform fee is an illustrative configuration, not a mandatory business model.

Store:
- Service price
- Total commission
- Platform fee
- Promoter net earnings
- Currency
- Commission status
- Booking ID
- Promoter ID
- Business ID

Use integer minor currency units.

Financial calculations must be performed server-side.

Create an append-only ledger.

Prevent duplicate commission awards.

Use idempotent operations.

Snapshot commission terms when attribution is established.

Only approved and demo-funded commissions should enter the available balance.

Display pending commissions separately.

---

# 16. DEMO WALLET

Create a polished earnings dashboard.

Show:
- Pending
- Approved
- Available
- Withdrawn
- Total earned

Include transaction history.

Support simulated withdrawal requests.

Clearly label all demo financial activity.

Do not transfer real funds.

Do not integrate real payouts until funding, payment provider, identity verification, and regulatory requirements have been addressed.

---

# 17. DEMO CONTROL CENTER

Create a secure, admin-only Demo Control Center.

This is essential for the live stage presentation.

Functions:

1. Verify both demo accounts exist.
2. Check database connectivity.
3. Check real-time connectivity.
4. Check the test booking flow.
5. Check commission calculations.
6. Check Marketing Studio availability.
7. Restore the demo to a known starting state.

Provide:

"Prepare Stage Demo"

This should reset only isolated demo data.

It must never modify or delete real customer data.

Provide:

"Run Demo Health Check"

Display clear success/failure indicators for each essential system.

Do not fabricate health-check results.

Add a guided demo fallback for temporary external service failures.

Clearly distinguish simulated events from actual actions.

---

# 18. STAGE DEMO ACCOUNTS

Prepare:

ACCOUNT 1:
Business Owner
Demo Barber Club

ACCOUNT 2:
Promoter
Alex

ACCOUNT 3:
Customer
Guest booking session

The two founders must be able to use separate devices simultaneously.

Use secure demo authentication.

Do not publish reusable privileged credentials.

Create a stage demo runbook with the correct URLs and account setup instructions.

---

# 19. DEMO CAMPAIGNS

Prepare two primary campaigns.

CAMPAIGN A — NORWAY

Business:
Demo Barber Club

Service:
Premium Haircut

Price:
500 NOK

Total commission:
100 NOK

Purpose:
Main live stage demonstration.

CAMPAIGN B — SPAIN

Business:
Mediterranean Water Sports Demo

Service:
Jet Ski Adventure

Price:
€150

Total commission:
20% of the booking price

Purpose:
Show how promoters can earn larger commissions from higher-value services.

Both campaigns are illustrative.

Do not claim actual partnerships unless verified.

---

# 20. DATABASE AND SECURITY

Design or extend the existing Supabase schema.

Likely tables:
- profiles
- roles
- businesses
- business_memberships
- campaigns
- campaign_assets
- campaign_memberships
- referral_links
- referral_events
- bookings
- conversions
- commissions
- ledger_entries
- marketing_content
- generated_videos
- withdrawal_requests
- notifications
- audit_logs

Use migrations.

Enable RLS.

Enforce:
- Business ownership
- Promoter permissions
- Admin permissions
- Private booking data access
- Secure commission calculations

Validate all sensitive operations server-side.

Do not expose Supabase service-role credentials to the browser.

Use safe media upload rules.

Only authorized assets may be used in generated promotional content.

Protect against duplicate conversions, unauthorized approvals, and fabricated earnings.

---

# 21. TESTING REQUIREMENTS

Create automated tests for:

- Business authentication
- Promoter authentication
- Campaign creation
- Campaign publication
- Real-time campaign discovery
- Promoter enrollment
- Referral link creation
- Customer booking
- Referral attribution
- Business verification
- Demo settlement
- Commission calculation
- Wallet updates
- Authorization
- Duplicate conversion prevention
- Demo reset
- Video export

Create an end-to-end Playwright test that simulates:

Browser A: Business owner
Browser B: Promoter
Browser C: Customer

Test the complete journey.

Verify that both authenticated dashboards update after database changes.

Run:
- Type checking
- Linting
- Unit tests
- Integration tests
- End-to-end tests
- Production build

Fix failures.

Do not report unexecuted tests as passing.

---

# 22. DEPLOYMENT

Use existing GitHub, Supabase, and Vercel integrations when available and authorized.

Do not overwrite unrelated projects.

Keep all credentials secure.

Deploy the application when possible.

Verify the production URL.

Test the deployed application on:
- Desktop
- Mobile
- Two simultaneous authenticated sessions

Do not declare the stage demo ready until the deployed end-to-end workflow has been verified.

---

# 23. STAGE DEMO SCRIPT

Create STAGE_DEMO.md.

Include:

BEFORE PRESENTATION:
- Required devices
- Required browser sessions
- Login preparation
- Internet requirements
- Demo health check
- Backup plan

DURING PRESENTATION:
- Exact actions for Business Owner
- Exact actions for Promoter
- Customer booking action
- Expected real-time updates
- Final commission screen

AFTER PRESENTATION:
- Demo reset procedure

Also create a short 60-second version and a longer 2-minute version.

The live demonstration should feel like two real people using the platform to solve a real business problem.

---

# 24. DEFINITION OF DONE

The stage demo is ready only when:

- The business can create a campaign.
- The promoter sees the campaign on another device.
- The promoter can join the campaign.
- The promoter can generate a referral link.
- The promoter can create promotional content.
- The video creator can export at least one real video template.
- A customer can book through the referral link.
- The business receives the booking.
- The business can verify the service.
- Demo settlement can be completed.
- The promoter receives the correct commission.
- Both dashboards update automatically.
- All relevant data persists.
- Critical security tests pass.
- The application works on mobile and desktop.
- The deployed version passes the stage demo test.

---

# 25. AUTONOMOUS EXECUTION

Begin by inspecting the existing Promly project.

Create a short implementation plan.

Then immediately start implementing.

Do not ask me to choose between minor technical alternatives.

Choose the most reliable approach.

Prioritize stage reliability above technical complexity.

Do not stop after writing documentation.

Do not claim success before testing.

Provide short progress summaries explaining:
- What you built
- Why it matters
- What you tested
- What remains

When finished, provide:
1. Deployment URL
2. Working features
3. Incomplete features
4. Test results
5. Demo account setup
6. Stage demo instructions
7. Any actions required from me

FINAL OBJECTIVE:

Build Promly into a real, beautiful, interactive marketplace where a business owner can publish an opportunity, a promoter can create marketing and attract a customer, and both founders can demonstrate a verified commission appearing in real time on stage.

The audience must understand the product without needing a technical explanation.

Build the complete working core, not just the appearance of one.