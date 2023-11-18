import { getClient } from './DBConnection.js';
import { config as dotenvConfig } from 'dotenv';

dotenvConfig();

const DB_NAME = process.env.MONGO_DB_NAME;
const DB_COLLECTION = process.env.MONGO_DB_COLLECTION;

async function insertDataIntoMongo(dataObject) {
    const client = getClient();
    const database = client.db(DB_NAME);
    const collection = database.collection(DB_COLLECTION);

    await collection.insertOne(dataObject);
}

async function fetchDataFromMongo() {
    const client = getClient();
    const database = client.db(DB_NAME);
    const collection = database.collection(DB_COLLECTION);

    const result = await collection.find({}).toArray();
    return result;
}

async function fetchByUserId(userId) {
    const client = getClient();
    const database = client.db(DB_NAME);
    const collection = database.collection(DB_COLLECTION);

    const result = await collection.find({ user_id: String(userId) }).toArray();
    return result;
}

async function deleteByApiKey(apiKey) {
    const client = getClient();
    const database = client.db(DB_NAME);
    const collection = database.collection(DB_COLLECTION);

    const result = await collection.deleteOne({ api_key: String(apiKey) });
    return result.deletedCount; // Returns the number of deleted documents (0 or 1)
}

async function fetchByServerId(serverId) {
    const client = getClient();
    const database = client.db(DB_NAME);
    const collection = database.collection(DB_COLLECTION);

    const result = await collection.find({ server_id: String(serverId) }).toArray();
    return result;
}


async function fetchByUserIdAndServerId(userId, serverId) {
    const client = getClient();
    const database = client.db(DB_NAME);
    const collection = database.collection(DB_COLLECTION);

    const result = await collection.find({
        user_id: String(userId),
        server_id: String(serverId),
    }).toArray();
    return result;
}

async function fetchByAPIKey(apiKey) {
    const client = getClient();
    const database = client.db(DB_NAME);
    const collection = database.collection(DB_COLLECTION);

    const result = await collection.find({
        api_key: String(apiKey),
    }).toArray();
    return result;
}

export {
    insertDataIntoMongo,
    fetchDataFromMongo,
    fetchByUserId,
    deleteByApiKey,
    fetchByServerId,
    fetchByUserIdAndServerId,
    fetchByAPIKey
};
