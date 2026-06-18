import { Component, input, output } from '@angular/core';

@Component({
  standalone: true,
  selector: 'app-header',
  imports: [],
  templateUrl: './header.html',
  styleUrls: ['./header.css'],
})
export class AppHeaderComponent {
  userName = input<string | null>(null);
  userRole = input<number | null>(null);
  botinLabel = input<string | null>(null);
  showAdminBtn = input<boolean>(false);

  logoutClick = output<void>();
  adminClick = output<void>();
}

// ✓ Optimizado — header.ts
