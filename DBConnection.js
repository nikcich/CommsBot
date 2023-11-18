import { MongoClient, ServerApiVersion } from 'mongodb';
import { config as dotenvConfig } from 'dotenv';

dotenvConfig();

const uri = process.env.MONGO_URI;

const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    },
});

async function connectToMongo() {
    await client.connect();
    console.log("Connected to MongoDB");
}

function getClient() {
    return client;
}

async function closeMongoConnection() {
    await client.close();
    console.log("Closed MongoDB connection");
}

process.on('SIGINT', async () => {
    await closeMongoConnection();
    process.exit(0);
});

export { connectToMongo, getClient, closeMongoConnection };
