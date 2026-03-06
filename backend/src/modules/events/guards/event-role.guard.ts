import { Injectable, CanActivate, ExecutionContext } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { EventsService } from "../events.service";
import { EVENT_PERMISSION_KEY, EventPermissionType } from "../../../common/decorators/event-role.decorator";

@Injectable()
export class EventRoleGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly eventsService: EventsService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const permission: EventPermissionType | undefined =
      this.reflector.getAllAndOverride(EVENT_PERMISSION_KEY, [
        context.getHandler(),
        context.getClass(),
      ]);
  
    if (!permission) return true;
  
    const request = context.switchToHttp().getRequest();
    const user = request.user;
    if (!user?.id) return false;
  
    const eventId = request.params?.id ?? request.params?.eventId;
    if (!eventId) return false;
  
    try {
      if (permission === "phase") {
        await this.eventsService.assertPhasePermission(eventId, user.id);
      } else if (permission === "broadcaster") {
        await this.eventsService.assertBroadcasterPermission(eventId, user.id);
      } else if (permission === "production") {
        await this.eventsService.assertProductionPermission(eventId, user.id);
      }
  
      return true;
    } catch {
      return false;
    }
  }}
