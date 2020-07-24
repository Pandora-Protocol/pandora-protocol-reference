module.exports = function isSemiAbsolutePath(str) {

    if (str.indexOf('../' ) >= 0) return false;
    if (str.indexOf('./' ) >= 0) return false;
    if (/^[\^$%@!\\<>:"|\?*]$/.test(str) ) return false;

    return true;
}