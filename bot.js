const {Client, Events, GatewayIntentBits} = require("discord.js")
const { insertMessages , connectToMongo, getMessagesFromToday, updateMessages, addReaction } = require("./mongo");
const {token} = require("./config.json");

const MESSAGE_POOL_LIMIT = 10;
const UPDATE_POOL_LIMIT = 10;


//store messages to bulk send into mongodb
let messagePool = [];
let updatesPool = [];

//TODO: move event handlers into seperate helper functions
const discord = new Client({
    intents: [GatewayIntentBits.MessageContent,GatewayIntentBits.GuildMessageTyping,GatewayIntentBits.GuildMessages, GatewayIntentBits.Guilds]
})

discord.once(Events.ClientReady, c=>{
    console.log(`[🤖]   Hello 👋 - ${c.user.tag}`)
})

discord.on(Events.MessageCreate,async msg=>{
    //build message 
    console.log(msg.id)
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
}) 
discord.on(Events.MessageUpdate, async (oldMessage, newMessage)=>{
    //see if message is in pool for create before adding it to the update queue
    const mIdx = messagePool.findIndex(msg=>msg._id === oldMessage.id)
    if(mIdx >= 0){
        messagePool[mIdx]["updated"] = new Date()
        messagePool[mIdx]["content"] = newMessage.content
        console.log('modified in memory', messagePool[mIdx]);
        return; //simply update the document that hasn't been inserted yet in memory. 
    }
    //otherwise we need to create an update document for mongodb document. 
    const msgUpdateDoc = {
            _id: oldMessage.id,
            author: oldMessage.author.username,
            content: newMessage.content,
            date: new Date(), 
    };
    updatesPool.push(msgUpdateDoc);
    console.log(updatesPool.length);
    if(updatesPool.length >= UPDATE_POOL_LIMIT){
        const result = await updateMessages(updatesPool);
        updatesPool = [];
        console.log(result)
    }
})

//TODO: handle reactions (add and remove)

async function main(){
    try {
       await connectToMongo();
       await discord.login(token);
    
   } catch (DiscordError) {
        console.warn("Discord Login Failed")
        console.error(DiscordError)
   }
}
main()
