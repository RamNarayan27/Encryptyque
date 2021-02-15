const fs = require('fs');
quotesFile = JSON.parse(fs.readFileSync('quotes.json'));
keylist = []
Object.keys(quotesFile).forEach(function(key) {
    keylist.push(key);
});

randint = Math.floor(Math.random() * 21);
author = keylist[randint];
quote = quotesFile[author];
finalString = `${quote} ~ ${author}`;
console.log(finalString);

