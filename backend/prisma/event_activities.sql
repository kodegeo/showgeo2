-- CreateEnum
CREATE TYPE "EventActivityType" AS ENUM ('VIP_MEET_GREET', 'FAN_DISCUSSION', 'REPLAY', 'PROMOTION', 'SURVEY');

-- CreateEnum
CREATE TYPE "EventActivityStatus" AS ENUM ('INACTIVE', 'ACTIVE', 'COMPLETED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "ActivityVisibility" AS ENUM ('ALL_ATTENDEES', 'REGISTERED_ONLY', 'VIP_ONLY');

-- AlterEnum
ALTER TYPE "TicketType" ADD VALUE 'VIP_MEET_GREET';

-- DropForeignKey
ALTER TABLE "meet_greet_sessions" DROP CONSTRAINT "fk_mg_event";

-- DropForeignKey
ALTER TABLE "meet_greet_sessions" DROP CONSTRAINT "fk_mg_ticket";

-- DropForeignKey
ALTER TABLE "meet_greet_sessions" DROP CONSTRAINT "fk_mg_user";

-- DropIndex
DROP INDEX "idx_mg_event_slot";

-- DropIndex
DROP INDEX "idx_mg_event_status";

-- DropIndex
DROP INDEX "meet_greet_sessions_ticket_id_key";

-- AlterTable
ALTER TABLE "meet_greet_sessions" DROP CONSTRAINT "meet_greet_sessions_pkey",
DROP COLUMN "created_at",
DROP COLUMN "duration_minutes",
DROP COLUMN "ended_at",
DROP COLUMN "event_id",
DROP COLUMN "joined_at",
DROP COLUMN "slot_order",
DROP COLUMN "started_at",
DROP COLUMN "ticket_id",
DROP COLUMN "updated_at",
DROP COLUMN "user_id",
ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "durationMinutes" INTEGER NOT NULL,
ADD COLUMN     "endedAt" TIMESTAMP(3),
ADD COLUMN     "eventId" TEXT NOT NULL,
ADD COLUMN     "joinedAt" TIMESTAMP(3),
ADD COLUMN     "slotOrder" INTEGER NOT NULL,
ADD COLUMN     "startedAt" TIMESTAMP(3),
ADD COLUMN     "ticketId" TEXT NOT NULL,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "userId" TEXT NOT NULL,
ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "id" SET DATA TYPE TEXT,
ADD CONSTRAINT "meet_greet_sessions_pkey" PRIMARY KEY ("id");

-- CreateTable
CREATE TABLE "event_activities" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "phase" "EventPhase" NOT NULL,
    "type" "EventActivityType" NOT NULL,
    "status" "EventActivityStatus" NOT NULL DEFAULT 'INACTIVE',
    "title" TEXT NOT NULL,
    "description" TEXT,
    "config" JSONB NOT NULL,
    "visibility" "ActivityVisibility" NOT NULL,
    "startsAt" TIMESTAMP(3),
    "endsAt" TIMESTAMP(3),
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "event_activities_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "event_activities_eventId_phase_idx" ON "event_activities"("eventId", "phase");

-- CreateIndex
CREATE INDEX "event_activities_type_status_idx" ON "event_activities"("type", "status");

-- CreateIndex
CREATE UNIQUE INDEX "meet_greet_sessions_ticketId_key" ON "meet_greet_sessions"("ticketId");

-- CreateIndex
CREATE INDEX "meet_greet_sessions_eventId_slotOrder_idx" ON "meet_greet_sessions"("eventId", "slotOrder");

-- CreateIndex
CREATE INDEX "meet_greet_sessions_eventId_status_idx" ON "meet_greet_sessions"("eventId", "status");

-- AddForeignKey
ALTER TABLE "meet_greet_sessions" ADD CONSTRAINT "meet_greet_sessions_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "events"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "meet_greet_sessions" ADD CONSTRAINT "meet_greet_sessions_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "tickets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "meet_greet_sessions" ADD CONSTRAINT "meet_greet_sessions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "app_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event_activities" ADD CONSTRAINT "event_activities_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "events"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event_activities" ADD CONSTRAINT "event_activities_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "app_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

