import { createNewTree, createPerson, addRelation, linkExistingRelation } from "../edit/commands";
import type { GeneaDocument } from "@/types/domain";
import { FastRandom } from "./random";

export type GeneratorScenario =
    | "standard"
    | "cousin_marriage"
    | "pedigree_collapse"
    | "endogamy";

export interface GeneratorOptions {
    seed: string | number;
    generations?: number;
    width?: number; // children per family
}

const MALE_NAMES = ["Juan", "Pedro", "Luis", "Carlos", "José", "Miguel", "Antonio", "Francisco", "Javier", "Manuel"];
const FEMALE_NAMES = ["María", "Ana", "Lucía", "Elena", "Carmen", "Isabel", "Marta", "Paula", "Laura", "Sofía"];
const SURNAMES = ["García", "Martínez", "López", "Mendoza", "Rodríguez", "Sánchez", "Pérez", "Gómez", "Torres", "Hernández"];

export class TreeGenerator {
    private rng: FastRandom;
    private doc: GeneaDocument;

    constructor(options: GeneratorOptions) {
        this.rng = new FastRandom(options.seed);
        this.doc = createNewTree();
    }

    private randomName(sex: "M" | "F" | "U"): string {
        if (sex === "M") return this.rng.pick(MALE_NAMES);
        if (sex === "F") return this.rng.pick(FEMALE_NAMES);
        return this.rng.pick([...MALE_NAMES, ...FEMALE_NAMES]);
    }

    private randomSurname(): string {
        return this.rng.pick(SURNAMES);
    }

    private randomPerson(sex?: "M" | "F" | "U", surname?: string): { name: string; surname: string; sex: "M" | "F" | "U" } {
        const s = sex ?? (this.rng.chance(0.5) ? "M" : "F");
        return {
            name: this.randomName(s),
            surname: surname ?? this.randomSurname(),
            sex: s
        };
    }

    /**
     * Generates a standard balanced tree
     */
    generateStandard(generations: number, childrenPerFamily: number = 2): GeneaDocument {
        // Note: childrenPerFamily is reserved for future expansion where we add siblings
        // For now, it generates 1 child per couple to maintain the tree structure.
        console.log(`Generating standard tree with depth ${generations} and ${childrenPerFamily} children per family target.`);
        // Start with a root person
        const rootInfo = this.randomPerson();
        const { next, personId: rootId } = createPerson(this.doc, {
            name: rootInfo.name,
            surname: rootInfo.surname,
            sex: rootInfo.sex
        });
        this.doc = next;

        this.addAncestors(rootId, generations - 1);

        return this.doc;
    }

    private addAncestors(personId: string, depth: number) {
        if (depth <= 0) return;

        const person = this.doc.persons[personId];

        // Add Father
        const fatherInfo = this.randomPerson("M", person.surname);
        const { next: nextF, personId: fatherId } = addRelation(this.doc, personId, "father", {
            name: fatherInfo.name,
            surname: fatherInfo.surname,
            sex: "M"
        });
        this.doc = nextF;

        // Add Mother
        const motherInfo = this.randomPerson("F", this.randomSurname());
        const { next: nextM, personId: motherId } = addRelation(this.doc, personId, "mother", {
            name: motherInfo.name,
            surname: motherInfo.surname,
            sex: "F"
        });
        this.doc = nextM;

        this.addAncestors(fatherId, depth - 1);
        this.addAncestors(motherId, depth - 1);
    }

