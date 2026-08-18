#!/usr/bin/env node

import { Command } from 'commander';
import chalk from 'chalk';
import { GoogleGenAI } from '@google/genai';
import * as fs from 'fs';
import * as path from 'path';
import dotenv from 'dotenv';

dotenv.config();

const program = new Command();

// ── Helpers ──────────────────────────────────────────────────────────

function getApiClient() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.error(chalk.red('Error: GEMINI_API_KEY environment variable is not set.'));
    console.error(chalk.gray('Create a .env file with GEMINI_API_KEY=your_key'));
    process.exit(1);
  }
  return new GoogleGenAI({ apiKey });
}

async function reviewSingleFile(filePath, options, ai) {
  const resolvedPath = path.resolve(process.cwd(), filePath);
  if (!fs.existsSync(resolvedPath)) {
    console.error(chalk.red(`Error: File not found at ${resolvedPath}`));
    return null;
  }

  const fileContent = fs.readFileSync(resolvedPath, 'utf-8');
  const maxTokens = parseInt(options.tokens, 10);
  const fileName = path.basename(resolvedPath);

  console.log(chalk.blue(`\n🔍 Reviewing ${chalk.bold(fileName)} using ${chalk.bold(options.model)}...`));

  const prompt = `
You are an expert AI code reviewer. Please review the following code from file "${fileName}".
Provide your review in the following sections:
- **🐛 Bugs**: List any bugs or potential bugs.
- **🔒 Security**: List any security vulnerabilities.
- **💡 Improvements**: Suggest improvements for code quality.
- **📊 Complexity**: Describe the time/space complexity.
- **🔧 Refactoring**: Suggest refactoring opportunities.

Be concise but thorough. If no issues in a category, say "None found."

Code to review:
\`\`\`
${fileContent}
\`\`\`
`;

  const response = await ai.models.generateContent({
    model: options.model,
    contents: prompt,
    config: {
      maxOutputTokens: maxTokens,
    }
  });

  return { fileName, review: response.text };
}

function collectFiles(dirPath, extensions) {
  let files = [];
  const items = fs.readdirSync(dirPath, { withFileTypes: true });
  for (const item of items) {
    const fullPath = path.join(dirPath, item.name);
    // Skip common non-code directories
    if (item.isDirectory()) {
      if (['node_modules', '.git', '.next', 'venv', '__pycache__', 'dist', 'build'].includes(item.name)) continue;
      files = files.concat(collectFiles(fullPath, extensions));
    } else if (item.isFile()) {
      const ext = path.extname(item.name).toLowerCase();
      if (extensions.includes(ext)) {
        files.push(fullPath);
      }
    }
  }
  return files;
}

// ── Commands ─────────────────────────────────────────────────────────

program
  .name('ai-reviewer')
  .description('AI Code Reviewer CLI — Review code with Gemini from your terminal')
  .version('2.0.0');

program
  .argument('<file>', 'File to review')
  .option('-m, --model <name>', 'Gemini model to use', 'gemini-2.5-flash')
  .option('-t, --tokens <number>', 'Max output tokens', '2000')
  .option('-o, --output <file>', 'Save review to a markdown file')
  .action(async (file, options) => {
    try {
      const ai = getApiClient();
      const result = await reviewSingleFile(file, options, ai);

      if (!result) return;

      console.log(chalk.green('\n✅ Review Complete:\n'));
      console.log(result.review);
      console.log('\n' + chalk.gray('─'.repeat(60)) + '\n');

      if (options.output) {
        const outputContent = `# Code Review: ${result.fileName}\n\n${result.review}\n`;
        fs.writeFileSync(options.output, outputContent, 'utf-8');
        console.log(chalk.green(`📄 Review saved to ${chalk.bold(options.output)}`));
      }

    } catch (error) {
      console.error(chalk.red('\n❌ An error occurred during the code review:'));
      console.error(error.message || error);
      process.exit(1);
    }
  });

program
  .command('dir <directory>')
  .description('Recursively review all code files in a directory')
  .option('-m, --model <name>', 'Gemini model to use', 'gemini-2.5-flash')
  .option('-t, --tokens <number>', 'Max output tokens per file', '2000')
  .option('-o, --output <file>', 'Save all reviews to a single markdown file')
  .option('-e, --extensions <list>', 'Comma-separated file extensions to include', '.js,.ts,.py,.tsx,.jsx,.mjs')
  .action(async (directory, options) => {
    try {
      const ai = getApiClient();
      const resolvedDir = path.resolve(process.cwd(), directory);

      if (!fs.existsSync(resolvedDir) || !fs.statSync(resolvedDir).isDirectory()) {
        console.error(chalk.red(`Error: Directory not found at ${resolvedDir}`));
        process.exit(1);
      }

      const extensions = options.extensions.split(',').map(e => e.trim());
      const files = collectFiles(resolvedDir, extensions);

      if (files.length === 0) {
        console.log(chalk.yellow('No matching files found.'));
        return;
      }

      console.log(chalk.blue(`\n📂 Found ${chalk.bold(files.length)} files to review in ${chalk.bold(directory)}\n`));

      let allReviews = `# Directory Code Review: ${directory}\n\nReviewed ${files.length} files.\n\n---\n\n`;

      for (let i = 0; i < files.length; i++) {
        const relPath = path.relative(resolvedDir, files[i]);
        console.log(chalk.gray(`[${i + 1}/${files.length}] ${relPath}`));

        const result = await reviewSingleFile(files[i], options, ai);
        if (result) {
          console.log(chalk.green(`  ✅ Done`));
          allReviews += `## ${result.fileName}\n\n${result.review}\n\n---\n\n`;
        }
      }

      if (options.output) {
        fs.writeFileSync(options.output, allReviews, 'utf-8');
        console.log(chalk.green(`\n📄 Full review saved to ${chalk.bold(options.output)}`));
      }

      console.log(chalk.green(`\n✅ All ${files.length} files reviewed.`));

    } catch (error) {
      console.error(chalk.red('\n❌ An error occurred:'));
      console.error(error.message || error);
      process.exit(1);
    }
  });

program.parse();
