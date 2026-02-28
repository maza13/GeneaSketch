import React, { useState } from 'react';
import { useAppStore } from '@/state/store';

import { MockTreeGenerator, GeneratorConfig } from '@/core/testing/mockGenerator';

export const MockToolsPanel: React.FC = () => {
    const { setDocument } = useAppStore();

    const [config, setConfig] = useState<GeneratorConfig>({
        seed: 'test-seed-' + Math.floor(Math.random() * 1000),
        depth: 4,
        avgChildren: 2,
        endogamyFactor: 0.1
    });

    const handleGenerate = () => {
        const generator = new MockTreeGenerator();
        const doc = generator.generate(config);
        setDocument(doc);
    };

    return (
        <div style={{ padding: '15px', border: '1px solid #ccc', borderRadius: '8px', background: '#f9f9f9', color: '#333' }}>
            <h3 style={{ margin: '0 0 15px 0' }}>🧪 Mock Tree Generator</h3>

            <div style={{ marginBottom: '10px' }}>
                <label style={{ display: 'block', fontSize: '0.8em' }}>Seed</label>
                <input
                    type="text"
                    value={config.seed}
                    onChange={e => setConfig({ ...config, seed: e.target.value })}
                    style={{ width: '100%', padding: '4px' }}
                />
            </div>

            <div style={{ marginBottom: '10px', display: 'flex', gap: '10px' }}>
                <div style={{ flex: 1 }}>
                    <label style={{ display: 'block', fontSize: '0.8em' }}>Depth</label>
                    <input
                        type="number"
                        value={config.depth}
                        onChange={e => setConfig({ ...config, depth: parseInt(e.target.value) || 0 })}
                        style={{ width: '100%', padding: '4px' }}
                    />
                </div>
                <div style={{ flex: 1 }}>
                    <label style={{ display: 'block', fontSize: '0.8em' }}>Avg Children</label>
                    <input
                        type="number"
                        value={config.avgChildren}
                        onChange={e => setConfig({ ...config, avgChildren: parseInt(e.target.value) || 0 })}
                        style={{ width: '100%', padding: '4px' }}
                    />
                </div>
            </div>

            <div style={{ marginBottom: '15px' }}>
                <label style={{ display: 'block', fontSize: '0.8em' }}>Endogamy Factor ({config.endogamyFactor})</label>
                <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.05"
                    value={config.endogamyFactor}
                    onChange={e => setConfig({ ...config, endogamyFactor: parseFloat(e.target.value) })}
                    style={{ width: '100%' }}
                />
            </div>

            <button
                onClick={handleGenerate}
                style={{
                    width: '100%',
                    padding: '8px',
                    background: '#4CAF50',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer'
                }}
            >
                Generate & Load Tree
            </button>
        </div>
    );
};
