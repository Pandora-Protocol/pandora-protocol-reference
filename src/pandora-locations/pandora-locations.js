const NodePandoraLocations = typeof BROWSER === "undefined" ? require('./node/node-pandora-locations') : undefined;
const BrowserPandoraLocations = typeof BROWSER !== "undefined" ? require('./browser/browser-pandora-locations') : undefined;

module.exports = NodePandoraLocations || BrowserPandoraLocations;