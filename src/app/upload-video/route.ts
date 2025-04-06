import { NextRequest } from "next/server";
import path from "path/posix";
import fs from "fs";
import { spawn } from "child_process";

const folderPath = path.join(process.cwd(), "storage", "uploads", "videos");
const convertedFolder = path.join(process.cwd(), "storage", "converted");

type ControllerClient = {
  controller: ReadableStreamDefaultController | undefined;
};

export async function POST(req: NextRequest) {
  const formData = await req.formData();

  let file: File | undefined;

  for (const data of formData.entries()) {
    const [key, uFile] = data;

    if (key !== "video") {
      continue;
    }

    file = uFile as File;
    break;
  }

  if (!file) {
    return Response.json({ success: false });
  }

  const videoPath = await saveFile(file);

  console.log("converting");

  const client: ControllerClient = { controller: undefined };

  const downloadVideoPath = convertVideo(videoPath, client);

  return new Response(
    new ReadableStream({
      start: (controller) => {
        client.controller = controller;
      },
    }),
    {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    },
  );
}

async function saveFile(file: File): Promise<string> {
  fs.mkdirSync(folderPath, { recursive: true });

  const filePath = path.join(folderPath, file.name);

  const arrayBuffer = await file.arrayBuffer();

  const arrayBufferView: DataView = new DataView(arrayBuffer);

  fs.writeFileSync(filePath, arrayBufferView);

  return filePath;
}

async function convertVideo(
  videoPath: string,
  client: ControllerClient,
): Promise<string> {
  const fileName = path.parse(videoPath).name;
  const convertedVideoPath = path.join(convertedFolder, `${fileName}.mp4`);

  fs.mkdirSync(convertedFolder, { recursive: true });

  const child = spawn("ffmpeg", ["-i", videoPath, convertedVideoPath]);

  return new Promise((resolve) => {
    child.on("error", (error) => {
      console.log("error", error);
      client.controller?.close();
    });

    child.on("exit", () => {
      console.log("conversion finished");
      client.controller?.close();
      resolve(convertedVideoPath);
    });

    child.stdout.on("data", (data) => {
      console.log(data.toString());
      client.controller?.enqueue(data.toString());
    });

    child.stderr.on("data", (data) => {
      console.log(data.toString());
      client.controller?.enqueue(data.toString());
    });
  });
}
