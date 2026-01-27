import * as THREE from 'three';
import { Grid, Html } from '@react-three/drei';
import { useMemo, lazy, Suspense, useState } from 'react';
import { usePerformanceSettings } from '../hooks/usePerformanceSettings';

import { HoloProjector } from './HoloProjector';

// Lazy load PythonEditor for better initial load performance
const PythonEditor = lazy(() => import('./PythonEditor').then(m => ({ default: m.PythonEditor })));

interface CyberRoomProps {
    onPythonError?: (code: string, errorMessage: string) => void;
    voiceCommandCode?: string | null;
}

export const CyberRoom: React.FC<CyberRoomProps> = ({ onPythonError, voiceCommandCode }) => {
    const { settings } = usePerformanceSettings();
    const [hologramData, setHologramData] = useState<any>(null);

    // Procedural tile texture with configurable size
    const tileTexture = useMemo(() => {
        const size = settings.tileTextureSize;
        const canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d')!;

        const tileCount = size === 512 ? 8 : 4;
        const tileSize = size / tileCount;
        const groutWidth = size === 512 ? 4 : 2;

        // Grout color (dark)
        ctx.fillStyle = '#1a1a2e';
        ctx.fillRect(0, 0, size, size);

        // Draw tiles
        for (let x = 0; x < tileCount; x++) {
            for (let y = 0; y < tileCount; y++) {
                // Vary tile colors slightly
                const baseColor = (x + y) % 2 === 0 ? '#2d3748' : '#1f2937';

                ctx.fillStyle = baseColor;
                ctx.fillRect(
                    x * tileSize + groutWidth / 2,
                    y * tileSize + groutWidth / 2,
                    tileSize - groutWidth,
                    tileSize - groutWidth
                );

                // Add subtle highlight to some tiles (only on high quality)
                if (settings.quality === 'high' && Math.random() > 0.7) {
                    ctx.fillStyle = 'rgba(100, 150, 200, 0.05)';
                    ctx.fillRect(
                        x * tileSize + groutWidth / 2,
                        y * tileSize + groutWidth / 2,
                        tileSize - groutWidth,
                        tileSize - groutWidth
                    );
                }
            }
        }

        const texture = new THREE.CanvasTexture(canvas);
        texture.wrapS = THREE.RepeatWrapping;
        texture.wrapT = THREE.RepeatWrapping;
        texture.repeat.set(8, 8);

        return texture;
    }, [settings.tileTextureSize, settings.quality]);

    // Reduced server lights count based on quality
    const serverLightCount = settings.quality === 'low' ? 4 : settings.quality === 'medium' ? 7 : 10;

    // Geometry detail for cylinders
    const cylinderSegments = settings.geometryDetail;

    return (
        <group>
            {/* --- REALISTIC TILED FLOOR --- */}
            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]}>
                <planeGeometry args={[50, 50]} />
                <meshStandardMaterial
                    map={tileTexture}
                    roughness={0.6}
                    metalness={0.2}
                />
            </mesh>

            {/* --- FLOOR REFLECTION LAYER (Only on medium/high) --- */}
            {settings.quality !== 'low' && (
                <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.005, 0]}>
                    <planeGeometry args={[50, 50]} />
                    {settings.enableTransmission ? (
                        <meshPhysicalMaterial
                            color="#1a1a2e"
                            transparent
                            opacity={0.3}
                            roughness={0.1}
                            metalness={0.8}
                            clearcoat={0.5}
                        />
                    ) : (
                        <meshStandardMaterial
                            color="#1a1a2e"
                            transparent
                            opacity={0.2}
                            roughness={0.2}
                            metalness={0.6}
                        />
                    )}
                </mesh>
            )}

            {/* --- NEON GRID --- */}
            <Grid
                position={[0, 0.01, 0]}
                args={[50, 50]}
                cellColor="#22d3ee"
                sectionColor="#0891b2"
                sectionThickness={1}
                cellThickness={0.5}
                fadeDistance={settings.quality === 'low' ? 15 : 25}
                infiniteGrid={settings.quality !== 'low'}
            />

            {/* --- GLASS WALL PANELS --- */}
            {[-15, -10, 10, 15].map((x, i) => (
                <group key={i} position={[x, 5, -10]}>
                    <mesh position={[0, 0, 0]}>
                        <boxGeometry args={[4, 10, 0.2]} />
                        {settings.enableTransmission ? (
                            <meshPhysicalMaterial
                                color={i % 2 === 0 ? "#22d3ee" : "#d946ef"}
                                transparent
                                opacity={0.1}
                                roughness={0.1}
                                metalness={0.9}
                                transmission={0.5}
                                thickness={0.5}
                            />
                        ) : (
                            <meshStandardMaterial
                                color={i % 2 === 0 ? "#22d3ee" : "#d946ef"}
                                transparent
                                opacity={0.15}
                                roughness={0.2}
                                metalness={0.7}
                            />
                        )}
                    </mesh>
                    {/* Frame */}
                    <mesh position={[0, 0, 0]}>
                        <boxGeometry args={[4.1, 10.1, 0.1]} />
                        <meshBasicMaterial color={i % 2 === 0 ? "#22d3ee" : "#d946ef"} wireframe transparent opacity={0.3} />
                    </mesh>
                </group>
            ))}

            {/* --- SERVER COLUMNS --- */}
            {[-20, 20].map((x, i) => (
                <group key={i} position={[x, 5, -5]}>
                    <mesh>
                        <boxGeometry args={[2, 12, 2]} />
                        <meshStandardMaterial color="#0a0a12" roughness={0.3} metalness={0.8} />
                    </mesh>
                    {/* Data Lights - reduced count on lower quality */}
                    {Array.from({ length: serverLightCount }).map((_, j) => (
                        <mesh key={j} position={[0, -4 + j * (10 / serverLightCount), 1.01]}>
                            <planeGeometry args={[1.5, 0.1]} />
                            <meshBasicMaterial color={j % 2 === 0 ? "#22d3ee" : "#d946ef"} toneMapped={false} />
                        </mesh>
                    ))}
                </group>
            ))}


            {/* --- CURVED HOLOGRAPHIC SCREENS --- */}
            {/* Left Screen - Python Editor (Lazy loaded) */}
            <group position={[-14, 4, -4]} rotation={[0, 0.6, 0]}>
                <Suspense fallback={null}>
                    <Html transform occlude position={[0, 0, 0]} rotation={[0, 0, 0]} scale={0.5} style={{ width: '600px', height: '400px' }}>
                        <PythonEditor
                            onError={onPythonError}
                            onShapeGenerated={setHologramData}
                            externalCode={voiceCommandCode || undefined}
                        />
                    </Html>
                </Suspense>
            </group>

            {/* Right Screen - Nural Graphics Hologram */}
            <HoloProjector
                position={[14, 4, -4]}
                rotation={[0, -0.6, 0]}
                shapeData={hologramData}
            />

            {/* --- CEILING STRUCTURE (Neon Pipes) --- */}
            {[-6, -2, 2, 6].map((x, i) => (
                <group key={i} position={[x, 10, 0]}>
                    <mesh rotation={[Math.PI / 2, 0, 0]}>
                        <cylinderGeometry args={[0.2, 0.2, 50, Math.max(6, Math.floor(cylinderSegments / 4))]} />
                        <meshStandardMaterial color="#333" roughness={0.5} metalness={0.9} />
                    </mesh>
                    {/* Neon Strip on pipe */}
                    <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, -0.21, 0]}>
                        <planeGeometry args={[0.1, 50]} />
                        <meshBasicMaterial color={i % 2 === 0 ? "#22d3ee" : "#d946ef"} toneMapped={false} side={THREE.DoubleSide} />
                    </mesh>
                </group>
            ))}
        </group>
    );
};
