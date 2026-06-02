import { spawn } from "node:child_process";
import type { StreamOption } from "../api/types.js";

export interface YtdlpOptions {
  referer?: string;
  headers?: Record<string, string>;
}

export async function extractStreamUrl(
  iframeUrl: string,
  options: YtdlpOptions = {},
): Promise<StreamOption | null> {
  const args = [
    "--no-download",
    "--no-warnings",
    "--print",
    "%(url)s",
    "--no-check-certificate",
  ];

  if (options.headers) {
    for (const [key, value] of Object.entries(options.headers)) {
      args.push("--add-header", `${key}: ${value}`);
    }
  }

  if (options.referer) {
    args.push("--add-header", `Referer: ${options.referer}`);
  }

  args.push(iframeUrl);

  const output = await execYtdlp(args);

  if (!output || !output.trim()) {
    return null;
  }

  const url = output.trim();
  if (!isStreamUrl(url)) {
    return null;
  }

  return {
    url,
    qualityLabel: "Hianime",
    referer: options.referer,
    sourceName: "Hianime",
  };
}

async function execYtdlp(args: string[]): Promise<string> {
  const executable = process.env.YT_DLP_EXECUTABLE ?? "yt-dlp";

  return new Promise((resolve, reject) => {
    const child = spawn(executable, args, {
      stdio: ["ignore", "pipe", "pipe"],
    });

    let stdout = "";
    let stderr = "";

    child.stdout?.on("data", data => {
      stdout += data.toString();
    });

    child.stderr?.on("data", data => {
      stderr += data.toString();
    });

    child.on("error", error => {
      reject(new Error(`Failed to spawn yt-dlp: ${error.message}`));
    });

    child.on("close", code => {
      if (code === 0) {
        resolve(stdout);
        return;
      }

      const message = stderr.trim() || `yt-dlp exited with code ${code}`;
      reject(new Error(message));
    });
  });
}

function isStreamUrl(url: string): boolean {
  return /(m3u8|mp4|webm|mpd|manifest|playlist)/i.test(url);
}