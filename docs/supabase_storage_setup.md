# Supabase Storage Setup (Showgeo 2.0 - Creator Version)

This document defines the storage architecture, bucket hierarchy, and access rules for Showgeo 2.0.  
It aligns with the `Assets`, `Events`, and `Creators` modules for unified file management.

---

## 🗂️ Bucket Structure

| Bucket | Access | Used For | Example Path |
|---------|---------|----------|---------------|
| `avatars` | Public | User profile images | `/users/{userId}/avatar.png` |
| `banners` | Public | Profile and creator banners | `/users/{userId}/banner.png` |
| `creators` | Public | Creator profile thumbnails | `/creators/{creatorId}/thumbnail.png` |
| `events` | Public | Event cover art and media | `/creators/{creatorId}/events/{eventId}/thumbnail.png` |
| `podcasts` | Public | Podcast covers and episode assets | `/creators/{creatorId}/podcasts/{podcastId}/cover.png` |
| `media` | Restricted | Audio/video uploads | `/creators/{creatorId}/media/{fileId}` |
| `assets` | Mixed | General uploads and documents | `/users/{userId}/uploads/{fileId}` |

---

## 🧰 Setup Commands

In your Supabase SQL Editor or CLI:

```sql
-- Create storage buckets
insert into storage.buckets (id, name, public) values
('avatars', 'avatars', true),
('banners', 'banners', true),
('creators', 'creators', true),
('events', 'events', true),
('podcasts', 'podcasts', true),
('media', 'media', false),
('assets', 'assets', false);
