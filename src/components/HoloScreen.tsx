import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Text, Html } from '@react-three/drei';
import * as THREE from 'three';

interface HoloScreenProps {
    position: [number, number, number];
    rotation?: [number, number, number];
    scale?: [number, number, number];
    title: string;
    children?: React.ReactNode;
    color?: string;
    videoUrl?: string; // YouTube embed URL
}

export const HoloScreen: React.FC<HoloScreenProps> = ({
    position,
    rotation = [0, 0, 0],
    scale = [1, 1, 1],
    title,
    children,
    color = "#00f3ff",
    videoUrl
}) => {
    const meshRef = useRef<THREE.Group>(null);
    const baseY = position[1];

    // Gentle floating animation
    useFrame((state) => {
        if (meshRef.current) {
            // Just update the y position without creating new objects
            meshRef.current.position.y = baseY + Math.sin(state.clock.elapsedTime * 0.5) * 0.05;
        }
    });

    return (
        <group ref={meshRef} position={position} rotation={rotation} scale={scale}>
            {/* Background Panel - Glass effect */}
            <mesh position={[0, 0, -0.05]}>
                <planeGeometry args={[4, 2.5]} />
                <meshPhysicalMaterial
                    color={color}
                    transparent
                    opacity={0.05}
                    metalness={0.9}
                    roughness={0.1}
                    emissive={color}
                    emissiveIntensity={0.1}
                    side={THREE.DoubleSide}
                    transmission={0.6}
                    thickness={0.5}
                />
            </mesh>

            {/* Scanline Effect (Simulated with grid or lines) */}
            <mesh position={[0, 0, -0.04]}>
                <planeGeometry args={[4, 2.5, 1, 50]} />
                <meshBasicMaterial color={color} transparent opacity={0.03} wireframe />
            </mesh>

            {/* Main Border/Frame */}
            <lineSegments>
                <edgesGeometry args={[new THREE.PlaneGeometry(4, 2.5)]} />
                <lineBasicMaterial color={color} opacity={0.8} transparent />
            </lineSegments>

            {/* Corner Brackets (Tech Feel) */}
            {[[-1.9, 1.15], [1.9, 1.15], [-1.9, -1.15], [1.9, -1.15]].map((pos, i) => (
                <group key={i} position={[pos[0], pos[1], 0.01]}>
                    <mesh>
                        <planeGeometry args={[0.3, 0.05]} />
                        <meshBasicMaterial color={color} />
                    </mesh>
                    <mesh rotation={[0, 0, Math.PI / 2]}>
                        <planeGeometry args={[0.3, 0.05]} />
                        <meshBasicMaterial color={color} />
                    </mesh>
                </group>
            ))}

            {/* Header Title */}
            <Text
                position={[-1.8, 1.35, 0.01]}
                fontSize={0.2}
                color="white"
                anchorX="left"
            >
                {title.toUpperCase()}
            </Text>

            {/* Interactive HTML Content Overlay */}
            <Html
                transform
                scale={1} // Revert scale to ensure accurate pointer events
                position={[0, 0, -0.01]}
                style={{
                    width: '396px', // 4 units * 100px - borders
                    height: '246px', // 2.5 units * 100px - borders
                    padding: '0px',
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    overflow: 'hidden',
                    pointerEvents: videoUrl ? 'auto' : 'none',
                    userSelect: 'none',
                    background: videoUrl ? '#000000' : `linear-gradient(180deg, ${color}11 0%, transparent 100%)`,
                    border: 'none',
                    zIndex: 1000, // Force clickability
                }}
                className="holo-content"
            >
                {videoUrl ? (
                    <iframe
                        width="100%"
                        height="100%"
                        src={videoUrl}
                        title={title}
                        frameBorder="0"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                        style={{ border: 'none', display: 'block' }}
                    />
                ) : (
                    <div className="w-full h-full text-xs font-mono text-cyan-50 opacity-90 overflow-hidden"
                        style={{ textShadow: `0 0 5px ${color}` }}>
                        {children}
                    </div>
                )}
            </Html>
        </group>
    );
};
