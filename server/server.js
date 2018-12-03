const server = require('http').createServer();
const express = require('express');
const path = require('path');
const WebSocketServer = require('ws').Server;
const {Subscription} = require('rxjs');
const cors = require('cors');
const ip = require("ip");

const app = express();
const PORT = 8081;

const wss = new WebSocketServer({server});

app.use(cors());
app.use(express.static(path.join(__dirname, '../')));

console.log('Your IP address is: ');
console.dir ( ip.address() );

let clientList = [];
let cid = 0;
// websocket on connection
wss.on('connection', (client) => {
    const clientId = cid++;
    const subscription = new Subscription();
    console.log(`New Client ${clientId} CONNECTED!`);
    // send back to client to store clientID
    client.send(createMessage({from: 'SERVER', myClientId: clientId}, false, 'SERVER', 'all', 'INFO'));

    // handle disconnect client
    client.on('close', () => {
        const client = saveClient(clientId, {type: 'disconnect'});
        console.log(`client ${clientId} *${client.username}* DISCONNECT`);
        sendMessage({type: 'ANNOUNCE', content: {content: `---- > User: "${client.username}" disconnected to channel`, from: 'SERVER'}});
        subscription.unsubscribe();
    });

    client.on('error', (error) => {
        console.log(`client ${clientId} ERROR`);
        console.error(error);
        subscription.unsubscribe();
    });

    client.on('message', (msg) => {
        let message;
        console.log(`client ${clientId} -> ${msg}`);
        try {
            message = JSON.parse(msg);
        } catch (err) {
            console.error(`ERROR: client ${clientId} - unable to parse message "${msg}"`);
        }
        switch (message.type) {
            case 'connect': {
                // save client on SERVER
                saveClient(clientId, message, client);
                sendMessage({type: 'ANNOUNCE', content: {content: `---- > User: "${message.sender}" connected to channel`, from: 'SERVER'}});
                break;
            }
            case 'disconnect': {
                saveClient(clientId, message, client);
                sendMessage({type: 'ANNOUNCE', content: {content: `---- > User: "${message.sender}" disconnected to channel`, from: 'SERVER'}});
                break;
            }
            case 'status': {
                const idx = clientList.findIndex(e => e.clientId === clientId)
                clientList[idx].status = message.status;
                sendMessage({type: 'ANNOUNCE', content: {content: `---- > User: "${message.sender}" change status to ${message.status}`, from: 'SERVER'}});
                break;
            }
            case 'message': {
                console.log(`Message from client ${clientId} to ${message.receiver || 'all'} -> ${message.content.content}`);
                //send back the message to the other clients
                let toClient = null;
                if (message.receiver != null) {
                    toClient = clientList.find(e => e.clientId === message.receiver);
                }
                delete message['type'];
                message.content.from = message.from;
                sendMessage(message, clientId, toClient);
                break;
            }
        }
    });
});

// create send message
function createMessage(content, isBroadcast, sender, receiver = 'all', type = 'MSG') {
    let toSend = {message: content, isPrivate: !isBroadcast, from: sender, to: receiver, type: type};
    if(sender === 'SERVER') {
        toSend.message.userList = clientList.map(e => ({clientId: e.clientId, username: e.username, avatar: e.avatar, online: e.online, status: e.status}));
    }
    return JSON.stringify(toSend);
}

// save clients on SERVER
function saveClient(cId, connectMessage, client) {
    let newClient = {clientId: cId, ws: client, username: connectMessage.sender, avatar: connectMessage.avatar, online: connectMessage.type === 'connect', status: connectMessage.status};
    if (connectMessage.type === 'connect') {
        console.log(`Client *${connectMessage.sender}* saved on Server`);
        client.send(createMessage({from: 'SERVER'}, false, 'SERVER', connectMessage.sender, 'LIST'));
    }
    const idx = clientList.findIndex(c => connectMessage.type === 'connect' ? c.username === connectMessage.sender : c.clientId === cId);
    if (idx >= 0) {
        clientList[idx].clientId = cId;
        clientList[idx].online = newClient.online;
        clientList[idx].status = !client ? 'offline' : newClient.status;
        clientList[idx].ws = client;
        return clientList[idx];
    } else {
        clientList.push(newClient);
        return newClient;
    }
}

// manage send message from->to client or broadcast to channel
function sendMessage(message, fromClient, toClient) {
    clientList
        .filter(e => !!e.online)
        .forEach(client2 => {
            if(message.type && message.type === 'ANNOUNCE') {
                client2.ws.send(createMessage(message.content, !message.receiver, 'SERVER', message.receiver, message.type));
            } else {
                if (toClient) {
                    if(toClient.clientId === client2.clientId || fromClient === client2.clientId){
                        client2.ws.send(createMessage(message.content, true, message.sender, message.receiver, message.type));
                    }
                } else {
                    client2.ws.send(createMessage(message.content, !message.receiver, message.sender, message.receiver, message.type));
                }
            }
        });
}

clientList.push({clientId: -1, ws: null, username: '#GENERAL', avatar: 'general', online: false, status: 'online'});
server.listen(PORT, () => console.log(`server listening on port ${PORT}`));
server.on('request', app);
