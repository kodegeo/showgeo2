# Creator Modals Map

## Purpose
This document defines all modal dialogs used in the Creator Dashboard and their corresponding functions. Each modal aligns with a Quick Action button in the `CreatorQuickActions` component and provides a unified, brand-consistent experience for creators to manage their content and activities.

---

## Shared Standards

**Modal Framework:** ShadCN UI (`<Dialog>` components)  
**Animation:** Framer Motion fade/slide transitions  
**Font:** Poppins (body), Montserrat (headings)  
**Primary Color:** `#CD000E`  
**Secondary Color:** `#F49600`  
**Background:** `#0B0B0B` (dark)  
**Text:** `#FFFFFF`  

Each modal includes:
- Title (H4)
- Description (optional)
- Close (X) button, top-right
- Form fields (with validation and placeholder text)
- Submit & Cancel buttons (`primary` and `outline` variants)
- Toast notifications on success/error

---

## Modal Overview

| Modal | Trigger | Description | Endpoint | Success Action |
|--------|----------|-------------|-----------|----------------|
| Create Event | `QuickActionButton: calendar-plus` | Allows creators to create a new live or on-demand event | `POST /api/events` | Closes modal, refreshes events list |
| Upload Media | `QuickActionButton: upload-cloud` | Upload media assets (image, video, audio) | `POST /api/assets/upload` | Closes modal, shows “Upload successful” toast |
| Start Stream | `QuickActionButton: video` | Configure and start a live stream | `POST /api/stream/start` | Closes modal, navigates to `/creator/live` |
| Create Post | `QuickActionButton: file-text` | Create and publish a social-style post | `POST /api/posts` | Closes modal, refreshes posts |
| Add Product | `CreatorStore` context | Add a new store item for sale | `POST /api/store/products` | Closes modal, refreshes store |
| Manage Fan | `FanManagementPanel` | Adjust fan settings, invite, or block users | `POST /api/fans/manage` | Updates fan list instantly |
| Confirm Delete | Global | Confirms deletion of any asset, event, or post | N/A | Executes deletion, refreshes relevant list |

---

## 1️⃣ Create Event Modal

**Component:** `CreateEventModal.tsx`  
**Fields:**
| Field | Type | Validation | Notes |
|--------|------|-------------|-------|
| Event Name | Text | Required, max 100 chars | |
| Description | Textarea | Optional, max 500 chars | |
| Date & Time | Datetime picker | Required | Uses local timezone |
| Category | Select | Required | (Music, Comedy, Podcast, Talk, Workshop) |
| Visibility | Toggle | Required | Public / Private |
| Thumbnail | File upload | Optional | Accepts `.jpg, .png` |
| Price | Number | Optional | USD, defaults to 0 (free) |

**Behavior:**  
- Calls `POST /api/events`  
- Displays toast: “Event created successfully”  
- Resets form on close

---

## 2️⃣ Upload Media Modal

**Component:** `UploadMediaModal.tsx`  
**Fields:**
| Field | Type | Validation | Notes |
|--------|------|-------------|-------|
| File | File | Required | Accepts `.jpg, .png, .mp3, .mp4` |
| Title | Text | Required, max 80 chars | |
| Description | Textarea | Optional, max 500 chars | |
| Type | Select | Required | Image, Video, Audio |
| Visibility | Toggle | Required | Public / Private |
| Expiration | Datetime | Optional | Auto-delete scheduling |

**Behavior:**  
- Calls `POST /api/assets/upload`  
- Auto-tags with creatorId  
- Displays toast: “Media uploaded successfully”  

---

## 3️⃣ Start Stream Modal

**Component:** `StartStreamModal.tsx`  
**Fields:**
| Field | Type | Validation | Notes |
|--------|------|-------------|-------|
| Stream Title | Text | Required, max 80 chars | |
| Category | Select | Required | From event categories |
| Description | Textarea | Optional, max 300 chars | |
| Visibility | Toggle | Required | Public / Private |
| Duration | Number | Optional | Minutes, defaults to 60 |
| Notify Followers | Checkbox | Optional | Sends system notifications |

**Behavior:**  
- Calls `POST /api/stream/start`  
- If success → navigates to `/creator/live/{streamId}`  
- Displays toast: “Stream started successfully”

---

## 4️⃣ Create Post Modal

**Component:** `CreatePostModal.tsx`  
**Fields:**
| Field | Type | Validation | Notes |
|--------|------|-------------|-------|
| Post Title | Text | Required, max 80 chars | |
| Content | Textarea | Required | Markdown supported |
| Media Attachment | File | Optional | Image/video |
| Visibility | Toggle | Required | Public / Private |

**Behavior:**  
- Calls `POST /api/posts`  
- Displays toast: “Post created successfully”  
- Updates creator feed immediately  

---

## 5️⃣ Add Product Modal

**Component:** `AddProductModal.tsx`  
**Fields:**
| Field | Type | Validation | Notes |
|--------|------|-------------|-------|
| Product Name | Text | Required | |
| Description | Textarea | Optional | |
| Price | Number | Required | USD format |
| Quantity | Number | Required | Integer |
| Product Image | File | Optional | Accepts `.jpg, .png` |

**Behavior:**  
- Calls `POST /api/store/products`  
- Displays toast: “Product added successfully”  

---

## 6️⃣ Manage Fan Modal

**Component:** `ManageFanModal.tsx`  
**Fields:**
| Field | Type | Validation | Notes |
|--------|------|-------------|-------|
| Username | Text | Read-only | Target user |
| Action | Select | Required | Follow / Unfollow / Block / Invite |
| Notes | Textarea | Optional | |

**Behavior:**  
- Calls `POST /api/fans/manage`  
- Instant feedback with toast: “Fan updated”  

---

## 7️⃣ Confirm Delete Modal

**Component:** `ConfirmDeleteModal.tsx`  
**Fields:**
| Field | Type | Validation | Notes |
|--------|------|-------------|-------|
| Confirmation Text | Text | Required | Must match word “DELETE” |
| Resource Type | Hidden | N/A | asset, event, post, etc. |

**Behavior:**  
- Executes relevant delete API call  
- Displays toast: “Deleted successfully”  

---

## Integration Notes
- All modals registered in `CreatorDashboardLayout.tsx`
- Global modal context: `useModalContext()`
- Modal open states controlled via React Context
- Each modal emits global event: `modal:success` for dashboard refresh

---

## Example Registration Snippet
```tsx
<ModalProvider>
  <CreateEventModal />
  <UploadMediaModal />
  <StartStreamModal />
  <CreatePostModal />
  <AddProductModal />
  <ManageFanModal />
  <ConfirmDeleteModal />
</ModalProvider>
