const {Client, Events, GatewayIntentBits} = require("discord.js")
const { insertMessages , connectToMongo } = require("./mongo");
const {token} = require("./config.json");

// const POLLING_INTERVAL = 10000;
const LIMIT = 2;
//store messages to bulk send into mongodb
let messagePool = [];
const discord = new Client({
    intents: [GatewayIntentBits.MessageContent,GatewayIntentBits.GuildMessageTyping,GatewayIntentBits.GuildMessages, GatewayIntentBits.Guilds]
})

discord.once(Events.ClientReady, c=>{
    console.log("Client ready. Logged in as " + c.user.tag)
})

discord.on(Events.MessageCreate,async msg=>{
    //build message 
    const messageDoc = {
        author: msg.author.username,
        channel: msg.channel.name,
        content: msg.content,
        when: new Date(),
    }
    messagePool.push(messageDoc)
    if(messagePool.length >= LIMIT){
        const result = await insertMessages(messagePool);
        console.log(result);
        messagePool = []
    } else { 
        console.log('crickets...')
    }
})

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
