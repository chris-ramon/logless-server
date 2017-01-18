import * as Chai from "chai";

import * as Counter from "../../lib/counter";

const expect = Chai.expect;

const NUM = 10;

describe("Counter", function () {

    let items: string[];

    before(function () {
        items = [];
        // This will provide a series of items where they are "ItemN" where the number of items will be "N * NUM + 1"
        for (let i = 0; i < NUM; i++) {
            const maxJ = i * NUM + 1;
            for (let j = 0; j < maxJ; j++) {
                items.push("Item" + i);
            }
        }
    });

    it("Tests the count result is produced.", function () {

        console.log("itemslength = " + items.length);
        console.time("Counter");
        const counterResult: Counter.CountResult = Counter.counter({
            length() {
                return items.length;
            },
            name(index: number) {
                return items[index];
            }
        });
        console.timeEnd("Counter");

        expect(counterResult).to.exist;
        expect(counterResult.count).to.have.length(NUM);

        for (let i = 0; i < counterResult.count.length; ++i) {
            expect(counterResult.count[i].name).to.equal("Item" + i);
            expect(counterResult.count[i].count).to.equal(i * NUM + 1);
        }
    });

    it("Tests the count result is produced when undefineds are mixed in.", function () {

        console.log("itemslength = " + items.length);
        console.time("Counter");
        const counterResult: Counter.CountResult = Counter.counter({
            length() {
                return items.length;
            },
            name(index: number) {
                return (index % 2 === 0) ? undefined : items[index];
            }
        });
        console.timeEnd("Counter");

        expect(counterResult).to.exist;
        expect(counterResult.count).to.have.length(NUM - 1); // The first one will not be used as it's only even.

        let j = 0;
        const halfNum = Math.floor(NUM / 2);
        for (let i = 0; i < counterResult.count.length; ++i) {
            ++j;
            expect(counterResult.count[i].name).to.equal("Item" + j);
            const expectedCount = (i % 2 === 0) ? j * halfNum + 1 : j * halfNum; // Even numbers will have one extra value than their counterparts. The extra in odd numbers is lopped off.
            expect(counterResult.count[i].count).to.equal(expectedCount);
        }
    });
});