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
    await db.get('CREATE TABLE IF NOT EXISTS channel('+
        'sender TEXT NOT NULL,'+
        'date INTEGER DEFAULT (strftime(\'%s\', \'now\')) NOT NULL,'+
        'text TEXT, PRIMARY KEY(date, sender));')
}

execute = async (statement) => {
    console.log('Executing sql:\t\t' + statement)
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
    return await execute('SELECT * FROM channel ORDER BY date;');
}

functions.add = async(sender, text)=>{
    execute(`INSERT INTO channel (sender, text) VALUES (\'${sender}\', \'${text}\');`)
}

functions.delete = async(sender, date)=>{
    execute(`DELETE FROM channel WHERE sender = \'${sender}\' AND date = \'${date}\'`);
}

functions.modify = async(sender, date, newMessage)=>{
    execute(`UPDATE channel SET text = ${newMessage} WHERE sender = \'${sender}\' AND date = \'${date}\'`);
}


const {testData} = require('./testData')
functions.reset = async()=>{
    await initiate();
    await execute('DROP TABLE channel');
    await initiate();
    testData.map(async(item)=>{
        const {sender, date, text} = item;
        await execute(`INSERT INTO channel (sender, date, text) VALUES (\'${sender}\', ${date} , \'${text}\');`);
    })
    // await execute('SELECT * FROM channel WHERE sender = \'Gremblo\';');
}

exports.database = functions;