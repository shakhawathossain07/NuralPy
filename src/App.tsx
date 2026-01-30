import { Canvas } from '@react-three/fiber';
import { Suspense } from 'react';
import { useSimulation } from './hooks/useSimulation';
import { usePerformanceSettingsProvider, PerformanceContext } from './hooks/usePerformanceSettings';
import { Experience } from './components/Experience';
import './App.css';

import { ErrorBoundary } from './components/ErrorBoundary';

function AppContent() {
  const {
    characters,
    logs,
    context,
    addLog
  } = useSimulation();

  const { settings, cycleQuality } = usePerformanceSettingsProvider();

  return (
    <PerformanceContext.Provider value={{ settings, setQuality: () => { }, cycleQuality }}>
      <div className="fixed inset-0 w-full h-full bg-[#050510] overflow-hidden">
        <ErrorBoundary>
          <Canvas
            shadows={settings.enableShadows}
            dpr={[1, settings.dpr]}
            gl={{
              antialias: settings.quality !== 'low',
              powerPreference: 'high-performance',
              stencil: false,
              depth: true,
            }}
            style={{ width: '100%', height: '100%', background: '#111' }}
          >
            <Suspense fallback={null}>
              <Experience characters={characters} logs={logs} context={context} addLog={addLog} />
            </Suspense>
          </Canvas>


          {/* Quality Toggle Button */}
          <div className="absolute bottom-10 right-6 pointer-events-auto">
            <button
              onClick={cycleQuality}
              className="px-4 py-2 rounded-lg font-mono text-xs border backdrop-blur-md transition-all bg-purple-500/20 border-purple-500 text-purple-300 hover:bg-purple-500/40"
              title="Click to cycle quality settings"
            >
              Quality: {settings.quality.toUpperCase()}
            </button>
          </div>

          {/* Header Overlay - NeuralPy Simulator */}
          <div className="absolute top-6 left-6 pointer-events-none">
            {/* Decorative Glow Background */}
            <div
              className="absolute -inset-4 rounded-2xl opacity-30 blur-xl"
              style={{
                background: 'linear-gradient(135deg, #06b6d4 0%, #8b5cf6 50%, #ec4899 100%)',
              }}
            />

            {/* Main Title */}
            <h1
              className="relative text-3xl font-black tracking-tight"
              style={{
                fontFamily: '"Orbitron", "Rajdhani", sans-serif',
                background: 'linear-gradient(90deg, #22d3ee 0%, #a78bfa 40%, #f472b6 70%, #22d3ee 100%)',
                backgroundSize: '200% 100%',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                animation: 'shimmer 3s linear infinite',
                textShadow: '0 0 30px rgba(167, 139, 250, 0.5)',
                letterSpacing: '0.05em',
              }}
            >
              <span style={{ fontWeight: 900 }}>Neural</span>
              <span style={{ color: '#f472b6', fontWeight: 300, fontStyle: 'italic' }}>Py</span>
              <span style={{ fontWeight: 400, marginLeft: '8px', opacity: 0.9 }}>Simulator</span>
            </h1>

            {/* Subtitle with Pulse Effect */}
            <div className="flex items-center gap-2 mt-1">
              <div
                className="w-2 h-2 rounded-full bg-emerald-400"
                style={{
                  boxShadow: '0 0 8px #34d399, 0 0 16px #34d399',
                  animation: 'pulse 2s ease-in-out infinite',
                }}
              />
              <span
                className="text-[11px] tracking-[0.4em] uppercase"
                style={{
                  background: 'linear-gradient(90deg, #6ee7b7, #22d3ee)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  fontFamily: '"JetBrains Mono", monospace',
                }}
              >
                System Active
              </span>
              <div className="flex gap-1 ml-2">
                {[0, 1, 2].map(i => (
                  <div
                    key={i}
                    className="w-1 h-3 rounded-full bg-cyan-400/60"
                    style={{
                      animation: `equalizer 0.8s ${i * 0.2}s ease-in-out infinite`,
                    }}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* Add keyframe animations via style tag */}
          <style>{`
            @keyframes shimmer {
              0% { background-position: 200% 0; }
              100% { background-position: -200% 0; }
            }
            @keyframes pulse {
              0%, 100% { opacity: 1; transform: scale(1); }
              50% { opacity: 0.5; transform: scale(0.8); }
            }
            @keyframes equalizer {
              0%, 100% { height: 6px; opacity: 0.4; }
              50% { height: 14px; opacity: 1; }
            }
            @import url('https://fonts.googleapis.com/css2?family=Orbitron:wght@400;700;900&family=JetBrains+Mono:wght@400&display=swap');
          `}</style>
        </ErrorBoundary>
      </div>
    </PerformanceContext.Provider>
  );
}

function App() {
  return <AppContent />;
}

export default App;
