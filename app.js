const { Observable, fromEvent, empty, timer } = rxjs;
const { ajax } = rxjs.ajax;
const { webSocket } = rxjs.webSocket;
const { debounceTime, map, switchMap, catchError, retryWhen } = rxjs.operators;

let serverMessages = [];

let message = {
    content: '',
    sender: '',
    isBroadcast: ''
}

let clientID;
let viewer = document.getElementsByClassName('messages');
let img = 'assets/image/spiderman.jpg';
let img2 = 'assets/image/yoda.jpg';

// INIT
const webSocket$ = webSocket('ws://localhost:8081');
webSocket$.subscribe((message) => {
        if (message.content === 'connected_to_server') {
            clientID = message.sender;
            console.log(`clientID: ${clientID}`);
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

document.getElementById('send').addEventListener('click', function(){
    sendShowMessage();
});
document.getElementById('message').addEventListener("keyup", function(event) {
    // Cancel the default action, if needed
    event.preventDefault();
    // Number 13 is the "Enter" key on the keyboard
    if (event.keyCode === 13) {
        sendShowMessage();
    }
  });

function sendShowMessage() {
    message = {
        content: document.getElementById('message').value,
        sender: clientID,
        isBroadcast: true
    };
    serverMessages.push(message);
    webSocket$.next(message);
    addMessage(message);
    document.getElementById('message').value = '';
    scroll();
}

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
    console.log(message.sender, clientID, clientID === 0);
    if (message.sender === clientID) {
        li.classList.add('sent');
        image.src = clientID === 0 ? img : img2; 
        console.log('1img:', image.src);
    } else {
        li.classList.add("replies");
        image.src = clientID === 1 ? img : img2; 
        console.log('2img:', image.src);
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
