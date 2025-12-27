import "dotenv/config";
import { NestFactory } from "@nestjs/core";
import { ValidationPipe } from "@nestjs/common";
import { SwaggerModule, DocumentBuilder } from "@nestjs/swagger";
import { AppModule } from "./app.module";
import { AllExceptionsFilter } from "./common/filters/all-exceptions.filter";


async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.enableShutdownHooks();
  app.useGlobalFilters(new AllExceptionsFilter());

  const isProd = process.env.NODE_ENV === "production";

  app.enableCors(
    isProd
      ? { origin: true, credentials: true }
      : {
          origin: process.env.FRONTEND_URL || "http://localhost:5173",
          credentials: true,
        }
  );

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

  // 🔴 THIS IS THE FIX
  await app.listen(port, '0.0.0.0');
  console.log(`🚀 Server running on 0.0.0.0:${port}`);
}

bootstrap();
