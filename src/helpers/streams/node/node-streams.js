module.exports = {

    /**
     * The stream has to return chunks of size chunkSize in order to boost the performance
     * @param stream
     * @param chunkSize
     * @param cb
     */
    splitStreamIntoChunks( stream,  chunkSize, cbProgress){

        return new Promise((resolve, reject)=>{

            let buffer = Buffer.alloc(chunkSize);
            let bufferPosition = 0, chunkIndex = 0;

            stream.on('data', (chunk)=>{
                try {

                    let readAlready = 0;
                    while (readAlready < chunk.length){

                        const diff = Math.min( chunkSize, Math.min( chunk.length - readAlready, chunkSize - bufferPosition ) );
                        chunk.copy(buffer, bufferPosition, readAlready, readAlready + diff );
                        bufferPosition += diff;
                        readAlready += diff;

                        if (bufferPosition === chunkSize){
                            cbProgress( { chunk: buffer, chunkIndex: chunkIndex++ })
                            bufferPosition = 0;
                        }

                    }

                } catch (ex) {
                    reject(ex);
                }
            })
            stream.on('end', ()=>{

                if (bufferPosition > 0){

                    let buffer2 = buffer;
                    if (bufferPosition !== chunkSize){
                        buffer2 = Buffer.alloc(bufferPosition);
                        buffer.copy(buffer2, 0, 0, bufferPosition);
                    }

                    cbProgress( {chunk: buffer2, chunkIndex: chunkIndex++})

                }

                resolve(true);

            })
            stream.on('error', e => reject(e) );

        });


    },


}