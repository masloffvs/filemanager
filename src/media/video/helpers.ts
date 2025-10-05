import { exec } from "child_process";
import type { Entry } from "../../fileDatabase";
import { logger } from "../../logger";
import crypto from "crypto";
import type { MediaFile, VideoMediaFile } from "../../mediaIndex";
import fs from "fs";

async function extractThumbnail(file: Entry): Promise<string | null> {
  if (!file.path) return null;

  return new Promise((resolve) => {
    const cmd = `ffmpeg -i "${file.path}" -ss 00:00:01.000 -vframes 1 -f image2pipe -`;
    exec(
      cmd,
      { encoding: "buffer", maxBuffer: 10 * 1024 * 1024 },
      (err, stdout) => {
        if (err) return resolve(null);
        const base64 = stdout.toString("base64");
        resolve(`data:image/jpeg;base64,${base64}`);
      }
    );
  });
}

export async function extractThumbnailsList(
  file: VideoMediaFile,
  count: number = 10
): Promise<{ timestamp: number; frameBase64: string }[]> {
  logger.debug("extractThumbnailsList: called", {
    path: file.path,
    duration: file.duration,
    count,
  });
  if (!file.path || !file.duration || count < 2) {
    logger.debug("extractThumbnailsList: invalid input", {
      path: file.path,
      duration: file.duration,
      count,
    });
    return [];
  }

  // Calculate timestamps: first at 0, last at duration, others evenly spaced
  const timestamps = Array.from({ length: count }, (_, i) =>
    Math.round((i * file.duration!) / (count - 1))
  );
  logger.debug("extractThumbnailsList: timestamps calculated", { timestamps });

  // Build ffmpeg command to extract each frame at the calculated timestamps
  // Use -ss before -i for each timestamp, then -frames:v 1 to extract only one frame per command
  // Run ffmpeg for each timestamp separately to avoid extracting extra frames
  const extractFrameAt = (time: number) => {
    const hhmmss = new Date(time * 1000).toISOString().substr(11, 8);
    return new Promise<{ timestamp: number; frameBase64: string }>(
      (resolve) => {
        const cmd = `ffmpeg -ss ${hhmmss} -i "${file.path}" -frames:v 1 -f image2pipe -`;
        exec(
          cmd,
          { encoding: "buffer", maxBuffer: 5 * 1024 * 1024 },
          (err, stdout) => {
            if (err) {
              logger.debug("extractThumbnailsList: ffmpeg error", {
                error: err,
                time,
              });
              return resolve({ timestamp: time, frameBase64: "" });
            }
            const start = stdout.indexOf(Buffer.from([0xff, 0xd8]));
            const end = stdout.indexOf(Buffer.from([0xff, 0xd9]), start) + 2;
            if (start === -1 || end === -1)
              return resolve({ timestamp: time, frameBase64: "" });
            const imgBuffer = stdout.slice(start, end);
            resolve({
              timestamp: time,
              frameBase64: `data:image/jpeg;base64,${imgBuffer.toString(
                "base64"
              )}`,
            });
          }
        );
      }
    );
  };

  // Run all frame extractions in parallel
  const images = await Promise.all(timestamps.map(extractFrameAt));
  logger.debug("extractThumbnailsList: total images extracted", {
    count: images.filter(Boolean).length,
  });
  return images.filter((img) => img.frameBase64 !== "");
}

export async function extractVideoMetadata(
  file: Entry
): Promise<Partial<VideoMediaFile>> {
  if (!file.path) return {};

  const cmd = `ffprobe -v quiet -print_format json -show_format -show_streams "${file.path}"`;

  const stdout = await new Promise<string>((resolve, reject) => {
    exec(cmd, (err, stdout) => {
      if (err) return resolve("");
      resolve(stdout.toString());
    });
  });

  if (!stdout) return {};

  const data = JSON.parse(stdout);
  const videoStream = data.streams?.find((s: any) => s.codec_type === "video");
  const format = data.format || {};

  const frameRate = (() => {
    const fr = videoStream?.r_frame_rate;
    if (!fr) return undefined;
    const [num, denom] = fr.split("/").map(Number);
    return denom ? num / denom : undefined;
  })();

  return {
    title: format.tags?.title,
    description: format.tags?.comment,
    duration: format.duration ? Math.round(Number(format.duration)) : undefined,
    width: videoStream?.width,
    height: videoStream?.height,
    codec: videoStream?.codec_name,
    frameRate,
    aspectRatio: videoStream?.display_aspect_ratio,
    quality: videoStream?.height ? `${videoStream.height}p` : undefined,
    thumbnailBase64: (await extractThumbnail(file)) || undefined,
  };
}

