const {app} = require('./httpServer')
const {database} = require('./databaseManager')
const {createSocketServer} = require('./socketHandler')

const socketServerPort = 8080

database.initiate();
database.reset();
if(process.argv[2] === 'reset')
    database.reset();

createSocketServer(app, process.env.PORT || socketServerPort)