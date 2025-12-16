
---

# 🌱 **seed_data_structure.md**

```markdown
# Showgeo 2.0 Seed Data Structure

This file defines the base seed data for initializing Supabase + Prisma.

---

## 👤 Users

| Field | Example | Notes |
|--------|----------|-------|
| id | uuid | Auto-generated |
| email | testuser@example.com | Required |
| password | hashed | bcrypt |
| username | "TestUser" | Unique |
| role | USER / CREATOR / ADMIN | Defaults to USER |
| createdAt | timestamp | - |

---

## 🧑‍🎤 Creators

| Field | Example | Notes |
|--------|----------|-------|
| id | uuid | - |
| userId | fk → users.id | One-to-one |
| name | “DJ Flux” | Display name |
| slug | “dj-flux” | Used for URLs |
| type | “MUSICIAN” | ENUM: COMEDIAN, POLITICIAN, BUSINESS, etc. |
| bio | “Electro-fusion artist from NYC” | - |
| bannerUrl | /banners/users/{userId}/banner.png | - |

---

## 🎟️ Events

| Field | Example | Notes |
|--------|----------|-------|
| id | uuid | - |
| creatorId | fk → creators.id | Owner |
| name | “Live at Sunset” | - |
| category | “LIVE” | - |
| type | FREE / PAID | ENUM |
| startTime | timestamp | - |
| endTime | timestamp | - |
| price | 9.99 | Decimal |
| thumbnailUrl | /events/creators/{creatorId}/events/{eventId}/thumbnail.png | - |

---

## 🎙️ Podcasts

| Field | Example | Notes |
|--------|----------|-------|
| id | uuid | - |
| creatorId | fk → creators.id | - |
| name | “The Future of Sound” | - |
| description | “Weekly talk with artists and producers.” | - |
| coverUrl | /podcasts/creators/{creatorId}/podcasts/{podcastId}/cover.png | - |
| isLive | false | Boolean |
| category | “Music Industry” | - |

---

## 🧾 Orders

| Field | Example | Notes |
|--------|----------|-------|
| id | uuid | - |
| userId | fk → users.id | - |
| eventId | fk → events.id | Nullable for non-events |
| totalAmount | 29.99 | - |
| status | PAID / PENDING / REFUNDED | - |

---

## 🗂️ Assets

| Field | Example | Notes |
|--------|----------|-------|
| id | uuid | - |
| ownerId | fk → users.id / creators.id | - |
| ownerType | USER / CREATOR | - |
| path | “/creators/{creatorId}/media/...” | - |
| type | IMAGE / VIDEO / AUDIO | - |
| isPublic | true | - |

---

## 📦 Example Script (Prisma Seed)

```ts
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const user = await prisma.app_users.create({
    data: {
      email: 'testuser@example.com',
      password: 'hashedpassword',
      username: 'TestUser',
      role: 'USER',
    },
  });

  const creator = await prisma.creator.create({
    data: {
      userId: user.id,
      name: 'DJ Flux',
      slug: 'dj-flux',
      type: 'MUSICIAN',
      bio: 'Electro-fusion artist from NYC',
    },
  });

  await prisma.event.create({
    data: {
      creatorId: creator.id,
      name: 'Live at Sunset',
      category: 'LIVE',
      type: 'PAID',
      price: 9.99,
    },
  });
}

main()
  .catch(e => console.error(e))
  .finally(async () => await prisma.$disconnect());
