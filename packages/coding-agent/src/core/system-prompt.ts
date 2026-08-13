/**
 * System prompt construction and project context loading
 */

import { getDocsPath, getExamplesPath, getReadmePath } from "../config.ts";
import { formatSkillsForPrompt, type Skill } from "./skills.ts";

export interface BuildSystemPromptOptions {
	/** Custom system prompt (replaces default). */
	customPrompt?: string;
	/** Tools to include in prompt. Default: [read, bash, edit, write] */
	selectedTools?: string[];
	/** Optional one-line tool snippets keyed by tool name. */
	toolSnippets?: Record<string, string>;
	/** Additional guideline bullets appended to the default system prompt guidelines. */
	promptGuidelines?: string[];
	/** Text to append to system prompt. */
	appendSystemPrompt?: string;
	/** Working directory. */
	cwd: string;
	/** Pre-loaded context files. */
	contextFiles?: Array<{ path: string; content: string }>;
	/** Pre-loaded skills. */
	skills?: Skill[];
}

/** Build the system prompt with tools, guidelines, and context */
export function buildSystemPrompt(options: BuildSystemPromptOptions): string {
	const {
		customPrompt,
		selectedTools,
		toolSnippets,
		promptGuidelines,
		appendSystemPrompt,
		cwd,
		contextFiles: providedContextFiles,
		skills: providedSkills,
	} = options;
	const promptCwd = cwd.replace(/\\/g, "/");

	const appendSection = appendSystemPrompt ? `\n\n${appendSystemPrompt}` : "";

	const contextFiles = providedContextFiles ?? [];
	const skills = providedSkills ?? [];

	if (customPrompt) {
		let prompt = customPrompt;

		if (appendSection) {
			prompt += appendSection;
		}

		// Append project context files
		if (contextFiles.length > 0) {
			prompt += "\n\n<project_context>\n\n";
			prompt += "项目专属说明与规范：\n\n";
			for (const { path: filePath, content } of contextFiles) {
				prompt += `<project_instructions path="${filePath}">\n${content}\n</project_instructions>\n\n`;
			}
			prompt += "</project_context>\n";
		}

		// Append skills section (only if read tool is available)
		const customPromptHasRead = !selectedTools || selectedTools.includes("read");
		if (customPromptHasRead && skills.length > 0) {
			prompt += formatSkillsForPrompt(skills);
		}

		prompt += `\n当前工作目录：${promptCwd}\nCurrent working directory: ${promptCwd}\n`;

		return prompt;
	}

	// Get absolute paths to documentation and examples
	const readmePath = getReadmePath();
	const docsPath = getDocsPath();
	const examplesPath = getExamplesPath();

	// Build tools list based on selected tools.
	// A tool appears in Available tools only when the caller provides a one-line snippet.
	const tools = selectedTools || ["read", "bash", "edit", "write"];
	const visibleTools = tools.filter((name) => !!toolSnippets?.[name]);
	const toolsList =
		visibleTools.length > 0 ? visibleTools.map((name) => `- ${name}: ${toolSnippets![name]}`).join("\n") : "(none)";

	// Build guidelines based on which tools are actually available
	const guidelinesList: string[] = [];
	const guidelinesSet = new Set<string>();
	const addGuideline = (guideline: string): void => {
		if (guidelinesSet.has(guideline)) {
			return;
		}
		guidelinesSet.add(guideline);
		guidelinesList.push(guideline);
	};

	const hasBash = tools.includes("bash");
	const hasGrep = tools.includes("grep");
	const hasFind = tools.includes("find");
	const hasLs = tools.includes("ls");
	const hasRead = tools.includes("read");

	// File exploration guidelines
	if (hasBash && !hasGrep && !hasFind && !hasLs) {
		addGuideline("使用 bash 执行 ls、rg、find 等文件操作");
	}

	for (const guideline of promptGuidelines ?? []) {
		const normalized = guideline.trim();
		if (normalized.length > 0) {
			addGuideline(normalized);
		}
	}

	// Always include these
	addGuideline("回答简洁，优先给出可执行的结论");
	addGuideline("处理文件时清晰展示文件路径");

	const guidelines = guidelinesList.map((g) => `- ${g}`).join("\n");

	let prompt = `你是 ASu，一个面向中文用户的智能工作助手。你运行在上游 coding-agent harness 的运行时之上，但对用户统一以“ASu”自称。

你的首要工作是帮助用户完成中文求职任务：
- 使用真实经历进行岗位定位、项目亮点提炼和 HR 开场白酥化；
- 输出高密度、强定位、项目全景和证据化的中文技术简历；
- 制作、编辑和完善中文简历，必要时生成可编辑 HTML 或 PDF；
- 记录和管理秋招投递、测评、面试、Offer、拒信及招聘邮件进度。

处理简历和 HR 自我介绍时，目标是让 HR 在很短时间内看懂“候选人是谁、做过什么、能解决什么问题”。默认采用以下表达链路：背景目标 → 个人边界 → 关键动作 → 系统能力 → 业务价值 → 结果证据。复杂项目要展开为项目全景，包括目标/场景、我的职责、架构或流程、关键难点、落地结果和可追问证据；只有用户确实做过时，才使用 Owner、项目负责人、核心作者、0-1 或架构升级等强标签。

简历顶部优先呈现岗位身份、目标方向、核心技术能力、城市/到岗信息和可信背书；经历按公司/团队和时间分组；项目 bullet 要具体、密集、可验证，避免“学习能力强、责任心强、热爱技术”等空泛评价。技术名词必须落到个人动作和结果上，不能只堆 Agent、Workflow、Tool、Skill、Context Engineering 等关键词。

HR 开场白要直接说明身份、目标岗位和匹配方向，中间只放 1—2 个最强真实证据，结尾说明岗位/城市/到岗时间（若已知）并邀请继续交流。Boss 直聘或微信短版通常控制在 80—160 字，完整版本控制在 180—280 字，语气自信、克制、可被追问，不把整份简历复制进聊天框。

除非用户明确要求编程或项目维护，否则优先按照求职助手处理请求。处理求职材料时，不能虚构职位、公司、项目、技术栈、职责、影响力或数据；不得把参考图片、他人简历或招聘信息中的内容当成用户经历。没有数字时使用可核验的定性结果，并将缺失事实标记为“待补证据”或“待确认”。表达应清晰、稳妥、可被 HR 追问和证据支撑。

你也保留完整的文件和代码协作能力，可以读取文件、执行命令、编辑代码和创建新文件。

可用工具：
${toolsList}

除上述工具外，根据项目配置，你可能还可以使用其他自定义工具。

工作规范：
${guidelines}

ASu 文档（只有用户询问自身、SDK、扩展、主题、技能或 TUI 时才读取）：
- 主文档：${readmePath}
- 补充文档：${docsPath}
- 示例：${examplesPath}（扩展、自定义工具、SDK）
- 读取文档或示例时，应从补充文档目录解析 docs/...，从示例目录解析 examples/...，不要优先读取当前工作目录中的同名文件
- 处理文档和示例前，完整阅读相关 .md 文件，并遵循其中的交叉引用`;

	if (appendSection) {
		prompt += appendSection;
	}

	// Append project context files
	if (contextFiles.length > 0) {
		prompt += "\n\n<project_context>\n\n";
		prompt += "项目专属说明与规范：\n\n";
		for (const { path: filePath, content } of contextFiles) {
			prompt += `<project_instructions path="${filePath}">\n${content}\n</project_instructions>\n\n`;
		}
		prompt += "</project_context>\n";
	}

	// Append skills section (only if read tool is available)
	if (hasRead && skills.length > 0) {
		prompt += formatSkillsForPrompt(skills);
	}

	prompt += `\n当前工作目录：${promptCwd}\nCurrent working directory: ${promptCwd}`;

	return prompt;
}
