import { createParamDecorator, ExecutionContext } from "@nestjs/common";
import { app_users as User } from "@prisma/client";

export const CurrentUser = createParamDecorator(
  (data: keyof User | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const user = request.user;

    return data ? user?.[data] : user;
  },
);

