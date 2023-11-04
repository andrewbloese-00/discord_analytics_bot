const {Client, Events, GatewayIntentBits} = require("discord.js")
const {  connectToMongo  } = require("./mongo");
const { getDiscordEventHandler } = require("./helpers");
const {token} = require("./config.json");

//create a discord client
const discord = new Client({
    intents: [GatewayIntentBits.MessageContent,GatewayIntentBits.GuildMessageTyping,GatewayIntentBits.GuildMessages, GatewayIntentBits.Guilds]
})

//get event handlers
const handle = getDiscordEventHandler()

//register event handlers
discord.once(Events.ClientReady, c=>{
    console.log(`[🤖]   Hello 👋 - ${c.user.tag}`)
})
discord.on(Events.MessageCreate, handle.onMessageCreate);
discord.on(Events.MessageUpdate, handle.onMessageUpdate);

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
