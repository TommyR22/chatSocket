const { Observable, fromEvent, empty, timer } = rxjs;
const { ajax } = rxjs.ajax;
const { webSocket } = rxjs.webSocket;
const { debounceTime, map, switchMap, catchError, retryWhen } = rxjs.operators;

let serverMessages = [];

let message = {
    content: '',
    sender: '',
    isBroadcast: '',
    receiver: ''
}

const username = 'yoda';
const username_friend = 'spiderman';

let clientID;
let viewer = document.getElementsByClassName('messages');
let img = 'assets/image/spiderman.jpg';
let img2 = 'assets/image/yoda.jpg';

// WebSocket
const webSocket$ = webSocket('ws://localhost:8081');
webSocket$.subscribe((message) => {
        if (message.content === 'connected_to_server') {
            console.log(`message received from: ${message.sender}`);
            sendMessage('login', username, false);
        } else if (message.content === 'new_client') {
            updateContact(message);
        } else {
            console.log('message received: ', message);
            serverMessages.push(message);
            addMessage(message);
            scroll();
        }
    },
    (err) => console.error(err),
    () => console.warn('Completed!')
);

function sendMessage(content, sender, isBroadcast, receiver){
    message = {
        content: content,
        sender: sender,
        isBroadcast: isBroadcast,
        receiver: receiver
    };
    // serverMessages.push(message);
    console.log('sendMessage: ', JSON.stringify(message));
    webSocket$.next(message);
    if (receiver) {
        showMessage(message);
    }
}

function showMessage(message) {
    addMessage(message);
    document.getElementById('message').value = '';
    scroll();
}

document.getElementById('send').addEventListener('click', function(){
    sendMessage(document.getElementById('message').value, username, false, username_friend);
});
document.getElementById('message').addEventListener("keyup", function(event) {
    // Cancel the default action, if needed
    event.preventDefault();
    // Number 13 is the "Enter" key on the keyboard
    if (event.keyCode === 13) {
        sendMessage(document.getElementById('message').value, username, false, username_friend);
    }
  });

document.getElementById('options').addEventListener('click', function(){
    const profile = document.getElementById('profile');
    profile.classList.toggle('expanded');
    const contacts = document.getElementById('contacts');
    contacts.classList.toggle('expanded');
});
document.getElementById('profile-img').addEventListener('click', function(){
    const status = document.getElementById('status-options');
    status.classList.toggle('active');
});


function addMessage(message) {
    const messages = document.getElementById('messlist');
    const li = document.createElement('li');
    var text = document.createTextNode(message.content);
    const p = document.createElement('p');
    const image = document.createElement('img');
    if (message.sender === username) {
        li.classList.add('sent');
        image.src = img2; 
    } else {
        li.classList.add("replies");
        image.src = img; 
    }
    p.appendChild(text);
    li.appendChild(image, li.childNodes[0]);
    li.appendChild(p, li.childNodes[0]);
    messages.appendChild(li, messages.childNodes[0]);
}

function updateContact(message) {
    const contacts = document.getElementById('contactlist');
    const first_li = document.getElementsByClassName('contact-status')[0];
    first_li.classList.add('online');
}

function scroll() {
    setTimeout(() => {
        scrollToBottom();
    }, 100);
}

function getDiff() {
    if (!viewer) {
        return -1;
    }
    return viewer.scrollHeight - (viewer.scrollTop + viewer.clientHeight);
}

function scrollToBottom(t = 1, b = 0) {
    if (b < 1) {
        b = getDiff();
    }
    if (b > 0 && t <= 120) {
        setTimeout(() => {
            const diff = easeInOutSin(t / 120) * getDiff();
            viewer.scrollTop += diff;
            scrollToBottom(++t, b);
        }, 1 / 60);
    }
}

function easeInOutSin(t) {
    return (1 + Math.sin(Math.PI * t - Math.PI / 2)) / 2;
}
