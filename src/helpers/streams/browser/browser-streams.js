const {createHash} = require('crypto');

module.exports = {

    computeStreamHashAndChunks(stream, chunkSize, cb) {

        const sum = createHash('sha256');
        const chunks = [];

        const size   = stream.size;
        let offset     = 0;

        const onLoadHandler = function(evt) {

            if ( !evt.target.error ) {

                offset += (evt.target.result.length || evt.target.result.byteLength);

                const buffer = evt.target.result;

                sum.update(buffer);

                const hashChunk = createHash('sha256').update(buffer).digest();
                chunks.push(hashChunk);

            } else
                return cb(evt.target.error)

            if (offset >= size)
                return cb(null, {
                    hash: sum.digest(),
                    chunks,
                } )

            readBlock(offset, chunkSize, stream);
        }

        const readBlock = function(_offset, length, _stream) {
            const r = new FileReader();
            const blob = _stream.slice(_offset, length + _offset);
            r.onload = onLoadHandler;
            r.readAsArrayBuffer(blob);
        }

        readBlock(offset, chunkSize, stream);
    }

}