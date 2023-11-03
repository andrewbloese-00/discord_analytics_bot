const { mongo_uri}  = require("./config.json")
const { MongoClient} = require("mongodb");
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


async function insertMessages(messages){
    console.log('insertMessages called with: ' + messages.length + ' messages');
    try {
        return MESSAGES_COLLECTION.insertMany(messages);
    } catch (error) {
        console.error(error);   
        return { error }
    }

}

module.exports = {connectToMongo, insertMessages}
