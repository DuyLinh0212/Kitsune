import { CommonModule } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AdminMessageService } from '../../../../core/services/admin-message.service';

@Component({
  selector: 'app-admin-messages',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './admin-messages.component.html',
  styleUrl: './admin-messages.component.css'
})
export class AdminMessagesComponent {
  private readonly adminMessageService = inject(AdminMessageService);

  protected readonly conversations = signal<{ userId: number; username: string; lastMessage: string; lastMessageAt: string; unreadCount: number }[]>([]);
  protected readonly messages = signal<{ id: number; senderId: number; senderName: string; content: string; isRead: boolean; createdAt: string }[]>([]);
  protected readonly isLoading = signal(true);
  protected readonly errorMessage = signal('');
  protected readonly selectedUserId = signal<number | null>(null);
  protected readonly replyText = signal('');

  constructor() {
    this.loadConversations();
  }

  protected loadConversations(): void {
    this.isLoading.set(true);
    this.adminMessageService.getConversations().subscribe({
      next: (c) => { this.isLoading.set(false); this.conversations.set(c); },
      error: (e: Error) => { this.isLoading.set(false); this.errorMessage.set(e.message); }
    });
  }

  protected selectUser(userId: number): void {
    this.selectedUserId.set(userId);
    this.adminMessageService.getMessages(userId).subscribe({
      next: (m) => { this.messages.set(m); },
      error: () => {}
    });
  }

  protected send(): void {
    const userId = this.selectedUserId();
    const text = this.replyText().trim();
    if (!userId || !text) return;
    this.adminMessageService.sendMessage(userId, text).subscribe({
      next: () => {
        this.replyText.set('');
        this.selectUser(userId);
      },
      error: () => {}
    });
  }
}
