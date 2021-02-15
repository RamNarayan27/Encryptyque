const cred = require('data-store')({ path: process.cwd() + '\\quotes.json' });

cred.set('author','quote')