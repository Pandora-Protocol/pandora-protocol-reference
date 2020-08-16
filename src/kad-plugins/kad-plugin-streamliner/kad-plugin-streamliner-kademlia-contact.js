const ContactType = require('pandora-protocol-kad-reference').plugins.PluginContactType.ContactType;

module.exports = function (options){

    return class MyContact extends options.Contact {

        getProtocol(command, data){

            //optimization to use websocket for Streamliner in case it wis available
            if (command === 'GET_STREAM_CHK' && this.contactType === ContactType.CONTACT_TYPE_ENABLED )
                return this.convertProtocolToWebSocket();

            return super.getProtocol(command, data);
        }

    }

}