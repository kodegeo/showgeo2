# Creating the markdown file for download
content = """
# Creator Application Specification

## 1. Overview
This document defines the Creator Application workflow, data model, validations,
and administrative approval system for the Showgeo platform. It is intended as a build
specification for engineering execution inside Cursor.

---

## 2. Goals
- Allow any verified Supabase-authenticated user to apply for Creator status.
- Create a corresponding **Entity** record when the application is submitted.
- Support multi-category creators (Musician, Comedian, Speaker, Dancer, Fitness).
- Implement a two-level verification process (Required → Conditional).
- Provide clean admin UI workflows while keeping MVP scope minimal.

---

## 3. Creator Application Workflow (MVP Scope)

### Step 1 — User Submits the Creator Application
Fields captured:
- **Brand Name (required)**
- **Category (required)** — musician, comedian, speaker, dancer, fitness
- **About / Bio**
- **Social Media Links (optional for now)**
- **Website (optional)**
- **Thumbnail Image (optional)**
- **Banner Image (optional)**

Behavior:
- Creates an **Entity** record:
  - `status = PENDING`
  - `type = ORGANIZATION` if brand name differs from user name; otherwise `INDIVIDUAL`
- Assigns the user an **EntityRole** of `OWNER`.
- Does **not** expose the entity publicly until approval.

---

## 4. Verification Model

### Level 1 — Required Verification (MVP)
Automatically required for *all* categories:
- Confirm the provided brand name does not conflict with an existing entity.
- Applicant signs acknowledgment of:
  - Truthful representation  
  - Responsibility for brand usage  
  - Platform safety policy  
  - Risk of removal if brand is fraudulent

### Level 2 — Conditional Verification (future phases)
Triggered by category selection:

#### For *Musician*
- Social media links required
- Record label details (optional now; required later)
- Manager/agent contact

#### For *Speaker*
- Website or business proof (optional now)
- Manager/agency contact

### Additional Optional Checks (later phases)
- Domain TXT verification  
- LLC / EIN verification  
- AI-assisted brand authenticity scan  
- Trademark lookup

---

## 5. Admin Review Workflow

### MVP Admin Actions
Admins can:
- View list of pending creator applications
- Open an application detail view
- Approve or Reject the creator application

### When Approved:
- `Entity.status → APPROVED`
- Entity becomes publicly visible
- Creator profile page becomes accessible
- Additional creator-only features are unlocked

### When Rejected:
- `Entity.status → REJECTED`
- Optional admin note is saved and shown to the creator
- Creator may resubmit after editing (future feature)

---

## 6. Data Model Requirements

### Entity Model Updates

enum EntityStatus {
PENDING
APPROVED
REJECTED
}


### Creator Application Table (optional future)
Not required for MVP; can be encoded directly in Entity + EntityRole.

---

## 7. API Requirements

### POST /api/entities/creator-apply
Creates:
- Entity (status: PENDING)
- Owner role
- Optional media assets

### GET /api/admin/creator-applications
- Admin-only list of pending apps

### PATCH /api/admin/creator-applications/:id/approve
- Approves the entity

### PATCH /api/admin/creator-applications/:id/reject
- Rejects entity with reason

---

## 8. Frontend Requirements

### User Interface
- “Become a Creator” button
- Simple application form
- Confirmation page after submission
- Creator dashboard unlocked after approval

### Admin UI (MVP)
- Pending applications table
- Approval modal

---

## 9. MVP Out-of-Scope
These will be added later:
- Multi-level conditional verification forms
- Domain verification
- Trademark scanning
- Automated fraud detection
- Manager contact verification workflows
- Multiple brand ownership per user
- Group entities with multiple owners

---

## 10. Edge Cases to Handle
- User attempts to create an entity with a slug already taken
- User submits multiple applications (block after one PENDING)
- Admin approval reversals (allow reverting APPROVED → PENDING)
- Deleting an entity should revoke roles

---

End of Specification.
"""

with open('/mnt/data/creator-application-spec.md', 'w') as f:
    f.write(content)

'/mnt/data/creator-application-spec.md'
