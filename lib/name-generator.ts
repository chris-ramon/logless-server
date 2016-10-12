/**
 * Created by bvizy on 10/12/16.
 */

var util = require('util');

// This is a port of the Docker 0.7.x go code that generates names from notable scientists and hackers.
// https://github.com/dotcloud/docker/blob/master/pkg/namesgenerator/names-generator.go
// docker license: Apache v 2.0 (https://github.com/dotcloud/docker/blob/master/LICENSE)

const left = ["happy", "jolly", "dreamy", "sad", "angry",
    "pensive", "focused", "sleepy", "grave", "distracted",
    "determined", "stoic", "stupefied", "sharp", "agitated",
    "cocky", "tender", "goofy", "furious", "desperate",
    "hopeful", "compassionate", "silly", "lonely", "condescending",
    "naughty", "kickass", "drunk", "boring", "nostalgic",
    "ecstatic", "insane", "cranky", "mad", "jovial",
    "sick", "hungry", "thirsty", "elegant", "backstabbing",
    "clever", "trusting", "loving", "suspicious", "berserk",
    "high", "romantic", "prickly", "evil"];

const right = ["lovelace", "franklin", "tesla", "einstein", "bohr",
    "davinci", "pasteur", "nobel", "curie", "darwin",
    "turing", "ritchie", "torvalds", "pike", "thompson",
    "wozniak", "galileo", "euclid", "newton", "fermat",
    "archimedes", "poincare", "heisenberg", "feynman", "hawking",
    "fermi", "pare", "mccarthy", "engelbart", "babbage",
    "albattani", "ptolemy", "bell", "wright", "lumiere",
    "morse", "mclean", "brown", "bardeen", "brattain",
    "shockley"];

export class NameGen {
    public static getName(checker?: (name: string) => boolean): string {
        let retry = 10;

        let name = util.format("%s_%s", NameGen.randElem(left), NameGen.randElem(right));

        while (checker && checker(name) && retry) {
            name = util.format("%s_%d", name, NameGen.randNum(100));
            retry--;
        }

        return retry ? name : null;
    };

    private static randNum(n) {
        let min = 0, max = n;
        return Math.floor(Math.random() * (max - min + 1) + min);
    }

    private static randElem(a) {
        return a[NameGen.randNum(a.length)];
    }
};
