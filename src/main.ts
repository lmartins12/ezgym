import { registerLocaleData } from '@angular/common';
import { provideHttpClient } from '@angular/common/http';
import ptBr from '@angular/common/locales/pt';
import { isDevMode, provideZoneChangeDetection } from '@angular/core';
import { bootstrapApplication } from '@angular/platform-browser';
import {
  PreloadAllModules,
  provideRouter,
  RouteReuseStrategy,
  withPreloading,
} from '@angular/router';
import { provideServiceWorker } from '@angular/service-worker';
import {
  IonicRouteStrategy,
  iosTransitionAnimation,
  provideIonicAngular,
} from '@ionic/angular/standalone';
import { provideTranslateService, TranslateLoader } from '@ngx-translate/core';
import {
  provideTranslateHttpLoader,
  TranslateHttpLoader,
} from '@ngx-translate/http-loader';

import { AppComponent } from './app/app.component';
import { routes } from './app/app.routes';

registerLocaleData(ptBr, 'pt-BR');

bootstrapApplication(AppComponent, {
  providers: [
    provideZoneChangeDetection(),
    { provide: RouteReuseStrategy, useClass: IonicRouteStrategy },
    provideIonicAngular({
      animated: true,
      navAnimation: iosTransitionAnimation,
    }),
    provideRouter(routes, withPreloading(PreloadAllModules)),
    provideHttpClient(),
    provideTranslateService({
      fallbackLang: 'pt',
      loader: {
        provide: TranslateLoader,
        useClass: TranslateHttpLoader,
      },
    }),
    provideTranslateHttpLoader({
      prefix: './assets/i18n/',
      suffix: '.json',
    }),
    provideServiceWorker('ngsw-worker.js', {
      enabled: !isDevMode(),
      registrationStrategy: 'registerWhenStable:30000',
    }),
  ],
});
