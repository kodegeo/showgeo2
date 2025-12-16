## Store Model Requirements

## Overview

A Store is a digital storefront used to sell merchandise, digital goods, or services associated with an Entity, Event, or Tour. It is a flexible component that supports various monetization and branding strategies depending on the owner or context.

## Associations

- A Store must belong to at least one of the following:
	- Entity (primary owner or creator)
	- Event (optional association)
	- Tour (optional association)
- A Store has_many Products
- A Store can have multiple Collaborators (via Entity IDs)
- A Store can optionally be associated with a StoreProfile (custom branding)

## Table: stores

| Column Name		| Type			| Constraints			| Description
| id				| UUID			| Primary Key 			| Unique store ID
| entity_id			| UUID			| Foreign Key, not null	| References the primary owning Entity
| event_id			| UUID			| Foreign Key, nullable	| References events.id (optional link)
| tour_id			| UUID			| Foreign Key, nullable	| References tours.id (optional link)
| name				| string		| Not null				| Store name
| slug				| string		| Unique, indexed		| URL-safe store identifier
| description		| text			| Optional				| Description of the store
| banner_image		| string		| Optional				| Visual banner image
| logo_url			| string		| Optional				| Store or brand logo
| currency			| string		| Default: 'USD'		| Store-wide currency setting
| status			| enum			| 'active'				| 'inactive'
| visibility		| enum			| 'public'				| 'unlisted'
| collaborators		| UUID[]		| Optional				| Array of collaborating entity_ids
| tags				| string[]		| Optional				| Categories, searchable keywords
| created_at		| datetime		| Default: now()		| Timestamp
| updated_at		| datetime		| Auto-managed			| Timestamp


## Key Features

- Ownership & Linking
- Must belong to a primary Entity
- Can be optionally linked to:
	- One Event (event_id)
	- One Tour (tour_id)
- This enables stores tied to:
	- A single LIVE (Event)
	- A tour-wide store (Tour)
	- A general brand storefront (Entity)

# Branding & Customization

- Store-level branding (logo, banner, description)
- Can inherit visuals from associated Event or Tour
- Customizable themes via StoreProfile

## Product Types

- Physical merchandise (T-shirts, posters)
- Digital goods (downloads, videos, NFTs)
- Access-based services (VIP tickets, Meet & Greets)

## Permissions

| Role			| Capabilities
| Entity Owner	| Full control over the store and its products
| Collaborator	| Can manage inventory and orders if granted by the owner
| Admin			| Platform-level visibility and moderation capabilities

- Entity Owner: Full control
- Manager: Can manage inventory and products
- Coordinator: View-only (optional)

## Store Visibility

| Value		| Description
| public	| Store is fully discoverable and open to all
| unlisted	| Only accessible via direct link
| private	| Only viewable by owner or collaborators

## Lifecycle Status
| Status	| Description
| active	| Store is live and visible
| inactive	| Store is hidden but still editable
| archived	| Store is frozen and not editable or visible

## Enhancements (Future)
| Event-exclusive inventory rules

Geo-restricted product availability
- Pre-order support for tours
- Tiered pricing for members or early access
- Analytics dashboard for store performance

