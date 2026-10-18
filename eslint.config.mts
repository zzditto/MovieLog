import tseslint from 'typescript-eslint';
import obsidianmd from "eslint-plugin-obsidianmd";
import globals from "globals";
import { globalIgnores } from "eslint/config";

export default tseslint.config(
	{
		languageOptions: {
			globals: {
				...globals.browser,
			},
			parserOptions: {
				projectService: {
					allowDefaultProject: [
						'eslint.config.mts',
						'manifest.json'
					]
				},
				tsconfigRootDir: import.meta.dirname,
				extraFileExtensions: ['.json']
			},
		},
	},
	...obsidianmd.configs.recommended,
	{
		// 界面以中文为主。保留品牌/缩写原有大小写，并跳过日期格式占位符，
		// 避免规则把「TMDB API Key」之类的专有名词误判为大小写错误。
		rules: {
			"obsidianmd/ui/sentence-case": [
				"warn",
				{
					brands: ["MovieLog", "Netflix", "TMDB"],
					acronyms: ["TMDB", "API"],
					ignoreRegex: ["YYYY-MM-DD", "yyyy-MM-dd"],
				},
			],
		},
	},
	globalIgnores([
		"node_modules",
		"tests",
		"dist",
		".opencode",
		"esbuild.config.mjs",
		"eslint.config.js",
		"version-bump.mjs",
		"versions.json",
		"main.js",
	]),
);
