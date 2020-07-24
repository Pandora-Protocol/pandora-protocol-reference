const index = require('./index')

console.log('BUILD-BROWSER')
index.KAD.init({});
index.init({});

window.PANDORA_PROTOCOL = index

module.exports = window.PANDORA_PROTOCOL;