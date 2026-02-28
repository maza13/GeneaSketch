import { describe, it, expect } from 'vitest';
import { MockTreeGenerator } from '../core/testing/mockGenerator';

describe('MockTreeGenerator', () => {
    it('should generate identical documents for the same seed', () => {
        const generator = new MockTreeGenerator();
        const config = {
            seed: 'stable-seed',
            depth: 3,
            avgChildren: 2,
            endogamyFactor: 0.1
        };

        const doc1 = generator.generate(config);
        const doc2 = generator.generate(config);

        expect(doc1.persons).toEqual(doc2.persons);
        expect(doc1.families).toEqual(doc2.families);
    });

    it('should generate different documents for different seeds', () => {
        const generator = new MockTreeGenerator();
        const config1 = { seed: 'seed-1', depth: 3, avgChildren: 2, endogamyFactor: 0.1 };
        const config2 = { seed: 'seed-2', depth: 3, avgChildren: 2, endogamyFactor: 0.1 };

        const doc1 = generator.generate(config1);
        const doc2 = generator.generate(config2);

        expect(doc1.persons).not.toEqual(doc2.persons);
    });

    it('should respect the requested depth', () => {
        const generator = new MockTreeGenerator();
        const depth = 4;
        const config = { seed: 'depth-test', depth, avgChildren: 2, endogamyFactor: 0 };
        const doc = generator.generate(config);

        // Max depth in mock generator is depth+1 (Father_G4 is person at depth 4)
        const personNames = Object.values(doc.persons).map(p => p.name);
        expect(personNames).toContain('Father_G4');
        expect(personNames).not.toContain('Father_G5');
    });
});
