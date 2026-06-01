/**
 * Rate Limiter
 *
 * 内存限流实现
 * - 基于用户 UID 的限流
 * - 滑动窗口算法
 * - 自动清理过期条目
 */

// 限流桶
interface RateLimitBucket {
  count: number;
  resetAt: number;
}

// 存储所有用户的限流状态
const buckets = new Map<string, RateLimitBucket>();

// 清理间隔 (5 分钟)
const CLEANUP_INTERVAL_MS = 300_000;

/**
 * 限流检查
 *
 * @param uid - 用户 UID
 * @param maxRequests - 窗口内最大请求数
 * @param windowMs - 窗口时间 (毫秒)
 * @returns true 如果允许请求，false 如果被限流
 */
export function rateLimitCheck(uid: string, maxRequests: number, windowMs: number): boolean {
  const now = Date.now();
  const bucket = buckets.get(uid);

  // 首次请求或窗口已过期
  if (!bucket || now > bucket.resetAt) {
    buckets.set(uid, {
      count: 1,
      resetAt: now + windowMs,
    });
    return true;
  }

  // 检查是否超过限制
  if (bucket.count >= maxRequests) {
    return false;
  }

  // 增加计数
  bucket.count++;
  return true;
}

/**
 * 获取用户剩余请求次数
 *
 * @param uid - 用户 UID
 * @param maxRequests - 窗口内最大请求数
 * @returns 剩余请求次数，如果无限制则返回 maxRequests
 */
export function getRemainingRequests(uid: string, maxRequests: number): number {
  const now = Date.now();
  const bucket = buckets.get(uid);

  if (!bucket || now > bucket.resetAt) {
    return maxRequests;
  }

  return Math.max(0, maxRequests - bucket.count);
}

/**
 * 重置用户限流状态
 *
 * @param uid - 用户 UID
 */
export function resetRateLimit(uid: string): void {
  buckets.delete(uid);
}

/**
 * 清理过期的限流条目
 */
function cleanupExpiredBuckets(): void {
  const now = Date.now();
  for (const [key, bucket] of buckets) {
    if (now > bucket.resetAt) {
      buckets.delete(key);
    }
  }
}

// 定期清理过期条目
setInterval(cleanupExpiredBuckets, CLEANUP_INTERVAL_MS);
