import {
	App,
	Notice,
	request,
} from "obsidian";
import QuizGenPlugin from "./main";
import debug from "debug";
import ReqFormatter from "./req_formatter";
import * as _ from 'underscore';

const logger = debug("quizgenerator: QuizGenerator");

export default class QuizGenerator {
	plugin: QuizGenPlugin;
	app: App;
	n_gen_question: number;

	constructor(app: App, plugin: QuizGenPlugin) {
		this.app = app;
		this.plugin = plugin;
		this.n_gen_question = 0;
	}

	async generate(title: string): Promise<string[]> {
		logger(`Generating a Quiz on ${title}`);
		if (!this.plugin.processing) {
			this.plugin.processing = true;
			// We get the text of the app
			const currentFile = this.app.workspace.getActiveFile();
			if (!currentFile) return [""];

			const content = await this.app.vault.read(currentFile);

			// We preprocess it (split the text in chunks of 2000 characters)
			const chunks = this.preprocessText(content, 2000);

			// Get the responses for each chunk
			let responses: string[] = [];

			await Promise.all(
				chunks.map(async (chunk) => {
					let trans_chunk = chunk.replace(/"/gm, "*");
					trans_chunk = chunk.replace(/'/gm, "_");

					this.plugin.settings.prompt = this.getPrompt(trans_chunk);
					const reqformatter = new ReqFormatter(
						this.app,
						this.plugin
					);
					const params = reqformatter.prepareReqParameters(
						this.plugin.settings,
						false
					);
					const response = await this.getQuizFromAPI(params);

					responses = [...responses, ...response];
					this.n_gen_question += 5;
					// Delay the execution of each iteration by 3 seconds
					//await this.delay(3000);
				})
			);

			// Combine the responses
			//const combinedResponse = this.combineResponses(responses);

			// Return the combined response
			return responses;
		} else {
			new Notice("There is already another generation process");
			logger("generate error", "There is another generation process");
			return Promise.reject(
				new Error("There is another generation process")
			);
		}
	}
	async prune_question(text: string[]): Promise<string[]> {
		console.log(`Currently Pruning to 10 questions ...`);
		if (this.n_gen_question > 10) {
			return _.sample(text, 10);
		}
		return text;
	}

	preprocessText(text: string, chunkSize: number): string[] {
		const chunks: string[] = [];
		const paragraphs: string[] = text.split("\n"); // Split text into paragraphs
		if (paragraphs[paragraphs.length - 1].length == 0){
			paragraphs.pop()
		}

		let currentChunk = "";

		for (const paragraph of paragraphs) {
			if (currentChunk.length + paragraph.length > chunkSize) {
				chunks.push(currentChunk.trim());
				currentChunk = "";
			}

			currentChunk += paragraph + " ";
		}

		if (currentChunk !== "") {
			chunks.push(currentChunk.trim());
		}
		console.log(chunks)
		return chunks;
	}

	combineResponses(responses: string[]): string {
		return responses.join("\n");
	}

	/* getPrompt(content: string) {
		return "[INPUT]" + content;
	} */
	getPrompt(content: string){
		return `Give sets
		of question/answer for anki cards based uniquely on this input in the following json format:
		" [OUTPUT]{"Questions" : [{ "key_info" : "The obitore are a community from the south west of asia that are selling erasers",
		   \n"question" : "What are the obitore ? ",
		   \n"answer" : "A community from the south west of asia know for selling erasers.",
		   \n"quote" : "The obitore are a community from the south west of asia that are selling erasers[...] (line 4)"}, ... ]} }".
		   The key_info property must be a quote from the given text.
		   If you ask a question that depends on a specific context/conditions, precise it in the question.
		  In a json, the attribute name MUST be \'"\' and not \'\'\'. All the questions must have their response in the input text,
		   don\'t add additional information but try having elaborate answers (you are allowed to rephrase). 
		   Forget every exterior knowledge. Note that the text is written in a markdown format and can contain mathematical formulas, hence the OUTPUT.answers 
		   have to be compatible with markdown. If there are not enough information in the token return an empty json. 
		   Text : ${content}`
	}



	async getQuizFromAPI(params: any, n_try = 0): Promise<string[]> {
		// Send request to OpenAI's API to generate the quiz
		let response = await request(params);
		const response_json = JSON.parse(response);
		response = response_json.choices[0].message.content;
		response = response.replace(/(?<!\\)\\(?=[a-zA-Z])/gm, "\\\\")
		let assistantResponse = [""]

		try {
			assistantResponse = await this.outputFormatting(response);

			// Return the assistant response
			return assistantResponse;
		} catch (error) {
			n_try += 1;
			if (n_try > 1) {
				this.plugin.processing = false;
				new Notice(
					"We are having trouble creating the quiz, some part of the text might not have flashcards please try again by selecting a specific part of the text."
				);
				assistantResponse = [""]
				//throw error;
			}else{

			console.log(
				`N TRY : ${n_try} ! The json was not correct ... Reformulating ... ${error}`
			);
			const new_prompt = `This is not a correct json ! Return a corrected version format (to help you the error is ${error}) : ${response}`;

			params.prompt = new_prompt;
			assistantResponse = await this.getQuizFromAPI(params, n_try);
			}
			return assistantResponse;
		}
	}

	async outputFormatting(input: string) {
		//Function to format the output
		const result: string[] = [];
		let transformedString = input.replace("[OUTPUT]", "");
		transformedString = transformedString.replace(/,(?=[}\]])/gm, "");

		console.log(transformedString)
		if (transformedString == "{}"){
			return [""]
		}

		const jsonResult = JSON.parse(transformedString);

		for (const entry of jsonResult.Questions) {
			if (entry.answer != "" && entry.answer != "null" ) {
				const new_set = `${JSON.stringify(entry.question).replace(
					/\\\\/gm,
					"\\"
				)}\n?\n${JSON.stringify(entry.answer).replace(
					/\\\\/gm,
					"\\"
				)} (Exact Quote : "${
					(entry.key_info != "") && (!entry.key_info.includes("pyramids")) ? entry.key_info : "NA"
				})"\n\n`;
				result.push(new_set.replace(/"/gm, ""));
			}
		}

		return result;
	}
	delay(ms: number): Promise<void> {
		return new Promise((resolve) => setTimeout(resolve, ms));
	}
}
