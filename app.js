import express from 'express';
const app = express();
import bodyParser from 'body-parser';
import { client } from './botClient.js';
import { whtGet, whtPost, handleOAuthCallback } from './routes.js';

// https://discord.com/oauth2/authorize?client_id=842980332516409374&redirect_uri=http%3A%2F%2F173.255.196.121%3A1738%2Fcallback&response_type=code&scope=identify%20guilds%20guilds.join

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.use(express.static('./public'));

// Route for the OAuth callback
app.get('/callback', handleOAuthCallback);

app.post('/wht', whtPost);

app.get('/wht', whtGet);

const port = 1738;

app.listen(port, () => {
  console.log(`Server listening at http://localhost:${port}`);
});