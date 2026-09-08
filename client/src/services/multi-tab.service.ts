/**
 * Gazette Editorial Studio — Multi-Tab Collision Coordinator
 * Uses the BroadcastChannel API to alert authors if the same manuscript
 * is currently open in multiple browser tabs or windows simultaneously.
 */

export type MultiTabMessage =
  | { type: 'PING'; articleId: string; senderTabId: string }
  | { type: 'PONG'; articleId: string; senderTabId: string }
  | { type: 'CLAIM_EDIT'; articleId: string; senderTabId: string };

class MultiTabService {
  private channel: BroadcastChannel | null = null;
  private tabId: string = Math.random().toString(36).substring(2, 9);
  private listeners: ((hasConflict: boolean, otherTabId?: string) => void)[] = [];
  private activeArticleId: string | null = null;

  constructor() {
    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      try {
        this.channel = new BroadcastChannel('gazette_editor_tabs');
        this.channel.onmessage = (event: MessageEvent<MultiTabMessage>) => {
          this.handleMessage(event.data);
        };
      } catch (err) {
        console.warn('BroadcastChannel not initialized', err);
      }
    }
  }

  private handleMessage(msg: MultiTabMessage) {
    if (!msg || msg.senderTabId === this.tabId) return;

    if (this.activeArticleId && msg.articleId === this.activeArticleId) {
      if (msg.type === 'PING') {
        // Reply with PONG to inform other tab that this article is already active here
        this.channel?.postMessage({
          type: 'PONG',
          articleId: this.activeArticleId,
          senderTabId: this.tabId,
        });
      } else if (msg.type === 'PONG' || msg.type === 'CLAIM_EDIT') {
        // Notify listener that another tab has this article open
        this.notifyListeners(true, msg.senderTabId);
      }
    }
  }

  /**
   * Register the active article in this tab and probe for other open tabs
   */
  startProbing(articleId: string, onConflictChange: (hasConflict: boolean) => void): () => void {
    this.activeArticleId = articleId;
    this.listeners.push(onConflictChange);

    // Announce presence & ask if any other tab has this article
    if (this.channel) {
      this.channel.postMessage({
        type: 'PING',
        articleId,
        senderTabId: this.tabId,
      });
    }

    return () => {
      this.listeners = this.listeners.filter((l) => l !== onConflictChange);
      if (this.activeArticleId === articleId) {
        this.activeArticleId = null;
      }
    };
  }

  /**
   * Take over editing and broadcast claim to other tabs
   */
  claimOwnership(articleId: string) {
    if (this.channel) {
      this.channel.postMessage({
        type: 'CLAIM_EDIT',
        articleId,
        senderTabId: this.tabId,
      });
    }
  }

  private notifyListeners(hasConflict: boolean, otherTabId?: string) {
    this.listeners.forEach((fn) => fn(hasConflict));
  }
}

export const multiTabService = new MultiTabService();
