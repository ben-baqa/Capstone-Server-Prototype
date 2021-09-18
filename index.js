const {database} = require('./databaseManager')
const express = require('express')
const app = express()

const port = 3001


if(process.argv[2] === 'reset')
    database.reset();


app.use(express.urlencoded({extended:true}))
app.use(express.json());

app.listen(port, ()=>{
    console.log(`Example app listening at http://localhost:${port}\n`)
    database.initiate();
})

app.use((req, res, next)=>{
    res.setHeader('Access-Control-Allow-Origin', 'http://localhost:3000');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE');
    res.setHeader('Access-Control-Allow-Headers', 'X-Requested-With,content-type');
    // res.setHeader('Access-Control-Allow-Credentials', true);
    next();
})

app.get('/', async(req, res) =>{
    res.send(JSON.stringify({text:'Hello World'}))
})

// fetch all
app.get('/all', async(req, res)=>{
    let all = await database.getAll();
    res.send(all);
})

// add new message
app.post('/', (req, res)=>{
    const {sender, text} = req.body;
    console.log('from: ' + sender + '\n' + text);
    database.add(sender, text);
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
