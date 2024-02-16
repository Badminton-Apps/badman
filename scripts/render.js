// @ts-check
const args = process.argv.slice(2);

main();

function main() {
  // check if the args contains a app and store it in a variable]
  const app = args.find((arg) => arg.includes('--app='))?.replace('--app=', '');

  if (!app || app.length === 0) {
    throw new Error('No app provided');
  }

  const envKey = `${app.toUpperCase()}_HOOK`;

  // check if the env key exists
  if (!process.env[envKey]) {
    throw new Error(`Env key ${envKey} does not exist`);
  }

  // the hookk is a url wich we want to post without showing the url
  const hook = process.env[envKey];

  if (!hook) {
    throw new Error('No hook provided');
  }

  fetch(hook, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
  });
}
