const {database} = require('./databaseManager')
const WebSocket = require('ws')
const Http = require('http')
/* Author: Benjamin Nielsen
Runs the communication of a back end server with a front end
messaging application, using websockets to enable automatic live
updates to the front end.

COMMUNICATION PROTOCOL:
very roughly follows http, params in CAPS are variable.
all meesages must be appended by :id to enable proper responses

    get/all:id                              get all messages in database
    get/channels:id                         get a list of all channels
    get/channel/CHANNEL:id                  get all messages in specified channel

    post/SENDER/TEXT/CHANNEL:id             add new message to the database

    put/SENDER/DATE/NEWTEXT/CHANNEL:id      modify extant message

    delete/SENDER/DATE/CHANNEL:id           delete extant message

    test:id                                 returns "test successful"
*/


// collection of currently connected socket objects, keyed by id
let sockets = {}
// collection of most recent get requests from each socket id
let requests = {}
// stores array of channels in memory to enable
// live updates of the channels view client side
let channelListCache = []
// stringified version of channelListCache to avoid unneccesary string conversions
let channelListString = ""

// The http server handling requests and websocket connections
let httpServer
// WebSocket server that runs communication with front end
let wsServer

// creates and initializes secure websocket server
exports.createSocketServer = (app, port = 8080) => {
    httpServer = Http.createServer()

    wsServer = new WebSocket.Server({ server: httpServer })
    httpServer.on('request', app)

    wsServer.on('connection', (ws) => {
        ws.on('message', parseMessage)
        ws.on('close', () => {
            for (var key in sockets)
                if (sockets[key] == ws){
                    delete sockets[key]
                    delete requests[key]
                }
            console.log('socket closed')
        })

        let id = getValidID()
        ws.send(`connection id:${id}`)
        sockets[id] = ws
        requests[id] = "null"
    })

    httpServer.listen(port, ()=>{
        console.log(`http/ws server listening on port ${port}`)
    })

    // ping all clients every 50s to keep back end connections alive
    setInterval(() => {
        sendToAll('ping', req => true)
    }, 50000)
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

// handles incoming requests with appropriate response to sender
let handleRequest = async(request, id) => {
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
            await database.add(sender, text, channel)
            await this.onChannelUpdate(channel)
            }
            break
        
        case "put":{ // modify message
            // format: put/sender/date/newText/channel:id
            const [sender, date, newText, channel] = segments.slice(1)
            await database.modify(sender, date, newText)
            await this.onChannelUpdate(channel)
            }
            break

        case "delete":{ // modify message
            // format: delete/sender/date/channel:id
            const [sender, date, channel] = segments.slice(1)
            await database.delete(sender, date)
            await this.onChannelUpdate(channel, true)
            }
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
            requests[id] = "all"
            let all = await database.getAll()
            sockets[id].send(all)
            break

        case 'channels': // get channel list
            // format: get/channels:id
            requests[id] = "channels"
            if (channelListCache.length == 0)
                channelListCache = await updateChannelList()
            console.log("channels", channelListString)
            sockets[id].send(channelListString)
            break

        case 'channel': // get all messages in channel
            // format get/channel/channelId:id
            requests[id] = `channel/${segments[1]}`
            let messages = await database.getMessagesInChannel(segments[1])
            // if(messages == undefined)
            //     messages = '[]'
            sockets[id].send(messages)
            break
    
        default:
            break;
    }
}

// fetch an updated list of channels
let updateChannelList = async() => {
    let channels = await database.getChannels()
    // channels = JSON.parse(channels)
    // let channelList = []
    // channels.forEach(entry => channelList.push(entry.channel))
    channelListString = await JSON.stringify(channels)
    return channels
}

// called when the contents of a given channel are modified
// updates connected clients with fresh data if it has been altered
exports.onChannelUpdate = async(channelId, deletion = false) => {
    if(deletion){
        let newChannelList = await updateChannelList();
        if (newChannelList.length != channelListCache.length){
            console.log(`-----------channel ${channelId} completely deleted`)
            channelListCache = newChannelList
            sendToAll(channelListString, req => req == 'channels')
            // updateClientChannelLists(newChannelList)
        }
    } else if (!(channelId in channelListCache)){
        console.log(`-----------new channel added (#${channelId})`)
        channelListCache = await updateChannelList();
        sendToAll(channelListString, req => req == 'channels')
        // updateClientChannelLists(updateChannelList())
    }

    // update all clients currently viewing effected channel
    let channelMessages = await database.getMessagesInChannel(channelId)
    sendToAll(channelMessages, req => req == `channel/${channelId}`)
}

// sends a payload to every connected socket whose
// last get request satifies the provided condition
let sendToAll = (payload, requestCondition) =>{
    for (var key in sockets){
        if(requestCondition(requests[key]))
            sockets[key].send(payload)
    }
}