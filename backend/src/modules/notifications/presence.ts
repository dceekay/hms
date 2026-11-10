/**
 * ============================================================================
 * MDS Specialist Hospital Management System (HMS)
 * ============================================================================
 * Module: Notifications / Realtime Presence
 * File: presence.ts
 *
 * Description:
 * High-performance, zero-database-overhead in-memory presence tracking service.
 * Tracks active SSE connections and real-time activity heartbeats in O(1) time.
 * ============================================================================
 */

export class PresenceService {
  private static activeConnections = new Map<string, number>();
  private static lastActivity = new Map<string, number>();

  /**
   * Called when a client establishes a live SSE notification connection.
   */
  static connect(userId: string): void {
    if (!userId) return;
    const current = PresenceService.activeConnections.get(userId) || 0;
    PresenceService.activeConnections.set(userId, current + 1);
    PresenceService.lastActivity.set(userId, Date.now());
  }

  /**
   * Called when a client disconnects an SSE notification connection.
   */
  static disconnect(userId: string): void {
    if (!userId) return;
    const current = PresenceService.activeConnections.get(userId) || 0;
    if (current <= 1) {
      PresenceService.activeConnections.delete(userId);
    } else {
      PresenceService.activeConnections.set(userId, current - 1);
    }
    PresenceService.lastActivity.set(userId, Date.now());
  }

  /**
   * Records that a user has made an active HTTP request or sent a heartbeat.
   */
  static touch(userId: string): void {
    if (!userId) return;
    PresenceService.lastActivity.set(userId, Date.now());
  }

  /**
   * Efficient O(1) in-memory check to see if a user is currently online.
   */
  static isOnline(userId: string, timeoutMs = 90000): boolean {
    if (!userId) return false;

    const activeSockets = PresenceService.activeConnections.get(userId) || 0;
    if (activeSockets > 0) {
      return true;
    }

    const last = PresenceService.lastActivity.get(userId);
    if (last && Date.now() - last <= timeoutMs) {
      return true;
    }

    return false;
  }

  /**
   * Returns a list of all currently online user IDs.
   */
  static getOnlineUsers(timeoutMs = 90000): string[] {
    const online = new Set<string>();
    const now = Date.now();

    for (const [userId, count] of PresenceService.activeConnections.entries()) {
      if (count > 0) {
        online.add(userId);
      }
    }

    for (const [userId, last] of PresenceService.lastActivity.entries()) {
      if (now - last <= timeoutMs) {
        online.add(userId);
      }
    }

    return Array.from(online);
  }

  /**
   * Clears in-memory presence tracking. Used primarily in automated testing.
   */
  static resetForTesting(): void {
    PresenceService.activeConnections.clear();
    PresenceService.lastActivity.clear();
  }
}

