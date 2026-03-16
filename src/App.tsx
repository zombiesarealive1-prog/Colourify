/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect } from 'react';
import { Upload, Download, Image as ImageIcon, RefreshCw, Trash2, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export default function App() {
  const [image, setImage] = useState<string | null>(null);
  const [processedImage, setProcessedImage] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [threshold, setThreshold] = useState(30);
  const [lineWeight, setLineWeight] = useState(1);
  const [isDragging, setIsDragging] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      loadImage(file);
    }
  };

  const loadImage = (file: File) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      setImage(event.target?.result as string);
      setProcessedImage(null);
    };
    reader.readAsDataURL(file);
  };

  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const onDragLeave = () => {
    setIsDragging(false);
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith('image/')) {
      loadImage(file);
    }
  };

  const processImage = () => {
    if (!image || !canvasRef.current) return;
    setIsProcessing(true);

    const img = new Image();
    // Only set crossOrigin if it's not a data URL to avoid potential issues
    if (!image.startsWith('data:')) {
      img.crossOrigin = "anonymous";
    }

    img.onerror = (e) => {
      console.error("Failed to load image for processing", e);
      setIsProcessing(false);
    };

    img.onload = () => {
      try {
        const canvas = canvasRef.current!;
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        if (!ctx) {
          setIsProcessing(false);
          return;
        }

        // Limit max dimension for performance while maintaining aspect ratio
        const maxDim = 1600;
        let w = img.width;
        let h = img.height;
        if (w > maxDim || h > maxDim) {
          if (w > h) {
            h = (maxDim / w) * h;
            w = maxDim;
          } else {
            w = (maxDim / h) * w;
            h = maxDim;
          }
        }

        canvas.width = w;
        canvas.height = h;
        ctx.drawImage(img, 0, 0, w, h);

        const imageData = ctx.getImageData(0, 0, w, h);
        const data = imageData.data;

        // 1. Grayscale
        const grayscale = new Uint8ClampedArray(w * h);
        for (let i = 0; i < data.length; i += 4) {
          // Standard luminance formula
          grayscale[i / 4] = (data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114);
        }

        // 2. Sobel Edge Detection
        const output = ctx.createImageData(w, h);
        const outData = output.data;
        const weight = Math.max(1, Math.floor(lineWeight));

        for (let y = weight; y < h - weight; y++) {
          for (let x = weight; x < w - weight; x++) {
            const idx = y * w + x;
            
            let gx = 0;
            let gy = 0;

            // Sobel kernels with variable weight (offset)
            const o = weight;
            
            // Horizontal gradient
            gx += -1 * grayscale[(y - o) * w + (x - o)];
            gx +=  1 * grayscale[(y - o) * w + (x + o)];
            gx += -2 * grayscale[y * w + (x - o)];
            gx +=  2 * grayscale[y * w + (x + o)];
            gx += -1 * grayscale[(y + o) * w + (x - o)];
            gx +=  1 * grayscale[(y + o) * w + (x + o)];

            // Vertical gradient
            gy += -1 * grayscale[(y - o) * w + (x - o)];
            gy += -2 * grayscale[(y - o) * w + x];
            gy += -1 * grayscale[(y - o) * w + (x + o)];
            gy +=  1 * grayscale[(y + o) * w + (x - o)];
            gy +=  2 * grayscale[(y + o) * w + x];
            gy +=  1 * grayscale[(y + o) * w + (x + o)];

            const magnitude = Math.sqrt(gx * gx + gy * gy);

            // Thresholding: magnitude > threshold means edge (black), else background (white)
            const isEdge = magnitude > threshold;
            const color = isEdge ? 0 : 255;
            
            const pixelIdx = idx * 4;
            outData[pixelIdx] = color;
            outData[pixelIdx + 1] = color;
            outData[pixelIdx + 2] = color;
            outData[pixelIdx + 3] = 255;
          }
        }

        // Fill in the borders that were skipped by the loop
        for (let i = 0; i < outData.length; i += 4) {
          if (outData[i + 3] === 0) { // If alpha is 0, it wasn't set
            outData[i] = 255;
            outData[i + 1] = 255;
            outData[i + 2] = 255;
            outData[i + 3] = 255;
          }
        }

        ctx.putImageData(output, 0, 0);
        const dataUrl = canvas.toDataURL('image/png');
        setProcessedImage(dataUrl);
      } catch (err) {
        console.error("Error during image processing:", err);
      } finally {
        setIsProcessing(false);
      }
    };
    img.src = image;
  };

  useEffect(() => {
    if (image) {
      const timer = setTimeout(() => {
        processImage();
      }, 150); // Debounce for smoother slider interaction
      return () => clearTimeout(timer);
    }
  }, [image, threshold, lineWeight]);

  const downloadImage = () => {
    if (!processedImage) return;
    const link = document.createElement('a');
    link.download = 'coloring-page-outline.png';
    link.href = processedImage;
    link.click();
  };

  const reset = () => {
    setImage(null);
    setProcessedImage(null);
  };

  return (
    <div className="min-h-screen bg-[#fcfcfc] text-zinc-900 font-sans selection:bg-zinc-200">
      <div className="max-w-6xl mx-auto px-6 py-12">
        {/* Header */}
        <header className="mb-12 text-center">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-100 text-[10px] font-bold text-emerald-600 mb-4 tracking-widest uppercase"
          >
            <ImageIcon size={12} />
            <span>Coloring Page Creator</span>
          </motion.div>
          <h1 className="text-5xl font-light tracking-tight mb-4">Coloring Outline</h1>
          <p className="text-zinc-500 max-w-md mx-auto text-sm">
            Convert your photos into clean, bold black outlines. 
            Perfect for printing and coloring by hand or digitally.
          </p>
        </header>

        <main>
          {!image ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              onDragOver={onDragOver}
              onDragLeave={onDragLeave}
              onDrop={onDrop}
              className={`
                relative group cursor-pointer
                aspect-[16/9] max-w-3xl mx-auto
                rounded-3xl border-2 border-dashed
                flex flex-col items-center justify-center gap-4
                transition-all duration-300
                ${isDragging ? 'border-emerald-500 bg-emerald-50/30' : 'border-zinc-200 bg-white hover:border-emerald-400'}
              `}
            >
              <input
                type="file"
                accept="image/*"
                onChange={handleFileUpload}
                className="absolute inset-0 opacity-0 cursor-pointer"
              />
              <div className="w-16 h-16 rounded-2xl bg-zinc-50 flex items-center justify-center text-zinc-400 group-hover:text-emerald-500 group-hover:bg-emerald-50 transition-all">
                <Upload size={32} />
              </div>
              <div className="text-center">
                <p className="text-lg font-medium">Upload a photo to outline</p>
                <p className="text-sm text-zinc-400">Drag and drop or click to browse</p>
              </div>
            </motion.div>
          ) : (
            <div className="space-y-8">
              {/* Controls */}
              <div className="flex flex-wrap items-center justify-between gap-8 bg-white p-8 rounded-3xl border border-zinc-100 shadow-xl shadow-zinc-200/50">
                <div className="flex flex-wrap items-center gap-12">
                  <div className="space-y-3">
                    <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest block">
                      Line Sensitivity
                    </label>
                    <div className="flex items-center gap-4">
                      <input
                        type="range"
                        min="5"
                        max="150"
                        value={threshold}
                        onChange={(e) => setThreshold(parseInt(e.target.value))}
                        className="w-40 h-1.5 bg-zinc-100 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                      />
                      <span className="text-xs font-mono text-zinc-500 w-6">{threshold}</span>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest block">
                      Line Thickness
                    </label>
                    <div className="flex items-center gap-4">
                      <input
                        type="range"
                        min="1"
                        max="5"
                        step="1"
                        value={lineWeight}
                        onChange={(e) => setLineWeight(parseInt(e.target.value))}
                        className="w-40 h-1.5 bg-zinc-100 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                      />
                      <span className="text-xs font-mono text-zinc-500 w-6">{lineWeight}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <button
                    onClick={reset}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold uppercase tracking-widest text-zinc-400 hover:text-red-500 hover:bg-red-50 transition-all"
                  >
                    <Trash2 size={16} />
                    Reset
                  </button>
                  <button
                    onClick={downloadImage}
                    disabled={!processedImage || isProcessing}
                    className="flex items-center gap-2 px-8 py-3 rounded-xl bg-zinc-900 text-white text-xs font-bold uppercase tracking-widest hover:bg-emerald-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-zinc-200"
                  >
                    <Download size={16} />
                    Download Page
                  </button>
                </div>
              </div>

              {/* Preview Grid */}
              <div className="grid md:grid-cols-2 gap-8">
                <div className="space-y-4">
                  <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest px-2">Original Photo</span>
                  <div className="aspect-square rounded-3xl overflow-hidden bg-zinc-50 border border-zinc-100 p-2">
                    <img src={image} alt="Original" className="w-full h-full object-contain rounded-2xl" referrerPolicy="no-referrer" />
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between px-2">
                    <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Coloring Outline</span>
                    {isProcessing && (
                      <div className="flex items-center gap-2 text-emerald-500">
                        <RefreshCw size={12} className="animate-spin" />
                        <span className="text-[10px] font-bold tracking-widest">CREATING...</span>
                      </div>
                    )}
                  </div>
                  <div className="aspect-square rounded-3xl overflow-hidden bg-white border border-zinc-100 p-2 relative shadow-inner">
                    <AnimatePresence mode="wait">
                      {processedImage ? (
                        <motion.img
                          key="processed"
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          src={processedImage}
                          alt="Processed"
                          className="w-full h-full object-contain rounded-2xl"
                          referrerPolicy="no-referrer"
                        />
                      ) : (
                        <div key="loading" className="w-full h-full flex items-center justify-center">
                          <RefreshCw size={32} className="text-zinc-100 animate-spin" />
                        </div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>
              </div>
            </div>
          )}
        </main>

        {/* Hidden Canvas for Processing */}
        <canvas ref={canvasRef} className="hidden" />

        <footer className="mt-20 pt-8 border-t border-zinc-100 text-center">
          <p className="text-[10px] font-bold text-zinc-300 uppercase tracking-[0.2em]">
            Optimized for Coloring Pages • Privacy First • Browser Powered
          </p>
        </footer>
      </div>
    </div>
  );
}
