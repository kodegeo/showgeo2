import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService, asPrismaDb } from "../../prisma/prisma.service";
import { randomUUID } from "crypto";

const MESSAGES_LIMIT = 50;

@Injectable()
export class ChatService {
  constructor(private readonly prisma: PrismaService) {}

  private async getOrCreateRoom(eventId: string): Promise<{ id: string }> {
    const event = await this.prisma.events.findUnique({
      where: { id: eventId },
      select: { id: true },
    });
    if (!event) {
      throw new NotFoundException("Event not found");
    }

    let room = await this.prisma.chat_rooms.findFirst({
      where: { eventId },
      select: { id: true },
    });

    if (!room) {
      room = await this.prisma.chat_rooms.create({
        data: {
          id: randomUUID(),
          eventId,
          name: "Live Chat",
          isPrivate: false,
          updatedAt: new Date(),
        },
        select: { id: true },
      });
    }

    return room;
  }

  async getMessages(eventId: string) {
    const room = await this.getOrCreateRoom(eventId);
    // chat_messages has no relations in Prisma client; fetch messages then resolve user/profile separately
    const messages = await asPrismaDb(this.prisma).chat_messages.findMany({
      where: { roomId: room.id },
      orderBy: { createdAt: "desc" },
      take: MESSAGES_LIMIT,
    });

    const userIds = [...new Set(messages.map((m) => m.userId).filter(Boolean))] as string[];
    const [users, profiles] = await Promise.all([
      userIds.length > 0
        ? this.prisma.app_users.findMany({
            where: { id: { in: userIds } },
            select: { id: true, email: true },
          })
        : Promise.resolve([]),
      userIds.length > 0
        ? this.prisma.user_profiles.findMany({
            where: { userId: { in: userIds } },
            select: { userId: true, username: true, firstName: true, lastName: true },
          })
        : Promise.resolve([]),
    ]);
    const userMap = new Map(users.map((u) => [u.id, u]));
    const profileMap = new Map(profiles.map((p) => [p.userId, p]));

    const reversed = messages.reverse();
    return {
      data: reversed.map((m) => {
        const user = m.userId ? userMap.get(m.userId) ?? null : null;
        const profile = m.userId ? profileMap.get(m.userId) ?? null : null;
        return {
          id: m.id,
          message: m.message,
          userId: m.userId,
          displayName: this.getDisplayNameFromUserAndProfile(user, profile),
          createdAt: m.createdAt?.toISOString() ?? new Date().toISOString(),
        };
      }),
    };
  }

  private getDisplayNameFromUserAndProfile(
    user: { id: string; email: string } | null,
    profile: { username: string | null; firstName: string | null; lastName: string | null } | null,
  ): string {
    if (!user) return "Guest";
    if (profile?.username) return profile.username;
    if (profile?.firstName || profile?.lastName)
      return [profile?.firstName, profile?.lastName].filter(Boolean).join(" ").trim();
    if (user.email) return user.email.split("@")[0] ?? "User";
    return "User";
  }

  async sendMessage(eventId: string, userId: string | null, dto: { message: string }) {
    const room = await this.getOrCreateRoom(eventId);
    const trimmed = dto.message.trim();
    if (!trimmed) {
      return { data: null };
    }

    const msg = await asPrismaDb(this.prisma).chat_messages.create({
      data: {
        roomId: room.id,
        userId: userId ?? "",
        message: trimmed.slice(0, 2000),
      },
    });

    let displayName = "Guest";
    if (msg.userId) {
      const [user, profile] = await Promise.all([
        this.prisma.app_users.findUnique({ where: { id: msg.userId }, select: { id: true, email: true } }),
        this.prisma.user_profiles.findUnique({
          where: { userId: msg.userId },
          select: { username: true, firstName: true, lastName: true },
        }),
      ]);
      displayName = this.getDisplayNameFromUserAndProfile(user, profile);
    }

    return {
      data: {
        id: msg.id,
        message: msg.message,
        userId: msg.userId,
        displayName,
        createdAt: msg.createdAt?.toISOString() ?? new Date().toISOString(),
      },
    };
  }
}
