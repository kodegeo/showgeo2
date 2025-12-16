# userModel & userProfile Documentation Update Patch (Showgeo 2.0)

## Purpose
This patch updates user-related documentation files to align with the new **User–Entity Hierarchy** model defined in `user_entity_hierarchy.md`.  
It adds entity relationship context, context switching behavior, and clarifies the distinction between `UserProfile` and `EntityProfile`.

---

## 📘 Target File: `/docs/userModel_requirements.md`

### 🔹 Add this section under **Relationships**

```md
### Relationships
- A `User` can own multiple `Entities`.
- A `User` can have multiple `EntityRole` relationships (OWNER, MANAGER, COORDINATOR).
- A `User` can act in a specific `Context` (personal or entity) for API requests and frontend actions.
```

---

### 🔹 Add this field under **Fields**

```md
### Fields
| Field | Type | Description |
|--------|------|-------------|
| `activeContext` | JSON / Nullable | Stores the current acting mode (user or entity). Used for frontend context switching. |
```

---

## 📘 Target File: `/docs/userProfile_requirements.md`

### 🔹 Add this clarification section under **Overview** or **Relationships**

```md
### Relationship to Entities
- A `UserProfile` represents the personal identity of a user (avatar, display name, bio).
- `EntityProfile` represents public-facing brand or artist information.
- Switching context in the UI determines which profile is editable.
```

---

## ⚙️ Optional Adjustments (if referenced elsewhere)

| File | Suggested Note |
|------|----------------|
| `eventModel_requirements.md` | Add a line under ownership: “Events are created under the current active entity context.” |
| `follow_requirements.md` | Add a note under relationships: “Users can follow Entities and Events.” |

---

## ✅ After Applying
Once the above snippets are added to the respective files:

- Cursor and developers will understand that **users can act as entities**.  
- The **context switching logic** (added to backend and frontend) will be correctly documented.  
- All docs stay consistent with the new entity conversion and context model.

---

## 🔧 Usage
Save this file as `/docs/userModel_update_patch.md`, then run the following inside Cursor:

```bash
/task sync_docs target=docs
```

Cursor will read this patch and automatically insert the updates into your existing markdown files.
