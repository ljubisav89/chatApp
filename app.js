if (process.env.NODE_ENV != "production") {
    require("dotenv").config()
}
const path = require('path')
const jsc8 = require("jsc8");
const express = require('express');
const app = express();
const http = require('http');
const server = http.createServer(app);
const { Server } = require("socket.io");
const io = new Server(server);
const atob = require("atob")

app.set("view engine", "ejs")
app.set("views", path.join(__dirname, 'views'))
app.use(express.urlencoded({ extended: true }))

const url = 'https://gdn.paas.macrometa.io'
const fabric = "_system"
const port = 3000
const apiKey = "" //set API key or use .env to set it
const collectionAndStreamName = "ChatCollection" // Name of collection


//connection
const client = new jsc8({
    url,
    apiKey: process.env.APIKEY || apiKey,
    fabric
})

async function createCollection() {
    try {
        const newColl = await client.createCollection(collectionAndStreamName, { stream: true });

    } catch (e) {
        //console.log(e.response.body);
    }
}
createCollection()

app.get('/', (req, res) => {
    res.render("index");
});
app.post('/chat', async (req, res) => {
    let name = req.body.name
    const docs = await client.executeQuery(`FOR i IN ${collectionAndStreamName} sort i.time asc RETURN i`);
    res.render("chat", { data: { name: name, docs: docs } })
});
app.get('/chat', (req, res) => {
    res.render("chat");
});

const saveMsg = async function (msg) {
    const insertedDoc = await client.insertDocument(collectionAndStreamName, msg);

};

const createConusmer = async function () {
    const consumer = await client.createStreamReader(collectionAndStreamName, "sub", true, true);
    consumer.on("message", async (msg) => {
        const { payload, messageId } = JSON.parse(msg);
        let m = JSON.parse(atob(payload)).chat
        console.log(m);
        io.emit('time', { time: m });
        consumer.send(JSON.stringify({ messageId }));
    });
};
createConusmer();
io.on('connection', function (socket) {
    // Use socket to communicate with this particular client only, sending it it's own id
    socket.on('chat message', (msg) => {
        msg = { chat: msg, time: Date.now() };
        saveMsg(msg)
    });
});

server.listen(port, () => {
    console.log(`Listening on ${port}`);
});



