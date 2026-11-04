import { createPasswordHash } from "./password.js";

function readHidden(prompt) {
  return new Promise((resolve, reject) => {
    const { stdin, stdout } = process;
    if (!stdin.isTTY || !stdin.setRawMode) {
      reject(new Error("Run npm run auth:hash in an interactive terminal."));
      return;
    }

    let value = "";
    stdout.write(prompt);
    stdin.setRawMode(true);
    stdin.resume();

    const finish = (error) => {
      stdin.setRawMode(false);
      stdin.pause();
      stdin.removeListener("data", onData);
      if (error) {
        reject(error);
      } else {
        stdout.write("\n");
        resolve(value);
      }
    };

    const onData = (chunk) => {
      for (const character of chunk.toString("utf8")) {
        if (character === "\u0003") {
          finish(new Error("Password hash generation cancelled."));
          return;
        }
        if (character === "\r" || character === "\n") {
          finish();
          return;
        }
        if (character === "\u0008" || character === "\u007f") {
          value = value.slice(0, -1);
        } else {
          value += character;
        }
      }
    };

    stdin.on("data", onData);
  });
}

try {
  const password = await readHidden("Password to hash (input hidden): ");
  const confirmation = await readHidden("Confirm password (input hidden): ");
  if (!password || password !== confirmation) {
    throw new Error("Passwords must be non-empty and match.");
  }

  console.log("Set this value as AUTH_PASSWORD_HASH:");
  console.log(await createPasswordHash(password));
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
