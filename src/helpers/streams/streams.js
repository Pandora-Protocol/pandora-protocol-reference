const BrowserStreams = typeof window !== "undefined" ? require('./browser/browser-streams') : undefined;
const NodeStreams = typeof window === "undefined" ? require('./node/node-streams') : undefined;

module.exports =  BrowserStreams || NodeStreams