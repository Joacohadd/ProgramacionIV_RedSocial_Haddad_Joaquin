import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { SessionReminder } from './shared/session-reminder';

@Component({ selector: 'app-root', standalone: true, imports: [RouterOutlet, SessionReminder], templateUrl: './app.html' })
export class App {}
