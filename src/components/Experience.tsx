import { OrbitControls, PerspectiveCamera } from '@react-three/drei';
import * as THREE from 'three';
import { RealisticSky } from './RealisticSky';
import type { Character, SimulationLog } from '../types/Character';
import { Avatar3D } from './Avatar3D';
import { CyberRoom } from './CyberRoom';
import { HoloScreen } from './HoloScreen';
import { EffectComposer, Bloom } from '@react-three/postprocessing';
import { usePerformanceSettings } from '../hooks/usePerformanceSettings';
import { pythonAssistant, type ErrorAnalysis } from '../services/pythonAssistant';
import { speakText } from '../services/elevenlabs';

import { useVoiceInteraction } from '../hooks/useVoiceInteraction';
import { generateHologramCode } from '../services/codeGenerator';
import { useAudioAnalyzer } from '../hooks/useAudioAnalyzer';

import { useEffect, useRef, useState, useCallback } from 'react';

interface ExperienceProps {
    characters: Character[];
    logs: SimulationLog[];
    context: string;
    addLog: (type: SimulationLog['type'], characterId: string, message: string) => void;
}

export const Experience: React.FC<ExperienceProps> = ({ characters, logs: _logs, context, addLog }) => {
    const { settings } = usePerformanceSettings();
    const { state: voiceState, transcript, aiResponse, startListening } = useVoiceInteraction(context);
    const { startListening: startAudio, stopListening: stopAudio, getFrequencyData } = useAudioAnalyzer();

    // Shared Position references for AI behavior
    const atlasPositionRef = useRef(new THREE.Vector3(0, 0, 0));

    // Track previous transcript to avoid duplicate logs
    const prevTranscriptRef = useRef("");
    const [generatedCode, setGeneratedCode] = useState<string | null>(null);

    // Assistance mode state
    const [isAssistanceActive, setIsAssistanceActive] = useState(false);
    const [assistanceFeedback, setAssistanceFeedback] = useState<string>("");
    const audioRef = useRef<HTMLAudioElement | null>(null);

    // Log voice commands to simulation context so Luna can "hear" them
    useEffect(() => {
        // Allow command processing during 'thinking' or 'speaking' (fast-path triggers speaking quickly)
        const isVoiceActive = voiceState === 'thinking' || voiceState === 'speaking';

        if (isVoiceActive && transcript && transcript !== prevTranscriptRef.current) {
            addLog('dialogue', 'Atlas', `Voice Command: "${transcript}"`);
            prevTranscriptRef.current = transcript;

            // Voice Command Interception for 3D Generation
            const lowerTranscript = transcript.toLowerCase();
            if (lowerTranscript.startsWith("show") || lowerTranscript.startsWith("generate") || lowerTranscript.startsWith("create")) {
                let objectName = lowerTranscript.replace(/^(show|generate|create)\s+(me\s+)?(a\s+)?/, "").trim();

                // Phonetic / Common Mishearing Corrections
                const corrections: Record<string, string> = {
                    "the art": "earth",
                    "art": "earth",
                    "birth": "earth",
                    "girth": "earth",
                    "hurt": "heart",
                    "part": "heart",
                    "boxs": "box",
                    "spear": "sphere",
                    "tourist": "torus",
                    "taurus": "torus",
                    "corn": "cone",
                    "not": "knot"
                };

                if (corrections[objectName]) {
                    console.log(`🔧 Autocorrecting "${objectName}" -> "${corrections[objectName]}"`);
                    objectName = corrections[objectName];
                }

                console.log("🎨 Voice Command Detected: Generating 3D Object ->", objectName);

                // Trigger Gemini Code Gen
                console.log("⏳ calling generateHologramCode...");
                generateHologramCode(objectName).then(response => {
                    console.log("✅ generateHologramCode RESOLVED:", response);
                    setGeneratedCode(response.code);
                    addLog('action', 'Luna', `Initializing Holographic Protocol: ${response.description}`);
                }).catch(err => {
                    console.error("❌ generateHologramCode FAILED in Experience component:", err);
                });
            }
        }
    }, [voiceState, transcript, addLog]);

    // Toggle assistance mode
    // Callback for handling AI analysis results
    const onAnalysisResult = useCallback(async (analysis: ErrorAnalysis) => {
        // Display feedback
        const feedbackText = `${analysis.explanation} ${analysis.suggestion}`;
        setAssistanceFeedback(feedbackText);

        // Log the assistance
        addLog('action', 'Luna', `Detected ${analysis.errorType}: ${analysis.explanation}`);

        // Speak the explanation via ElevenLabs
        const voiceText = `I noticed a ${analysis.errorType}. ${analysis.explanation} ${analysis.suggestion}`;
        // Helper to play audio (reused from original logic)
        try {
            const audioBuffer = await speakText(voiceText);

            if (audioBuffer) {
                const blob = new Blob([audioBuffer], { type: 'audio/mpeg' });
                const url = URL.createObjectURL(blob);

                if (audioRef.current) {
                    audioRef.current.pause();
                }

                const audio = new Audio(url);
                audioRef.current = audio;

                audio.onended = () => {
                    URL.revokeObjectURL(url);
                    // Clear feedback after speaking (optional: keep it visible)
                    setTimeout(() => setAssistanceFeedback(""), 3000);
                };

                audio.play().catch(e => console.error("Audio playback error:", e));
            }
        } catch (err) {
            console.error("Audio generation failed:", err);
        }
    }, [addLog]);

    // Declarative Sync: Ensure pythonAssistant service matches React state
    // This fixes the issue where HMR resets the service but React keeps the state true.
    useEffect(() => {
        if (isAssistanceActive) {
            console.log("🔄 Syncing Assistant State: Enabling...");
            pythonAssistant.enable(onAnalysisResult);
        } else {
            pythonAssistant.disable();
        }

        // Cleanup on unmount
        return () => pythonAssistant.disable();
    }, [isAssistanceActive, onAnalysisResult]);

    // Toggle assistance mode (User Action)
    const toggleAssistance = useCallback(() => {
        // Helper for instant TTS feedback
        const speak = (text: string) => {
            if ('speechSynthesis' in window) {
                const utterance = new SpeechSynthesisUtterance(text);
                utterance.rate = 1.1;
                window.speechSynthesis.speak(utterance);
            }
        };

        setIsAssistanceActive(prev => {
            const newState = !prev;
            setAssistanceFeedback("");
            if (newState) {
                speak("Assistance mode activated.");
            } else {
                speak("Assistance mode deactivated.");
            }
            return newState;
        });
    }, []);

    // Handle Python errors from CyberRoom's PythonEditor
    const handlePythonError = useCallback((code: string, errorMessage: string) => {
        if (pythonAssistant.isActive()) {
            setAssistanceFeedback("🧠 Analyzing interaction...");
        }
        pythonAssistant.handleError(code, errorMessage);
    }, []);

    return (
        <>
            {/* --- SCENE BACKGROUND (Dark Navy/Black) --- */}
            <color attach="background" args={['#020208']} />

            {/* --- POST PROCESSING (Conditional based on quality) --- */}
            {settings.enableBloom && (
                <EffectComposer>
                    <Bloom
                        mipmapBlur
                        intensity={settings.bloomIntensity}
                        luminanceThreshold={0.2}
                        luminanceSmoothing={0.9}
                    />
                </EffectComposer>
            )}

            <PerspectiveCamera makeDefault position={[0, 4, 12]} fov={50} />
            <OrbitControls
                maxPolarAngle={Math.PI / 2 - 0.05}
                minDistance={0.5}
                maxDistance={20}
                target={[0, 2, 0]}
            />

            {/* --- LIGHTING (Boosted for visibility) --- */}
            <ambientLight intensity={0.5} color="#ffffff" />

            {/* Cyan Light (Left) - Reduced intensity for performance */}
            <pointLight position={[-10, 5, -5]} color="#22d3ee" intensity={settings.quality === 'low' ? 5 : 10} distance={40} decay={2} />
            {/* Magenta Light (Right) */}
            <pointLight position={[10, 5, -5]} color="#d946ef" intensity={settings.quality === 'low' ? 5 : 10} distance={40} decay={2} />


            {/* --- CYBERPUNK ROOM ENVIRONMENT --- */}
            <CyberRoom
                onPythonError={handlePythonError}
                voiceCommandCode={generatedCode}
                getFrequencyData={getFrequencyData}
            />

            {/* --- REALISTIC NIGHT SKY WITH MOON --- */}
            <RealisticSky />

            {/* --- CHARACTERS --- */}
            {characters.map(char => (
                <Avatar3D
                    key={char.id}
                    character={char}
                    worldSize={10}
                    isPlayerControlled={char.name === 'Atlas'}
                    voiceState={char.name === 'Luna' ? voiceState : undefined}
                    voiceTranscript={char.name === 'Luna' ? transcript : undefined}
                    onVoiceStart={char.name === 'Luna' ? startListening : undefined}
                    isAssistanceActive={char.name === 'Luna' ? isAssistanceActive : undefined}
                    onAssistanceToggle={char.name === 'Luna' ? toggleAssistance : undefined}
                    assistanceFeedback={char.name === 'Luna' ? assistanceFeedback : undefined}
                    aiResponse={char.name === 'Luna' ? aiResponse : undefined}
                    // Atlas tracks position, Luna follows it
                    trackPositionRef={char.name === 'Atlas' ? atlasPositionRef : undefined}
                    followTargetRef={char.name === 'Luna' ? atlasPositionRef : undefined}
                />
            ))}


            {/* --- YOUTUBE SCREEN --- */}
            <HoloScreen
                position={[0, 4, -8]}
                title="YOUTUBE PLAYER"
                color="#22d3ee"
                videoId="jfKfPfyJRdk"
                onPlay={() => {
                    console.log("▶ YouTube Started: Syncing Audio...");
                    startAudio();
                }}
                onPause={() => {
                    console.log("⏸ YouTube Paused: Stopping Sync...");
                    stopAudio();
                }}
                onEnd={() => {
                    console.log("⏹ YouTube Ended: Stopping Sync...");
                    stopAudio();
                }}
            />
        </>
    );
};

