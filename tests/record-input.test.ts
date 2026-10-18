import { describe, expect, it } from 'vitest';
import { WatchStatus } from '../src/types';
import { formatLocalDate, validateRecordForm } from '../src/record-input';

describe('观影记录表单', () => {
	it('按本地时间格式化日期', () => {
		expect(formatLocalDate(new Date(2026, 6, 28, 0, 30))).toBe('2026-07-28');
	});

	it('月份和日期都是一位数时补零', () => {
		expect(formatLocalDate(new Date(2026, 0, 5))).toBe('2026-01-05');
		expect(formatLocalDate(new Date(2026, 8, 9))).toBe('2026-09-09');
		expect(formatLocalDate(new Date(2026, 11, 31))).toBe('2026-12-31');
	});

	it('接受闰日和 0 分评分', () => {
		expect(validateRecordForm({
			watchDate: '2024-02-29',
			rating: '0',
			platform: '影院',
			status: WatchStatus.COMPLETED
		})).toEqual({
			ok: true,
			value: {
				watchDate: '2024-02-29',
				rating: 0,
				platform: '影院',
				status: WatchStatus.COMPLETED
			}
		});
	});

	it.each(['2023-02-29', '2024-13-01', 'not-a-date'])('拒绝不存在的观看日期：%s', (watchDate) => {
		expect(validateRecordForm({
			watchDate,
			rating: '',
			platform: '',
			status: WatchStatus.COMPLETED
		})).toEqual({ ok: false, message: '请输入有效的观看日期（YYYY-MM-DD）' });
	});

	it.each(['-1', '10.1', 'abc'])('拒绝无效评分：%s', (rating) => {
		expect(validateRecordForm({
			watchDate: '2026-07-28',
			rating,
			platform: '',
			status: WatchStatus.COMPLETED
		})).toEqual({ ok: false, message: '评分必须是 0 到 10 之间的数字' });
	});
});
