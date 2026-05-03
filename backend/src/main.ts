import "dotenv/config";
import { NestFactory } from "@nestjs/core";
import { Logger, ValidationPipe } from "@nestjs/common";
import { SwaggerModule, DocumentBuilder } from "@nestjs/swagger";
import { AppModule } from "./app.module";
import { AllExceptionsFilter } from "./common/filters/all-exceptions.filter";
import { AppSocketIoAdapter } from "./socket-io.adapter";
import { buildSocketIoCors } from "./modules/realtime/socket.config";

async function bootstrap() {
  const logger = new Logger("Bootstrap");
  const app = await NestFactory.create(AppModule);

  app.useWebSocketAdapter(new AppSocketIoAdapter(app.getHttpServer()));
  logger.log("WebSocket: AppSocketIoAdapter (Socket.IO CORS forced via callback)");

  app.enableShutdownHooks();
  app.useGlobalFilters(new AllExceptionsFilter());

  app.enableCors(buildSocketIoCors());

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // Set global prefix for all routes
  // Alias controllers (AuthAliasController, EventsAliasController, FollowAliasController)
  // are registered with @Controller() (no prefix) to handle legacy routes without /api
  app.setGlobalPrefix("api");

  const config = new DocumentBuilder()
    .setTitle("Showgeo API")
    .setDescription("Showgeo 2.0 Backend API Documentation")
    .setVersion("2.0.0")
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup("api/docs", app, document);

  const port = process.env.PORT || 3000;

  await app.listen(port, "0.0.0.0");
  logger.log(`HTTP listening on 0.0.0.0:${port} (Fly internal_port must match)`);
}

bootstrap().catch((err) => {
  console.error("Bootstrap failed:", err);
  process.exit(1);
});
