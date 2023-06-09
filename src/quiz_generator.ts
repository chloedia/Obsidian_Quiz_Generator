import {App,addIcon, Notice, Plugin, PluginSettingTab, Setting, request, MarkdownView, Editor, parseFrontMatterAliases, MetadataCache} from 'obsidian';
import QuizGenPlugin from './main'
import debug from "debug";
import ReqFormatter from './req_formatter';
import { TIMEOUT } from 'dns';
const logger = debug('quizgenerator: QuizGenerator');

export default class QuizGenerator{
    plugin: QuizGenPlugin;
    app: App;
    n_gen_question : number;

    constructor(app: App, plugin: QuizGenPlugin) {
        this.app = app;
		this.plugin = plugin;
        this.n_gen_question = 0;
	}

    async generate(title: string):Promise<string> {
        logger(`Generating a Quiz on ${title}`);
        console.log(this.plugin.processing)
        if (!this.plugin.processing) {
            this.plugin.processing = true
            // We get the text of the app
            const currentFile = this.app.workspace.getActiveFile();
            if (!currentFile) return "";
    
            const content = await this.app.vault.read(currentFile);
    
            // We preprocess it (split the text in chunks of 2000 characters)
            const chunks = this.preprocessText(content, 2000);
    
            // Get the responses for each chunk
            const responses: string[] = [];
            
    
            await Promise.all(chunks.map(async (chunk) =>{

                console.log(chunk)
                let trans_chunk = chunk.replace(/\"/gm, '*')
                trans_chunk = chunk.replace(/\'/gm, '_')

                this.plugin.settings.prompt = this.getPrompt(trans_chunk);
                let reqformatter = new ReqFormatter(this.app, this.plugin);
                const params = reqformatter.prepareReqParameters(this.plugin.settings, false);
                const response = await this.getQuizFromAPI(params);
                console.log(response)
                responses.push(response);
                this.n_gen_question += 5;
                // Delay the execution of each iteration by 3 seconds
                //await this.delay(3000);
            }))
    
            // Combine the responses
            const combinedResponse = this.combineResponses(responses);
    
            // Return the combined response
            return combinedResponse;
        } else {
            new Notice("There is already another generation process");
            logger("generate error", "There is another generation process");
            return Promise.reject(new Error("There is another generation process"));
        }
    }
    async prune_question(text: string): Promise<string> {
        console.log(`Currently Pruning to 10 questions ...`)
        if (10 < this.n_gen_question){
            // We preprocess the input text
            const chunks = this.preprocessText(text, 2500);
            console.log(chunks)

            const chunk = `[INPUT] ${chunks[0]}`
            let trans_chunk = chunk.replace(/\"/gm, '*')
            trans_chunk = chunk.replace(/\'/gm, '_')

            this.plugin.settings.prompt = this.getPrompt(trans_chunk);
            this.plugin.settings.system_prompt = "You are a question selector, you will be feed an input flagged by [INPUT] with a questions ? answers format, based uniquely on this input select 10 questions in the following json format \:\" [OUTPUT]{\"Questions\" : [{ \"question\" : \"Where was the pyramids ?\",\n \"answer\" : \"In Egypt.\", \n \"line\" : \"4-5\" }, ... ]} }\". In a json, the attribute name MUST be '\"' and not '\''. All the questions must have their response in the input text, don't add additional information. Forget every exterior knowledge. Note that the [INPUT] is a written in markdown, hence the OUTPUT.answers have to be compatible to markdown. Don't forget that this character : \'\\\' is strictly banned and you must write it as \"\\\\\""
            let reqformatter = new ReqFormatter(this.app, this.plugin);
            const params = reqformatter.prepareReqParameters(this.plugin.settings, false);
            const response = await this.getQuizFromAPI(params);
            console.log(response)

            return response 
        }
        return text

    }
    
    preprocessText(text: string, chunkSize: number): string[] {
        const chunks: string[] = [];
        const paragraphs: string[] = text.split("\n"); // Split text into paragraphs
    
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
    
        return chunks;
    }
    
    combineResponses(responses: string[]): string {
        return responses.join('\n');
    }

    getPrompt(content : string){
        return '[INPUT][N_QUESTIONS = 5]' + content
    }

    async getQuizFromAPI(params: any, n_try: number = 0): Promise<string> {
        // Send request to OpenAI's API to generate the quiz
        let response = await request(params);
        const response_json = JSON.parse(response);
        response = response_json.choices[0].message.content

        try {
          let assistantResponse = await this.outputFormatting(response)

          // Return the assistant response
          return assistantResponse;

        } catch (error) {
          n_try += 1
          if (n_try > 4){
            this.plugin.processing = false
            new Notice("We are having trouble creating the quiz, please try again ...");
            throw error}
            
          console.log(`N TRY : ${n_try} ! The json was not correct ... Reformulating ... ${error}`)
          const new_prompt = `This is not a correct json ! Return a corrected version format (to help you the error is ${error}) : ${response}`
    
          params.prompt = new_prompt
          const assistantResponse = this.getQuizFromAPI(params, n_try)
          return assistantResponse
        }
      }
    
      async outputFormatting(input: string){
        console.log(input)
        //Function to format the output
        let result = "";
        let transformedString = input.replace('[OUTPUT]',"")
        transformedString = transformedString.replace(/,(?=[}\]])/gm,"")

        console.log(transformedString)

        let jsonResult = JSON.parse(transformedString);
        

        for (let entry of jsonResult.Questions) {
            if (entry.answer != ""){
            result += `${JSON.stringify(entry.question).replace(/\\\\/gm,"\\")}\n?\n${JSON.stringify(entry.answer).replace(/\\\\/gm,"\\")}\n\n`
            }
          }

        return result.replace(/\"/gm, '')

    }
    delay(ms: number): Promise<void> {
        return new Promise((resolve) => setTimeout(resolve, ms));
    }
}

