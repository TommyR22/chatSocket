const server = require('http').createServer();
const express = require('express');
const path = require('path');
const WebSocketServer = require('ws').Server;
const {Subscription} = require('rxjs');
const cors = require('cors');

const app = express();
const PORT = 8081;

const wss = new WebSocketServer({server});

app.use(cors());

let clientList = {};
let cid = 0;
// websocket on connection
wss.on('connection', (client) => {
    const clientId = cid++;
    const subscription = new Subscription();
    console.log(`New Client ${clientId} CONNECTED!`);
    // send back to client to store clientID
    client.send(createMessage({sender: 'SERVER', myClientId: clientId}, false, 'SERVER', '', 'INFO'));

    // handle disconnect client
    client.on('close', () => {
        console.log(`client ${clientId} DISCONNECT`);
        const client = saveClient(clientId, {type: 'disconnect'}, client);
        sendMessage({type: 'ANNOUNCE', content: `user ${client.username} disconnected to channel`, sender: 'SERVER', userList: clientList.map(e => {
                return {clientId: e.clientId, username: e.username, online: e.online};
            })});
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
                sendMessage({type: 'ANNOUNCE', content: `user ${message.sender} connected to channel`, sender: 'SERVER', userList: clientList.map(e => {
                        return {clientId: e.clientId, username: e.username, online: e.online};
                    })});
                break;
            }
            case 'disconnect': {
                saveClient(clientId, message, client);
                sendMessage({
                    type: 'ANNOUNCE',
                    content: `user ${message.sender} disconnected to channel`,
                    sender: 'SERVER',
                    userList: clientList.map(e => {
                        return {clientId: e.clientId, username: e.username, online: e.online};
                    })
                });
                break;
            }
            case 'message': {
                console.log(`Message from client ${clientId} -> ${message.sender}: ${message}`);
                //send back the message to the other clients
                let toClient = null;
                if (message.receiver) {
                    toClient = clientList.find(e => e.username === message.receiver);
                }
                sendMessage(message, clientId, toClient);
                break;
            }
        }
    });
});

// create send message
function createMessage(content, isBroadcast, sender, receiver = 'all', type = 'MSG') {
    return JSON.stringify({message: content, isPrivate: !isBroadcast, from: sender, to: receiver, type: type});
}

// save clients on SERVER
function saveClient(cId, connectMessage, client) {
    let newClient = {clientId: cId, ws: client, username: connectMessage.sender, avatar: connectMessage.avatar, online: connectMessage.type === 'connect'};
    if (connectMessage.type === 'connect') {
        console.log(`Client *${connectMessage.sender}* saved on Server`);
        client.send(createMessage({sender: 'SERVER', userList: clientList.map(e => {
                return {clientId: e.clientId, username: e.username, online: e.online};
            })}, false, 'SERVER', connectMessage.sender, 'LIST'));
    }
    clientList[connectMessage.sender] = newClient;
    return newClient;
}

// manage send message from->to client or broadcast to channel
function sendMessage(message, fromClient, toClient) {
    clientList
        .filter(e => !!e.online)
        .forEach(client2 => {
            if(message.type && message.type === 'ANNOUNCE') {
                client2.ws.send(createMessage(message.content, !message.receiver, message.sender, message.receiver, message.type));
            } else {
                if (toClient) {
                    clientList[toClient.username].ws.send(createMessage(message.content, !message.receiver, message.sender, message.receiver, message.type));
                } else {
                    client2.ws.send(createMessage(message.content, !message.receiver, message.sender, message.receiver, message.type));
                }
            }
        });
}

server.listen(PORT, () => console.log(`server listening on port ${PORT}`));
server.on('request', app);
