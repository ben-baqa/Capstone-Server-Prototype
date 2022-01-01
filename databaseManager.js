const sqlite3 = require('sqlite3');
const {open} = require('sqlite');

const openDB = async()=>{
    // open the database
    return await open({
        filename: 'database.db',
        driver: sqlite3.Database
    });
}

initiate = async()=>{
    const db = await openDB();
    await db.get('CREATE TABLE IF NOT EXISTS messages('+
        'channel INTEGER DEFAULT (1) NOT NULL,' +
        'sender TEXT NOT NULL,'+
        'date INTEGER DEFAULT (strftime(\'%s\', \'now\')) NOT NULL,'+
        'text TEXT, PRIMARY KEY(date, sender));')
}

execute = async (statement, debug = true) => {
    if(debug)
        console.log('\nExecuting sql:\t\t' + statement);
    const db = await openDB();
    let result = await db.all(statement);
    if(result.length > 0){
        let value = await JSON.stringify(result, null, '\t');
        // console.log('value fetched:\n' + value);
        return value;
    }
}

let functions = {execute, initiate};

functions.getAll = async() => {
    return await execute('SELECT * FROM messages ORDER BY date;');
}

functions.getMessagesInChannel = async(id) => {
    return await execute(`SELECT * FROM messages WHERE channel = ${id} ORDER BY date`);
}

functions.getChannels = async() => {
    return await execute('SELECT DISTINCT channel FROM MESSAGES');
}


functions.add = async(sender, text, channel)=>{
    execute(`INSERT INTO messages (sender, text, channel) VALUES (\'${sender}\', \'${text}\', ${channel});`)
}

functions.delete = async(sender, date)=>{
    execute(`DELETE FROM messages WHERE sender = \'${sender}\' AND date = \'${date}\'`);
}

functions.modify = async(sender, date, newMessage)=>{
    execute(`UPDATE messages SET text = \'${newMessage}\' WHERE sender = \'${sender}\' AND date = ${date}`);
}


const {testData} = require('./testData')
functions.reset = async()=>{
    console.log('resetting database with test values from testData.js');
    await initiate();
    await execute('DROP TABLE messages', false);
    await initiate();
    testData.map(async(item)=>{
        const {sender, date, text, channel} = item;
        try {
            await execute(`INSERT INTO messages (channel, sender, date, text) VALUES ` +
                `(${channel}, \'${sender}\', ${date} , \'${text}\');`, false);
        } catch (error) {
            console.log("Whoopsie");
        }
    });
    console.log('Done')
    // await execute('SELECT * FROM messages WHERE sender = \'Gremblo\';');
}

exports.database = functions;