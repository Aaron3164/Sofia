import React, { useEffect, useRef, useState, useCallback } from 'react';
import { GoogleGenAI, Modality, type LiveServerMessage } from '@google/genai';
import { Mic, MicOff, PhoneOff, Sparkles, Volume2, AlertCircle, Loader2, Send } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface TalkWithSofiaModalProps {
  isOpen: boolean;
  onClose: () => void;
  courseTitle: string;
  courseContext: string;
  courseSummary?: string;
}

interface TranscriptEntry {
  id: string;
  role: 'sofia' | 'user';
  text: string;
}

const MAX_SESSION_SECONDS = 10 * 60; // 10 minutes max pour protéger les quotas

function downsampleTo16k(input: Float32Array, inputSampleRate: number): Int16Array {
  if (inputSampleRate === 16000) {
    const out = new Int16Array(input.length);
    for (let i = 0; i < input.length; i++) {
      const s = Math.max(-1, Math.min(1, input[i]));
      out[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
    }
    return out;
  }
  const ratio = inputSampleRate / 16000;
  const newLength = Math.round(input.length / ratio);
  const result = new Int16Array(newLength);
  let offsetResult = 0;
  let offsetBuffer = 0;
  while (offsetResult < result.length) {
    const nextOffsetBuffer = Math.round((offsetResult + 1) * ratio);
    let accum = 0;
    let count = 0;
    for (let i = offsetBuffer; i < nextOffsetBuffer && i < input.length; i++) {
      accum += input[i];
      count++;
    }
    const avg = count > 0 ? accum / count : 0;
    const s = Math.max(-1, Math.min(1, avg));
    result[offsetResult] = s < 0 ? s * 0x8000 : s * 0x7fff;
    offsetResult++;
    offsetBuffer = nextOffsetBuffer;
  }
  return result;
}

function int16ToBase64(pcm: Int16Array): string {
  const bytes = new Uint8Array(pcm.buffer, pcm.byteOffset, pcm.byteLength);
  let binary = '';
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
  }
  return btoa(binary);
}

function base64ToFloat32(base64: string): Float32Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  const int16 = new Int16Array(bytes.buffer);
  const float32 = new Float32Array(int16.length);
  for (let i = 0; i < int16.length; i++) {
    float32[i] = int16[i] / 32768;
  }
  return float32;
}

