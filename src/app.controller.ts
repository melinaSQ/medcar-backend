import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service';

// aqui inyectamos el appservice para usar sus metodos
//el appcontroller es el que maneja las rutas
@Controller()
export class AppController {
  constructor(private readonly appService: AppService) { }

  @Get() //ruta raiz -> / - localhost:3000 
  getHello(): string {
    return this.appService.getHello();
  }
}
