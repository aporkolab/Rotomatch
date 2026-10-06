import { enableProdMode, provideZoneChangeDetection } from '@angular/core';
import { bootstrapApplication } from '@angular/platform-browser';
import { AppComponent } from './app/app.component';
import { environment } from './environments/environment';
import { provideRouter, Routes } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { HomeComponent } from './app/page/home/home.component';
import { RulesComponent } from './app/page/rules/rules.component';
import { ContactComponent } from './app/page/contact/contact.component';
import { GameComponent } from './app/page/game/game.component';
import { provideAnimations } from '@angular/platform-browser/animations';

if (environment.production) {
  enableProdMode();
}

const routes: Routes = [
  { path: '', component: HomeComponent },
  { path: 'rules', component: RulesComponent },
  { path: 'contact', component: ContactComponent },
  { path: 'game', component: GameComponent }
];

bootstrapApplication(AppComponent, {
  providers: [provideZoneChangeDetection(), provideRouter(routes), provideHttpClient(), provideAnimations()]
}).catch(err => console.error(err));
