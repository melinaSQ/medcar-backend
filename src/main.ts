import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

//este archivo es el que crea el servidor que va a estar escuchando en el puerto 3000
async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
