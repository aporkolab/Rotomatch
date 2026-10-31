import { Component, ChangeDetectionStrategy } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { CollapseModule } from 'ngx-bootstrap/collapse';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
  imports: [RouterOutlet, RouterLink, RouterLinkActive, CollapseModule],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AppComponent {
  public isCollapsed = true;
}