export const TalkWithSofiaModal: React.FC<TalkWithSofiaModalProps> = ({
  isOpen,
  onClose,
  courseTitle,
  courseContext,
  courseSummary = ''
}) => {
  const [status, setStatus] = useState<'connecting' | 'listening' | 'speaking' | 'error' | 'ended'>('connecting');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [micDebugInfo, setMicDebugInfo] = useState<string>('');
  const [isMuted, setIsMuted] = useState(false);
  const [hasMic, setHasMic] = useState(true);
  const [textReply, setTextReply] = useState('');
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [transcripts, setTranscripts] = useState<TranscriptEntry[]>([]);
  const [micLevel, setMicLevel] = useState(0);

  const isMutedRef = useRef(false);
  const sessionRef = useRef<any>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const captureCtxRef = useRef<AudioContext | null>(null);
  const playbackCtxRef = useRef<AudioContext | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const nextPlayTimeRef = useRef<number>(0);
  const activeSourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
  const transcriptEndRef = useRef<HTMLDivElement | null>(null);
  const isClosingRef = useRef(false);

  const stopPlaybackQueue = useCallback(() => {
    activeSourcesRef.current.forEach(source => {
      try {
        source.stop();
      } catch {
        // Ignore if already stopped
      }
    });
    activeSourcesRef.current.clear();
    if (playbackCtxRef.current) {
      nextPlayTimeRef.current = playbackCtxRef.current.currentTime;
    } else {
      nextPlayTimeRef.current = 0;
    }
  }, []);

  const cleanupAll = useCallback(() => {
    isClosingRef.current = true;
    stopPlaybackQueue();

    if (processorRef.current) {
      try { processorRef.current.disconnect(); } catch {}
      processorRef.current = null;
    }
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(track => track.stop());
      mediaStreamRef.current = null;
    }
    if (captureCtxRef.current) {
      captureCtxRef.current.close().catch(() => {});
      captureCtxRef.current = null;
    }
    if (playbackCtxRef.current) {
      playbackCtxRef.current.close().catch(() => {});
      playbackCtxRef.current = null;
    }
    if (sessionRef.current) {
      try { sessionRef.current.close(); } catch {}
      sessionRef.current = null;
    }
  }, [stopPlaybackQueue]);

  const appendTranscript = useCallback((role: 'sofia' | 'user', chunk: string) => {
    if (!chunk || !chunk.trim()) return;
    setTranscripts(prev => {
      const last = prev[prev.length - 1];
      if (last && last.role === role) {
        const updated = [...prev];
        updated[updated.length - 1] = { ...last, text: last.text + chunk };
        return updated;
      }
      return [...prev.slice(-14), { id: `${Date.now()}-${Math.random()}`, role, text: chunk }];
    });
  }, []);

  const playPcmChunk = useCallback((base64Data: string) => {
    const ctx = playbackCtxRef.current;
    if (!ctx) return;

    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }

    const float32 = base64ToFloat32(base64Data);
    if (float32.length === 0) return;

    const buffer = ctx.createBuffer(1, float32.length, 24000);
    buffer.copyToChannel(new Float32Array(float32), 0);

    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.connect(ctx.destination);

    const startTime = Math.max(ctx.currentTime + 0.02, nextPlayTimeRef.current);
    source.start(startTime);
    nextPlayTimeRef.current = startTime + buffer.duration;

    activeSourcesRef.current.add(source);
    setStatus('speaking');

    source.onended = () => {
      activeSourcesRef.current.delete(source);
      if (activeSourcesRef.current.size === 0 && !isClosingRef.current) {
        setStatus('listening');
      }
    };
  }, []);

  useEffect(() => {
    if (!isOpen) return;

    isClosingRef.current = false;
    setStatus('connecting');
    setErrorMessage(null);
    setElapsedSeconds(0);
    setTranscripts([]);
    setIsMuted(false);
    setHasMic(true);
    setTextReply('');
    isMutedRef.current = false;

    let cancelled = false;

    const acquireMicStream = async (): Promise<MediaStream | null> => {
      if (!navigator.mediaDevices?.getUserMedia) {
        setMicDebugInfo('API getUserMedia indisponible dans ce navigateur.');
        return null;
      }

      const errors: string[] = [];

      // 1. Essai direct natif avec simple { audio: true }
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        if (stream) return stream;
      } catch (err: any) {
        errors.push(`audio:true -> ${err?.name || err?.message || err}`);
      }

      // 2. Énumérer les périphériques audio
      try {
        const allDevices = await navigator.mediaDevices.enumerateDevices();
        const audioInputs = allDevices.filter(d => d.kind === 'audioinput');
        if (audioInputs.length === 0) {
          errors.push('enumerateDevices: 0 audioinput trouvé');
        } else {
          for (const dev of audioInputs) {
            try {
              const stream = await navigator.mediaDevices.getUserMedia({
                audio: { deviceId: dev.deviceId ? { exact: dev.deviceId } : undefined }
              });
              if (stream) return stream;
            } catch (dErr: any) {
              errors.push(`${dev.label || dev.deviceId || 'inconnu'} -> ${dErr?.name || dErr?.message}`);
            }
          }
        }
      } catch (enumErr: any) {
        errors.push(`enumerateDevices -> ${enumErr?.message}`);
      }

      // 3. Essai contraintes basiques
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: false,
            noiseSuppression: false,
            autoGainControl: false
          }
        });
        if (stream) return stream;
      } catch (err3: any) {
        errors.push(`unconstrained -> ${err3?.name || err3?.message}`);
      }

      setMicDebugInfo(errors.join(' | '));
      return null;
    };

    const startVoiceSession = async () => {
      try {
        // 1. Demander l'accès micro (avec fallback si aucun micro connecté)
        const stream = await acquireMicStream();
        if (cancelled) {
          stream?.getTracks().forEach(t => t.stop());
          return;
        }
        if (stream) {
          mediaStreamRef.current = stream;
          setHasMic(true);
        } else {
          setHasMic(false);
        }

        // 2. Préparer les AudioContext (lecture toujours active, capture si micro présent)
        const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
        const captureCtx = stream ? new AudioCtx() : null;
        const playbackCtx = new AudioCtx();
        captureCtxRef.current = captureCtx;
        playbackCtxRef.current = playbackCtx;
        nextPlayTimeRef.current = playbackCtx.currentTime;

        // 3. Récupérer le token éphémère sécurisé depuis /api/live-token
        const { data: { session: supaSession } } = await supabase.auth.getSession();
        const jwt = supaSession?.access_token;
        if (!jwt) {
          throw new Error('Veuillez vous connecter pour utiliser "Parle avec Sofia".');
        }

        const tokenRes = await fetch('/api/live-token', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${jwt}`
          },
          body: JSON.stringify({
            courseTitle,
            courseContext,
            courseSummary
          })
        });

        const tokenPayload = await tokenRes.json().catch(() => ({}));
        if (!tokenRes.ok || !tokenPayload.token) {
          throw new Error(tokenPayload.message || tokenPayload.error || 'Impossible de démarrer la session vocale.');
        }
        if (cancelled) return;

        // 4. Connexion WebSocket directe à Gemini Live API avec le token éphémère
        const ai = new GoogleGenAI({
          apiKey: tokenPayload.token,
          httpOptions: { apiVersion: 'v1alpha' }
        });

        const liveSession = await ai.live.connect({
          model: tokenPayload.model || 'models/gemini-2.5-flash-native-audio-latest',
          config: {
            responseModalities: [Modality.AUDIO],
          },
          callbacks: {
            onopen: () => {
              if (cancelled) return;
              setStatus('listening');
            },
            onmessage: (message: LiveServerMessage) => {
              if (cancelled || isClosingRef.current) return;
              const serverContent = message.serverContent;
              if (!serverContent) return;

              if (serverContent.interrupted) {
                stopPlaybackQueue();
                setStatus('listening');
              }

              if (serverContent.inputTranscription?.text) {
                appendTranscript('user', serverContent.inputTranscription.text);
              }

              if (serverContent.outputTranscription?.text) {
                appendTranscript('sofia', serverContent.outputTranscription.text);
              }

              const parts = serverContent.modelTurn?.parts || [];
              for (const part of parts) {
                if (part.inlineData?.data && part.inlineData?.mimeType?.startsWith('audio/')) {
                  playPcmChunk(part.inlineData.data);
                }
              }
            },
            onerror: (err: any) => {
              console.error('[ParleAvecSofia] Erreur WebSocket:', err);
              if (!cancelled && !isClosingRef.current) {
                setErrorMessage('La connexion vocale a été interrompue.');
                setStatus('error');
              }
            },
            onclose: () => {
              if (!cancelled && !isClosingRef.current) {
                setStatus('ended');
              }
            }
          }
        });

        if (cancelled) {
          liveSession.close();
          return;
        }
        sessionRef.current = liveSession;

        // 5. Déclencher la prise de parole immédiate et accueillante de Sofia
        liveSession.sendClientContent({
          turns: [{
            role: 'user',
            parts: [{ text: 'Salut Sofia ! Dis-moi rapidement sur quoi porte notre cours et demande-moi comment je veux qu’on l’aborde (questions, explications, histoire ou autre).' }]
          }],
          turnComplete: true
        });

        // 6. Démarrer le streaming micro vers Gemini (uniquement si un micro est disponible)
        if (stream && captureCtx) {
          const source = captureCtx.createMediaStreamSource(stream);
          const processor = captureCtx.createScriptProcessor(4096, 1, 1);
          processorRef.current = processor;

          processor.onaudioprocess = (event) => {
            if (isClosingRef.current || !sessionRef.current) return;
            const inputData = event.inputBuffer.getChannelData(0);

            // Calcul du volume pour le feedback visuel
            let sum = 0;
            for (let i = 0; i < inputData.length; i++) {
              sum += inputData[i] * inputData[i];
            }
            const rms = Math.sqrt(sum / inputData.length);
            setMicLevel(isMutedRef.current ? 0 : Math.min(1, rms * 6));

            if (isMutedRef.current) return;

            const pcm16k = downsampleTo16k(inputData, captureCtx.sampleRate);
            const base64 = int16ToBase64(pcm16k);
            try {
              sessionRef.current.sendRealtimeInput({
                audio: {
                  data: base64,
                  mimeType: 'audio/pcm;rate=16000'
                }
              });
            } catch {
              // Ignore send errors while closing
            }
          };

          source.connect(processor);
          processor.connect(captureCtx.destination);
        }
      } catch (err: any) {
        console.error('[ParleAvecSofia] Erreur initialisation:', err);
        if (!cancelled) {
          let msg = err?.message || 'Impossible de lancer la discussion vocale.';
          if (err?.name === 'NotAllowedError' || err?.name === 'PermissionDeniedError') {
            msg = 'Accès au microphone refusé. Autorisez le micro dans votre navigateur pour parler avec Sofia.';
          } else if (err?.name === 'NotReadableError') {
            msg = 'Votre microphone est déjà utilisé par une autre application (Discord, Zoom, etc.).';
          }
          setErrorMessage(msg);
          setStatus('error');
          cleanupAll();
        }
      }
    };

    startVoiceSession();

    return () => {
      cancelled = true;
      cleanupAll();
    };
  }, [isOpen, courseTitle, courseContext, cleanupAll, playPcmChunk, stopPlaybackQueue, appendTranscript]);

  // Minuteur de session (10 minutes max pour maîtriser les tokens)
  useEffect(() => {
    if (!isOpen || status === 'connecting' || status === 'error' || status === 'ended') return;

    const timer = window.setInterval(() => {
      setElapsedSeconds(prev => {
        if (prev + 1 >= MAX_SESSION_SECONDS) {
          cleanupAll();
          setStatus('ended');
          return MAX_SESSION_SECONDS;
        }
        return prev + 1;
      });
    }, 1000);

    return () => window.clearInterval(timer);
  }, [isOpen, status, cleanupAll]);

  useEffect(() => {
    transcriptEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [transcripts]);

  const toggleMute = () => {
    setIsMuted(prev => {
      const next = !prev;
      isMutedRef.current = next;
      return next;
    });
  };

  const handleHangUp = () => {
    cleanupAll();
    onClose();
  };

  const handleSendTextReply = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = textReply.trim();
    if (!trimmed || !sessionRef.current || status === 'error' || status === 'ended') return;
    stopPlaybackQueue();
    appendTranscript('user', trimmed);
    setTextReply('');
    try {
      sessionRef.current.sendClientContent({
        turns: [{ role: 'user', parts: [{ text: trimmed }] }],
        turnComplete: true
      });
    } catch (err) {
      console.error('[ParleAvecSofia] Erreur envoi texte:', err);
    }
  };

  if (!isOpen) return null;

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  const remainingSeconds = Math.max(0, MAX_SESSION_SECONDS - elapsedSeconds);

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 1000,
        backgroundColor: 'rgba(10, 10, 14, 0.85)',
        backdropFilter: 'blur(12px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1rem'
      }}
    >
      <div
        className="glass-panel"
        style={{
          width: '100%',
          maxWidth: '520px',
          borderRadius: '1.5rem',
          padding: '1.75rem',
          border: '1px solid rgba(225, 29, 72, 0.3)',
          backgroundColor: 'var(--bg-elevated)',
          boxShadow: '0 24px 60px rgba(0, 0, 0, 0.6)',
          display: 'flex',
          flexDirection: 'column',
          gap: '1.25rem',
          maxHeight: '90vh'
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <div style={{
              width: '34px',
              height: '34px',
              borderRadius: '10px',
              background: 'linear-gradient(135deg, #e11d48, #fb7185)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white'
            }}>
              <Sparkles size={18} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700 }}>Parle avec Sofia</h3>
              <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text-secondary)', maxWidth: '250px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {courseTitle}
              </p>
            </div>
          </div>

          <div style={{
            padding: '0.3rem 0.7rem',
            borderRadius: '999px',
            backgroundColor: 'var(--bg-secondary)',
            fontSize: '0.78rem',
            fontWeight: 600,
            fontVariantNumeric: 'tabular-nums',
            color: remainingSeconds < 60 ? '#fb7185' : 'var(--text-secondary)',
            border: '1px solid var(--border-color)'
          }}>
            {formatTime(elapsedSeconds)} / 10:00
          </div>
        </div>

        {/* Visual Voice Orb */}
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '1.75rem 1rem',
          borderRadius: '1.25rem',
          backgroundColor: 'rgba(255, 255, 255, 0.02)',
          border: '1px solid var(--border-color)',
          gap: '1rem'
        }}>
          {status === 'error' ? (
            <div style={{ textAlign: 'center', color: '#ef4444', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }}>
              <AlertCircle size={40} />
              <p style={{ margin: 0, fontSize: '0.9rem', fontWeight: 500, color: 'var(--text-primary)' }}>
                {errorMessage}
              </p>
            </div>
          ) : (
            <>
              <div style={{
                position: 'relative',
                width: '104px',
                height: '104px',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: status === 'speaking'
                  ? 'radial-gradient(circle, rgba(225, 29, 72, 0.45) 0%, rgba(225, 29, 72, 0.12) 70%)'
                  : 'radial-gradient(circle, rgba(59, 130, 246, 0.25) 0%, rgba(59, 130, 246, 0.06) 70%)',
                border: status === 'speaking' ? '2px solid #e11d48' : '2px solid rgba(255, 255, 255, 0.14)',
                transform: `scale(${status === 'speaking' ? 1.08 : 1 + micLevel * 0.15})`,
                transition: 'transform 0.12s ease, border-color 0.2s ease, background 0.2s ease',
                boxShadow: status === 'speaking' ? '0 0 32px rgba(225, 29, 72, 0.35)' : 'none'
              }}>
                {status === 'connecting' ? (
                  <Loader2 size={34} className="animate-spin" style={{ color: '#fb7185' }} />
                ) : status === 'speaking' ? (
                  <Volume2 size={36} style={{ color: '#fb7185' }} />
                ) : (
                  <Mic size={34} style={{ color: isMuted ? '#ef4444' : '#f4f4f5' }} />
                )}
              </div>

              <div style={{ textAlign: 'center' }}>
                <p style={{ margin: 0, fontSize: '0.92rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                  {status === 'connecting' && 'Connexion à Sofia en cours...'}
                  {status === 'listening' && (!hasMic
                    ? 'Aucun micro détecté — Écris ta réponse ci-dessous'
                    : isMuted
                      ? 'Micro coupé (Muet)'
                      : 'Sofia t’écoute... Parle naturellement !')}
                  {status === 'speaking' && 'Sofia te répond...'}
                  {status === 'ended' && 'Séance terminée ! Bien joué 👏'}
                </p>
                <p style={{ margin: '0.25rem 0 0', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  {!hasMic
                    ? (micDebugInfo ? `Détail : ${micDebugInfo}` : 'Mode Écoute + Clavier actif (Sofia parle à voix haute)')
                    : 'Basé en direct sur ton cours • Zéro effort de lecture'}
                </p>
              </div>
            </>
          )}
        </div>

        {/* Live Transcript (compact) */}
        {transcripts.length > 0 && (
          <div style={{
            maxHeight: '165px',
            overflowY: 'auto',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.5rem',
            padding: '0.75rem',
            borderRadius: '0.9rem',
            backgroundColor: 'var(--bg-secondary)',
            border: '1px solid var(--border-color)',
            fontSize: '0.82rem',
            lineHeight: 1.45
          }}>
            {transcripts.map(item => (
              <div key={item.id} style={{
                alignSelf: item.role === 'user' ? 'flex-end' : 'flex-start',
                maxWidth: '88%',
                padding: '0.45rem 0.7rem',
                borderRadius: '0.75rem',
                backgroundColor: item.role === 'user' ? 'rgba(225, 29, 72, 0.16)' : 'var(--bg-elevated)',
                border: '1px solid var(--border-color)',
                color: 'var(--text-primary)'
              }}>
                <span style={{ fontWeight: 700, fontSize: '0.7rem', display: 'block', marginBottom: '0.1rem', color: item.role === 'user' ? '#fb7185' : 'var(--text-secondary)' }}>
                  {item.role === 'user' ? 'Toi' : 'Sofia'}
                </span>
                {item.text}
              </div>
            ))}
            <div ref={transcriptEndRef} />
          </div>
        )}

        {/* Saisie clavier (utile s'il n'y a pas de micro ou en bibliothèque) */}
        {(status === 'listening' || status === 'speaking') && (
          <form onSubmit={handleSendTextReply} style={{ display: 'flex', gap: '0.5rem' }}>
            <input
              type="text"
              value={textReply}
              onChange={e => setTextReply(e.target.value)}
              placeholder={!hasMic ? 'Écris ta réponse à Sofia...' : 'Ou écris une réponse rapide...'}
              style={{
                flex: 1,
                padding: '0.65rem 0.9rem',
                borderRadius: '0.75rem',
                border: '1px solid var(--border-color)',
                backgroundColor: 'var(--bg-secondary)',
                color: 'var(--text-primary)',
                fontSize: '0.85rem',
                outline: 'none'
              }}
            />
            <button
              type="submit"
              disabled={!textReply.trim()}
              className="btn btn-primary"
              style={{
                padding: '0.65rem 0.9rem',
                borderRadius: '0.75rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
              title="Envoyer"
            >
              <Send size={16} />
            </button>
          </form>
        )}

        {/* Controls */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem', paddingTop: '0.25rem' }}>
          {hasMic && status !== 'error' && status !== 'ended' && (
            <button
              type="button"
              onClick={toggleMute}
              className="btn btn-outline"
              style={{
                flex: 1,
                padding: '0.85rem 1rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5rem',
                borderColor: isMuted ? '#ef4444' : 'var(--border-color)',
                color: isMuted ? '#ef4444' : 'var(--text-primary)',
                backgroundColor: isMuted ? 'rgba(239, 68, 68, 0.1)' : 'transparent'
              }}
            >
              {isMuted ? <MicOff size={18} /> : <Mic size={18} />}
              <span>{isMuted ? 'Réactiver micro' : 'Couper micro'}</span>
            </button>
          )}

          <button
            type="button"
            onClick={handleHangUp}
            className="btn"
            style={{
              flex: 1,
              padding: '0.85rem 1rem',
              backgroundColor: '#ef4444',
              color: 'white',
              border: 'none',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem',
              fontWeight: 600
            }}
          >
            <PhoneOff size={18} />
            <span>{status === 'error' || status === 'ended' ? 'Fermer' : 'Raccrocher'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};

