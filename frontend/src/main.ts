import { bootstrapApplication } from '@angular/platform-browser';
import { registerLocaleData } from '@angular/common';
import localeEs from '@angular/common/locales/es-AR';
import { App } from './app/app';
import { appConfig } from './app/app.config';

registerLocaleData(localeEs);
bootstrapApplication(App, appConfig)
  .catch(error => console.error(error));
