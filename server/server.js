const server = require('http').createServer();
const express = require('express');
const path = require('path');
const WebSocketServer = require('ws').Server;
const { Subscription } = require('rxjs');
const cors = require('cors');

const app = express();
const PORT = 8081;

const wss = new WebSocketServer({ server });

app.use(cors());
//app.use(express.static(path.join(__dirname, '../browser')));

let clientList = {};

// websocket on connection
wss.on('connection', (client) => {
  const subscription = new Subscription();
  console.log(`New Client CONNECTED!`);
  // send back to client to store clientID
  client.send(createMessage(`connected_to_server`, false, 'SERVER'));
  /* wss.clients.forEach(client2 => {
        if (client2 != client) {
            client2.send(createMessage(`new_client`, true, ''));
        }
    }); */

  client.on('close', () => {
    console.log(`client CLOSED`);
    subscription.unsubscribe();
  });

  client.on('error', (error) => {
    console.log(`client ERROR`);
    console.error(error);
    subscription.unsubscribe();
  });

  client.on('message', (msg) => {
    message = JSON.parse(msg);
    console.log(`Message from client: ${message.sender} -> ${msg}`);
    // save client on SERVER
    if (!clientList[message.sender]) {
      saveClient(message.sender, client);
    }

    if (message.receiver) {
      // send message between two client
      clientList[message.receiver].send(msg);
    }

    //ws.send(createMessage('Hi there, I am a WebSocket server', false, clientId));

    if (message.isBroadcast) {
        //send back the message to the other clients
        wss.clients
            .forEach(client2 => {
                if (client2 != client) {
                    client2.send(createMessage(message.content, true, message.sender));
                }
            });
    }

  });
});

// create send message
function createMessage(content, isBroadcast, sender, receiver) {
    return JSON.stringify({content, isBroadcast, sender, receiver});
}

// save clients on SERVER
function saveClient(username, client) {
  console.log(`Client *${username}* saved on Server`);
  clientList[username] = client;
}

server.listen(PORT, () => console.log(`server listening on port ${PORT}`));
server.on('request', app);