export async function isVideoFileValidQuick(
  file: Entry
): Promise<{ valid: boolean; md5: string | undefined }> {
  logger.debug("isVideoFileValidQuick: Checking file", { path: file.path });
  if (!file.path) {
    logger.debug("isVideoFileValidQuick: No file path provided");
    return { valid: false, md5: undefined };
  }
  try {
    const stat = await Bun.file(file.path).stat();
    logger.debug("isVideoFileValidQuick: File stat", { size: stat.size });
    if (stat.size === 0) {
      logger.debug("isVideoFileValidQuick: File size is zero");
      return { valid: false, md5: undefined };
    }

    const md5 = crypto
      .createHash("md5")
      .update(await fs.promises.readFile(file.path))
      .digest("hex");

    logger.debug("isVideoFileValidQuick: File MD5", { md5 });
    const cmd = `ffprobe -v error -select_streams v:0 -show_entries stream=codec_type -of csv=p=0 "${file.path}"`;
    logger.debug("isVideoFileValidQuick: Running ffprobe", { cmd });
    return await new Promise((resolve) => {
      exec(cmd, { timeout: 3000 }, (err, stdout) => {
        if (err) {
          logger.debug("isVideoFileValidQuick: ffprobe error", { error: err });
          return resolve({ valid: false, md5 });
        }
        const output = stdout?.toString().trim();
        logger.debug("isVideoFileValidQuick: ffprobe output", { output });
        resolve({
          valid: output === "video",
          md5,
        });
      });
    });
  } catch (e) {
    logger.debug("isVideoFileValidQuick: Exception caught", { error: e });
    return { valid: false, md5: undefined };
  }
}
export async function extractVideoPalette(file: Entry): Promise<Array<{
  frame: number;
  paletteHexTopLeft: string;
  paletteHexTopRight: string;
  paletteHexBottomLeft: string;
  paletteHexBottomRight: string;
  paletteHexCenter: string;
}> | null> {
  logger.debug("extractVideoPalette: called", { path: file.path });

  if (!file.path) {
    logger.debug("extractVideoPalette: no file path");
    return [];
  }

  // Get video duration using ffprobe
  const durationCmd = `ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${file.path}"`;
  logger.debug("extractVideoPalette: running ffprobe for duration", {
    durationCmd,
  });
  const duration = await new Promise<number>((resolve) => {
    exec(durationCmd, (err, stdout) => {
      if (err) {
        logger.debug("extractVideoPalette: ffprobe error", { error: err });
        return resolve(0);
      }
      const dur = Math.floor(Number(stdout.toString().trim()));
      logger.debug("extractVideoPalette: duration result", { duration: dur });
      resolve(dur);
    });
  });
  if (!duration || duration < 1) {
    logger.debug("extractVideoPalette: invalid duration", { duration });
    return [];
  }

  // Calculate up to 128 timestamps: first at 0, last at duration, others evenly spaced
  let maxFrames: number;

  if (duration <= 60) {
    maxFrames = 16;
  } else if (duration <= 300) {
    maxFrames = 32;
  } else if (duration <= 1800) {
    maxFrames = 64;
  } else {
    maxFrames = 128;
  }

  logger.debug("extractVideoPalette: maxFrames determined", {
    maxFrames,
    duration,
  });

  // Always extract exactly maxFrames palettes, spaced across the whole video
  const frameCount = maxFrames;
  logger.debug("extractVideoPalette: frameCount fixed to maxFrames", {
    frameCount,
    duration,
  });

  // Calculate timestamps: first at 0, last at duration, others evenly spaced
  const timestamps: number[] = Array.from({ length: frameCount }, (_, i) =>
    Math.round((i * duration) / (frameCount - 1))
  );
  logger.debug("extractVideoPalette: timestamps calculated", { timestamps });

  // Strictly sequential extraction
  const palettes: Array<{
    frame: number;
    paletteHexTopLeft: string;
    paletteHexTopRight: string;
    paletteHexBottomLeft: string;
    paletteHexBottomRight: string;
    paletteHexCenter: string;
  }> = [];

  for (const time of timestamps) {
    const hhmmss = new Date(time * 1000).toISOString().substr(11, 8);
    const cmd = `ffmpeg -ss ${hhmmss} -i "${file.path}" -frames:v 1 -vf "scale=10:10,format=rgb24" -f rawvideo -`;
    logger.debug("extractVideoPalette: running ffmpeg for frame", {
      time,
      hhmmss,
      cmd,
    });

    // eslint-disable-next-line no-await-in-loop
    const palette = await new Promise<{
      frame: number;
      paletteHexTopLeft: string;
      paletteHexTopRight: string;
      paletteHexBottomLeft: string;
      paletteHexBottomRight: string;
      paletteHexCenter: string;
    } | null>((resolve) => {
      exec(
        cmd,
        { encoding: "buffer", maxBuffer: 1024 * 1024 },
        (err, stdout) => {
          if (err || !stdout || stdout.length < 10 * 10 * 3) {
            logger.debug("extractVideoPalette: ffmpeg error or empty frame", {
              error: err,
              time,
            });
            return resolve(null);
          }
          const frameBuffer = stdout;
          const getColorAt = (x: number, y: number) => {
            const idx = (y * 10 + x) * 3;
            return (
              ((frameBuffer[idx] || 0) << 16) |
              ((frameBuffer[idx + 1] || 0) << 8) |
              (frameBuffer[idx + 2] || 0)
            )
              .toString(16)
              .padStart(6, "0");
          };
          const palette = {
            frame: time,
            paletteHexTopLeft: getColorAt(0, 0),
            paletteHexTopRight: getColorAt(9, 0),
            paletteHexBottomLeft: getColorAt(0, 9),
            paletteHexBottomRight: getColorAt(9, 9),
            paletteHexCenter: getColorAt(5, 5),
          };
          logger.debug("extractVideoPalette: palette extracted", {
            time,
            palette,
          });
          resolve(palette);
        }
      );
    });

    if (palette) {
      palettes.push(palette);
    }
  }

  logger.debug("extractVideoPalette: total palettes extracted", {
    count: palettes.length,
  });
  return palettes;
}
