module.exports = class InterfacePandoraLocations {

    constructor(pandoraProtocolNode, prefix = '', type) {
        this._pandoraProtocolNode = pandoraProtocolNode;
        this._prefix = this.trailingSlash(prefix);
        this._type = type;
    }

    trailingSlash(str  = ''){

        if (str.substr(-1) !== '/')         // If the last character is not a slash
            str = str + '/';            // Append a slash to it.

        return str
    }


}