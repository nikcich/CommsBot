import qs from 'qs';
import { config as dotenvConfig } from 'dotenv';
import axios from 'axios';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { client } from './botClient.js';
import { fetchByAPIKey } from './DBInterface.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenvConfig();

const botToken = process.env.BOT_TOKEN;
const clientSecret = process.env.CLIENT_SECRET;
const clientId = process.env.CLIENT_ID;
const redirect_uri = process.env.REDIRECT_URI;
const guildId = process.env.GUILD_ID;
const lobbyId = process.env.LOBBY_CHANNEL;
const freqIds = process.env.FREQUENCIES_ID;

const successPath = path.resolve(__dirname, 'public', 'JoinedSuccessfully.html');
const alreadyMemberPath = path.resolve(__dirname, 'public', 'AlreadyMember.html');
const errorPath = path.resolve(__dirname, 'public', 'FailedToJoin.html');

function getAPIKey(req) {
    let k = req.query.key;
    if (!k) {
        k = null;
    }

    return k;
}

export async function whtPost(req, res) {
    const apiKey = getAPIKey(req);
    if (apiKey == null) {
        res.send({ code: 2 });
        return;
    }

    console.log("received", req.body);

    let data = req.body;
    const targetFreq = data.frequency;
    const robloxId = data.user;

    try {
        let moveResult = await moveUserToVoice(robloxId, targetFreq, apiKey);

        res.send({ code: moveResult });
    } catch (e) {
        console.log(e);
        res.send({ code: 2 });
    }
}

export async function whtGet(req, res) {
    const apiKey = getAPIKey(req);
    if (apiKey == null) {
        res.send({});
        return;
    }

    const configurations = await fetchByAPIKey(apiKey);

    if (configurations.length == 0) {
        res.send({});
        return;
    }

    const isBotInServer = client.guilds.cache.has(configurations[0].server_id);
    const channelIDs = configurations.channels;

    if (!isBotInServer) {
        res.send({});
        return;
    }

    const server = client.guilds.cache.get(configurations.server_id);
    const channelsList = channelIDs.map((id) => server.channels.cache.get(id));

    let chs = channelsList.filter((ch) => ch != null && ch != undefined).map((ch) => ch.name);
    let mp = {};

    for (let ch of chs) {
        mp[ch] = true;
    }

    res.send(mp);
}

export async function handleOAuthCallback(req, res) {
    const { code } = req.query;
    try {

        const accessToken = await getAccessToken(code);
        const userId = await getUserId(accessToken);
        const joinResult = await addUserToServer(userId, accessToken);

        const finalStatus = joinResult.status;

        if (finalStatus == 204) { // Already in server
            res.status(200).sendFile(alreadyMemberPath);
        } else if (finalStatus == 201) { // Successfully joined server
            res.status(200).sendFile(successPath);
        } else { // UNKNOWN
            throw new Error("Unknown Status");
        }
    } catch (error) {
        console.error('Failed', error);
        res.status(500).sendFile(errorPath);
    }
}

async function getAccessToken(code) {
    const data = qs.stringify({
        'code': code,
        'client_id': clientId,
        'client_secret': clientSecret,
        'redirect_uri': redirect_uri,
        'scope': 'identify guilds guilds.join',
        'grant_type': 'authorization_code'
    });

    const config = {
        method: 'post',
        maxBodyLength: Infinity,
        url: 'https://discord.com/api/oauth2/token',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
        },
        data: data
    };

    const response = await axios.request(config);
    return response.data.access_token;
}

async function getUserId(accessToken) {
    const userURL = 'https://discordapp.com/api/users/@me';
    const userHeaders = {
        'Authorization': `Bearer ${accessToken}`,
    };

    const response = await axios.get(userURL, { headers: userHeaders });
    return response.data.id;
}

async function addUserToServer(userId, accessToken) {
    let data = JSON.stringify({
        "access_token": accessToken
    });

    let config = {
        method: 'put',
        maxBodyLength: Infinity,
        url: 'https://discord.com/api/guilds/' + guildId + '/members/' + userId,
        headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bot ' + botToken,
        },
        data: data
    };

    const response = await axios.request(config)

    return response;
}

async function moveUserToVoice(robloxId, targetFrequency, apiKey) {

    // TODO: Get discord ID from roblox ID
    const targetUserId = "382692599934484490";
    let targetChannel = null;

    const guild = client.guilds.cache.get(guildId);

    const configurations = await fetchByAPIKey(apiKey);

    if (configurations.length == 0) {
        return 4;
    }

    const isBotInServer = client.guilds.cache.has(configurations[0].server_id);
    const channelIDs = configurations[0].channels;

    if (!isBotInServer) {
        return 4;
    }

    const server = client.guilds.cache.get(configurations[0].server_id);
    const channelsList = channelIDs.map((id) => server.channels.cache.get(id));

    let ids = channelsList.filter((ch) => ch != null && ch != undefined).map((ch) => ch.id);
    let chs = channelsList.filter((ch) => ch != null && ch != undefined).map((ch) => ch.name);

    for (let i in chs) {
        let ch = chs[i];
        if (ch == targetFrequency) {
            targetChannel = ids[i];
        }
    }

    if (targetChannel == null) {
        return 3;
    }

    if (!guild) {
        return 4;
    }

    const voiceChannels = guild.channels.cache.filter(channel => ids.includes(channel.id));

    let moved = false;
    voiceChannels.forEach(voiceChannel => {
        const members = voiceChannel.members.forEach(member => {
            if (member.user.id == targetUserId) {
                try {
                    member.voice.setChannel(targetChannel);
                    moved = true;
                } catch (e) {
                    console.log(e);
                    moved = false
                }
            }
        });
    });

    return moved == true ? 1 : 5;
}