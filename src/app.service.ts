import { Injectable } from '@nestjs/common';

// aqui se inyectan las dependencias para exportar las clases mediante los metodos
@Injectable()
export class AppService {
  getHello(): string {
    return 'Hello World!';
  }
}
