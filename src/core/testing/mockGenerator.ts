import type { GeneaDocument, Person, Family } from "@/types/domain";

export interface GeneratorConfig {
    seed: string | number;
    depth: number;
    avgChildren: number;
    endogamyFactor: number; // 0 to 1, probability of a "loop" (consanguinity)
}

/**
 * A simple seedable LCG (Linear Congruential Generator) to avoid external dependencies.
 */
class Random {
    private seed: number;
    constructor(seed: string | number) {
        if (typeof seed === "string") {
            let hash = 0;
            for (let i = 0; i < seed.length; i++) {
                hash = (hash << 5) - hash + seed.charCodeAt(i);
                hash |= 0;
            }
            this.seed = Math.abs(hash);
        } else {
            this.seed = Math.abs(seed);
        }
    }

    next(): number {
        this.seed = (this.seed * 1664525 + 1013904223) % 4294967296;
        return this.seed / 4294967296;
    }

    between(min: number, max: number): number {
        return Math.floor(this.next() * (max - min + 1)) + min;
    }

    pickOne<T>(arr: T[]): T {
        return arr[Math.floor(this.next() * arr.length)];
    }

    boolean(probability: number = 0.5): boolean {
        return this.next() < probability;
    }
}

export class MockTreeGenerator {
    private doc: GeneaDocument;
    private rng: Random;
    private personCounter = 0;
    private familyCounter = 0;

    constructor() {
        this.doc = this.createEmptyDoc();
        this.rng = new Random(Date.now());
    }

    private createEmptyDoc(): GeneaDocument {
        return {
            persons: {},
            families: {},
            media: {},
            metadata: {
                sourceFormat: "GSK",
                gedVersion: "7.0.x",
                importProvenance: []
            }
        };
    }

    private createPerson(sex: "M" | "F", name: string, surname: string): Person {
        const id = `P${++this.personCounter}`;
        const person: Person = {
            id,
            name,
            surname,
            sex,
            lifeStatus: this.rng.boolean(0.8) ? "alive" : "deceased",
            events: [],
            famc: [],
            fams: [],
            mediaRefs: [],
            sourceRefs: []
        };
        this.doc.persons[id] = person;
        return person;
    }

    private createFamily(husbandId?: string, wifeId?: string): Family {
        const id = `F${++this.familyCounter}`;
        const family: Family = {
            id,
            husbandId,
            wifeId,
            childrenIds: [],
            events: []
        };
        this.doc.families[id] = family;
        if (husbandId) this.doc.persons[husbandId].fams.push(id);
        if (wifeId) this.doc.persons[wifeId].fams.push(id);
        return family;
    }

    private generationPool: Map<number, Set<string>> = new Map();

    private addToPool(gen: number, id: string) {
        if (!this.generationPool.has(gen)) {
            this.generationPool.set(gen, new Set());
        }
        this.generationPool.get(gen)!.add(id);
    }

    public generate(config: GeneratorConfig): GeneaDocument {
        this.rng = new Random(config.seed);
        this.doc = this.createEmptyDoc();
        this.personCounter = 0;
        this.familyCounter = 0;
        this.generationPool = new Map();

        // Base person (Proband)
        const proband = this.createPerson(
            this.rng.pickOne(["M", "F"]),
            "Proband",
            "Seed_" + config.seed
        );

        this.generateAncestors(proband, 0, config.depth, config);

        return this.doc;
    }

    private generateAncestors(child: Person, currentDepth: number, maxDepth: number, config: GeneratorConfig) {
        if (currentDepth >= maxDepth) return;

        let father: Person | undefined;
        let mother: Person | undefined;

        const genLevel = currentDepth + 1;

        // Attempt to find existing candidates for endogamy
        const pool = this.generationPool.get(genLevel);
        const canUseEndogamy = pool && pool.size >= 2 && this.rng.boolean(config.endogamyFactor);

        if (canUseEndogamy) {
            const candidates = Array.from(pool!);
            const fatherId = this.rng.pickOne(candidates.filter(id => this.doc.persons[id].sex === "M"));
            const motherId = this.rng.pickOne(candidates.filter(id => this.doc.persons[id].sex === "F"));

            if (fatherId) father = this.doc.persons[fatherId];
            if (motherId) mother = this.doc.persons[motherId];
        }

        const surname = child.surname || "Unknown";
        if (!father) {
            father = this.createPerson("M", `Father_G${genLevel}`, surname);
            this.addToPool(genLevel, father.id);
        }
        if (!mother) {
            mother = this.createPerson("F", `Mother_G${genLevel}`, `Maternal_${genLevel}`);
            this.addToPool(genLevel, mother.id);
        }

        const fam = this.createFamily(father.id, mother.id);
        fam.childrenIds.push(child.id);
        child.famc.push(fam.id);

        // Random siblings for the child
        const siblingCount = this.rng.between(0, config.avgChildren);
        for (let i = 0; i < siblingCount; i++) {
            const sibling = this.createPerson(
                this.rng.pickOne(["M", "F"]),
                `Sibling_${i}_G${currentDepth}`,
                surname
            );
            fam.childrenIds.push(sibling.id);
            sibling.famc.push(fam.id);
        }

        // Recurse upwards
        this.generateAncestors(father, genLevel, maxDepth, config);
        this.generateAncestors(mother, genLevel, maxDepth, config);
    }
}

