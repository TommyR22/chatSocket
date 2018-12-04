(function () {
    const {fromEvent, timer, merge} = rxjs;
    const {webSocket} = rxjs.webSocket;
    const {switchMap, retryWhen} = rxjs.operators;

    let username = localStorage.getItem('username');
    let avatar = localStorage.getItem('avatar') || 'default';
    let myStatus = sessionStorage.getItem('status') || 'online';

    let avatars = {
        spiderman: 'assets/image/spiderman.jpg',
        batman: 'assets/image/batman.jpg',
        reply: 'assets/image/reply.png',
        yoda: 'assets/image/yoda.jpg',
        default: 'assets/image/profile_default.png',
        server: 'assets/image/root.png',
        general: 'assets/image/general.png'
    };

    let serverMessages = {
        '-1': [] // broadcast channel
    };
    let channel_list = [];
    let myClientId = 0;
    let viewer = document.getElementById('messages');
    let currentChat = -1;

    // WebSocket
    const webSocket$ = webSocket('ws://' + window.location.hostname + ':8081');
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
                            avatar = avatar.toLocaleLowerCase();
                            if (avatars[avatar] != null) {
                                localStorage.setItem('avatar', avatar);
                            } else {
                                avatar = 'default';
                            }
                        }
                    }
                }
                // update images
                document.getElementById("username").innerText = username;
                document.getElementById("profile-img").src = avatars[avatar];
                document.getElementById("profile-img").className = myStatus;
                return {type: 'connect', avatar: avatar, sender: username, status: myStatus};
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
                        serverMessages['-1'].push(resp.message);
                        updateMessage(-1);
                        scroll();
                        break;
                    }
                    case 'MSG': {
                        console.log('message received: ', resp.message);
                        let toMess = resp.to === 'all' ? -1 : resp.to === myClientId ? resp.message.from : resp.to;
                        serverMessages[toMess].push(resp.message);
                        updateMessage(toMess);
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
                sendMessage(document.getElementById('message').value, username, false, currentChat >= 0 ? currentChat : undefined);
            } else if (event.type === 'click') {
                sendMessage(document.getElementById('message').value, username, false, currentChat >= 0 ? currentChat : undefined);
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
            const message = {
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

    function setMyStatus(status) {
        sessionStorage.setItem('status', status);
        const profile = document.getElementById('profile-img');
        profile.className = status;
        document.getElementById('profile-img').click();
        myStatus = status;
        webSocket$.next({type: 'status', sender: username, status: status});
    }

    function updateMessage(channel) {
        const messages = document.getElementById('messlist');
        updateContacts(channel_list);
        if (channel === currentChat) {
            messages.innerHTML = '';
            serverMessages[channel].forEach(mess => {
                const li = document.createElement('li');
                var text = document.createTextNode(mess.content);
                const p = document.createElement('p');
                const image = document.createElement('img');
                const idx = channel_list.findIndex(e => e.clientId === mess.from);
                if (mess.from === myClientId) {
                    li.classList.add('sent');
                    image.src = avatars[avatar];
                } else {
                    li.classList.add(mess.from === 'SERVER' ? "server" : "replies");
                    image.src = mess.from === 'SERVER' ? avatars.server : idx < 0 ? avatars.default : avatars[channel_list[idx].avatar];
                }
                p.appendChild(text);
                li.appendChild(image, li.childNodes[0]);
                li.appendChild(p, li.childNodes[0]);
                messages.appendChild(li, messages.childNodes[0]);
            });
        }
    }

    function switchChannel(chatId) {
        const chatAvatar = document.getElementById('chat-avatar');
        const chatName = document.getElementById('chat-name');
        const idx = channel_list.findIndex(e => e.clientId === chatId);
        if (idx >= 0) {
            currentChat = chatId;
            chatAvatar.src = avatars[channel_list[idx].avatar || 'default'];
            chatName.innerText = channel_list[idx].username;
            updateContacts(channel_list);
            updateMessage(chatId);
        }
    }

    function updateContacts(list) {
        channel_list = list;
        const contacts = document.getElementById('contactlist');
        contacts.innerHTML = '';
        list.forEach(user => {
            if (!serverMessages[user.clientId]) serverMessages[user.clientId] = [];
            if (user.clientId !== myClientId) {
                const lastIdxMsg = serverMessages[user.clientId].length - 1;
                contacts.innerHTML += `<li onclick="switchChannel(${user.clientId})" class="contact ${user.clientId === currentChat ? 'active' : ''}">
                    <div class="wrap">
                        <span class="contact-status ${user.status ? user.status : ''}"></span>
                        <img src="${avatars[user.avatar || 'default']}" alt=""/>
                        <div class="meta">
                            <p class="name">${user.username}</p>
                            <p class="preview">${lastIdxMsg >= 0 ? serverMessages[user.clientId][lastIdxMsg].content : ''}</p>
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

    window.setMyStatus = setMyStatus;
    window.switchChannel = switchChannel;

}());
