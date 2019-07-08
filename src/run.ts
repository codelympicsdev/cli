import * as ora from 'ora';
import fetch from 'node-fetch';
import * as Conf from 'conf';
import * as spawn from 'cross-spawn';
import chalk from 'chalk';
import {
  streamWrite,
  chunksToLinesAsync,
  chomp,
  streamEnd,
} from '@rauschma/stringio';

const config = new Conf();

interface TestResponse {
  challenge: string;
  input: Input;
  expected_output: Output;
}

interface LiveResponse {
  id: string;
  challenge: string;
  input: Input;
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
  cmd: { live: boolean }
) {
  const token = config.get('token') as string;

  const spinner = ora('Getting data').start();

  if (cmd.live) {
    const response = await fetch(
      `https://api.codelympics.dev/v0/challenges/${challengeID}/generate/live`,
      {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    if (!response.ok) {
      if (response.headers.get('Content-Type') == 'application/json') {
        spinner.fail(`An error occured: ${(await response.json()).error}`);
      } else {
        spinner.fail(`An error occured: ${await response.text()}`);
      }
      return;
    }

    if (response.headers.get('Content-Type') != 'application/json') {
      spinner.fail(`An error occured: response not json`);
    }

    const data = (await response.json()) as LiveResponse;

    spinner.succeed('Got data');

    const programSpinner = ora('Running program').start();
    const output = await run(executable, data.input);
    programSpinner.succeed('Finished running');

    const uploadSpinner = ora('Uploading results').start();
    const resp = await fetch(
      `https://api.codelympics.dev/v0/attempts/${data.id}/submit`,
      {
        method: 'POST',
        body: JSON.stringify({
          output,
        }),
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      }
    );
    if (!resp.ok) {
      uploadSpinner.fail('Failed uploading results');
      return;
    }

    uploadSpinner.succeed('Uploaded results');
  } else {
    const response = await fetch(
      `https://api.codelympics.dev/v0/challenges/${challengeID}/generate/test`,
      {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    if (!response.ok) {
      if (response.headers.get('Content-Type') == 'application/json') {
        spinner.fail(`An error occured: ${(await response.json()).error}`);
      } else {
        spinner.fail(`An error occured: ${await response.text()}`);
      }
      return;
    }

    if (response.headers.get('Content-Type') != 'application/json') {
      spinner.fail(`An error occured: response not json`);
    }

    const data = (await response.json()) as TestResponse;

    spinner.succeed('Recieved data');
    const programSpinner = ora('Running program').start();

    const output = await run(executable, data.input);

    if (output.stdout != data.expected_output.stdout) {
      programSpinner.fail('Stdout does not match');
      console.log(chalk.bold('Stdout should be'));
      console.log(data.expected_output.stdout);
      console.log(chalk.bold('but is'));
      console.log(output.stdout);
      return;
    }

    if (output.stderr != data.expected_output.stderr) {
      programSpinner.fail('Stderr does not match');
      console.log(chalk.bold('Stderr should be'));
      console.log(data.expected_output.stderr);
      console.log(chalk.bold('but is'));
      console.log(output.stderr);
      return;
    }

    programSpinner.succeed('Test succeded');
  }
}

async function run(executable: string, input: Input): Promise<Output> {
  const proc = spawn(executable, input.arguments, {
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
