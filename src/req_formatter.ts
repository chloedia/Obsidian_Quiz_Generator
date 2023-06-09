import {App,addIcon, Notice, Plugin, PluginSettingTab, Setting, request, MarkdownView, Editor, parseFrontMatterAliases} from 'obsidian';
import {QuizGeneratorSettings} from './types';
import QuizGenPlugin from './main';
import debug from "debug";
const logger = debug('quizgenerator:ReqFormatter');

export type ChatGPTAgent = "assistant" | "user" | "system";

export default class ReqFormatter {
    plugin: QuizGenPlugin;
    app: App;
	constructor(app: App, plugin: QuizGenPlugin) {
        this.app = app;
		this.plugin = plugin;
	}

    addContext(parameters: QuizGeneratorSettings,prompt: string){
        const params={
           ...parameters,
           prompt	
       }
       return params;
   }

   prepareReqParameters(params: QuizGeneratorSettings,insertMetadata: boolean,templatePath:string="", additionnalParams:any={}, role:ChatGPTAgent = 'assistant') {
    logger("prepareReqParameters",params,insertMetadata,templatePath);
    let bodyParams:any= {
     "model": params.engine,
     "max_tokens": 3000,
     "temperature": params.temperature,
     "frequency_penalty": params.frequency_penalty
  };

    const chatModels=["gpt-3.5-turbo","gpt-3.5-turbo-0301","gpt-4"];

    const reqUrl = "https://api.openai.com/v1/chat/completions";
    const reqExtractResult = "requestResults?.choices[0].message.content";
    bodyParams["messages"]=[{"role": "system", "content": params.system_prompt},{"role": role, "content": params.prompt}];


    bodyParams = {...bodyParams,...additionnalParams?.bodyParams};

    let reqParams = {
        url: reqUrl,
        method: 'POST',
        body:'',
        headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${params.api_key}`
        },
        extractResult: reqExtractResult
    }

    reqParams = {...reqParams,...additionnalParams?.reqParams};
    reqParams.body=	JSON.stringify(bodyParams);
    logger("prepareReqParameters",{bodyParams,reqParams});
       return reqParams;

    }
}