module.exports = {

    async splitStreamIntoChunks(stream, chunkSize, cbProgress) {

        return new Promise((resolve, reject)=>{

            const size = stream.size;
            let offset = 0, chunkIndex = 0;

            const onLoadHandler = async function(evt) {

                if ( evt.target.error )
                    return reject( evt.target.error);

                offset += (evt.target.result.length || evt.target.result.byteLength);

                const chunk = Buffer.from(evt.target.result);

                await cbProgress( {chunk, chunkIndex: chunkIndex++} );

                if (offset >= size)
                    return resolve(true);

                readBlock(offset, chunkSize, stream);
            }

            const readBlock = function(_offset, length, _stream) {
                const r = new FileReader();
                const blob = _stream.slice(_offset, length + _offset);
                r.onload = onLoadHandler;
                r.readAsArrayBuffer(blob);
            }

            readBlock(offset, chunkSize, stream);

        });

    }

}