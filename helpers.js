const {insertMessages,updateMessages} = require("./mongo");
//limits the number of messages held in memory before 'flushing' to db, 
//for testing purposes set to '1'
//increasing the limit reduces the number of requests made to mongodb
//uses bulk insert/update
const MESSAGE_POOL_LIMIT = 1; 
const UPDATE_POOL_LIMIT = 1;

//create a message and updates pool as well as handlers for various discord events. 
const getDiscordEventHandler = () => { 
    let messagePool = [];
    let updatesPool = [];

    async function onMessageCreate(msg){
        //build message
        const messageDoc = {
            _id: msg.id, //use same id as message
            author: msg.author.username,
            channel: msg.channel.name,
            content: msg.content,
            when: new Date(),
        }
        messagePool.push(messageDoc)
        if(messagePool.length >= MESSAGE_POOL_LIMIT){
            const result = await insertMessages(messagePool);
            console.log(result);
            messagePool = []
        } 

    }
    async function onMessageUpdate(oldMessage, newMessage){
        //check if message is still waiting to be inserted
        const mIdx = messagePool.findIndex(msg=>msg._id === oldMessage.id)
        if(mIdx >= 0){
            messagePool[mIdx]["updated"] = new Date()
            messagePool[mIdx]["content"] = newMessage.content
            console.log('modified in memory', messagePool[mIdx]);
            return; //simply update the document that hasn't been inserted yet in memory. 
        }

        //check if any updates pending on the message
        const uIdx = updatesPool.findIndex(u=>u._id === oldMessage.id)
        if(uIdx >= 0){
            updatesPool[uIdx]["updated"] = new Date();
            updatesPool[uIdx]["content"] = newMessage.content
        }

        //otherwise we need to create an update document for mongodb document. 
        const msgUpdateDoc = {
                _id: oldMessage.id,
                author: oldMessage.author.username,
                content: newMessage.content,
                date: new Date(), 
        };
        updatesPool.push(msgUpdateDoc);
        if(updatesPool.length >= UPDATE_POOL_LIMIT){
            const result = await updateMessages(updatesPool);
            updatesPool = [];
            console.log(result)
        }
    }

    return { 
        onMessageCreate, onMessageUpdate, 
    }
}

module.exports = {getDiscordEventHandler}

