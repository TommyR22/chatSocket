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

let cid = 0;
// websocket on connection
wss.on('connection', (ws) => {
  const clientId = cid++;
  const subscription = new Subscription();

  console.log(`client ${clientId} CONNECTED`);
  // send back to client to store clientID
  ws.send(createMessage(`connected_to_server`, false, clientId));
  wss.clients.forEach(client => {
        if (client != ws) {
            client.send(createMessage(`new_client`, true, ''));
        }
    });

  ws.on('close', () => {
    console.log(`client ${clientId} CLOSED`);
    subscription.unsubscribe();
  });

  ws.on('error', (error) => {
    console.log(`client ${clientId} ERROR`);
    console.error(error);
    subscription.unsubscribe();
  });

  ws.on('message', (msg) => {
    let message;
    console.log(`client ${clientId} -> ${msg}`);

    try {
      message = JSON.parse(msg);
    } catch (err) {
      console.error(`ERROR: client ${clientId} - unable to parse message "${msg}"`);
    }

    //ws.send(createMessage('Hi there, I am a WebSocket server', false, clientId));

    if (message.isBroadcast) {
        //send back the message to the other clients
        wss.clients
            .forEach(client => {
                if (client != ws) {
                    client.send(createMessage(message.content, true, message.sender));
                }
            });
    }

  });
});

function createMessage(content, isBroadcast, sender) {
    return JSON.stringify({content, isBroadcast, sender});
}


server.listen(PORT, () => console.log(`server listening on port ${PORT}`));
server.on('request', app);
