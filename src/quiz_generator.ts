import {App,addIcon, Notice, Plugin, PluginSettingTab, Setting, request, MarkdownView, Editor, parseFrontMatterAliases, MetadataCache} from 'obsidian';
import QuizGenPlugin from './main'
import debug from "debug";
import ReqFormatter from './req_formatter';
import { TIMEOUT } from 'dns';
const logger = debug('quizgenerator: QuizGenerator');

export default class QuizGenerator{
    plugin: QuizGenPlugin;
    app: App;

    constructor(app: App, plugin: QuizGenPlugin) {
        this.app = app;
		this.plugin = plugin;
	}

    async generate(title: string) {
        logger(`Generating a Quiz on ${title}`);
        if (!this.plugin.processing) {
            // We get the text of the app
            const currentFile = this.app.workspace.getActiveFile();
            if (!currentFile) return;
    
            const content = await this.app.vault.read(currentFile);
    
            // We preprocess it (split the text in chunks of 2000 characters)
            const chunks = this.preprocessText(content, 2000);
    
            // Get the responses for each chunk
            const responses = [];
            
    
            for (const chunk of chunks) {

                console.log(chunk)
                let trans_chunk = chunk.replace(/\"/gm, '*')
                trans_chunk = chunk.replace(/\'/gm, '_')

                this.plugin.settings.prompt = this.getPrompt(trans_chunk);
                let reqformatter = new ReqFormatter(this.app, this.plugin);
                const params = reqformatter.prepareReqParameters(this.plugin.settings, false);
                const response = await this.getQuizFromAPI(params);
                console.log(response)
                responses.push(response);
                // Delay the execution of each iteration by 3 seconds
                //await this.delay(3000);
            }
    
            // Combine the responses
            const combinedResponse = this.combineResponses(responses);
    
            // Return the combined response
            return combinedResponse;
        } else {
            logger("generate error", "There is another generation process");
            return Promise.reject(new Error("There is another generation process"));
        }
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
        return '[INPUT]' + content
    }

    async getQuizFromAPI(params: any) {
        try {
          // Send request to OpenAI's API to generate the quiz
          const response = await request(params);
      
          // Parse the response as JSON if it's a string
          const parsedResponse = typeof response === "string" ? JSON.parse(response) : response;
      
          // Check the response status
          if (parsedResponse.status < 200 || parsedResponse.status >= 300) {
            throw new Error(`Failed to generate quiz. Status: ${parsedResponse.statusText}`);
          }
          // Extract the assistant response
          let assistantResponse = parsedResponse.choices[0].message.content;
          assistantResponse = await this.outputFormatting(assistantResponse)

          // Return the assistant response
          return assistantResponse;

        } catch (error) {
          console.error("An error occurred while generating the quiz:", error);
          throw error;
        }
      }
    
      async outputFormatting(input: string){
        console.log(input)
        //Function to format the output
        let result = "";
        let transformedString: string = input.replace(/(?<!\\)\\(?!\\)/gm, '\\\\');
        transformedString = transformedString.replace(/'/gm, "\"")
        let jsonResult = JSON.parse(transformedString.replace('[OUTPUT]',""));
        console.log(jsonResult)

        for (let entry of jsonResult.Questions) {
            result += `${JSON.stringify(entry.question).replace(/\\\\/gm,"\\")}\n?\n${JSON.stringify(entry.answer).replace(/\\\\/gm,"\\")}\n\n`
          }

        return result.replace(/\"/gm, '')

    }
    delay(ms: number): Promise<void> {
        return new Promise((resolve) => setTimeout(resolve, ms));
    }
}

