const PandoraStreamType = require('../pandora-box/stream/pandora-box-stream-type')
const PandoraBoxStream = require('../pandora-box/stream/pandora-box-stream')
const PandoraBoxStreamStatus = require('../pandora-box/stream/pandora-box-stream-status')

module.exports = class InterfacePandoraLocations {

    constructor(pandoraProtocolNode, prefix = '', type) {
        this._pandoraProtocolNode = pandoraProtocolNode;
        this._prefix = this.trailingSlash(prefix);
        this._type = type;
    }

    /**
     * Returns the name of the location. Example
     *  /home/user/stream1.data => stream1
     * @param path
     * @returns {string}
     */
    extractLocationName(path, includeExtension = false ){

        let base = path.substring( path.lastIndexOf('/') + 1);

        if (!includeExtension && base.lastIndexOf(".") !== -1)
            base = base.substring(0, base.lastIndexOf("."));

        return base;
    }

    /**
     * Returns the base of a location. Example
     *  /home/user/stream1.data => /home/user
     *  /home/user/ => /home
     * @param path
     * @returns {string}
     */
    extractLocationBase(path){

        //in case of "data1/data2/data3/"
        if (path.substr(-1) === '/')
            path = path.substr(0, path.length-1 );

        let base = path.substring( 0, path.lastIndexOf('/') + 1);
        if (base.substr(-1) === '/')
            base = base.substr(0, base.length-1 );
        return base;
    }

    trailingSlash(str  = ''){

        if (str.substr(-1) !== '/')         // If the last character is not a slash
            str = str + '/';            // Append a slash to it.

        return str
    }

    startWithSlash(str = ''){
        return (str[0] !== '/' ? '/' : '') + str;
    }

    _explodeStreamPath(streams, path){

        //deconstruct relative path
        const dirStreams = [];

        while (path !== '/'){

            const directory = this.startWithSlash( this.extractLocationBase(path) );

            //let's check if directory exists
            let found;
            for (let i = streams.length-1; i >= 0; i--)
                if (streams[i].type === PandoraStreamType.PANDORA_LOCATION_TYPE_DIRECTORY && streams[i].path === directory ){
                    found = true;
                    break;
                }
            if (!found){

                const pandoraStream = new PandoraBoxStream( this,
                    directory,
                    PandoraStreamType.PANDORA_LOCATION_TYPE_DIRECTORY,
                    0,
                    0,
                    Buffer.alloc(0),
                    [],
                    [],
                    PandoraBoxStreamStatus.STREAM_STATUS_FINALIZED,
                );

                dirStreams.push( pandoraStream );

            }
            path = directory;
        }

        for (let i=dirStreams.length-1; i >= 0; i--)
            streams.push(dirStreams[i]);

    }

}