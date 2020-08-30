module.exports = function (options){

    return class MyContact extends options.Contact {

        constructor() {
            super(...arguments);

            //optimization to use websocket for Streamliner in case it wis available
            this._specialContactProtocolByCommands['GET_STREAM_CHK'] = this.convertProtocolToWebSocket.bind(this);
            this._specialContactProtocolByCommands['CONN_PING'] = this.convertProtocolToWebSocket.bind(this);

        }

    }

}