    /**
     * Generates a scenario where two siblings' grandchildren marry (second cousins)
     */
    generateCousinMarriage(): GeneaDocument {
        // 1. Ancestor couple (G2)
        const gfInfo = this.randomPerson("M");
        const { next: n1, personId: gfId } = createPerson(this.doc, gfInfo);
        this.doc = n1;
        const gmInfo = this.randomPerson("F");
        const { next: n2, personId: gmId } = createPerson(this.doc, gmInfo);
        this.doc = n2;

        // 2. Two children (G1 siblings)
        const s1Info = this.randomPerson("M", gfInfo.surname);
        const { next: n3, personId: s1Id } = addRelation(this.doc, gfId, "child", s1Info);
        this.doc = linkExistingRelation(n3, s1Id, gmId, "mother");

        const s2Info = this.randomPerson("F", gfInfo.surname);
        const { next: n4, personId: s2Id } = addRelation(this.doc, gfId, "child", s2Info);
        this.doc = linkExistingRelation(n4, s2Id, gmId, "mother");

        // 3. Grandchildren (G0 cousins)
        const p1Info = this.randomPerson("M", s1Info.surname);
        const { next: n5, personId: p1Id } = addRelation(this.doc, s1Id, "child", p1Info);
        this.doc = n5;

        const p2Info = this.randomPerson("F", s2Info.surname);
        const { next: n6, personId: p2Id } = addRelation(this.doc, s2Id, "child", p2Info);
        this.doc = n6;

        // 4. Cousins marry and have a child
        const childInfo = this.randomPerson();
        const { next: n7, personId: childId } = addRelation(this.doc, p1Id, "child", childInfo);
        this.doc = linkExistingRelation(n7, childId, p2Id, "mother");

        return this.doc;
    }

    /**
     * Generates a "Pedigree Collapse" scenario where one ancestor is shared by multiple branches
     */
    generatePedigreeCollapse(): GeneaDocument {
        // Root child
        const rootInfo = this.randomPerson();
        const { next: n1, personId: rootId } = createPerson(this.doc, rootInfo);
        this.doc = n1;

        // Parents
        const fatherInfo = this.randomPerson("M", rootInfo.surname);
        const { next: n2, personId: fatherId } = addRelation(this.doc, rootId, "father", fatherInfo);
        this.doc = n2;

        const motherInfo = this.randomPerson("F");
        const { next: n3, personId: motherId } = addRelation(this.doc, rootId, "mother", motherInfo);
        this.doc = n3;

        // Common Ancestor (Great-Grandfather)
        const commonGgfInfo = this.randomPerson("M", "Shared");
        const { next: n4, personId: commonGgfId } = createPerson(this.doc, commonGgfInfo);
        this.doc = n4;

        // Father's Branch
        const gf1Info = this.randomPerson("M", fatherInfo.surname);
        const { next: n5, personId: gf1Id } = addRelation(this.doc, fatherId, "father", gf1Info);
        this.doc = linkExistingRelation(n5, gf1Id, commonGgfId, "father");

        // Mother's Branch
        const gf2Info = this.randomPerson("M", motherInfo.surname);
        const { next: n6, personId: gf2Id } = addRelation(this.doc, motherId, "father", gf2Info);
        this.doc = linkExistingRelation(n6, gf2Id, commonGgfId, "father");

        return this.doc;
    }

    /**
     * Generates a scenario with a small population where everyone eventually relates (Endogamy)
     */
    generateEndogamy(populationSize: number = 10, generations: number = 4): GeneaDocument {
        const population: string[] = [];

        // 1. Create initial population
        for (let i = 0; i < populationSize; i++) {
            const info = this.randomPerson();
            const { next, personId } = createPerson(this.doc, info);
            this.doc = next;
            population.push(personId);
        }

        // 2. Over several generations, form couples and have children within the population
        let currentGen = population;
        for (let g = 0; g < generations; g++) {
            const nextGen: string[] = [];
            const males = currentGen.filter(id => this.doc.persons[id].sex === "M");
            const females = currentGen.filter(id => this.doc.persons[id].sex === "F");

            const numCouples = Math.min(males.length, females.length, 5);
            for (let c = 0; c < numCouples; c++) {
                const husbandId = males[c];
                const wifeId = females[c];

                // Have 2-3 children
                const numChildren = this.rng.nextInt(2, 3);
                for (let i = 0; i < numChildren; i++) {
                    const childInfo = this.randomPerson(undefined, this.doc.persons[husbandId].surname);
                    const { next, personId: childId } = addRelation(this.doc, husbandId, "child", childInfo);
                    this.doc = linkExistingRelation(next, childId, wifeId, "mother");
                    nextGen.push(childId);
                }
            }
            if (nextGen.length < 2) break;
            currentGen = nextGen;
        }

        return this.doc;
    }

    // More scenario methods will be added here...
}
