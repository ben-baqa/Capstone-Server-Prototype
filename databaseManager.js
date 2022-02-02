const sqlite3 = require('sqlite3');
const {open} = require('sqlite');
const { Pool, Client } = require('pg');

let pool
const db = new Client()

const openDB = async()=>{
    // open the database
    return await pool.connect()

    // return await open({
    //     filename: 'database.db',
    //     driver: sqlite3.Database
    // });
}

initiate = async()=>{
    pool = new Pool({
        connectionString: process.env.DATABASE_URL,
        ssl: {
            rejectUnauthorized: false
        }
    });

    try {
        // const db = await openDB()
        await db.connect()
        await db.query('CREATE TABLE IF NOT EXISTS messages('+
            'channel INTEGER DEFAULT (1) NOT NULL,' +
            'sender TEXT NOT NULL,'+
            'date bigint NOT NULL DEFAULT (date_part(\'epoch\'::text, now()) * (1000))::double precision,'+
            'text TEXT, PRIMARY KEY(date, sender));')
            // db.end()
        // db.release()
    } catch (err) {
        console.error('\n\nan error occured when initializing the database')
        console.error(err)
    }

    // const db = await openDB();
    // await db.get('CREATE TABLE IF NOT EXISTS messages('+
    //     'channel INTEGER DEFAULT (1) NOT NULL,' +
    //     'sender TEXT NOT NULL,'+
    //     'date INTEGER DEFAULT (strftime(\'%s\', \'now\')) NOT NULL,'+
    //     'text TEXT, PRIMARY KEY(date, sender));')
}

// execute the provided SQL statement,
// return json string of result
execute = async (statement, stringify = true, debug = true) => {
    try {
        if(debug)
            console.log('\nExecuting sql:\t\t' + statement);
        // const db = await openDB();
        // await db.connect()
        let result = await db.query(statement);
        // db.end()
        // db.release()
        if(result.length > 0){
            if(stringify){
                let value = await JSON.stringify(result, null, '\t');
                return value;
            }else
                return result;
        }
    } catch (err) {
        console.log('\nsomethig went wrong during a query')
        console.error(err)
    }
}

executeWithParams = async (statement, parameters, stringify = true, debug = true) => {
    try {
        if(debug)
            console.log('\nExecuting sql:\t\t' + statement);
        // const db = await openDB();
        // await db.connect()
        let result = await db.query(statement, parameters);
        // db.end()
        // db.release()
        if(result.length > 0){
            if(stringify){
                let value = await JSON.stringify(result, null, '\t');
                return value;
            }else
                return result;
        }
    } catch (err) {
        console.log('\n something went wrong during a parameterized query')
        console.error(err)
    }
}

let functions = {execute, initiate};

functions.getAll = async() => {
    return await execute('SELECT * FROM messages ORDER BY date;');
}

functions.getMessagesInChannel = async(id) => {
    let messages = await executeWithParams(`SELECT * FROM messages WHERE channel = $1 ORDER BY date`, [id]);
    return messages? messages: '[]'
}

functions.getChannels = async() => {
    let channels = await execute('SELECT DISTINCT channel FROM MESSAGES', false);
    let channelArray = []
    if(channels)
        channels.forEach(entry => channelArray.push(entry.channel))
    return channelArray
}


functions.add = async(sender, text, channel)=>{
    await executeWithParams(`INSERT INTO messages (sender, text, channel) VALUES ($1, $2, $3);`, [sender, text, channel])
}

functions.delete = async(sender, date)=>{
    await executeWithParams(`DELETE FROM messages WHERE sender = $1 AND date = $2`, [sender, date]);
}

functions.modify = async(sender, date, newMessage)=>{
    await executeWithParams(`UPDATE messages SET text = $1 WHERE sender = $2 AND date = $3`, [newMessage, sender, date]);
}


const {testData} = require('./testData');
const res = require('express/lib/response');
functions.reset = async()=>{
    console.log('resetting database with test values from testData.js');
    await initiate();
    await execute('DROP TABLE messages', true, false);
    await initiate();
    testData.map(async(item)=>{
        const {sender, date, text, channel} = item;
        try {
            await execute(`INSERT INTO messages (channel, sender, date, text) VALUES ` +
                `(${channel}, \'${sender}\', ${date} , \'${text}\');`, true, false);
        } catch (error) {
            console.log("Whoopsie");
        }
    });
    console.log('Done')
    // await execute('SELECT * FROM messages WHERE sender = \'Gremblo\';');
}

exports.database = functions;