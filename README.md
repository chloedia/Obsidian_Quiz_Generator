# Obsidian Local FlashCard Generator


🚀 **Supercharge your Obsidian workflow with QuizCraft**, the revolutionary Obsidian plugin designed to **transform your notes into dynamic flashcards**. Seamlessly harness the power of LLMs, such as GPT-3 or GPT-4, or any OSS LLM to effortlessly generate customized flashcards from your notes. Prepare for exams, retain crucial information, and enhance your learning experience like never before.

## Features

- 📚 Generate quizzes that seamlessly integrate with the [Spaced Repetition](https://github.com/st3v3nmw/obsidian-spaced-repetition) Obsidian plugin.
- 🎯 Effortlessly transform your notes into curated quizzes tailored to your learning needs.

## Setup 
### OpenAI 
1. 🔑 Obtain your OpenAI API key from [here](https://beta.openai.com/account/api-keys).
2. ⚙️ Access the plugin settings in Obsidian by navigating to `Settings` > `Flashcard Generator` under `Community Plugins`.
3. ✅ Untoggle the "Use Local LLM" option if you want OpenAI.
4. 🛠️ Enter your OpenAI API key in the designated field.
5. 💻 Choose which model (gpt3.5 or gpt4) you want to use.
6. 🔢 Choose whether to limit the number of questions to 10.
   
### Local LLM 
1. 🛠️ Install Ollama from [here](https://ollama.com/) and follow the instructions to install it locally.
2. ⚙️ Access the plugin settings in Obsidian by navigating to `Settings` > `Flashcard Generator` under `Community Plugins`.
3. ✅  Toggle the "Use Local LLM" option if you want to use local models instead of OpenAI.
4. 💻 Choose which model from ollama you want to use (you need to run a Model from Ollama first).

## Usage

Create comprehensive quizzes with ease:
- 📝 Click the plugin icon while viewing your note to initiate the process.
- ✅ Validate the relevance of generated questions for your study.
- 🚀 Access the plugin via the Obsidian ribbon or use the "Create GPT-3 Quiz" command, customizable with a keyboard shortcut.

## Contributing

Join us in enhancing QuizCraft:
- 💡 Contribute to new feature development.
- 🔜 Look forward to **Customizable Learning:** Craft flashcards that align perfectly with your study objectives. Specify the level of detail, format, and content you want on your cards, giving you complete control over your learning journey.

## Links
This code is a fork from Obsidian Quiz Generator plugin from ChloeDia with extra logic to handle local LLMs and better JSON handling, credits goes to her.

Inspired by the code architecture of the [obsidian-textgenerator-plugin](https://github.com/nhaouari/obsidian-textgenerator-plugin).
