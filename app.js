(function () {
    const {fromEvent, timer, merge} = rxjs;
    const {webSocket} = rxjs.webSocket;
    const {switchMap, retryWhen} = rxjs.operators;

    let serverMessages = [];

    let message = {
        type: 'message',
        content: '',
        sender: '',
        receiver: '',
        avatar: ''
    };

    let username = localStorage.getItem('username');
    let avatar = localStorage.getItem('avatar') || 'default';

    let avatars = {
        spiderman: 'assets/image/spiderman.jpg',
        batman: 'assets/image/batman.jpg',
        reply: 'assets/image/reply.png',
        yoda: 'assets/image/yoda.jpg',
        default: 'assets/image/profile_default.png',
        server: 'assets/image/root.png'
    };

    let channel_list = [];
    let myClientId = 0;
    let viewer = document.getElementById('messages');

    // WebSocket
    const webSocket$ = webSocket('ws://localhost:8081');
    webSocket$
        .multiplex(
            () => {
                if (username == null) {
                    username = prompt('Insert your username:', 'spiderman');
                    localStorage.setItem('avatar', 'default');
                    if (username != null) {
                        localStorage.setItem('username', username);
                        avatar = prompt('Insert your favorite avatar from ["spiderman", "batman", "reply", "yoda"]:', 'spiderman');
                        if (avatar != null) {
                            if (avatars[avatar] != null) {
                                localStorage.setItem('avatar', avatar);
                            }
                        }
                    }
                }
                // update images
                document.getElementById("username").innerText = username;
                document.getElementById("profile-img").src = avatars[avatar];
                return {type: 'connect', avatar: avatar, sender: username};
            },
            () => ({type: 'disconnect', avatar: avatar, sender: username}),
            (_) => true
        )
        .pipe(
            retryWhen(switchMap(() => timer(1000))) // disconnect strategy
        )
        .subscribe((resp) => {
                switch (resp.type) {
                    case 'INFO': {
                        myClientId = resp.message.myClientId;
                        break;
                    }
                    case 'LIST': {
                        updateContacts(resp.message.userList);
                        break;
                    }
                    case 'ANNOUNCE': {
                        if (resp.message.userList) updateContacts(resp.message.userList);
                        addMessage(resp.message, true);
                        scroll();
                        break;
                    }
                    case 'MSG': {
                        console.log('message received: ', resp.message);
                        serverMessages.push(resp.message.content);
                        addMessage(resp.message);
                        scroll();
                        break;
                    }
                }
            },
            (err) => console.error(err),
            () => console.warn('Completed!')
        );

    merge(fromEvent(document.getElementById('send'), 'click'),
        fromEvent(document.getElementById('message'), 'keyup'))
        .subscribe((event) => {
            event.preventDefault();
            if (event.type === 'keyup' && event.keyCode === 13) {
                sendMessage(document.getElementById('message').value, username, false);
            } else if (event.type === 'click') {
                sendMessage(document.getElementById('message').value, username, false);
            }
        });

    fromEvent(document.getElementById('options'), 'click')
        .subscribe(() => {
            const profile = document.getElementById('profile');
            profile.classList.toggle('expanded');
            const contacts = document.getElementById('contacts');
            contacts.classList.toggle('expanded');
        });

    fromEvent(document.getElementById('profile-img'), 'click')
        .subscribe(() => {
            const status = document.getElementById('status-options');
            status.classList.toggle('active');
        });

    function sendMessage(content, sender, isBroadcast, receiver) {
        if (content && content.length > 0) {
            message = {
                type: 'message',
                content: {content: content},
                from: myClientId,
                receiver: receiver,
                avatar: avatar
            };
            // serverMessages.push(message);
            console.log('sendMessage: ', JSON.stringify(message));
            webSocket$.next(message);
            document.getElementById('message').value = '';
        }
    }

    function addMessage(message, isServer) {
        const messages = document.getElementById('messlist');
        const li = document.createElement('li');
        var text = document.createTextNode(message.content);
        const p = document.createElement('p');
        const image = document.createElement('img');
        const idx = channel_list.findIndex(e => e.clientId === message.from);
        if (message.from === myClientId) {
            li.classList.add('sent');
            image.src = avatars[avatar];
        } else {
            li.classList.add(isServer ? "server" : "replies");
            image.src = isServer ? avatars.server : idx < 0 ? avatars.default : avatars[channel_list[idx].avatar];
        }
        p.appendChild(text);
        li.appendChild(image, li.childNodes[0]);
        li.appendChild(p, li.childNodes[0]);
        messages.appendChild(li, messages.childNodes[0]);
    }

    function updateContacts(list) {
        channel_list = list;
        const contacts = document.getElementById('contactlist');
        contacts.innerHTML = '';
        list.forEach(user => {
            if (user.clientId !== myClientId) {
                contacts.innerHTML += `<li class="contact active">
                    <div class="wrap">
                        <span class="contact-status ${user.online ? 'online' : ''}"></span>
                        <img src="${avatars[user.avatar || 'default']}" alt=""/>
                        <div class="meta">
                            <p class="name">${user.username}</p>
                            <p class="preview">I'm the master!</p>
                        </div>
                    </div>
                </li>`;
            }
        });
    }

    function scroll() {
        setTimeout(() => {
            scrollToBottom();
        }, 200);
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

}());
