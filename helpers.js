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
    let memoryMessages = new Map();
    let memoryUpdates = new Map();


    async function onMessageCreate(msg){
        //build message
        const messageDoc = {
            _id: msg.id, //use same id as message
            author: msg.author.username,
            channel: msg.channel.name,
            content: msg.content,
            when: new Date(),
        }
        //add the message to the pool and enter its id to the lookup map
        memoryMessages.set(msg.id,(messagePool.push(messageDoc)-1));
        
        //if we are at the limit, insert the messages into the db and clear the pool/table
        if(messagePool.length >= MESSAGE_POOL_LIMIT){
            const result = await insertMessages(messagePool);
            console.log(result);
            messagePool = []
            memoryMessages.clear();
        } 


    }
    async function onMessageUpdate(oldMessage, newMessage){
        //check if message is still waiting to be inserted
        const mIdx = memoryMessages.get(oldMessage.id)
        if(mIdx){
            messagePool[mIdx]["updated"] = new Date()
            messagePool[mIdx]["content"] = newMessage.content
            console.log('modified in memory', messagePool[mIdx]);
            return; //simply update the document that hasn't been inserted yet in memory. 
        }

        //check if any updates pending on the message
        const uIdx = memoryUpdates.get(oldMessage.id);
        if(uIdx !== undefined){
            updatesPool[uIdx]["updated"] = new Date();
            updatesPool[uIdx]["content"] = newMessage.content
            return;
        }

        //otherwise we need to create an update document for mongodb document. 
        const msgUpdateDoc = {
                _id: oldMessage.id,
                author: oldMessage.author.username,
                content: newMessage.content,
                date: new Date(), 
        };
        
        memoryUpdates.set(oldMessage.id,(updatesPool.push(msgUpdateDoc)-1));

        if(updatesPool.length >= UPDATE_POOL_LIMIT){
            const result = await updateMessages(updatesPool);
            updatesPool = [];
            memoryUpdates.clear();
            console.log(result)
        }
    }
    async function onMessageReactionAdd(reaction,user){
        //is the message in memory? 
        const msgId = reaction.message.id;
        const mIdx = memoryMessages.get(msgId);
        //update the reactions field or create it
        if(mIdx !== undefined){
            if(!messagePool[mIdx]["reactions"]){
                messagePool[mIdx]["reactions"] = {
                    [reaction.emoji.name]: 1,
                }
            } else if(!messagePool[mIdx]["reactions"][reaction.emoji.name]){
                messagePool[mIdx]["reactions"][reaction.emoji.name] = 1
            }
            else {
                messagePool[mIdx]["reactions"][reaction.emoji.name] += 1;
            }
            return
        }  
        
        //is there an update for the message in memory?
        const uIdx = memoryUpdates.get(msgId)
        if(uIdx !== undefined){
            if(!updatesPool[uIdx]["$inc"]){
                updatesPool[uIdx]["$inc"] = { [`reactions.${reaction.emoji.name}`]: 1 }
            } 
            else if( !updatesPool[uIdx]["$inc"][`reactions.${reaction.emoji.name}`] ){
                updatesPool[uIdx]["$inc"][`reactions.${reaction.emoji.name}`] = 1
            } 
            else {
                updatesPool[uIdx]["$inc"][`reactions.${reaction.emoji.name}`] += 1
            }
            return
        }
        
        //create new update document
        const updateDoc = { 
            $inc: { [`reactions.${reaction.emoji.name}`]: 1}
        }
        memoryUpdates.set(msgId,(updatesPool.push(updateDoc)-1));

        if(updatesPool.length >= UPDATE_POOL_LIMIT){
            const result = await updateMessages(updatesPool);
            updatesPool = [];
            memoryUpdates.clear();
            console.log(result)
        }

    }

    async function onMessageReactionRemove(reaction,user){
         //is the message in memory? 
         const msgId = reaction.message.id;
         const mIdx = memoryMessages.get(msgId);
         //update the reactions field or create it
         if(mIdx !== undefined){
             if(messagePool[mIdx]["reactions"][reaction.emoji.name])
                messagePool[mIdx]["reactions"][reaction.emoji.name] -= 1;
             return
         }  
         
         //is there an update for the message in memory?
         const uIdx = memoryUpdates.get(msgId)
         if(uIdx !== undefined){
             if(!updatesPool[uIdx]["$inc"]){
                 updatesPool[uIdx]["$inc"] = { [`reactions.${reaction.emoji.name}`]: -1 }
             } 
             else if( !updatesPool[uIdx]["$inc"][`reactions.${reaction.emoji.name}`] ){
                 updatesPool[uIdx]["$inc"][`reactions.${reaction.emoji.name}`] = -1
             } 
             else {
                 updatesPool[uIdx]["$inc"][`reactions.${reaction.emoji.name}`] -= 1
             }
             return
         }
         
         //create new update document
         const updateDoc = { 
             $inc: { [`reactions.${reaction.emoji.name}`]: -1}
         }
         memoryUpdates.set(msgId,(updatesPool.push(updateDoc)-1));
 
         if(updatesPool.length >= UPDATE_POOL_LIMIT){
             const result = await updateMessages(updatesPool);
             updatesPool = [];
             memoryUpdates.clear();
             console.log(result)
         }
    }


    return { 
        onMessageCreate, onMessageUpdate, onMessageReactionAdd, onMessageReactionRemove
    }
}

module.exports = {getDiscordEventHandler}

