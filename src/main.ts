import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger'; // <-- Importa las nuevas herramientas

//este archivo es el que crea el servidor que va a estar escuchando en el puerto 3000
async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.enableCors({
    //origin: '*', // Permite cualquier origen. Para producción, sé más específico: ['http://localhost:3001', 'https://miapp.com']
    origin: true,
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    credentials: true,
  });

  const config = new DocumentBuilder()
    .setTitle('MED-CAR API')
    .setDescription('Documentación de la API para la aplicación de gestión de ambulancias MED-CAR.')
    .setVersion('1.0')
    .addBearerAuth() // <-- ¡IMPORTANTE! Esto añade un candado a los endpoints protegidos
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api-docs', app, document); // <-- La URL será http://localhost:3000/api-docs

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
