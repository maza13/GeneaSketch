/**
 * Simple seeded random number generator (LCG)
 * for reproducible test trees.
 */
export class FastRandom {
    private seed: number;

    constructor(seed: string | number) {
        if (typeof seed === "string") {
            this.seed = this.hashString(seed);
        } else {
            this.seed = seed;
        }
    }

    private hashString(str: string): number {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            hash = (hash << 5) - hash + str.charCodeAt(i);
            hash |= 0;
        }
        return hash;
    }

    /** Returns a float between 0 and 1 */
    next(): number {
        this.seed = (this.seed * 1664525 + 1013904223) % 4294967296;
        return (this.seed >>> 0) / 4294967296;
    }

    /** Returns an integer between min and max (inclusive) */
    nextInt(min: number, max: number): number {
        return Math.floor(this.next() * (max - min + 1)) + min;
    }

    /** Picks a random element from an array */
    pick<T>(array: T[]): T {
        return array[this.nextInt(0, array.length - 1)];
    }

    /** Returns true with a given probability */
    chance(p: number): boolean {
        return this.next() < p;
    }
}
