import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import multer from "multer";
import ffmpeg from "fluent-ffmpeg";
import fs from "fs";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  const upload = multer({ dest: "uploads/" });

  // Ensure uploads directory exists
  if (!fs.existsSync("uploads")) {
    fs.mkdirSync("uploads");
  }

  // API Route for audio processing
  app.post("/api/process-audio", upload.single("audio"), (req, res) => {
    if (!req.file) {
      return res.status(400).json({ error: "No audio file uploaded" });
    }

    const stretch = parseFloat(req.body.stretch || "1.0");
    const inputPath = req.file.path;
    const outputPath = path.join("uploads", `processed-${Date.now()}.mp3`);

    // Target frequency calculation for linked pitch & stretch
    // If stretch is 1.0 (normal), frequency stays same.
    // We use a baseline of 44100 as per technical requirements.
    const baselineFreq = 44100;
    const targetFreq = Math.round(baselineFreq / stretch);

    console.log(`Processing: stretch=${stretch}, targetFreq=${targetFreq}`);

    ffmpeg(inputPath)
      .audioFilters([
        `asetrate=${targetFreq}`,
        `aresample=${baselineFreq}`
      ])
      .audioCodec("libmp3lame")
      .audioBitrate("320k")
      .audioChannels(2)
      .audioFrequency(baselineFreq)
      // Removed incorrect -cbr true. libmp3lame uses CBR by default with -b:a
      .on("start", (commandLine) => {
        console.log("Spawned FFmpeg with command: " + commandLine);
      })
      .on("stderr", (stderrLine) => {
        console.log("FFmpeg Stderr: " + stderrLine);
      })
      .on("end", () => {
        console.log("FFmpeg processing finished.");
        if (fs.existsSync(outputPath) && fs.statSync(outputPath).size > 1024) {
          res.download(outputPath, "edited_audio_320kbps.mp3", (err) => {
            if (err) console.error("Download error:", err);
            // Cleanup folders
            try {
              if (fs.existsSync(inputPath)) fs.unlinkSync(inputPath);
              if (fs.existsSync(outputPath)) fs.unlinkSync(outputPath);
            } catch (e) { console.error("Cleanup error:", e); }
          });
        } else {
          console.error("Output file is too small or missing.");
          res.status(500).json({ error: "Processed file was invalid or empty" });
          if (fs.existsSync(inputPath)) fs.unlinkSync(inputPath);
          if (fs.existsSync(outputPath)) fs.unlinkSync(outputPath);
        }
      })
      .on("error", (err) => {
        console.error("FFmpeg error:", err);
        res.status(500).json({ error: "Audio processing failed" });
        if (fs.existsSync(inputPath)) fs.unlinkSync(inputPath);
      })
      .save(outputPath);
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
