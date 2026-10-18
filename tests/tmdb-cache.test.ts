import { describe, expect, it } from 'vitest';
import { CACHE_MAX_ENTRIES, CACHE_TTL_MS, pruneTmdbCacheEntries } from '../src/tmdb-cache';

describe('TMDB 持久缓存', () => {
	it('丢弃过期和畸形缓存条目', () => {
		const now = 1_000_000;
		expect(pruneTmdbCacheEntries({
			valid: { data: { id: 1 }, timestamp: now - 1 },
			expired: { data: { id: 2 }, timestamp: now - CACHE_TTL_MS - 1 },
			invalid: { data: { id: 3 }, timestamp: 'not-a-time' }
		}, now)).toEqual({
			valid: { data: { id: 1 }, timestamp: now - 1 }
		});
	});

	it('只保留最新的条目，并按时间从新到旧排列', () => {
		const now = 10_000_000;
		const total = CACHE_MAX_ENTRIES + 5;
		const entries: Record<string, unknown> = {};

		// index 越大越旧；写入顺序用固定步长打乱，既不是从新到旧也不是从旧到新，
		// 因此结果只能来自按 timestamp 排序，而非对象的插入顺序。
		for (let step = 0; step < total; step++) {
			const index = (step * 37) % total;
			entries[`entry-${index}`] = { data: index, timestamp: now - index };
		}

		const pruned = pruneTmdbCacheEntries(entries, now);

		expect(Object.keys(pruned)).toEqual(
			Array.from({ length: CACHE_MAX_ENTRIES }, (_, index) => `entry-${index}`)
		);
		expect(pruned['entry-0']).toEqual({ data: 0, timestamp: now });
		expect(pruned[`entry-${CACHE_MAX_ENTRIES - 1}`]).toBeDefined();
		expect(pruned[`entry-${CACHE_MAX_ENTRIES}`]).toBeUndefined();
		expect(pruned[`entry-${total - 1}`]).toBeUndefined();
	});
});
