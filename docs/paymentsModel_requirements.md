# Payments Model Requirements

## Overview

The Payments module handles all monetary transactions in the Showgeo platform, including event ticket sales, store product purchases, and subscription payments. It integrates with Stripe for secure payment processing, manages order lifecycles, processes refunds, and tracks payment history. The system supports multiple order types (TICKET, PRODUCT, SUBSCRIPTION) and provides comprehensive order management for users and entities.

## Associations

- An **Order** must belong to a **User** (purchaser)
- An Order can optionally belong to an **Entity** (seller)
- An Order can optionally belong to an **Event** (for ticket purchases)
- An Order can optionally belong to a **Store** (for product purchases)
- An Order has_many **OrderItems** (tickets or products)
- An Order has_many **Payments** (payment attempts and records)
- An **OrderItem** can optionally link to a **Ticket** or **Product**
- A **Ticket** can optionally link to an **Order** (if purchased)

---

## Order Structure

### Core Attributes

| Property                  | Type      | Description                                                  |
|---------------------------|-----------|--------------------------------------------------------------|
| `id`                      | UUID      | Unique order identifier                                      |
| `userId`                  | UUID      | The user who placed the order (purchaser)                    |
| `entityId`                | UUID      | Optional: The entity receiving payment (seller)               |
| `eventId`                 | UUID      | Optional: Associated event (for ticket orders)               |
| `storeId`                 | UUID      | Optional: Associated store (for product orders)              |
| `type`                    | enum      | `TICKET` \| `PRODUCT` \| `SUBSCRIPTION`                      |
| `status`                  | enum      | `PENDING` \| `PROCESSING` \| `COMPLETED` \| `FAILED` \| `CANCELLED` \| `REFUNDED` |
| `totalAmount`             | Decimal   | Total order amount (10,2 precision)                          |
| `currency`                | string    | Currency code (default: 'USD')                                |
| `paymentMethod`           | enum      | `STRIPE` \| `CREDIT_CARD` \| `DEBIT_CARD`                    |
| `stripePaymentIntentId`   | string    | Optional: Stripe payment intent ID (unique)                  |
| `stripeSessionId`         | string    | Optional: Stripe checkout session ID (unique)                |
| `metadata`                | JSON      | Optional: Additional order data                               |
| `createdAt`               | timestamp | Auto-managed timestamp                                        |
| `updatedAt`               | timestamp | Auto-managed timestamp                                        |

---

## OrderItem Structure

### Core Attributes

| Property       | Type      | Description                                                  |
|----------------|-----------|--------------------------------------------------------------|
| `id`           | UUID      | Unique order item identifier                                 |
| `orderId`      | UUID      | Parent order ID                                              |
| `ticketId`     | UUID      | Optional: Linked ticket (if ticket order)                    |
| `productId`    | UUID      | Optional: Linked product (if product order)                  |
| `quantity`     | integer   | Quantity purchased (default: 1)                               |
| `unitPrice`    | Decimal   | Price per unit at time of purchase (10,2 precision)         |
| `totalPrice`   | Decimal   | Total price for this item (unitPrice × quantity) (10,2 precision) |
| `name`         | string    | Product/ticket name at time of purchase                      |
| `description`  | string    | Optional: Product/ticket description                         |
| `metadata`     | JSON      | Optional: Additional item data                               |
| `createdAt`    | timestamp | Auto-managed timestamp                                       |
| `updatedAt`    | timestamp | Auto-managed timestamp                                       |

---

## Payment Structure

### Core Attributes

| Property           | Type      | Description                                                  |
|--------------------|-----------|--------------------------------------------------------------|
| `id`               | UUID      | Unique payment identifier                                   |
| `orderId`          | UUID      | Associated order ID                                          |
| `amount`           | Decimal   | Payment amount (10,2 precision)                             |
| `currency`        | string    | Currency code (default: 'USD')                               |
| `status`           | string    | `succeeded` \| `pending` \| `failed` \| `refunded`         |
| `paymentMethod`   | enum      | `STRIPE` \| `CREDIT_CARD` \| `DEBIT_CARD`                   |
| `stripePaymentId` | string    | Optional: Stripe payment ID (unique)                        |
| `stripeChargeId`   | string    | Optional: Stripe charge ID (unique)                         |
| `refundId`         | string    | Optional: Stripe refund ID (unique)                          |
| `failureReason`    | string    | Optional: Payment failure reason                            |
| `metadata`         | JSON      | Optional: Additional payment data                           |
| `createdAt`        | timestamp | Auto-managed timestamp                                       |
| `updatedAt`        | timestamp | Auto-managed timestamp                                       |

