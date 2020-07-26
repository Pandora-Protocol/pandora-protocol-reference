module.exports = {

    splitStreamIntoChunks(stream, chunkSize, cb) {

        const size = stream.size;
        let offset = 0, chunkIndex = 0;

        const onLoadHandler = function(evt) {

            if ( !evt.target.error ) {

                offset += (evt.target.result.length || evt.target.result.byteLength);

                const chunk = evt.target.result;

                cb(null, {done: false, chunk, chunkIndex: chunkIndex++})

            } else
                return cb(evt.target.error)

            if (offset >= size){
                return cb(null, {done: true })
            }

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