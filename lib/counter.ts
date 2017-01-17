export interface Count {
    name: string;
    count: number;
}

export interface CountResult {
    count: Count[];
}

export interface NameSupplier {
    length(): number;
    name(index: number): string;
}

export function counter(supplier: NameSupplier): CountResult {
    let countResult: CountResult = {count: []};
    const map: { [timestamp: string]: Count } = {};

    const length = supplier.length();
    console.info("Length " + length);
    for (let i = 0; i < length; ++i) {
        const name = supplier.name(i);
        console.info("name " + name);
        if (name) {
            let count: Count = map[name];
            if (!count) {
                count = { name: name, count: 0 };
                map[name] = count;
                countResult.count.push(count);
            }
            ++count.count;
        }
    }

    return countResult;
}