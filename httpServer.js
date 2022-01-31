const {database} = require('./databaseManager')
const {onChannelUpdate} = require('./socketHandler')
const express = require('express')

/* Author: Benjamin Nielsen
Handles new message requests from the Raspberry PI without requiring them
to establish a persistant connection.
*/
const app = express()
app.use(express.urlencoded({extended:true}))
app.use(express.json());

app.use((req, res, next)=>{
    res.setHeader('Access-Control-Allow-Origin', 'http://localhost:3000');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST');
    res.setHeader('Access-Control-Allow-Headers', 'X-Requested-With,content-type');
    // res.setHeader('Access-Control-Allow-Credentials', true);
    next();
})

app.get('/', async(req, res) =>{
    res.send('Basic API Usage:\t' +
    'get/all -> all messages\t' +
    'get/channels -> all unique channels\t' +
    'get/p/# -> all messages in channel #\t\t' +
    'post -> add new message given the following info: {sender=\'\', text=\'\', channel=#}\t\t' +
    'delete -> delete a message matching given info: {sender=\'\', date=(unix timestamp)}')
})

// fetch all
app.get('/all', async(req, res)=>{
    let all = await database.getAll();
    res.send(all);
})

// fetch all messages in a specific channel
app.get('/p/:channelId', async(req, res)=>{
    channelId = req.params.channelId;
    // console.log('Looking for messages in channel ' + channelId);
    let messages = await database.getMessagesInChannel(channelId);
    res.send(messages);
})

// fetch a list of all channels
app.get('/channels', async(req, res)=>{
    let channels = await database.getChannels();
    res.send(JSON.stringify(channels));
})

// add new message
app.post('/', async(req, res)=>{
    const {sender, text, channel} = req.body;
    console.log('from: ' + sender + "\tin channel " + channel + '\n' + text);
    await database.add(sender, text, channel);
    onChannelUpdate(channel)
    res.send('received a post request')
})

exports.app = app