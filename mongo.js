const { mongo_uri}  = require("./config.json")
const { MongoClient, ObjectId} = require("mongodb");
const client = new MongoClient(mongo_uri);
const db_name = "dcbot"
const collection_name = "messages"
const db = client.db(db_name);
const MESSAGES_COLLECTION = db.collection(collection_name);

async function connectToMongo(){
    try {
        await client.connect();
        console.log('Connected to MongoDB!')
    } catch (error) {
        console.error(error)
        process.exit(1)   
    }
}
const ALL_CHANNELS = "xXallXx"
const DAY_MS = 1000 * 60 * 60 * 24


/**
 * 
 * @param {string|string[]} channels - default selects all channels, otherwise selects all channels provided 
 * @param {number} limit how many documents to return, default is 500. For no limit use 0
 * @note all channels is a special string 'xXallXx'
 * @returns { {messages: Document[]} | {messages:{} }| {error: string|Error}}
 */
async function getMessagesFromToday(limit=500,channels=ALL_CHANNELS){
    const today = Date.now();
    const whenGreater = new Date(today - DAY_MS);

    //do all channels
    if(!(channels instanceof Array) && channels === ALL_CHANNELS){
        let todaysMessages = {};
        //build pipeline
        const match = {$match: { when: {$gte: whenGreater}}};
        const sort = { $sort: { when: 1}}; //note: have a query in place for the 'when' field
        const project = { $project: { _id: 0}};
        const pipeline = [ match , sort ];
        if(limit > 0){
            pipeline.push({$limit: limit})
        }
        pipeline.push(project);

        //execute aggregation pipeline
        //stages are | match -> sort -> limit? -> project -|
        try {
            const allMessages = await MESSAGES_COLLECTION.aggregate(pipeline)
        
            //group messages from each channel
            for await (const message of allMessages){
                if(todaysMessages[message.channel]){
                    todaysMessages[message.channel].push(message);
                } else {
                    todaysMessages[message.channel] = [ message ];
                }
            }

            return {messages: todaysMessages};
        } catch (error) {
            console.error(error);
            return {error};
        }
       


    } else { //do specified channels

        //do we need to cast string --> [string]
        let cast = false
        //guard against invalid call 
        if(!channels instanceof Array){
            cast = true
        }

        //build the pipeline
        const match = {$match: { channel:{$in: cast?[channels]:channels}, when: {$gte: whenGreater}}};
        const sort = { $sort: { when: 1}};
        const project = { $project: { _id: 0, channel: 0}};
        const pipeline = [ match , sort ];
        //limit is optional 
        if(limit > 0){
            pipeline.push({$limit: limit});
        }
        pipeline.push(project);

        //execute aggregation pipeline
        //stages are | match -> sort -> limit? -> project -|
        const todaysMessages = await MESSAGES_COLLECTION.aggregate(pipeline).toArray();
        return {messages: todaysMessages};
    } 
}

async function insertMessages(messages){
    console.log('insertMessages called with: ' + messages.length + ' messages');
    try {
        return MESSAGES_COLLECTION.insertMany(messages);
    } catch ( error ) {
        console.error(error);   
        return { error }
    }

}
/**
 * 
 * @param {{_id: string, content:string, author:string,date:Date}[]} messageUpdatesWithIds 
 */
async function updateMessages(messageUpdatesWithIds){
    let jobs = []
    for(let messageUpdate of messageUpdatesWithIds ){
        const filter = { _id: messageUpdate._id}
        const content = messageUpdate.content, updated = messageUpdate.date

        jobs.push(
            MESSAGES_COLLECTION.updateOne(filter,{$set:{content,updated}})
        );
    }

    try {
        const updateDocs = await Promise.all(jobs);
        return updateDocs

    } catch (error) {
        console.error(error)
        return { error };
    }

    
}
/**
 * 
 * @param {string} messageId the id of the message in the messages collection
 * @param {string} reactionName the name of the reaction to increment
 * @param {boolean} up - true: increment by one, false: decrement by one
 */
async function updateReaction(messageId, reactionEmoji, up = true){
    //find message by id, then update the count in the 
    //reactions subdocument in the 'reactionEmoji' field
     
}


module.exports = {connectToMongo, insertMessages , getMessagesFromToday, updateMessages, addReaction}