---

## Order Types

| Type          | Description                                                  |
|---------------|--------------------------------------------------------------|
| `TICKET`      | Event ticket purchase - links to Event and creates Ticket records |
| `PRODUCT`     | Store product purchase - links to Store and Product           |
| `SUBSCRIPTION`| Subscription purchase (future: recurring payments)            |

---

## Order Status Lifecycle

| Status       | Description                                                  |
|--------------|--------------------------------------------------------------|
| `PENDING`    | Order created, awaiting payment initiation                   |
| `PROCESSING` | Payment in progress (Stripe checkout session created)       |
| `COMPLETED`  | Payment succeeded, order fulfilled                          |
| `FAILED`     | Payment failed                                               |
| `CANCELLED`  | Order cancelled before completion                            |
| `REFUNDED`   | Order refunded (partial or full)                            |

### Status Transitions

```
PENDING → PROCESSING → COMPLETED
                              ↓
                         REFUNDED

PENDING → PROCESSING → FAILED
PENDING → CANCELLED
```

---

## Payment Processing Flow

### 1. Checkout Initiation

1. **User** selects items (tickets or products) to purchase
2. **Frontend** sends checkout request to backend:
   - Order type (TICKET or PRODUCT)
   - Event ID or Store ID
   - Items array (name, unitPrice, quantity)
   - Success/cancel URLs
3. **Backend** validates:
   - Items are not empty
   - Total amount > 0
   - Event or Store exists
   - User is authenticated
4. **Backend** creates Order with status `PENDING`
5. **Backend** creates OrderItems for each item
6. **Backend** creates Stripe checkout session
7. **Backend** updates Order with `stripeSessionId` and status `PROCESSING`
8. **Backend** returns checkout session URL to frontend
9. **Frontend** redirects user to Stripe checkout

### 2. Payment Completion

1. **User** completes payment on Stripe checkout page
2. **Stripe** sends webhook event `checkout.session.completed` to backend
3. **Backend** verifies webhook signature
4. **Backend** updates Order:
   - Status: `COMPLETED`
   - `stripePaymentIntentId`: from session
5. **Backend** creates Payment record with status `succeeded`
6. **Backend** creates Tickets (if order type is TICKET):
   - One Ticket per OrderItem quantity
   - Links tickets to Order
7. **Backend** sends confirmation notification to user

### 3. Payment Failure

1. **Stripe** sends webhook event `payment_intent.payment_failed`
2. **Backend** verifies webhook signature
3. **Backend** updates Order:
   - Status: `FAILED`
4. **Backend** creates Payment record with status `failed`
5. **Backend** stores failure reason in Payment record

### 4. Refund Processing

1. **User** or **Admin** initiates refund request
2. **Backend** validates:
   - Order exists and is `COMPLETED`
   - User owns order or is Admin
   - Order has successful payment
3. **Backend** calls Stripe refund API
4. **Backend** updates Order:
   - Status: `REFUNDED`
5. **Backend** creates or updates Payment record:
   - Status: `refunded`
   - `refundId`: from Stripe
6. **Backend** handles Stripe webhook `charge.refunded` (if triggered separately)

---

## Stripe Integration

### Environment Variables

```env
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_API_VERSION=2024-10-28.acacia
```

### Webhook Events Handled

| Event Type                | Handler                    | Action                                                      |
|---------------------------|----------------------------|-------------------------------------------------------------|
| `checkout.session.completed` | `handleCheckoutCompleted` | Update order to COMPLETED, create Payment, create Tickets  |
| `payment_intent.succeeded`   | `handlePaymentSucceeded`  | Update order to COMPLETED, upsert Payment record            |
| `payment_intent.payment_failed` | `handlePaymentFailed` | Update order to FAILED, create Payment record with failure  |
| `charge.refunded`            | `handleRefund`            | Update order to REFUNDED, update Payment record             |

### Webhook Security

- **Signature Verification**: All webhook requests verified using `stripe-signature` header
- **Raw Body Required**: Backend must receive raw request body for signature verification
- **Endpoint**: `POST /api/payments/webhook` (public, no auth required)

