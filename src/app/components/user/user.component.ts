import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { LoginService } from '../../services/login.service';
import { GravatarService } from '../../services/gravatar.service';
import { TopBarService } from '../../services/top-bar.service';
import { User } from '../../models/user';

@Component({
    selector: 'app-user',
    standalone: true,
    imports: [CommonModule, MatCardModule],
    templateUrl: './user.component.html',
    styleUrls: ['./user.component.css']
})
export class UserComponent implements OnInit {
    private loginService = inject(LoginService);
    private gravatarService = inject(GravatarService);
    private topBarService = inject(TopBarService);

    user: User | null = null;
    avatarUrl = '';

    ngOnInit(): void {
        this.topBarService.updateState({
            title: 'User',
            showFilter: false,
            filterVisible: false,
            showAdd: false
        });

        this.user = this.loginService.getUser();
        const fallbackId = this.user?.user_id?.toString() ?? this.user?.firstname ?? 'hevelius-user';
        this.avatarUrl = this.gravatarService.getAvatarUrl(this.user?.email, fallbackId, 96);
    }
}
