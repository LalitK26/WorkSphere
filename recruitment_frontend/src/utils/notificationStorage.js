/**
 * Notification data model: id, title, message, createdAt, isRead, redirectPath (optional).
 * Storage: localStorage fallback. Do not crash if backend support is missing.
 */

const PENDING_KEY = 'recruitment_notifications_pending';
const NOTIFIED_APPLICATIONS_KEY = 'recruitment_notified_application_ids';
const NOTIFIED_INTERVIEWS_KEY = 'recruitment_notified_interview_ids';
const NOTIFIED_OFFERS_KEY = 'recruitment_notified_offer_ids';

function storageKey(userId) {
  return `recruitment_candidate_notifications_${userId ?? 'anon'}`;
}

function safeParse(key, fallback = []) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : fallback;
  } catch {
    return fallback;
  }
}

function safeSet(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    console.error('notificationStorage: failed to write', key, e);
  }
}

/**
 * @param {string} [userId]
 * @returns {Array<{ id: string, title: string, message: string, createdAt: string, isRead: boolean, redirectPath?: string }>}
 */
export function getNotifications(userId) {
  const key = storageKey(userId);
  const list = safeParse(key, []);
  return list.map((n) => ({
    id: n.id ?? '',
    title: n.title ?? 'Notification',
    message: n.message ?? '',
    createdAt: n.createdAt ?? '',
    isRead: !!n.isRead,
    redirectPath: n.redirectPath ?? undefined,
  }));
}

/**
 * @param {string} [userId]
 * @param {{ title: string, message: string, redirectPath?: string }} payload
 * @returns {{ id: string, title: string, message: string, createdAt: string, isRead: boolean, redirectPath?: string }}
 */
export function addNotification(userId, payload) {
  const key = storageKey(userId);
  const list = safeParse(key, []);
  const now = new Date().toISOString();
  const id = `n-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
  const n = {
    id,
    title: payload.title ?? 'Notification',
    message: payload.message ?? '',
    createdAt: now,
    isRead: false,
    redirectPath: payload.redirectPath ?? undefined,
  };
  list.unshift(n);
  safeSet(key, list);
  dispatchNotificationsChanged();
  dispatchNotificationAdded(n);
  return n;
}

/**
 * @param {string} [userId]
 * @param {string} notificationId
 */
export function markAsRead(userId, notificationId) {
  const key = storageKey(userId);
  const list = safeParse(key, []);
  const idx = list.findIndex((x) => x.id === notificationId);
  if (idx !== -1) {
    list[idx] = { ...list[idx], isRead: true };
    safeSet(key, list);
    dispatchNotificationsChanged();
  }
}

/**
 * Merge pending notifications (e.g. from registration) into user's store and clear pending.
 * @param {string} userId
 */
export function mergePendingNotifications(userId) {
  const pending = safeParse(PENDING_KEY, []);
  if (pending.length === 0) return;
  const key = storageKey(userId);
  const list = safeParse(key, []);
  const merged = [...pending, ...list];
  safeSet(key, merged);
  safeSet(PENDING_KEY, []);
  dispatchNotificationsChanged();
}

/**
 * Add a notification before login (e.g. account created). Stored under pending.
 * @param {{ title: string, message: string }} payload
 */
export function addPendingNotification(payload) {
  const list = safeParse(PENDING_KEY, []);
  const now = new Date().toISOString();
  const id = `n-pending-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
  const n = {
    id,
    title: payload.title ?? 'Notification',
    message: payload.message ?? '',
    createdAt: now,
    isRead: false,
    redirectPath: undefined,
  };
  list.push(n);
  safeSet(PENDING_KEY, list);
}

export const NOTIFICATIONS_CHANGED = 'recruitment-notifications-changed';
export const NOTIFICATION_ADDED = 'recruitment-notification-added';

export function dispatchNotificationsChanged() {
  try {
    window.dispatchEvent(new CustomEvent(NOTIFICATIONS_CHANGED));
  } catch (_) { }
}

function dispatchNotificationAdded(notification) {
  try {
    window.dispatchEvent(new CustomEvent(NOTIFICATION_ADDED, { detail: notification }));
  } catch (_) { }
}

/**
 * Track which application IDs we've already notified (shortlisted/rejected).
 * @returns {Set<number>}
 */
export function getNotifiedApplicationIds() {
  const raw = safeParse(NOTIFIED_APPLICATIONS_KEY, []);
  return new Set(raw.map((x) => Number(x)).filter((x) => !isNaN(x)));
}

/**
 * @param {number} applicationId
 */
export function markApplicationNotified(applicationId) {
  const set = getNotifiedApplicationIds();
  set.add(applicationId);
  safeSet(NOTIFIED_APPLICATIONS_KEY, [...set]);
}

const NOTIFIED_INTERVIEW_DATA_KEY = 'recruitment_notified_interview_data';

/**
 * Track which interview IDs we've notified (scheduled/updated).
 * @returns {Set<number>}
 */
export function getNotifiedInterviewIds() {
  const raw = safeParse(NOTIFIED_INTERVIEWS_KEY, []);
  return new Set(raw.map((x) => Number(x)).filter((x) => !isNaN(x)));
}

/**
 * @returns {Record<number, { interviewDate: string, interviewTime: string }>}
 */
export function getNotifiedInterviewData() {
  const raw = safeParse(NOTIFIED_INTERVIEW_DATA_KEY, {});
  const out = {};
  for (const [k, v] of Object.entries(raw)) {
    const id = Number(k);
    if (isNaN(id) || !v || typeof v !== 'object') continue;
    out[id] = { interviewDate: String(v.interviewDate ?? ''), interviewTime: String(v.interviewTime ?? '') };
  }
  return out;
}

/**
 * @param {number} interviewId
 * @param {{ interviewDate?: string, interviewTime?: string }} data
 */
export function markInterviewNotified(interviewId, data = {}) {
  const set = getNotifiedInterviewIds();
  set.add(interviewId);
  safeSet(NOTIFIED_INTERVIEWS_KEY, [...set]);
  const store = getNotifiedInterviewData();
  store[interviewId] = { interviewDate: String(data.interviewDate ?? ''), interviewTime: String(data.interviewTime ?? '') };
  safeSet(NOTIFIED_INTERVIEW_DATA_KEY, store);
}

/**
 * Track which offer IDs we've notified (offer letter sent).
 * @returns {Set<number>}
 */
export function getNotifiedOfferIds() {
  const raw = safeParse(NOTIFIED_OFFERS_KEY, []);
  return new Set(raw.map((x) => Number(x)).filter((x) => !isNaN(x)));
}

/**
 * @param {number} offerId
 */
export function markOfferNotified(offerId) {
  const set = getNotifiedOfferIds();
  set.add(offerId);
  safeSet(NOTIFIED_OFFERS_KEY, [...set]);
}
