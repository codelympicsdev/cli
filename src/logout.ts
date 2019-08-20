import ora from 'ora';
import Conf from 'conf';

const config = new Conf();

export default async function logout() {
  const spinner = ora('Signing out').start();

  config.delete('token');

  spinner.succeed(`Signed out`);
}
