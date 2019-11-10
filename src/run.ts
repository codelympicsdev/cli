import ora from 'ora';
import fetch from 'node-fetch';
import { config } from './util/config';
import spawn from 'cross-spawn';
import chalk from 'chalk';
import {
  streamWrite,
  chunksToLinesAsync,
  chomp,
  streamEnd,
} from '@rauschma/stringio';
import { client } from './util/graphql';

interface TestResponse {
  generateAttempt: {
    input: Input;
    expected_output: Output;
  };
}

interface LiveResponse {
  generateAttempt: {
    id: string;
    input: Input;
  };
}

interface Input {
  arguments: string[];
  stdin: string;
}

interface Output {
  stdout: string;
  stderr: string;
}

export default async function submit(
  challengeID: string,
  executable: string,
  args: string[],
  cmd: { live: boolean }
) {
  const token = config.get('token') as string;

  const spinner = ora('Getting data').start();

  const c = client(token);

  if (cmd.live) {
    let data: LiveResponse;
    try {
      data = await c.request(
        `
          mutation GenerateLiveAttempt($challenge: ID!) {
            generateAttempt(challenge: $challenge, live: true) {
              id
              input {
                arguments
                stdin
              }
            }
          }
        `,
        { challenge: challengeID }
      );
    } catch (error) {
      if ((error as Error).message.includes('max attempts')) {
        spinner.fail(
          `You have reached the maximum allowed attempts for this challenge.`
        );
      } else {
        spinner.fail(`Fetching data failed: ${(error as Error).message}`);
      }
      return;
    }

    if (!data || !data.generateAttempt) {
      spinner.fail(`No data recieved: ${data}`);
      return;
    }

    const attempt = data.generateAttempt;

    spinner.succeed('Recieved data');

    const programSpinner = ora('Running program').start();
    const output = await run(executable, args, attempt.input);
    programSpinner.succeed('Finished running');

    const uploadSpinner = ora('Uploading results').start();
    let resp: any;
    try {
      resp = await c.request(
        `
        mutation SubmitLiveAttempt($attempt: ID!, $stdout: String!, $stderr: String!) {
          submitAttempt(attempt: $attempt, stdout: $stdout, stderr: $stderr) {
            submission_date
          }
        }
      `,
        {
          attempt: attempt.id,
          stdout: output.stdout,
          stderr: output.stderr,
        }
      );
    } catch (error) {
      spinner.fail(`Submission failed with error: ${(error as Error).message}`);
      return;
    }

    if (!resp || !resp.submitAttempt) {
      spinner.fail(`Submission recieved no response data: ${resp}`);
      return;
    }

    uploadSpinner.succeed(
      `Server recieved results at ${new Date(
        resp.submitAttempt.submission_date
      ).toLocaleString()}.`
    );
  } else {
    let data: TestResponse;
    try {
      data = await c.request(
        `
          mutation GenerateTestAttempt($challenge: ID!) {
            generateAttempt(challenge: $challenge, live: false) {
              id
              input {
                arguments
                stdin
              }
              expected_output {
                stdout
                stderr
              }
            }
          }
        `,
        { challenge: challengeID }
      );
    } catch (error) {
      spinner.fail(`Submission failed with error: ${(error as Error).message}`);
      return;
    }

    spinner.succeed('Recieved data');
    const programSpinner = ora('Running program').start();

    const attempt = data.generateAttempt;

    try {
      const output = await run(executable, args, attempt.input);
      if (output.stdout != attempt.expected_output.stdout) {
        programSpinner.fail('Stdout does not match');
        console.log(chalk.bold('Stdout should be'));
        console.log(attempt.expected_output.stdout);
        console.log(chalk.bold('but is'));
        console.log(output.stdout);
        return;
      }

      if (output.stderr != attempt.expected_output.stderr) {
        programSpinner.fail('Stderr does not match');
        console.log(chalk.bold('Stderr should be'));
        console.log(attempt.expected_output.stderr);
        console.log(chalk.bold('but is'));
        console.log(output.stderr);
        return;
      }

      programSpinner.succeed('Test succeded');
    } catch (error) {
      programSpinner.fail('Running test failed: ' + error.message);
    }
  }
}

async function run(
  executable: string,
  args: string[],
  input: Input
): Promise<Output> {
  const proc = spawn(executable, [...args, ...input.arguments], {
    stdio: ['pipe', 'pipe', 'pipe'],
  });

  if (proc.stdin) {
    await streamWrite(proc.stdin, input.stdin);
    await streamEnd(proc.stdin);
  }

  let stdout = '';
  if (proc.stdout) {
    for await (const line of chunksToLinesAsync(proc.stdout)) {
      stdout += chomp(line);
    }
  }

  let stderr = '';
  if (proc.stderr) {
    for await (const line of chunksToLinesAsync(proc.stderr)) {
      stderr += chomp(line);
    }
  }

  await new Promise(resolve => proc.addListener('exit', () => resolve()));

  return {
    stdout: stdout,
    stderr: stderr,
  };
}
