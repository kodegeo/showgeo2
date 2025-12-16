# Cursor Update Spec — Creator Application Page (Page 1 Enhancements)

## Goal
Update the Creator Application system to:
1. Fix payload errors between frontend and backend.
2. Replace “About / Bio” with “How will you use this creator page?”
3. Add a real Terms & Conditions acknowledgment with checkbox.
4. Ensure correct mapping of fields to backend DTO.
5. Replace `null` with `undefined` for banner/thumbnail.
6. Prepare Page 1 structure for Creator Application (future pages coming later).

---

# PART 1 — Update CreatorApplicationPage.tsx

## Replace:
- “About your brand / bio” → **“How will you use this creator page?”**
- Field name `usageDescription`
- Field name `background` (remove entirely or map properly)
- Remove placeholder upload areas for thumbnail & banner (we will add real uploads later)

## Add:
### Terms Section
A large scrollable Terms & Conditions box + required checkbox to submit:
- Checkbox label: “I agree to the Creator Terms and Conditions.”
- Disable submit button until checked.

### Payload Fixes
Before submitting:
- Remove `null` values
- Convert to `undefined` where needed
- Map fields exactly to backend:

```ts
const payload = {
  brandName: form.brandName,
  category: form.category,
  bio: form.usageDescription, // rename and map correctly
  website: form.website || undefined,
  socialLinks: {
    twitter: form.twitter || undefined,
    instagram: form.instagram || undefined,
    facebook: form.facebook || undefined,
    youtube: form.youtube || undefined,
    tiktok: form.tiktok || undefined,
  },
  thumbnail: form.thumbnail ?? undefined,
  bannerImage: form.bannerImage ?? undefined,
};
