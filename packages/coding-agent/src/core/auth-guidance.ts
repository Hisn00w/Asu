import { join } from "node:path";
import { getDocsPath } from "../config.ts";

const UNKNOWN_PROVIDER = "unknown";

export function getProviderLoginHelp(): string {
	return [
		"使用 /login 通过 OAuth 或 API Key 登录模型提供商。相关文档：",
		`  ${join(getDocsPath(), "providers.md")}`,
		`  ${join(getDocsPath(), "models.md")}`,
	].join("\n");
}

export function formatNoModelsAvailableMessage(): string {
	return `暂无可用模型。${getProviderLoginHelp()}`;
}

export function formatNoModelSelectedMessage(): string {
	return `尚未选择模型。\n\n${getProviderLoginHelp()}\n\n然后使用 /model 选择模型。`;
}

export function formatNoApiKeyFoundMessage(provider: string): string {
	const providerDisplay = provider === UNKNOWN_PROVIDER ? "当前选择的模型" : provider;
	return `未找到 ${providerDisplay} 的 API Key。\n\n${getProviderLoginHelp()}`;
}
