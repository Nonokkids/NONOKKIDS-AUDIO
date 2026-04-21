/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  Upload, 
  Settings2, 
  Music, 
  Download, 
  AlertCircle, 
  CheckCircle2, 
  Loader2, 
  AudioLines,
  Link as LinkIcon,
  Activity,
  Play,
  Pause,
  Volume2
} from "lucide-react";

export default function App() {
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [processedUrl, setProcessedUrl] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isProcessedPlaying, setIsProcessedPlaying] = useState(false);
  const [stretch, setStretch] = useState(1.0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [status, setStatus] = useState<"idle" | "success" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const processedAudioRef = useRef<HTMLAudioElement>(null);

  // Sync playback rate for Live Preview (Resampling effect)
  useEffect(() => {
    if (audioRef.current) {
      // In linked resampling: speed = 1/stretch
      // We set preservesPitch to false to hear the pitch change
      const playbackRate = 1 / stretch;
      audioRef.current.playbackRate = playbackRate;
      
      // Attempt to disable pitch correction for resample effect preview
      if ('preservesPitch' in audioRef.current) {
        (audioRef.current as any).preservesPitch = false;
      } else if ('mozPreservesPitch' in audioRef.current) {
        (audioRef.current as any).mozPreservesPitch = false;
      }
    }
  }, [stretch, previewUrl]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      setFile(selectedFile);
      setStatus("idle");
      setIsPlaying(false);
      setIsProcessedPlaying(false);
      setProcessedUrl(null);
      
      // Cleanup old URL
      if (previewUrl) window.URL.revokeObjectURL(previewUrl);
      
      const url = window.URL.createObjectURL(selectedFile);
      setPreviewUrl(url);
    }
  };

  const togglePlay = () => {
    if (!audioRef.current) return;
    if (isProcessedPlaying) {
      processedAudioRef.current?.pause();
      setIsProcessedPlaying(false);
    }

    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }
    setIsPlaying(!isPlaying);
  };

  const toggleProcessedPlay = () => {
    if (!processedAudioRef.current) return;
    if (isPlaying) {
      audioRef.current?.pause();
      setIsPlaying(false);
    }

    if (isProcessedPlaying) {
      processedAudioRef.current.pause();
    } else {
      processedAudioRef.current.play();
    }
    setIsProcessedPlaying(!isProcessedPlaying);
  };

  const handleProcess = async (mode: "review" | "download") => {
    if (!file) return;

    setIsProcessing(true);
    setStatus("idle");
    if (mode === "review") setProcessedUrl(null);

    const formData = new FormData();
    formData.append("audio", file);
    formData.append("stretch", stretch.toString());

    // Signal processing mode to user
    const processStartTime = Date.now();

    try {
      const response = await fetch("/api/process-audio", {
        method: "POST",
        body: formData,
        // Using a longer signal for mobile if needed, though fetch is usually persistent
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: "Server connection failed" }));
        throw new Error(errorData.error || "Processing failed");
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      
      setProcessedUrl(url);
      setStatus("success");

      if (mode === "download") {
        const a = document.createElement("a");
        a.href = url;
        a.download = `edited_${file.name.split(".")[0]}_320kbps.mp3`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      }
      
    } catch (err: any) {
      console.error("Process Error:", err);
      setStatus("error");
      
      // Better error messages for mobile
      if (err.name === 'AbortError' || err.message.includes('timeout')) {
        setErrorMessage("Connection timed out. Try a shorter clip.");
      } else {
        setErrorMessage(err.message || "Failed to process audio.");
      }
    } finally {
      setIsProcessing(false);
    }
  };

  // Calculations for display
  const transpositionValue = (Math.log2(1/stretch) * 12).toFixed(2);
  const timeScaleValue = (stretch * 100).toFixed(1);
  const resampleRateValue = (44.1 / stretch).toFixed(1);

  return (
    <div className="min-h-screen bg-editor-bg text-ink font-sans flex flex-col h-screen overflow-hidden">
      {/* Hidden Audio Player for Preview */}
      {previewUrl && (
        <audio 
          ref={audioRef} 
          src={previewUrl} 
          onEnded={() => setIsPlaying(false)}
          className="hidden" 
        />
      )}

      {/* Hidden Audio Player for Processed Result */}
      {processedUrl && (
        <audio 
          ref={processedAudioRef} 
          src={processedUrl} 
          onEnded={() => setIsProcessedPlaying(false)}
          className="hidden" 
        />
      )}

      {/* Header */}
      <header className="h-[60px] bg-sidebar-bg border-b border-border-dim flex items-center justify-between px-6 shrink-0 relative z-20">
        <div className="flex items-center gap-3 text-brand-cyan font-bold tracking-wider text-sm uppercase">
          <AudioLines strokeWidth={2.5} className="w-5 h-5 flex-shrink-0" />
          <span className="hidden sm:inline tracking-widest leading-none pt-0.5 font-black">NONOKKIDS AUDIO</span>
          <span className="sm:hidden leading-none pt-0.5 font-black">NONOKKIDS</span>
        </div>
        <div className="bg-brand-cyan/10 text-brand-cyan px-3 py-1 rounded-full text-[10px] sm:text-[11px] border border-brand-cyan/30 uppercase font-bold truncate max-w-[150px] sm:max-w-none">
          SYSTEM_STABLE: V4.5
        </div>
      </header>

      <main className="flex-1 flex flex-col md:grid md:grid-cols-[320px_1fr] bg-border-dim overflow-hidden">
        {/* Sidebar */}
        <aside className="bg-sidebar-bg p-5 flex flex-col gap-5 md:gap-8 overflow-y-auto border-b md:border-b-0 md:border-r border-border-dim shrink-0">
          {/* Section: Controls */}
          <div className="space-y-4">
            <span className="text-[10px] uppercase text-label tracking-[0.2em] mb-4 block font-black">Dynamic Controls</span>
            
            <div className="space-y-5">
              <div className="flex justify-between text-xs text-gray-400 font-bold font-mono">
                <span>STRETCH / PITCH LINK</span>
                <span className="text-brand-cyan bg-brand-cyan/10 px-2 py-0.5 rounded border border-brand-cyan/20">{stretch.toFixed(2)}x</span>
              </div>
              <input 
                type="range" 
                min="0.3" 
                max="1.7" 
                step="0.01" 
                value={stretch}
                onChange={(e) => setStretch(parseFloat(e.target.value))}
                className="custom-range w-full h-8"
              />
              <div className="flex justify-center relative py-1 md:py-2">
                <div className="bg-editor-bg p-2 rounded-full border border-brand-cyan/50 text-brand-cyan shadow-[0_0_20px_rgba(0,210,255,0.25)] animate-pulse">
                  <LinkIcon className="w-5 h-5" />
                </div>
              </div>
              <p className="text-[10px] text-label text-center leading-relaxed font-medium hidden md:block">
                Locking resample rate for phase perfect<br/>transposition and scaling.
              </p>
            </div>
          </div>

          {/* Section: Action Options */}
          <div className="mt-2 space-y-3">
            <span className="text-[10px] uppercase text-label tracking-[0.2em] mb-3 block font-black">Execution Engine</span>
            
            {/* OPTION 1: REVIEW */}
            <button
              disabled={!file || isProcessing}
              onClick={() => handleProcess("review")}
              className={`
                w-full py-3.5 rounded-xl font-black uppercase tracking-[0.15em] text-[10px] shadow-lg transition-all flex flex-col items-center justify-center gap-1 group
                ${!file || isProcessing 
                  ? "bg-border-dim text-label cursor-not-allowed opacity-50" 
                  : "bg-white/5 text-ink border border-white/10 hover:bg-white/10 hover:border-brand-cyan/50 active:scale-95"}
              `}
            >
              {isProcessing ? (
                <Loader2 className="w-4 h-4 animate-spin text-brand-cyan" />
              ) : (
                <Play className="w-4 h-4 text-brand-cyan group-hover:scale-110 transition-transform" />
              )}
              <span>Review Results First</span>
            </button>

            {/* OPTION 2: DIRECT DOWNLOAD */}
            <button
              disabled={!file || isProcessing}
              onClick={() => handleProcess("download")}
              className={`
                w-full py-4 rounded-xl font-black uppercase tracking-[0.15em] text-[10px] shadow-xl transition-all flex flex-col items-center justify-center gap-1
                ${!file || isProcessing 
                  ? "bg-border-dim text-label cursor-not-allowed opacity-50" 
                  : "bg-brand-cyan text-editor-bg hover:shadow-brand-cyan/40 hover:brightness-110 active:scale-95 shadow-[0_4px_20px_rgba(0,210,255,0.15)]"}
              `}
            >
              {isProcessing ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Download className="w-4 h-4" />
              )}
              <span>Direct Export MP3</span>
            </button>
          </div>

          <div className="mt-auto hidden md:block">
            <div className="bg-white/5 p-4 rounded-xl border border-white/5">
              <span className="text-[9px] text-label uppercase font-black block mb-2 tracking-widest">System Load</span>
              <div className="w-full bg-editor-bg h-1 rounded-full overflow-hidden">
                <div 
                  className={`h-full bg-brand-cyan transition-all duration-1000 ${isProcessing ? 'w-[80%]' : 'w-[5%]'}`}
                ></div>
              </div>
            </div>
          </div>
        </aside>

        {/* Editor View */}
        <section className="bg-editor-bg p-4 md:p-8 flex flex-col justify-start md:justify-center overflow-y-auto relative min-h-0 flex-grow">
          {/* Main Waveform Display */}
          <div className="h-[140px] md:h-[280px] bg-brand-cyan/[0.03] border border-border-dim rounded-2xl flex items-center justify-center relative mb-6 md:mb-8 flex-shrink-0 overflow-hidden shadow-inner">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(0,210,255,0.05)_0%,transparent_70%)]"></div>
            <svg 
              className={`w-[95%] h-[80px] md:h-[120px] stroke-brand-cyan transition-all duration-300 ${isPlaying || isProcessedPlaying ? 'opacity-80 scale-105' : 'opacity-40'}`}
              style={{ strokeWidth: 2, strokeLinecap: 'round' }}
              viewBox="0 0 1000 100"
              fill="none"
            >
              <motion.path 
                animate={{ 
                  d: isPlaying || isProcessedPlaying 
                    ? "M0 50 Q 10 0 20 50 T 40 50 T 60 50 T 80 50 T 100 50 T 120 10 T 140 90 T 160 50 T 180 50 T 200 50 T 220 0 T 240 100 T 260 50 T 280 50 T 300 0 T 320 100 T 340 50 T 360 50 T 380 50 T 400 50 T 420 50 T 440 0 T 460 100 T 480 50 T 500 50 T 520 50 T 540 50 T 560 50 T 580 50 T 600 50 T 620 0 T 640 100 T 660 50 T 680 50 T 700 0 T 720 100 T 740 50 T 760 50 T 780 50 T 800 50 T 820 50 T 840 0 T 860 100 T 880 50 T 900 50 T 920 50 T 940 50 T 960 50 T 980 50 T 1000 50"
                    : "M0 50 Q 10 40 20 50 T 40 50 T 60 50 T 80 50 T 100 50 T 120 50 T 140 50 T 160 50 T 180 50 T 200 50 T 220 45 T 240 55 T 260 50 T 280 50 T 300 45 T 320 55 T 340 50 T 360 50 T 380 50 T 400 50 T 420 50 T 440 45 T 460 55 T 480 50 T 500 50 T 520 50 T 540 50 T 560 50 T 580 50 T 600 50 T 620 45 T 640 55 T 660 50 T 680 50 T 700 45 T 720 55 T 740 50 T 760 50 T 780 50 T 800 50 T 820 50 T 840 45 T 860 55 T 880 50 T 900 50 T 920 50 T 940 50 T 960 50 T 980 50 T 1000 50"
                }}
                transition={{ repeat: Infinity, duration: 1.5, ease: "easeInOut" }}
                d="M0 50 L 1000 50"
              />
            </svg>
            <div className="absolute top-4 right-4 flex gap-2">
              <div className={`w-2 h-2 rounded-full ${isProcessing ? 'bg-orange-500 animate-ping' : isPlaying || isProcessedPlaying ? 'bg-green-500 animate-pulse' : 'bg-white/20'}`}></div>
            </div>
            <div className="absolute bottom-4 left-4 md:left-6 font-mono text-[9px] md:text-xs text-brand-cyan tracking-widest bg-editor-bg/90 border border-brand-cyan/30 px-3 py-1 rounded shadow-lg backdrop-blur-sm">
              {file ? "I/O_BUF_STABLE" : "SIGNAL_LOST"}
            </div>
            
            {!file && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-editor-bg/60 backdrop-blur-[4px] rounded-xl">
                <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 10, ease: "linear" }}>
                  <Activity className="w-10 h-10 text-white/20 mb-4" />
                </motion.div>
                <button 
                  onClick={() => fileInputRef.current?.click()}
                  className="bg-brand-cyan text-editor-bg px-6 py-3 rounded-full text-[10px] font-black uppercase tracking-[0.2em] shadow-2xl hover:scale-105 active:scale-95 transition-all"
                >
                  INITIALIZE LOAD
                </button>
              </div>
            )}
          </div>

          {/* Current File Panel */}
          <div className="flex gap-4 items-center flex-shrink-0">
            <div className="flex-1 bg-sidebar-bg p-4 md:p-6 rounded-xl border border-border-dim relative group overflow-hidden">
              <div className="flex justify-between items-start mb-3">
                <span className="text-[9px] md:text-[10px] text-label uppercase tracking-widest font-bold">Input Source Buffer</span>
                {file && (
                  <div className="flex items-center gap-1.5 text-brand-cyan text-[9px] font-mono animate-pulse">
                    <Volume2 className="w-3 h-3" />
                    LIVE
                  </div>
                )}
              </div>
              
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 relative z-10">
                <div className="flex items-center gap-4 w-full sm:w-auto">
                  {/* Play Button */}
                  <div className="relative">
                    <button
                      disabled={!file}
                      onClick={togglePlay}
                      className={`
                        w-12 h-12 rounded-full flex items-center justify-center shrink-0 transition-all
                        ${file 
                          ? "bg-brand-cyan/10 border border-brand-cyan/30 text-brand-cyan hover:bg-brand-cyan hover:text-editor-bg shadow-[0_0_10px_rgba(0,210,255,0.1)]" 
                          : "bg-white/5 border border-white/5 text-label cursor-not-allowed"}
                      `}
                    >
                      {isPlaying ? <Pause className="w-5 h-5 fill-current" /> : <Play className="w-5 h-5 ml-1 fill-current" />}
                    </button>
                    {file && !isPlaying && (
                      <span className="absolute -bottom-6 left-1/2 -translate-x-1/2 text-[8px] text-brand-cyan font-bold uppercase whitespace-nowrap opacity-60">Preview</span>
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="font-semibold text-base md:text-lg text-ink truncate">
                      {file ? file.name : "Waiting for input..."}
                    </div>
                    <div className="text-[10px] md:text-xs text-label mt-1 font-mono uppercase truncate">
                      {file ? `Resampled: ${(44.1 / stretch).toFixed(1)} kHz • ${(file.size / 1e6).toFixed(1)} MB` : "Null Signal"}
                    </div>
                  </div>
                </div>

                <button 
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full sm:w-auto bg-transparent border border-border-dim text-label px-4 py-2.5 rounded-lg text-xs font-semibold hover:text-ink hover:border-brand-cyan transition-all cursor-pointer whitespace-nowrap active:scale-95"
                >
                  {file ? "RELOAD_FILE" : "CHOOSE_FILE"}
                </button>
              </div>
              <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleFileChange} 
                accept=".mp3,audio/mpeg,audio/mp3,audio/wav,audio/x-wav,audio/aiff,audio/x-aiff,audio/flac,audio/ogg" 
                className="hidden" 
              />
            </div>
          </div>

          {/* Advanced Stats (Live) */}
          <div className="mt-8 md:mt-12 grid grid-cols-3 gap-4 md:gap-8 flex-shrink-0">
            {[
              { label: "Live Pitch", value: transpositionValue, unit: "st" },
              { label: "Time Scale", value: timeScaleValue, unit: "%" },
              { label: "Resample", value: resampleRateValue, unit: "kHz" }
            ].map((stat, i) => (
              <div key={i} className="text-center group p-2 rounded-lg hover:bg-white/[0.02] transition-colors">
                <span className="text-[8px] md:text-[10px] text-label uppercase tracking-widest font-bold block mb-2 group-hover:text-brand-cyan transition-colors">{stat.label}</span>
                <div className="text-xl md:text-3xl font-extralight text-ink font-mono tabular-nums">
                  {stat.value}<span className="text-[10px] md:text-sm text-label ml-1">{stat.unit}</span>
                </div>
              </div>
            ))}
          </div>

          {/* Processed Result (The 'Review before Download' section) */}
          <AnimatePresence>
            {processedUrl && (
              <motion.div 
                initial={{ opacity: 0, scale: 0.95, y: 30 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                className="mt-10 bg-editor-bg border-2 border-brand-cyan/40 p-4 md:p-8 rounded-2xl flex flex-col md:flex-row items-center gap-6 flex-shrink-0 shadow-[0_0_50px_rgba(0,210,255,0.15)] relative overflow-hidden"
              >
                <div className="absolute top-0 left-0 w-1 h-full bg-brand-cyan animate-pulse"></div>
                
                <div className="flex-1 min-w-0 text-center md:text-left">
                  <div className="flex items-center justify-center md:justify-start gap-2 mb-2">
                    <div className="w-2 h-2 rounded-full bg-brand-cyan animate-ping"></div>
                    <span className="text-[11px] text-brand-cyan uppercase tracking-[0.3em] font-black">Official Review Ready</span>
                  </div>
                  <div className="text-lg md:text-xl font-bold text-ink truncate font-mono">
                    {file?.name.split('.')[0]}_PROCESSED.mp3
                  </div>
                  <div className="text-[10px] text-label uppercase mt-1 tracking-widest">
                    44.1kHz • 16-bit • 320kbps CBR
                  </div>
                </div>
                
                <div className="flex flex-col sm:flex-row items-center gap-4 w-full md:w-auto">
                  {/* The actual PLAY REVIEW button */}
                  <button
                    onClick={toggleProcessedPlay}
                    className={`
                      w-full sm:w-auto flex items-center justify-center gap-3 px-8 py-4 rounded-xl text-sm font-black uppercase tracking-widest transition-all shadow-xl
                      ${isProcessedPlaying 
                        ? "bg-ink text-editor-bg scale-105" 
                        : "bg-brand-cyan text-editor-bg hover:shadow-brand-cyan/40 hover:scale-105 active:scale-95"}
                    `}
                  >
                    {isProcessedPlaying ? <Pause className="w-5 h-5 fill-current" /> : <Play className="w-5 h-5 fill-current ml-1" />}
                    <span>{isProcessedPlaying ? "Pause Review" : "Play Review"}</span>
                  </button>
                  
                  {/* The separate DOWNLOAD button */}
                  <a
                    href={processedUrl}
                    download={`edited_${file?.name.split(".")[0] || 'audio'}_320kbps.mp3`}
                    className="w-full sm:w-16 h-14 rounded-xl border-2 border-brand-cyan/30 text-brand-cyan flex items-center justify-center transition-all hover:bg-brand-cyan hover:text-editor-bg hover:border-brand-cyan shadow-lg active:scale-95 group"
                    title="Finalize & Download"
                  >
                    <Download className="w-6 h-6 group-hover:animate-bounce" />
                    <span className="sm:hidden ml-2 font-bold uppercase tracking-widest text-xs">Save to Device</span>
                  </a>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Success/Error Alerts overlay-like */}
          <div className="fixed bottom-6 right-6 md:absolute md:top-8 md:right-8 md:bottom-auto z-50 flex flex-col gap-2 w-[calc(100%-48px)] md:max-w-sm pointer-events-none">
            <AnimatePresence>
              {status === "success" && (
                <motion.div 
                  initial={{ x: 100, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  exit={{ x: 100, opacity: 0 }}
                  className="bg-green-500/10 border border-green-500/20 p-4 rounded-lg flex items-center gap-3 backdrop-blur-md pointer-events-auto"
                >
                  <CheckCircle2 className="w-5 h-5 text-green-400 flex-shrink-0" />
                  <span className="text-[10px] text-green-400 font-medium font-mono">EXEC_SUCCESS: FILE_EXPORTED</span>
                </motion.div>
              )}
              {status === "error" && (
                <motion.div 
                  initial={{ x: 100, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  exit={{ x: 100, opacity: 0 }}
                  className="bg-red-500/10 border border-red-500/20 p-4 rounded-lg flex items-center gap-3 backdrop-blur-md pointer-events-auto"
                >
                  <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
                  <span className="text-[10px] text-red-500 font-medium font-mono uppercase truncate">FAIL: {errorMessage}</span>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </section>
      </main>
    </div>
  );
}
