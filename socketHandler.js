const {database} = require('./databaseManager')
const WebSocket = require('ws')
const https = require('https')
const fs = require('fs')

let sockets = {}
let httpsServer
let wsServer

exports.createSocketServer = (port = 8080) => {
    const key = fs.readFileSync('key-rsa.pem')
    const cert = fs.readFileSync('cert.pem')
    
    httpsServer = https.createServer({key, cert})
    httpsServer.listen(port)

    wsServer = new WebSocket.Server({ server: httpsServer })

    wsServer.on('connection', (ws) => {
        ws.on('message', parseMessage)
        ws.on('close', () => {
            for (var key in sockets)
                if (sockets[key] == ws) delete sockets[key]
            console.log('socket closed')
        })

        let id = getValidID()
        ws.send(`connection id:${id}`)
        sockets[id] = ws
    })
    console.log(`wss server listening on port ${port}`)
}

// fetches the lowest available socket identifier
let getValidID = () => {
    let n = 0
    while (n in sockets)
        n++
    console.log('new id fetched:', n)
    return n
}

// parses raw message to allow execution of multiple commands
let parseMessage = (message) => {
    console.log(message.toString())
    let [requests, id] = message.toString().split(':')
    requests.split("&").forEach(request => {
        handleRequest(request, id)
    });
}

// handles incoming requests with appropriate respones to sender
let handleRequest = (request, id) => {
    let segments = request.split("/")

    if(id < 0 || id >= sockets.length)
    {
        console.log(`\n ERROR: message received from invalid id: ${id}`)
        return;
    }

    // console.log(`From Socket ${id}: `, request)

    switch (segments[0]) {
        case "get": // get information
            // format: get/...:id
            handleGet(segments.slice(1), id)
            break

        case "post":{ // add message
            // format: post/sender/text/channel:id
            const [sender, text, channel] = segments.slice(1)
            console.log('from: ' + sender + "\tin channel " + channel + '\n' + text)
            database.add(sender, text, channel)}
            break
        
        case "put":{ // modify message
            // format: put/sender/date/newText:id
            const [sender, date, newText] = segments.slice(1)
            database.modify(sender, date, newText)}
            break

        case "delete":{ // modify message
            // format: delete/sender/date:id
            const [sender, date] = segments.slice(1)
            database.delete(sender, date)}
            break

        case "test": // test connection
            // format: test:id
            sockets[id].send('test successful')
            break

        default:
            console.log('invalid request format')
            break
    }
}

// handles information requests
let handleGet = async(segments, id) => {
    switch (segments[0]) {
        case 'all': // get all messages
            // format: get/all:id
            let all = await database.getAll()
            sockets[id].send(all)
            break

        case 'channels': // get channel list
            // format: get/channels:id
            let channels = await database.getChannels()
            sockets[id].send(channels)
            break

        case 'channel': // get all messages in channel
            // format get/channel/channelId:id
            let messages = await database.getMessagesInChannel(segments[1])
            sockets[id].send(messages)
            break
    
        default:
            break;
    }
}