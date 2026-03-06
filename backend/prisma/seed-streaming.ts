import { PrismaClient, EventStatus, EventPhase } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const entityId = "ec99e8b9-f2c2-44eb-82db-5b8fda2b3cd5"; // DJ Yessir
  const eventId = "00000000-0000-0000-0000-000000000010";

  const startTime = new Date();
  startTime.setMinutes(startTime.getMinutes() + 15);

  const endTime = new Date();
  endTime.setHours(endTime.getHours() + 2);

  const event = await prisma.events.upsert({
    where: { id: eventId },
    update: {
      status: EventStatus.SCHEDULED,
      isVirtual: true,
      startTime,
      endTime,
    },
    create: {
      id: eventId,
      name: "DJ Yessir – Live Test Stream",
      description: "Streaming test for real entity user",
      entities_events_entityIdToentities: { connect: { id: entityId } },
      eventType: "LIVE",
      phase: EventPhase.PRE_LIVE,
      status: EventStatus.SCHEDULED,
      startTime,
      endTime,
      isVirtual: true,
      ticketRequired: false,
      geoRestricted: false,
      testingEnabled: true,
      updatedAt: new Date(),
    },
  });

  console.log("✅ Event seeded:", event.name, event.id);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
