import { Vault } from 'obsidian';
import { UgreenSyncSettings } from './types';

let vaultAdapter: Vault['adapter'] | null = null;
let logFilePath = '';
let debugEnabled = false;

export function initFileLogger(adapter: Vault['adapter'], path: string): void {
	vaultAdapter = adapter;
	logFilePath = path;
}

/** Set the global debug flag. Call this whenever settings.debugLogging changes. */
export function setDebugEnabled(enabled: boolean): void {
	debugEnabled = enabled;
}

/** Check whether debug logging is currently active (for use in the fetch wrapper). */
export function isDebugEnabled(): boolean {
	return debugEnabled;
}

async function appendToLogFile(line: string): Promise<void> {
	if (!vaultAdapter || !logFilePath) {
		return;
	}
	try {
		const exists = await vaultAdapter.exists(logFilePath);
		const content = exists ? await vaultAdapter.read(logFilePath) : '';
		await vaultAdapter.write(logFilePath, content + line);
	} catch {
		// Silently ignore write failures to avoid cascading errors
	}
}

function formatLogLine(
	level: string,
	operation: string,
	details: Record<string, unknown>,
): string {
	const ts = new Date().toISOString();
	const detailStr = Object.keys(details).length > 0 ? ` ${JSON.stringify(details)}` : '';
	return `[${ts}] [${level}] ${operation}${detailStr}\n`;
}

export function debugLog(
	settings: UgreenSyncSettings,
	operation: string,
	details: Record<string, unknown> = {},
): void {
	if (!settings.debugLogging) {
		return;
	}

	console.debug(`[UGREEN Sync] ${operation}`, details);
	void appendToLogFile(formatLogLine('DEBUG', operation, details));
}

/**
 * Log an error to both console and file (only when debug logging is enabled).
 * Designed for use in the fetch wrapper and other contexts where settings may
 * not be directly available.
 */
export function logError(
	context: string,
	message: string,
	details?: unknown,
): void {
	if (!debugEnabled) {
		return;
	}
	const detailObj = details !== undefined
		? { message, details }
		: { message };
	console.error(`[UGREEN Sync] ${context}:`, detailObj);
	void appendToLogFile(formatLogLine('ERROR', `${context}: ${message}`, { details }));
}
