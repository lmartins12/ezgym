import { registerLocaleData } from '@angular/common';
import ptBr from '@angular/common/locales/pt';
import { bootstrapApplication } from '@angular/platform-browser';

import { AppComponent } from './app/app.component';
import { appConfig } from './app/app.config';

registerLocaleData(ptBr, 'pt-BR');

bootstrapApplication(AppComponent, appConfig).catch((err) =>
  console.error(err),
);
