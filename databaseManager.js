const sqlite3 = require('sqlite3');
const {open} = require('sqlite');
const { Pool } = require('pg');

let pool

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
        const db = await openDB()
        await db.query('CREATE TABLE IF NOT EXISTS messages('+
            'channel INTEGER DEFAULT (1) NOT NULL,' +
            'sender TEXT NOT NULL,'+
            'date bigint NOT NULL DEFAULT (date_part(\'epoch\'::text, now()) * (1000))::double precision,'+
            'text TEXT, PRIMARY KEY(date, sender));')
        db.release()
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
    if(debug)
        console.log('\nExecuting sql:\t\t' + statement);
    const db = await openDB();
    let result = await db.query(statement);
    db.release()
    if(result.length > 0){
        if(stringify){
            let value = await JSON.stringify(result, null, '\t');
            return value;
        }else
            return result;
    }
}

let functions = {execute, initiate};

functions.getAll = async() => {
    return await execute('SELECT * FROM messages ORDER BY date;');
}

functions.getMessagesInChannel = async(id) => {
    let messages = await execute(`SELECT * FROM messages WHERE channel = ${id} ORDER BY date`);
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
    await execute(`INSERT INTO messages (sender, text, channel) VALUES (\'${sender}\', \'${text}\', ${channel});`)
}

functions.delete = async(sender, date)=>{
    await execute(`DELETE FROM messages WHERE sender = \'${sender}\' AND date = ${date}`);
}

functions.modify = async(sender, date, newMessage)=>{
    await execute(`UPDATE messages SET text = \'${newMessage}\' WHERE sender = \'${sender}\' AND date = ${date}`);
}


const {testData} = require('./testData')
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