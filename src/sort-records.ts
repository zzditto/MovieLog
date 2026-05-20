interface RecordWithDate {
	content: string;
	watchDate: string;
	originalIndex: number;
}

interface ParsedMarkdown {
	frontmatter: string;
	header: string;
	records: RecordWithDate[];
}

function parseRecords(content: string): ParsedMarkdown {
	let frontmatter = '';
	let header = '';
	let body = content;

	const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---\n?/);
	if (frontmatterMatch?.[1] !== undefined) {
		frontmatter = frontmatterMatch[1];
		body = content.substring(frontmatterMatch[0].length);
	}

	const headerMatch = body.match(/^(# .+)$/m);
	if (headerMatch?.[1] !== undefined) {
		header = headerMatch[1];
		body = body.substring(headerMatch.index! + headerMatch[0].length);
	}

	const recordChunks = body.split(/(?=^## )/m).filter(chunk => chunk.trim());

	const records: RecordWithDate[] = recordChunks.map((chunk, index) => {
		const dateMatch = chunk.match(/\*\*完成日期\*\*:\s*(\d{4}-\d{2}-\d{2})?/);
		return {
			content: chunk.trim(),
			watchDate: dateMatch?.[1] || '',
			originalIndex: index
		};
	});

	return { frontmatter, header, records };
}

function sortRecords(records: RecordWithDate[]): RecordWithDate[] {
	return [...records].sort((a, b) => {
		if (a.watchDate && !b.watchDate) return -1;
		if (!a.watchDate && b.watchDate) return 1;

		if (a.watchDate && b.watchDate) {
			const dateComparison = b.watchDate.localeCompare(a.watchDate);
			if (dateComparison !== 0) return dateComparison;
		}

		return a.originalIndex - b.originalIndex;
	});
}

function rebuildMarkdown(parsed: ParsedMarkdown): string {
	const parts: string[] = [];

	if (parsed.frontmatter) {
		parts.push(`---\n${parsed.frontmatter}\n---\n`);
	}

	if (parsed.header) {
		parts.push(parsed.header + '\n\n');
	}

	if (parsed.records.length > 0) {
		const recordsContent = parsed.records
			.map(record => record.content)
			.join('\n\n---\n\n');
		parts.push(recordsContent);
	}

	return parts.join('');
}

export function sortMarkdownRecords(content: string): string {
	if (!content || !content.trim()) {
		return content;
	}

	const parsed = parseRecords(content);

	if (parsed.records.length === 0) {
		return content;
	}

	parsed.records = sortRecords(parsed.records);

	return rebuildMarkdown(parsed);
}
