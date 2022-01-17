const {database} = require('./databaseManager')
const {createSocketServer} = require('./socketHandler')
const express = require('express')
// const http = require('http')
const WebSocket = require('ws')

const port = 3001
const app = express()

// var server = http.createServer(app)
// let wsServer = new WebSocket.Server({ port: 3002 })

// wsServer.on('connection', (ws) => {
//     ws.on('message', (ms) => {
//         console.log('received: ', ms.toString())
//     })

//     ws.send('test response')
// })

// server.listen(3002)

createSocketServer(8080)


if(process.argv[2] === 'reset')
    database.reset();


app.use(express.urlencoded({extended:true}))
app.use(express.json());

app.listen(port, ()=>{
    console.log(`Example app listening at http://localhost:${port}\n`)
    database.initiate();
    database.reset();
})

app.use((req, res, next)=>{
    res.setHeader('Access-Control-Allow-Origin', 'http://localhost:3000');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE');
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
    res.send(channels);
})

// add new message
app.post('/', (req, res)=>{
    const {sender, text, channel} = req.body;
    console.log('from: ' + sender + "\tin channel " + channel + '\n' + text);
    database.add(sender, text, channel);
    res.send('received a post request')
})

// modify message
app.put('/', async(req, res)=>{
    console.log('received a put request')
    res.send('received a put request')
})

// delete message
app.delete('/', (req, res)=>{
    console.log('received a delete request')
    const {sender, date} = req.body;
    database.delete(sender, date)
    res.send('received a delete request')
})
