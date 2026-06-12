import { spawn } from "node:child_process";

export interface LaunchPlayerOptions {
  executable?: string;
  args?: string[];
  referer?: string;
  title?: string;
}

export async function launchPlayer(url: string, options: LaunchPlayerOptions = {}): Promise<void> {
  const executable = options.executable ?? process.env.ANIME_PLAYER ?? "iina";
  const args = options.args ?? process.env.ANIME_PLAYER_ARGS?.split(" ").filter(Boolean) ?? [];
  const finalArgs = [...args];

  if (options.referer) {
    if (executable === "mpv") {
      finalArgs.push(`--http-header-fields=Referer: ${options.referer}`);
    } else if (executable === "iina") {
      finalArgs.push(`--mpv-http-header-fields=Referer: ${options.referer}`);
    }
  }

  if (options.title) {
    if (executable === "mpv") {
      finalArgs.push(`--title=${options.title}`);
    } else if (executable === "iina") {
      finalArgs.push(`--mpv-force-media-title=${options.title}`);
    }
  }

  await new Promise<void>((resolve, reject) => {
    const child = spawn(executable, [...finalArgs, url], {
      stdio: "inherit",
    });

    child.on("error", error => {
      reject(new Error(`Failed to launch player '${executable}': ${error.message}`));
    });

    child.on("exit", code => {
      if (code === 0 || code === null) {
        resolve();
        return;
      }

      reject(new Error(`Player exited with code ${code}`));
    });
  });
}
