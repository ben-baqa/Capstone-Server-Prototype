const { Pool } = require('pg');

let pool

const openDB = async()=>{
    // open the database
    return await pool.connect()
}

initiate = async()=>{
    pool = new Pool({
        connectionString: process.env.DATABASE_URL,
        ssl: {
            rejectUnauthorized: false
        }
    });

    try {
        await pool.query('CREATE TABLE IF NOT EXISTS messages('+
            'channel INTEGER DEFAULT (1) NOT NULL,' +
            'sender TEXT NOT NULL,'+
            'date bigint NOT NULL DEFAULT (date_part(\'epoch\'::text, now()) * (1000))::double precision,'+
            'text TEXT, PRIMARY KEY(date, sender));')
    } catch (err) {
        console.error('\n\nan error occured when initializing the database')
        console.error(err)
    }
}

// execute the provided SQL statement,
// return json string of result
execute = async (statement, stringify = true, debug = true, printRes = false) => {
    try {
        if(debug)
            console.log('\nExecuting sql:\t\t' + statement)
            
        let res = await pool.query(statement)
        let result = res.rows

        if(result.length > 0){
            if(stringify){
                let value = await JSON.stringify(result, null, '\t')
                if (printRes)
                    console.log('Result: ', value)
                return value;
            }else
                if (printRes)
                    console.log('Result: ', result)
                return result;
        }
    } catch (err) {
        console.log('\nsomething went wrong during a query')
        console.error(err)
    }
}

executeWithParams = async (statement, parameters, stringify = true, debug = true, printRes = false) => {
    try {
        if(debug)
            console.log('\nExecuting sql:\t\t' + statement);
            
        let res = await pool.query(statement, parameters);
        let result = res.rows;
        
        if(result.length > 0){
            if(stringify){
                let value = await JSON.stringify(result, null, '\t');
                if (printRes)
                    console.log('Result: ', value)
                return value;
            }else
                if (printRes)
                    console.log('Result: ', result)
                return result;
        }
    } catch (err) {
        console.log('\n something went wrong during a parameterized query')
        console.error(err)
    }
}

let functions = {execute, initiate};

functions.getAll = async() => {
    return await execute('SELECT * FROM messages ORDER BY date;', printRes = true);
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
}

exports.database = functions;