### Checkout Session Configuration

```typescript
{
  payment_method_types: ["card"],
  line_items: [...], // From order items
  mode: "payment",
  success_url: "...",
  cancel_url: "...",
  client_reference_id: orderId,
  metadata: {
    orderId,
    userId,
    type,
    eventId,
    storeId,
  },
}
```

---

## Permissions

| Role          | Capabilities                                                |
|---------------|------------------------------------------------------------|
| **User**      | Create checkout, view own orders, request refunds on own orders |
| **Entity**    | View orders for their events/stores, process refunds       |
| **Admin**     | View all orders, process refunds, manage all payments      |

### Access Control

- **View Orders**: Users can only view their own orders (unless Admin)
- **Create Refund**: Users can refund their own orders; Admins can refund any order
- **Create Checkout**: Requires authentication (any authenticated user)
- **Webhook Handler**: Public endpoint (verified via Stripe signature)

---

## Key Features

### Order Management

- **Order Creation**: Automatically create orders with line items
- **Order Tracking**: Track order status through lifecycle
- **Order History**: Users can view their order history
- **Order Details**: Detailed order view with items and payments

### Payment Processing

- **Stripe Integration**: Secure payment processing via Stripe
- **Multiple Payment Methods**: Support for credit/debit cards
- **Payment Tracking**: Record all payment attempts and outcomes
- **Automatic Ticket Creation**: Tickets created automatically for TICKET orders

### Refund Management

- **Full Refunds**: Refund entire order amount
- **Partial Refunds**: Support for partial refunds (future enhancement)
- **Refund Tracking**: Track refund status and history
- **Stripe Refund Sync**: Automatic sync with Stripe refund webhooks

### Order Items

- **Flexible Line Items**: Support tickets and products in same order structure
- **Price Snapshot**: Store price at time of purchase
- **Quantity Support**: Multiple quantities per item
- **Metadata Support**: Store additional item data as JSON

### Webhook Processing

- **Reliable Processing**: Webhook events update order and payment status
- **Idempotency**: Handle duplicate webhook events safely
- **Error Handling**: Log and handle webhook processing errors
- **Event Handling**: Process checkout, payment, and refund events

---

## API Endpoints

### Create Checkout Session

```http
POST /api/payments/checkout
Authorization: Bearer <token>

{
  "type": "TICKET",
  "eventId": "event-123",
  "items": [
    {
      "name": "VIP Ticket",
      "unitPrice": 99.99,
      "quantity": 2,
      "ticketId": "ticket-123"
    }
  ],
  "successUrl": "https://example.com/success",
  "cancelUrl": "https://example.com/cancel"
}
```

**Response:**
```json
{
  "sessionId": "cs_test_...",
  "url": "https://checkout.stripe.com/..."
}
```

### Get Orders

```http
GET /api/payments/orders?page=1&limit=20&status=COMPLETED&type=TICKET
Authorization: Bearer <token>
```

**Response:**
```json
{
  "data": [
    {
      "id": "order-123",
      "type": "TICKET",
      "status": "COMPLETED",
      "totalAmount": 199.98,
      "items": [...],
      "payments": [...]
    }
  ],
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 100,
    "totalPages": 5
  }
}
```

### Get Order Details

```http
GET /api/payments/orders/:id
Authorization: Bearer <token>
```

**Response:**
```json
{
  "id": "order-123",
  "userId": "user-123",
  "eventId": "event-123",
  "type": "TICKET",
  "status": "COMPLETED",
  "totalAmount": 199.98,
  "items": [...],
  "payments": [...],
  "createdAt": "2025-01-01T00:00:00.000Z"
}
```

### Create Refund

```http
POST /api/payments/refund
Authorization: Bearer <token>

{
  "orderId": "order-123",
  "reason": "Customer request"
}
```

**Response:**
```json
{
  "refundId": "re_test_...",
  "amount": 199.98,
  "status": "succeeded"
}
```

### Webhook Handler

```http
POST /api/payments/webhook
Stripe-Signature: <signature>

<raw body from Stripe>
```

**Response:**
```json
{
  "received": true
}
```

---

## Data Relationships

### Order Relationships

