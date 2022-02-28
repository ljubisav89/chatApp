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
const collectionName = "Coll"
const streamName = "Stream"
const streamWorker = "SWorker"
const regions = [
    "gdn-ap-west",
    "gdn-us-west",
    "gdn-ap-sydney",
    "gdn-eu-west",
    "gdn-ap-south",
    "gdn-ap-northeast",
    "gdn-us-east",
    "gdn-us-central",
    "gdn-eu-central"
]
const definition =
    `@App:name("${streamWorker}")
@App:description('SW')
@App:qlVersion('2')
-- Define Source.
CREATE SOURCE ${collectionName} WITH (type = 'database', collection = "${collectionName}", collection.type="doc" , replication.type="global", map.type='json') (chat string);
-- Define Stream.
CREATE SINK STREAM ${streamName} (chat string);
-- Data Processing
@info(name='Query')
INSERT INTO ${streamName}
SELECT chat
FROM ${collectionName};`

//connection
const client = new jsc8({
    url,
    apiKey: process.env.APIKEY || apiKey,
    fabric
})

async function createSW() {
    try {
        const streamapps = await client.createStreamApp(regions, definition);
        await client.activateStreamApp(streamWorker, true);
    } catch (e) {
        //  console.log(e);
    }
}

createSW()


app.get('/', (req, res) => {
    res.render("index");
});
app.post('/chat', async (req, res) => {
    let name = req.body.name
    const docs = await client.getDocumentMany(collectionName, 20);
    res.render("chat", { data: { name: name, docs: docs } })
});
app.get('/chat', (req, res) => {
    res.render("chat");
});

const a = async function (msg) {
    const insertedDoc = await client.insertDocument(collectionName, msg);

};

const b = async function () {
    const consumer = await client.createStreamReader(streamName, "sub", true);
    consumer.on("message", async (msg) => {
        const { payload, messageId } = JSON.parse(msg);
        let m = (atob(payload).slice(9, -2)).split(":")
        m = m[0] + " >> " + m[1]
        console.log(m);
        io.emit('time', { time: m });
        consumer.send(JSON.stringify({ messageId }));
    });
};
b();
io.on('connection', function (socket) {
    // Use socket to communicate with this particular client only, sending it it's own id
    socket.on('i am client', console.log);
    socket.on('chat message', (msg) => {
        msg = { chat: msg }
        console.log(msg);
        a(msg)
    });
});

server.listen(port, () => {
    console.log(`Listening on ${port}`);
});
