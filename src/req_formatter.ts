import { App } from "obsidian";
import { QuizGeneratorSettings } from "./types";
import QuizGenPlugin from "./main";
import debug from "debug";
import { Stream } from "stream";
const logger = debug("quizgenerator:ReqFormatter");

export type ChatGPTAgent = "assistant" | "user" | "system";

export default class ReqFormatter {
	plugin: QuizGenPlugin;
	app: App;
	constructor(app: App, plugin: QuizGenPlugin) {
		this.app = app;
		this.plugin = plugin;
	}

	addContext(parameters: QuizGeneratorSettings, prompt: string) {
		const params = {
			...parameters,
			prompt,
		};
		return params;
	}

	prepareReqParameters(
		params: QuizGeneratorSettings,
		insertMetadata: boolean,
		templatePath = "",
		additionnalParams: any = {},
		role: ChatGPTAgent = "user"
	) {
		logger("prepareReqParameters", params, insertMetadata, templatePath);

		let model, reqUrl, reqExtractResult;
        if (params.useLocalLLM) {
            logger("useLocalLLM");
			
            model = params.selectedOllamaModel;
            reqUrl = "http://localhost:11434/v1/chat/completions";
			reqExtractResult = "requestResults?.choices[0].message.content";
        } else {
            logger("useChatGPT");
            reqUrl = "https://api.openai.com/v1/chat/completions";
            model = params.engine;
			reqExtractResult = "requestResults?.choices[0].message.content";
        }
	
		let bodyParams: any = {
			model: model,
			max_tokens: 3000,
			temperature: params.temperature,
			frequency_penalty: params.frequency_penalty,
			stream: false,
		};

		// Add ctx_length to bodyParams for local LLM only

		//const chatModels = ["gpt-3.5-turbo", "gpt-3.5-turbo-0301", "gpt-4"];
		//const reqUrl = "https://api.openai.com/v1/chat/completions";
		bodyParams["messages"] = [
			{ role: "system", content: params.system_prompt },
			{ role: role, content: params.prompt },
		];

		bodyParams = { ...bodyParams, ...additionnalParams?.bodyParams };

		let reqParams = {
			url: reqUrl,
			method: "POST",
			body: "",
			headers: {
				"Content-Type": "application/json",
				Authorization: `Bearer ${params.api_key}`,
			},
			extractResult: reqExtractResult,
		};

		reqParams = { ...reqParams, ...additionnalParams?.reqParams };
		reqParams.body = JSON.stringify(bodyParams);
		console.log("Body Params ", bodyParams["messages"]);
		logger("prepareReqParameters", { bodyParams, reqParams });
		return reqParams;
	}
}
