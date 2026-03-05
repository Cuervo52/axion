import { X, Upload, Camera, Image as ImageIcon, Check, AlertCircle, Loader2, Users, ScanLine } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useState, useRef } from 'react';
import React from 'react';
import { analyzeMatchScreenshot } from '../services/gemini';

interface EscanearPartidaProps {
  isOpen: boolean;
  onClose: () => void;
}

interface ExtractedData {
  matchId: string;
  position: string;
  totalKills: number;
  totalScore: number;
  totalDamage: number;
  mode: string;
  members: Array<{
    gamertag: string;
    kills: number;
    damage: number;
    score: number;
  }>;
}

export default function EscanearPartida({ isOpen, onClose }: EscanearPartidaProps) {
  const [step, setStep] = useState<'upload' | 'processing' | 'review' | 'success'>('upload');
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [extractedData, setExtractedData] = useState<ExtractedData | null>(null);

  const processImage = async (base64Image: string) => {
    setStep('processing');
    setError(null);
    try {
      // Check size before sending
      const sizeInBytes = (base64Image.length * 3) / 4;
      const sizeInMB = sizeInBytes / 1024 / 1024;
      console.log(`Sending image of size: ${sizeInMB.toFixed(2)} MB`);

      if (sizeInMB > 10) {
        throw new Error(`Image is too large (${sizeInMB.toFixed(2)} MB). Please use a smaller image.`);
      }

      const data = await analyzeMatchScreenshot(base64Image);
      setExtractedData(data);
      setStep('review');
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'No se pudo analizar la imagen. Asegúrate de que sea una captura clara de los resultados.');
      setStep('upload');
    }
  };

  const resizeImage = (base64Str: string, maxWidth = 800): Promise<string> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.src = base64Str;
      img.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;

          // Maintain aspect ratio but cap at maxWidth
          if (width > maxWidth) {
            height = (height * maxWidth) / width;
            width = maxWidth;
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            reject(new Error("Could not get canvas context"));
            return;
          }
          ctx.drawImage(img, 0, 0, width, height);
          // Reduce quality to 0.7 as requested to avoid payload issues
          const resized = canvas.toDataURL('image/jpeg', 0.7);
          console.log(`Image resized from ${img.width}x${img.height} to ${width}x${height}`);
          resolve(resized);
        } catch (e) {
          reject(e);
        }
      };
      img.onerror = (e) => reject(new Error("Failed to load image"));
    });
  };

  const handlePaste = async (e: ClipboardEvent) => {
    if (e.clipboardData && e.clipboardData.files && e.clipboardData.files[0]) {
      const file = e.clipboardData.files[0];
      if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = async (ev) => {
          const result = ev.target?.result as string;
          try {
            console.log("Original pasted image size:", (result.length * 3) / 4 / 1024 / 1024, "MB");
            const resizedImage = await resizeImage(result);
            console.log("Resized pasted image size:", (resizedImage.length * 3) / 4 / 1024 / 1024, "MB");
            setSelectedImage(resizedImage);
            processImage(resizedImage);
          } catch (err) {
            console.error("Error resizing pasted image:", err);
            setError("Error al procesar la imagen pegada.");
          }
        };
        reader.readAsDataURL(file);
      }
    }
  };

  React.useEffect(() => {
    if (isOpen) {
      document.addEventListener('paste', handlePaste as any);
    } else {
      document.removeEventListener('paste', handlePaste as any);
    }
    return () => {
      document.removeEventListener('paste', handlePaste as any);
    };
  }, [isOpen]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.onload = async (ev) => {
        const result = ev.target?.result as string;
        try {
          console.log("Original image size:", (result.length * 3) / 4 / 1024 / 1024, "MB");
          const resizedImage = await resizeImage(result);
          console.log("Resized image size:", (resizedImage.length * 3) / 4 / 1024 / 1024, "MB");
          setSelectedImage(resizedImage);
          processImage(resizedImage);
        } catch (err) {
          console.error("Error resizing image:", err);
          setError("Error al procesar la imagen. Intenta con otra captura.");
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      const reader = new FileReader();
      reader.onload = async (ev) => {
        const result = ev.target?.result as string;
        try {
          console.log("Original image size:", (result.length * 3) / 4 / 1024 / 1024, "MB");
          const resizedImage = await resizeImage(result);
          console.log("Resized image size:", (resizedImage.length * 3) / 4 / 1024 / 1024, "MB");
          setSelectedImage(resizedImage);
          processImage(resizedImage);
        } catch (err) {
          console.error("Error resizing image:", err);
          setError("Error al procesar la imagen. Intenta con otra captura.");
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const resetFlow = () => {
    setStep('upload');
    setSelectedImage(null);
    setExtractedData(null);
    setError(null);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[80]"
            onClick={onClose}
          />
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed bottom-0 left-0 right-0 bg-[#0B0E14] border-t border-white/10 rounded-t-3xl z-[90] max-h-[90vh] overflow-y-auto max-w-md mx-auto shadow-2xl"
          >
            {/* Header del Modal */}
            <div className="sticky top-0 bg-[#0B0E14]/95 backdrop-blur-md border-b border-white/5 p-4 flex justify-between items-center z-10">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <Camera className="text-purple-500" /> Escanear Partida
              </h2>
              <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-full text-slate-400 hover:text-white transition-colors">
                <X size={20} />
              </button>
            </div>

            <div className="p-6 pb-12">
              {/* Paso 1: Subir Imagen */}
              {step === 'upload' && (
                <div className="space-y-6">
                  <div
                    className="border-2 border-dashed border-white/10 rounded-2xl p-8 flex flex-col items-center justify-center gap-4 bg-white/5 hover:bg-white/10 hover:border-purple-500/50 transition-all cursor-pointer group"
                    onClick={() => fileInputRef.current?.click()}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={handleDrop}
                  >
                    <div className="w-16 h-16 rounded-full bg-purple-500/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                      <Upload size={32} className="text-purple-400" />
                    </div>
                    <div className="text-center">
                      <p className="text-white font-bold mb-1">Sube tu captura</p>
                      <p className="text-xs text-slate-400">Toca para seleccionar o arrastra aquí</p>
                    </div>
                    <input
                      type="file"
                      ref={fileInputRef}
                      className="hidden"
                      accept="image/*"
                      onChange={handleFileSelect}
                    />
                  </div>

                  {error && (
                    <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 flex gap-3">
                      <AlertCircle className="text-red-400 shrink-0" size={20} />
                      <div className="text-xs text-red-200">
                        {error}
                      </div>
                    </div>
                  )}

                  <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-4 flex gap-3">
                    <AlertCircle className="text-blue-400 shrink-0" size={20} />
                    <div className="text-xs text-blue-200">
                      <strong className="block mb-1 text-blue-400">Tips para mejor precisión:</strong>
                      Asegúrate que la imagen sea clara y muestre la tabla de puntuación completa al final de la partida.
                    </div>
                  </div>
                </div>
              )}

              {/* Paso 2: Procesando */}
              {step === 'processing' && (
                <div className="flex flex-col items-center justify-center py-12 space-y-6">
                  <div className="relative">
                    <div className="absolute inset-0 bg-purple-500 blur-xl opacity-20 animate-pulse" />
                    <Loader2 size={64} className="text-purple-500 animate-spin relative z-10" />
                  </div>
                  <div className="text-center space-y-2">
                    <h3 className="text-xl font-bold text-white">Analizando Captura...</h3>
                    <p className="text-sm text-slate-400">Nuestra IA está extrayendo los stats</p>
                  </div>
                </div>
              )}

              {/* Paso 3: Revisión */}
              {step === 'review' && selectedImage && extractedData && (
                <div className="space-y-6">
                  <div className="relative rounded-xl overflow-hidden border border-white/10 aspect-video bg-black">
                    <img src={selectedImage} alt="Preview" className="w-full h-full object-contain" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent flex items-end p-4">
                      <span className="text-xs font-mono text-white/80 bg-black/50 px-2 py-1 rounded">Captura Original</span>
                    </div>
                  </div>

                  <div className="bg-white/5 rounded-xl border border-white/10 p-4 space-y-4">
                    <div className="flex items-center justify-between border-b border-white/5 pb-2">
                      <h3 className="font-bold text-white">Resultados Detectados</h3>
                      <span className="text-[10px] bg-green-500/20 text-green-400 px-2 py-0.5 rounded border border-green-500/20">IA Probada</span>
                    </div>

                    <div className="bg-black/40 p-3 rounded-xl border border-purple-500/20 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <ScanLine size={14} className="text-purple-400" />
                        <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Match ID</span>
                      </div>
                      <span className="text-xs font-mono text-purple-300">{extractedData.matchId}</span>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="bg-black/40 p-4 rounded-xl border border-white/5">
                        <label className="text-xs text-slate-500 uppercase font-bold tracking-wider">Posición</label>
                        <div className="text-2xl font-black text-yellow-500 mt-1">{extractedData.position}</div>
                      </div>
                      <div className="bg-black/40 p-4 rounded-xl border border-white/5">
                        <label className="text-xs text-slate-500 uppercase font-bold tracking-wider">Kills Totales</label>
                        <div className="text-2xl font-black text-white mt-1">{extractedData.totalKills}</div>
                      </div>
                      <div className="bg-black/40 p-4 rounded-xl border border-white/5">
                        <label className="text-xs text-slate-500 uppercase font-bold tracking-wider">Score Total</label>
                        <div className="text-2xl font-black text-purple-400 mt-1">{extractedData.totalScore.toLocaleString()}</div>
                      </div>
                      <div className="bg-black/40 p-4 rounded-xl border border-white/5">
                        <label className="text-xs text-slate-500 uppercase font-bold tracking-wider">Daño Total</label>
                        <div className="text-2xl font-black text-slate-300 mt-1">{extractedData.totalDamage.toLocaleString()}</div>
                      </div>
                    </div>

                    {/* Lista de Jugadores Detectados */}
                    <div className="pt-4">
                      <div className="text-xs text-slate-400 uppercase font-bold mb-3 flex items-center gap-2 px-1">
                        <Users size={14} /> Jugadores Detectados ({extractedData.members.length})
                      </div>
                      <div className="space-y-3">
                        {extractedData.members.map((member, idx) => (
                          <div key={idx} className="bg-white/5 p-3 rounded-xl border border-white/5 flex flex-col gap-2">
                            <div className="flex justify-between items-center">
                              <span className="font-bold text-white text-sm">{member.gamertag}</span>
                              <span className="text-xs font-mono text-purple-300 bg-purple-500/10 px-2 py-1 rounded border border-purple-500/20">
                                {member.score.toLocaleString()} PTS
                              </span>
                            </div>
                            <div className="flex items-center gap-4 text-xs text-slate-400 border-t border-white/5 pt-2 mt-1">
                              <div className="flex items-center gap-1.5">
                                <div className="w-1.5 h-1.5 rounded-full bg-red-500"></div>
                                <span className="text-white font-bold">{member.kills}</span> Kills
                              </div>
                              <div className="flex items-center gap-1.5">
                                <div className="w-1.5 h-1.5 rounded-full bg-orange-500"></div>
                                <span className="text-white font-bold">{member.damage.toLocaleString()}</span> Daño
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {error && (
                    <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 flex gap-3">
                      <AlertCircle className="text-red-400 shrink-0" size={20} />
                      <div className="text-xs text-red-200">
                        {error}
                      </div>
                    </div>
                  )}

                  <div className="flex gap-3">
                    <button
                      onClick={resetFlow}
                      className="flex-1 py-3 rounded-xl font-bold text-slate-300 bg-white/5 hover:bg-white/10 transition-colors"
                    >
                      Reintentar
                    </button>
                    <button
                      onClick={async () => {
                        try {
                          setError(null);
                          const response = await fetch('/api/matches', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify(extractedData),
                          });

                          if (response.status === 409) {
                            const data = await response.json();
                            throw new Error(data.error || 'Esta partida ya fue registrada.');
                          }

                          if (!response.ok) throw new Error('Error al guardar la partida');

                          setStep('success');
                          setTimeout(() => {
                            onClose();
                            resetFlow();
                            window.location.reload();
                          }, 2000);
                        } catch (err: any) {
                          console.error(err);
                          setError(err.message || 'Error al guardar la partida. Intenta de nuevo.');
                        }
                      }}
                      className="flex-1 py-3 rounded-xl font-bold text-black bg-gradient-to-r from-purple-500 to-yellow-500 hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
                    >
                      <Check size={18} /> Confirmar
                    </button>
                  </div>
                </div>
              )}

              {/* Paso 4: Éxito */}
              {step === 'success' && (
                <div className="flex flex-col items-center justify-center py-12 space-y-6">
                  <div className="w-20 h-20 rounded-full bg-green-500/20 flex items-center justify-center border border-green-500/50">
                    <Check size={40} className="text-green-500" />
                  </div>
                  <div className="text-center space-y-2">
                    <h3 className="text-2xl font-bold text-white">¡Guardado!</h3>
                    <p className="text-sm text-slate-400">Los stats se han actualizado correctamente.</p>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
