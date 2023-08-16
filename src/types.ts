type QuizGeneratorSettings = {
	api_key: string;
	engine: string;
	max_tokens: number;
	temperature: number;
	frequency_penalty: number;
	system_prompt: string;
	prompt: string;
	n_questions: number;
	prune: boolean;
	promptsPath: string;
	showStatusBar: boolean;
	displayErrorInEditor: boolean;
	outputToBlockQuote: boolean;
};

type QuizGeneratorConfiguration = {
	packages: PackageTemplate[];
	installedPackages: InstalledPackage[];
};

type InstalledPackage = {
	packageId: string;
	version: string;
	prompts: PromptTemplate[];
	installedPrompts: installedPrompts[];
};

type installedPrompts = {
	promptId: string;
	version: string;
};

type PackageTemplate = {
	packageId: string;
	name: string;
	version: string;
	minTextGeneratorVersion: string;
	description: string;
	tags: string;
	author: string;
	authorUrl: string;
	repo: string;
	published_at: Date;
	downloads: number;
};

type PromptTemplate = {
	promptId: string;
	name: string;
	path: string;
	description: string;
	required_values: string;
	author: string;
	tags: string;
	version: string;
};

type FileViewMode = "source" | "preview" | "default";
enum NewTabDirection {
	vertical = "vertical",
	horizontal = "horizontal",
}

type Model = {
	id: string;
};
export type {
	FileViewMode,
	NewTabDirection,
	QuizGeneratorSettings,
	PromptTemplate,
	PackageTemplate,
	Model,
	InstalledPackage,
	QuizGeneratorConfiguration,
};
