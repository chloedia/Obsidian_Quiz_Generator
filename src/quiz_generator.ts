import { App, Notice } from "obsidian";
import QuizGenPlugin from "./main";
import debug from "debug";
import * as _ from "underscore";
import OpenAI from "openai";
import { zodResponseFormat } from "openai/helpers/zod";
import { z } from "zod";
import { QuizGeneratorSettings } from "./types";

const logger = debug("quizgenerator: QuizGenerator");

// Define Zod schemas for typed Quiz data
const FlashcardSchema = z.object({
    question: z.string(),
    answer: z.string(),
    quote: z.string(),
});

const QuizSchema = z.object({
    Questions: z.array(FlashcardSchema),
});

// Create TypeScript interfaces from Zod schemas
type Flashcard = z.infer<typeof FlashcardSchema>;
type Quiz = z.infer<typeof QuizSchema>;

export default class QuizGenerator {
    private plugin: QuizGenPlugin;
    private app: App;
    private n_gen_question: number;
    private client: OpenAI;

    constructor(app: App, plugin: QuizGenPlugin) {
        this.app = app;
        this.plugin = plugin;
        this.n_gen_question = 0;

        // Configure local vs. remote LLM
        this.client = new OpenAI({
            apiKey: this.plugin.settings.useLocalLLM ? "ollama" : this.plugin.settings.api_key,
            baseURL: this.plugin.settings.useLocalLLM ? "http://localhost:11434/v1" : "https://api.openai.com/v1",
            dangerouslyAllowBrowser: true,
            
        });
    }

    public async generate(title: string): Promise<string[]> {
        logger(`Generating a Quiz on ${title}`);
        if (this.plugin.processing) {
            new Notice("There is already another generation process");
            logger("generate error", "There is another generation process");
            return Promise.reject(new Error("There is another generation process"));
        }

        this.plugin.processing = true;
        try {
            const currentFile = this.app.workspace.getActiveFile();
            if (!currentFile) return [];

            const content = await this.app.vault.read(currentFile);
            const chunks = this.preprocessText(content, 2000);

            let responses: string[] = [];
            let counter = 0;

            await Promise.all(
                chunks.map(async (chunk) => {
                    this.plugin.settings.prompt = this.getPrompt(chunk);
                    const quizData = await this.getQuizFromAPI(this.plugin.settings);
                    if (quizData) {
                        // Convert each flashcard into a string for storage
                        responses.push(...await this.stringifyJson(quizData));
                    }
                    counter += 1;
                    logger(`Generated quiz part ${counter} / ${chunks.length}`);
                })
            );

            return responses;
        } finally {
            this.plugin.processing = false;
        }
    }

    public async prune_question(text: string[]): Promise<string[]> {
        logger(`Currently pruning questions to a maximum of 10...`);
        if (this.n_gen_question > 10) {
            return _.sample(text, 10);
        }
        return text;
    }

    /**
     * Breaks text into sections by markdown headings, then lines, then periods.
     * Returns chunks subject to the specified chunk size.
     */
    private preprocessText(text: string, chunkSize: number): string[] {
        const chunks: string[] = [];
        const headingSections: string[] = text.split(/\n(?=#)/);
        const finalSegments: string[] = [];

        for (const headingSection of headingSections) {
            const lines = headingSection.split("\n");
            for (const line of lines) {
                const sentences = line.split(".");
                for (const sentence of sentences) {
                    const trimmed = sentence.trim();
                    if (trimmed.length > 0) {
                        finalSegments.push(trimmed);
                    }
                }
            }
        }

        let currentChunk = "";
        for (const segment of finalSegments) {
            if ((currentChunk + segment).length > chunkSize) {
                chunks.push(currentChunk.trim());
                currentChunk = "";
            }
            currentChunk += segment + ". ";
        }

        if (currentChunk !== "") {
            chunks.push(currentChunk.trim());
        }
        return chunks;
    }

    /**
     * Builds a prompt string to pass to the LLM.
     */
    private getPrompt(content: string): string {
        return `Give sets
        of question/answer for Anki cards based uniquely on this input in the proper JSON format:
        {
            "Questions": [
                {
                    "question": "",
                    "answer": "",
                    "quote": ""
                }
            ]
        }.
        The "question"/"answer"/"quote" properties must reflect data found in the text (no outside info). Note that the text is in markdown format and the response must be compatible (headers, lists, formulas, links, images, etc.).
        Respond with only valid JSON. 
        --- TEXT ---
        ${content}`;
    }

    /**
     * Sends a request to the OpenAI API and attempts to parse the response using the QuizSchema.
     */
    private async getQuizFromAPI(settings: QuizGeneratorSettings): Promise<Quiz | null> {
        try {
            const completion = await this.client.beta.chat.completions.parse({
                model: settings.useLocalLLM ? settings.selectedOllamaModel : settings.engine,
                messages: [
                    {
                        role: "system",
                        content:
                            "You are an Anki Flashcard Generator, and you only return valid JSON that follows the requested schema.",
                    },
                    { role: "user", content: settings.prompt },
                ],
                response_format: zodResponseFormat(QuizSchema, "quiz_schema"),
            });

            const message = completion.choices[0]?.message;
            if (message?.parsed) {
                logger("Parsed quiz data:", message.parsed);
                return message.parsed as Quiz;
            }
            return null;
        } catch (error) {
            logger("Error fetching quiz data:", error);
            return null;
        }
    }

    async stringifyJson(jsonResult: Quiz): Promise<string[]> {
		const result: string[] = [];
		for (const entry of jsonResult.Questions) {
			if (entry.answer != "" && entry.answer != "null" ) {
				const new_set = `${JSON.stringify(entry.question).replace(
					/\\\\/gm,
					"\\"
				)}\n?\n${JSON.stringify(entry.answer).replace(
					/\\\\/gm,
					"\\"
				)} *(Exact Quote : "${
					(entry.quote != "")? `${entry.quote}*` : "NA"
				})"\n\n`;
				result.push(new_set.replace(/"/gm, ""));
			}
		}
		return result;
	}

    /**
     * Helper function to pause execution for a given number of milliseconds.
     */
    private delay(ms: number): Promise<void> {
        return new Promise((resolve) => setTimeout(resolve, ms));
    }
}