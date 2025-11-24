import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';

//este archivo es el que crea el servidor que va a estar escuchando en el puerto 3000
async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.enableCors({
    //origin: '*', // Permite cualquier origen. Para producción, sé más específico: ['http://localhost:3001', 'https://miapp.com']
    origin: true,
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    credentials: true,
  });

  app.useGlobalPipes(new ValidationPipe({
    whitelist: true, // Ignora los datos que no están en el DTO
    forbidNonWhitelisted: true, // Lanza un error si se envían datos no permitidos
    transform: true, // Convierte los payloads a los tipos definidos en los DTOs
    transformOptions: { enableImplicitConversion: true }, // Permite conversiones implícitas de tipos
  }));

  // Definimos el puerto y el host (la IP)
  const port = process.env.PORT || 3000;
  const host = '0.0.0.0';

  await app.listen(port, host);

  console.log(`Application is running on: ${await app.getUrl()}`);
}
bootstrap();
