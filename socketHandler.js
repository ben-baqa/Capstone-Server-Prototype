const {database} = require('./databaseManager')
const WebSocket = require('ws')
const https = require('https')
const fs = require('fs')

let sockets = {}
let httpsServer
let wsServer

exports.createSocketServer = (port) => {
    const key = fs.readFileSync('key-rsa.pem')
    const cert = fs.readFileSync('cert.pem')

    httpsServer = https.createServer({ key, cert },
        (req, res) => {
            res.writeHead(200)
            res.end('hello world\n')
            console.log('Https request received.')
        }).listen(8080)

    wsServer = new WebSocket.Server({ server: httpsServer })

    wsServer.on('connection', (ws) => {
        ws.on('message', handleMessage)
        ws.on('close', () => {
            for (var key in sockets)
                if (sockets[key] == ws) delete sockets[key]
            console.log('socket closed')
        })

        let id = getValidID()
        ws.send(`connection id:${id}`)
        sockets[id] = ws
    })
}

// fetches the lowest available socket identifier
let getValidID = () => {
    let n = 0
    while (n in sockets)
        n++
    console.log('new id fetched:', n)
    return n
}

// handles incoming messages with appropriate respones to sender
let handleMessage = (m) => {
    m = m.toString()
    console.log(m)
    m = m.split(":")
    let ar = m[0].split("/")
    let id = parseInt(m[1])

    console.log(`From Socket ${id}: `, m[0])

    switch (ar[0]) {
        case "get": // get information
            // format: get/...:id
            handleGet(ar.slice(1), id)
            break

        case "post":{ // add message
            // format: post/sender/text/channel:id
            const [sender, text, channel] = ar.slice(1)
            console.log('from: ' + sender + "\tin channel " + channel + '\n' + text)
            database.add(sender, text, channel)}
            break
        
        case "put":{ // modify message
            // format: put/sender/date/newText:id
            const [sender, date, newText] = ar.slice(1)
            database.modify(sender, date, newText)}
            break

        case "delete":{ // modify message
            // format: delete/sender/date:id
            const [sender, date] = ar.slice(1)
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
let handleGet = async(ar, id) => {
    switch (ar[0]) {
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
            let messages = await database.getMessagesInChannel(ar[1])
            sockets[id].send(messages)
            break
    
        default:
            break;
    }
}