const { delay } = require('bluebird');

(async () => {
    const x = [3000, 2000, 1000];
    for (const y of x) {
        console.log('Doing delay', y);
        await delay(y);
        console.log('Done delay', y);
    }
})();
