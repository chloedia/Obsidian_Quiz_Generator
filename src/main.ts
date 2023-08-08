import { App, Editor, MarkdownView, request, Modal, Notice, Plugin, PluginSettingTab, Setting, addIcon } from 'obsidian';
import {QuizGeneratorSettings} from './types';
import { openFile, createFileWithInput} from 'src/utils';
import QuizGenerator from './quiz_generator';
import {SetPath } from './set_path'
import safeAwait from 'safe-await'
import ReqFormatter from './req_formatter';

import debug from "debug";
const logger = debug('textgenerator:main');
const SYSTEM_PROMPT = "You are a quiz generator, you will be feed an input with the flags [INPUT] and you will give sets of question/answer for anki cards based uniquely on this input in the following json format \:\" [OUTPUT]{\"Questions\" : [{ \"question\" : \"Where were build the pyramids ?\",\n \"answer\" : \"In Egypt.\", \n \"quote\" : \"The pyramids were built in Egypt in ... (line 1)\" }, ... ]} }\". In a json, the attribute name MUST be '\"' and not '\''. All the questions must have their response in the input text, don't add additional information but try having elaborate answers (you are allowed to rephrase). Forget every exterior knowledge. Note that the [INPUT] is written in a markdown format, hence the OUTPUT.answers have to be compatible to markdown.",


// Remember to rename these classes and interfaces!

DEFAULT_SETTINGS: QuizGeneratorSettings= {
	api_key: "",
	engine: "gpt-3.5-turbo",
	max_tokens: 1000,
	temperature: 0.7,
	frequency_penalty: 0.5,
	prompt: "",
	system_prompt : "You are a quiz generator, you will be feed an input with the flags [INPUT] and you will give sets of question/answer for anki cards based uniquely on this input in the following json format \:\" [OUTPUT]{\"Questions\" : [{ \"question\" : \"Where were build the pyramids ?\",\n \"answer\" : \"In Egypt.\", \n \"quote\" : \"The pyramids were built in Egypt in ... (line 1)\" }, ... ]} }\". In a json, the attribute name MUST be '\"' and not '\''. All the questions must have their response in the input text, don't add additional information but try having elaborate answers (you are allowed to rephrase). Forget every exterior knowledge. Note that the [INPUT] is written in a markdown format, hence the OUTPUT.answers have to be compatible to markdown.",
	n_questions : 7,
	prune : false,
	showStatusBar: true,
	outputToBlockQuote: false,
	promptsPath:"textgenerator/prompts",
	displayErrorInEditor: false
}

export default class QuizGenPlugin extends Plugin {
	settings: QuizGeneratorSettings;
	defaultSettings:QuizGeneratorSettings;
	processing: boolean = false;
	//TODO : Give the file where the cursor is (Not necessary) -> clear
	getActiveView() {
        const activeView = this.app.workspace.getActiveViewOfType(MarkdownView);
        if (activeView !== null) {
            return activeView
        } else {
            new Notice("The file type should be Markdown!");
            return null
        }
    }
	async generateQuiz() {
		this.settings.system_prompt = SYSTEM_PROMPT
		const activeFile = this.app.workspace.getActiveFile();
		const activeView = this.getActiveView();
		if (activeView !== null) {
			const editor = activeView.editor;
			}
		console.log("Creating the questions ...")
		var quizgen = new QuizGenerator(this.app, this)

		var title;
		if (activeFile !== null){
				title = `${activeFile.basename} Quiz`;
			}


		else{
			logger('You have to select a file.');
			title = "NewQuiz";
		}
		let responses: string[] = await quizgen.generate(title)
		if (this.settings.prune) { 
			responses = await quizgen.prune_question(responses)
		 }
		const response = responses.join('\n');

		const content = "# Generated Quiz\n\n#flashcards\n" + response
		console.log(title)
		const suggestedPath = `${title}.md`

		//Open a new note and write string
		new SetPath(this.app,suggestedPath,async (path: string) => {
			const [errorFile,file]= await safeAwait(createFileWithInput(path,content,this.app));
			if(errorFile) {
				logger("createTemplate error",errorFile);
				return Promise.reject(errorFile);
			}
			openFile(this.app,file);
			}).open(); 

		this.processing = false
	}
	async onload() {
		this.defaultSettings = DEFAULT_SETTINGS;
		await this.loadSettings();
		//addIcon('genquiz', '')

		// This creates an icon in the left ribbon.
		const ribbonIconEl = this.addRibbonIcon('checkbox-glyph', 'Quiz Generator', async (evt: MouseEvent) => {
			// Called when the user clicks the icon.
			statusBarItemEl.setText('Generating Quiz ...');
			this.generateQuiz();
			statusBarItemEl.setText('No Quiz Generation');
			this.processing = false

			
		});
		// Perform additional things with the ribbon
		ribbonIconEl.addClass('my-plugin-ribbon-class');

		// This adds a status bar item to the bottom of the app. Does not work on mobile apps.
		const statusBarItemEl = this.addStatusBarItem();
		statusBarItemEl.setText('No Quiz Generation');

		// This adds a complex command that can check whether the current state of the app allows execution of the command
		this.addCommand({
			id: 'genquiz-modal',
			name: 'Generate quiz',
			checkCallback: (checking: boolean) => {
				// Conditions to check
				const markdownView = this.app.workspace.getActiveViewOfType(MarkdownView);
				if (markdownView) {
					// If checking is true, we're simply "checking" if the command can be run.
					// If checking is false, then we want to actually perform the operation.
					if (!checking) {
						statusBarItemEl.setText('Generating Quiz ...');
						this.generateQuiz();
					}
					statusBarItemEl.setText('No Quiz Generation');

					// This command will only show up in Command Palette when the check function returns true
					return true;
				}
			}
		});

		// This adds a settings tab so the user can configure various aspects of the plugin
		this.addSettingTab(new QuizGenSettingTab(this.app, this));
	}

	onunload() {

	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}
}

class QuizGenModal extends Modal {
	constructor(app: App) {
		super(app);
	}

	onOpen() {
		const {contentEl} = this;
		contentEl.setText('Welcome to a Generated Quiz world');
	}

	onClose() {
		const {contentEl} = this;
		contentEl.empty();
	}
}

class QuizGenSettingTab extends PluginSettingTab {
	plugin: QuizGenPlugin;

	constructor(app: App, plugin: QuizGenPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const {containerEl} = this;

		containerEl.empty();

		containerEl.createEl('h2', {text: 'Settings of the Awesome Quiz Generator Plugin.'});

		new Setting(containerEl)
			.setName('Api Key')
			.setDesc('It\'s a secret 👀')
			.addText(text => text
				.setPlaceholder('Enter your Open AI API key')
				.setValue(this.plugin.settings.api_key)
				.onChange(async (value) => {
					this.plugin.settings.api_key = value;
					await this.plugin.saveSettings();
				}));
		new Setting(containerEl)
				.setName('Prune questions')
				.setDesc('Limit to 10 the number of generated flashcards')
				.addToggle(res => res
					.setValue(this.plugin.settings.prune)
					.onChange(async (value) => {
						this.plugin.settings.prune = value;
						await this.plugin.saveSettings();
					}))					
	}
}
