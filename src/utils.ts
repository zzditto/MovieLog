import { Notice } from 'obsidian';

export function reportError(context: string, error: unknown): void {
    const message = error instanceof Error ? error.message : '未知错误';
    new Notice(`${context}: ${message}`);
    console.error(`[MovieLog] ${context}:`, error);
}