```
Order
├── User (purchaser)
├── Entity? (seller)
├── Event? (for ticket orders)
├── Store? (for product orders)
├── OrderItems[] (line items)
└── Payments[] (payment records)
```

### OrderItem Relationships

```
OrderItem
├── Order (parent order)
├── Ticket? (if ticket order)
└── Product? (if product order)
```

### Payment Relationships

```
Payment
└── Order (associated order)
```

### Ticket Relationships

```
Ticket
├── User (owner)
├── Event (associated event)
└── Order? (if purchased)
```

---

## Business Rules

### Order Validation

1. **Items Required**: Order must have at least one item
2. **Total Amount**: Total amount must be greater than 0
3. **Event/Store Validation**: 
   - TICKET orders must have valid eventId
   - PRODUCT orders must have valid storeId
4. **User Authentication**: User must be authenticated to create orders

### Payment Validation

1. **Order Exists**: Payment must reference existing order
2. **Amount Match**: Payment amount should match order total (with tolerance)
3. **Currency Match**: Payment currency must match order currency
4. **Status Consistency**: Payment status must align with order status

### Refund Rules

1. **Order Status**: Only COMPLETED orders can be refunded
2. **Payment Exists**: Order must have successful payment to refund
3. **User Ownership**: Users can only refund their own orders (unless Admin)
4. **Stripe Refund**: Refund must be processed through Stripe

---

## Error Handling

### Validation Errors

- **400 Bad Request**: Invalid request data
- **404 Not Found**: Order, Event, or Store not found
- **401 Unauthorized**: User not authenticated
- **403 Forbidden**: User lacks permission

### Payment Errors

- **Payment Failed**: Order status set to FAILED, failure reason stored
- **Webhook Verification Failed**: Invalid Stripe signature
- **Stripe API Error**: Handle Stripe API errors gracefully

### Refund Errors

- **Order Not Found**: Return 404
- **Order Not Completed**: Cannot refund non-completed orders
- **No Payment**: Cannot refund orders without successful payment
- **Stripe Refund Error**: Handle Stripe refund API errors

---

## Enhancements (Future)

### Recurring Payments

- Support SUBSCRIPTION order type with recurring billing
- Handle subscription lifecycle (active, cancelled, expired)
- Support subscription upgrades/downgrades

### Partial Refunds

- Allow partial refunds for orders with multiple items
- Refund specific order items
- Prorate refunds based on item quantities

### Payment Methods

- Support additional payment methods (PayPal, Apple Pay, Google Pay)
- Store payment method preferences
- Support saved payment methods

### Order Modifications

- Allow order cancellation before payment
- Support order modifications (add/remove items)
- Handle order updates and price adjustments

### Analytics & Reporting

- Order analytics dashboard for entities
- Revenue reporting and forecasting
- Payment method analytics
- Refund rate tracking

### International Payments

- Multi-currency support
- Currency conversion
- Regional payment methods
- Tax calculation and reporting

### Order Fulfillment

- Digital delivery (tickets, downloads)
- Physical shipping (products)
- Shipping address management
- Tracking information

### Discounts & Promotions

- Coupon code support
- Discount codes per event/store
- Bulk pricing
- Early bird pricing

---

## Testing Considerations

### Unit Tests

- Order creation and validation
- Payment processing logic
- Refund processing logic
- Webhook event handling
- Error handling scenarios

### Integration Tests

- Stripe checkout session creation
- Stripe webhook processing
- Order lifecycle transitions
- Ticket creation for ticket orders
- Refund flow with Stripe

### Test Data

- Mock Stripe API responses
- Test webhook events
- Test order states
- Test payment scenarios

---

## Security Considerations

### Payment Security

- **PCI Compliance**: Never store credit card data
- **Stripe Tokenization**: All payments processed through Stripe
- **Webhook Verification**: Verify all Stripe webhook signatures
- **HTTPS Only**: All payment endpoints require HTTPS in production

### Data Privacy

- **Order Privacy**: Users can only view their own orders
- **Payment Privacy**: Payment details not exposed to frontend
- **Metadata Encryption**: Sensitive metadata encrypted at rest

### Access Control

- **Authentication Required**: All order/payment endpoints require authentication
- **Role-Based Access**: Entity owners and Admins have expanded access
- **Webhook Security**: Webhook endpoint verified via Stripe signature only

---

**Last Updated:** 2025-01-01  
**Version:** 2.0.0

