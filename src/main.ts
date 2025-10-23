import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';

//este archivo es el que crea el servidor que va a estar escuchando en el puerto 3000
async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.useGlobalPipes(new ValidationPipe({
    whitelist: true, // Ignora los datos que no están en el DTO
    forbidNonWhitelisted: true, // Lanza un error si se envían datos no permitidos
    transform: true, // Convierte los payloads a los tipos definidos en los DTOs
    transformOptions: { enableImplicitConversion: true }, // Permite conversiones implícitas de tipos
  }));

  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
