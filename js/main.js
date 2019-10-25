/*
 *  This file is part of WebRTC Share (https://send.jcubic.pl)
 *  Application code for WebRTC/Firebase based P2P file sharing app
 *
 *  Copyright (C) Jakub T. Jankiewicz <https://jcubic.pl>
 *
 *  This program is free software: you can redistribute it and/or modify
 *  it under the terms of the GNU Affero General Public License as
 *  published by the Free Software Foundation, either version 3 of the
 *  License, or (at your option) any later version.
 *
 *  This program is distributed in the hope that it will be useful,
 *  but WITHOUT ANY WARRANTY; without even the implied warranty of
 *  MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 *  GNU Affero General Public License for more details.
 *
 *  You should have received a copy of the GNU Affero General Public License
 *  along with this program.  If not, see <https://www.gnu.org/licenses/>.
 *
 *  MIT licensed POC can be found at https://codepen.io/jcubic/pen/yvMeRg
 *
 */
/* global firebase, PeerConnection, URL, Blob, Promise, FileReader, room */
(function() {
    var config = {
        apiKey: "AIzaSyCiYZ-_3zXQCu6DIkOd_HRGLCS3s6bIYiE",
        authDomain: "jcubic-webrtc.firebaseapp.com",
        databaseURL: "https://jcubic-webrtc.firebaseio.com",
        projectId: "jcubic-webrtc",
        storageBucket: "jcubic-webrtc.appspot.com",
        messagingSenderId: "530153588319"
    };
    var servers = {
        iceServers: [
            {urls: 'stun:stun.services.mozilla.com'}, // there are free public stun servers
            {urls: 'stun:stun.l.google.com:19302'},   // but turn are not
            {
                urls: 'turn:numb.viagenie.ca',
                credential: 'vampire666',  // some old password I've used, typed by mistake
                username: 'jcubic@onet.pl' // you can create free turn account on that link
            }
        ]
    };
    const message_channel = 'WebRTC';
    firebase.initializeApp(config);
    var db_ref = firebase.database().ref('send/' + room);
    // ------------------------------------------------------------------------
    // :: Firebase based Events
    // ------------------------------------------------------------------------
    function FirebaseConnection() {
        this.randId = Math.floor(Math.random() * 1000000000);
        log('Client ID: ' + this.randId);
        this.cleanup();
        this.connection = this.connect();
        this.connection.onDisconnect().set([{
            type: 'disconnect',
            sender: null, // send to both
            data: JSON.stringify({id: this.getSessionid()})
        }]);
    }
    // ------------------------------------------------------------------------
    FirebaseConnection.prototype.connect = function(room) {
        db_ref.child(message_channel).remove();
        return db_ref.child(message_channel);
    };
    // ------------------------------------------------------------------------
    FirebaseConnection.prototype.on = function (type, fn) {
        var id = this.getSessionid();
        this.connection.on('child_added', function(snapshot) {
            var message = snapshot.val();
            if (message.type == type && message.sender != id) {
                var data = JSON.parse(message.data);
                fn(data);
            }
        });
    };
    // ------------------------------------------------------------------------
    FirebaseConnection.prototype.emit = function (type, data) {
        var msg = this.connection.push({
            type: type,
            sender: this.getSessionid(),
            data: typeof data === 'undefined' ? true : JSON.stringify(data)
        });
        msg.remove();
    };
    // ------------------------------------------------------------------------
    FirebaseConnection.prototype.getSessionid = function () {
        return this.randId;
    };
    // ------------------------------------------------------------------------
    FirebaseConnection.prototype.disconnect = function () {};
    // ------------------------------------------------------------------------
    FirebaseConnection.prototype.cleanup = function() {
        firebase.database().ref('/send').once("value", snap => {
            const list = [];
            snap.forEach(x => {
                const value = x.val();
                const messages = value[message_channel];
                if (messages && messages.length === 1) {
                    const { type } = messages[0];
                    if (type === 'disconnect') {
                        list.push(x.key);
                    }
                }
            });
            list.forEach(name => {
                firebase.database().ref(`/send/${name}`).remove();
            });
        });
    };
    // ------------------------------------------------------------------------
    // :: File Handler
    // ------------------------------------------------------------------------
    function FileHandler(filename, arrayBuffer, progress) {
        this.filename = filename;
        this.arraybuffer = arrayBuffer;
        this._progress = progress || function(){};
    }
    // ------------------------------------------------------------------------
    FileHandler.prototype.save = function() {
        var link = document.createElement('a');
        document.body.appendChild(link);
        link.href = this.dataURI(this.arraybuffer);
        link.download = this.filename;
        link.click();
        URL.revokeObjectURL(link.href);
        document.body.removeChild(link);
    };
    FileHandler.prototype.progress = function(percent) {
        this._progress(percent);
    };
    // ------------------------------------------------------------------------
    FileHandler.prototype.dataURI = function(arraybuffer) {
        var blob = new Blob([new Uint8Array(arraybuffer).buffer]);
        return URL.createObjectURL(blob);
    };
    // ------------------------------------------------------------------------
    FileHandler.prototype.send = function(dataChannel, chunk_size) {
        chunk_size = chunk_size || 256 * 1024;
        var len = this.arraybuffer.byteLength,
            n = len / chunk_size | 0;
        var chunks = n + (len % chunk_size ? 1 : 0);
        dataChannel.send(JSON.stringify({
            length: len,
            chunks: chunks,
            filename: this.filename
        }));
        log('sending total of ' + len + ' bytes in ' + chunks + ' chunks');
        for (var i = 0; i < n; i++) {
            var start = i * chunk_size,
                end = (i + 1) * chunk_size;
            log('sending ' + i + ' chunk');
            this.progress(i * 100 / chunks);
            dataChannel.send(this.arraybuffer.slice(start, end));
        }
        // send the reminder, if any
        if (len % chunk_size) {
            this.progress(100);
            dataChannel.send(this.arraybuffer.slice(n * chunk_size));
            if (n === 0) {
                log('sending data');
            } else {
                log('sending last chunk');
            }
        }
    };
    // ------------------------------------------------------------------------
    FileHandler.fromFile = function(file, progress) {
        return new Promise(function(resolve, reject) {
            var f = new FileReader();
            f.onload = function(e) {
                resolve(new FileHandler(file.name, e.target.result, progress));
            };
            f.onerror = function(e) {
                reject(e);
            };
            f.readAsArrayBuffer(file);
        });
    };
    // ------------------------------------------------------------------------
    // IP discovery
    // https://github.com/diafygi/webrtc-ips
    function IPSniffer(callback) {
        this._ip_regex = /([0-9]{1,3}(\.[0-9]{1,3}){3}|[a-f0-9]{1,4}(:[a-f0-9]{1,4}){7})/;
        this.reset();
        this._callback = callback;
    }
    // ------------------------------------------------------------------------
    IPSniffer.prototype.reset = function() {
        this._ip_dups = {};
    };
    // ------------------------------------------------------------------------
    IPSniffer.prototype.snoop = function(ice) {
        var ip_addr = (this._ip_regex.exec(ice.candidate.candidate) || [])[1];
        if (ip_addr && !this._ip_dups[ip_addr]) {
            this._callback(ip_addr);
        }
        this._ip_dups[ip_addr] = true;
    };
    // ------------------------------------------------------------------------
    // :: Utils
    // ------------------------------------------------------------------------
    function pad(n, width, z) {
        // ref: https://stackoverflow.com/a/10073788/387194
        z = z || '0';
        n = n + '';
        return n.length >= width ? n : new Array(width - n.length + 1).join(z) + n;
    }
    // ------------------------------------------------------------------------
    function log(str) {
        var date = new Date();
        var nums = [date.getHours(), date.getMinutes(), date.getSeconds()];
        var time_str = nums.map((n) => pad(n, 2)).join(':');
        console.log(str);
        if (typeof str !== 'string') {
            str = JSON.stringify(str);
        }
        if (str == '{}') {
            console.log(new Error().stack);
        }
        str = '[' + time_str + '] ' + str;
        textarea.value += (str.length > 100 ? str.slice(0, 97) + '...' : str) + '\n';
        textarea.scrollTop = textarea.scrollHeight;
    }
    // ------------------------------------------------------------------------
    function button(message, enabled) {
        var send = document.getElementById('send');
        if (enabled) {
            send.disabled = file.disabled = false;
        } else {
            send.disabled = file.disabled = true;
        }
        send.innerHTML = message;
    }
    // ------------------------------------------------------------------------
    function Progress() {
        this._send = document.querySelector('progress.send');
        this._recv = document.querySelector('progress.recv');
    }
    Progress.prototype.send = function(value) {
        this._send.value = Math.floor(value);
    };
    Progress.prototype.recv = function(value) {
        this._recv.value = Math.floor(value);
    };
    // ------------------------------------------------------------------------
    var dataChannel;
    var pc;
    var users = db_ref.child('users');
    var offer_sent = false;
    var file = document.getElementById('file');
    var textarea = document.querySelector('textarea');
    var connection = new FirebaseConnection();
    var ips = new IPSniffer(function(ip) {
        log('IP detected ' + ip);
    });
    var progress = new Progress();
    // ------------------------------------------------------------------------
    document.querySelector('.send-btn').addEventListener('click', function() {
        progress.recv(0);
        progress.send(0);
    });
    // ------------------------------------------------------------------------
    connection.on('recv', function(value) {
        progress.recv(value);
        log('peer receive chunk (' + Math.round(value) + '%)');
    });
    // ------------------------------------------------------------------------
    connection.on('done', function() {
        log('peer download done');
    });
    // ------------------------------------------------------------------------
    connection.on('answer', function(answer) {
        log('receive answer');
        pc.handleAnswer(answer);
        if (!offer_sent) {
            create_offer();
        }
    });
    // ------------------------------------------------------------------------
    connection.on('disconnect', function(data) {
        log('Lost connection with ' + data.id);
        button('waiting...', false);
        offer_sent = false;
        dataChannel = null;
        pc = null;
        ips.reset();
    });
    // ------------------------------------------------------------------------
    connection.on('ice', function(ice) {
        pc.processIce(ice);
        ips.snoop(ice);
    });
    // ------------------------------------------------------------------------
    connection.on('offer', function (offer) {
        log('recieve offer');
        pc.handleOffer(offer, function (err) {
            if (err) {
                log(err.toString());
                return;
            }
            log('sending answer');

            // you can just call answer
            pc.answer(function (err, answer) {
                if (err) {
                } else {
                    connection.emit('answer', answer);
                }
            });
        });
    });
    // ------------------------------------------------------------------------
    function create_pc(initiator) {
        if (pc) {
            return;
        }
        pc = new PeerConnection(servers);
        pc.on('ice', function (candidate) {
            // it's your job to send these to someone
            connection.emit('ice', candidate);
        });
        if (initiator) {
            dataChannel = pc.createDataChannel('filetransfer');
            dataChannel.binaryType = "arraybuffer";
            add_channel_handler(dataChannel);
        } else {
            pc.on('addChannel', function(channel) {
                dataChannel = channel;
                dataChannel.binaryType = "arraybuffer";
                add_channel_handler(channel);
            });
        }
    }
    // ------------------------------------------------------------------------
    function create_offer() {
        if (offer_sent) {
            return;
        }
        log('sending offer');
        offer_sent = true;
        pc.offer(function(err, offer) {
            if (err) {
                log(err.toString());
            } else {
                connection.emit('offer', offer);
            }
        });
    }
    // ------------------------------------------------------------------------
    file.addEventListener('change', function(e) {
        // happen on select file (send) + then select and cancel
        if (e.target.files.length) {
            FileHandler.fromFile(e.target.files[0], function(percent) {
                progress.send(percent);
            }).then(function(handler) {
                handler.send(dataChannel);
            });
        }
    });
    // ------------------------------------------------------------------------
    var message_callback = (function() {
        var buf, count, meta;
        var n;
        return function onmessage(event) {
            console.log(event);
            if (typeof event.data === 'string') {
                meta = JSON.parse(event.data);
                buf = window.buf = new Uint8ClampedArray(meta.length);
                n = count = 0;
                file.disable = true;
                log('Expecting a total of ' + buf.byteLength + ' bytes in ' + meta.chunks + ' chunks');
                return;
            }
            var data = new Uint8ClampedArray(event.data);
            buf.set(data, count);
            var len = (data.byteLength || event.data.size);
            count += len;
            n += 1;
            var percent = n * 100 / meta.chunks;
            log('receive ' + len + ' data (' + Math.round(percent) + '%)');
            connection.emit('recv', percent);
            progress.recv(percent);
            if (count === buf.byteLength) {
                // we're done: all data chunks have been received
                log('Done. downloading.');
                connection.emit('done');
                file.disable = false;
                new FileHandler(meta.filename, buf.buffer).save();
            }
        };
    })();
    // ------------------------------------------------------------------------
    function add_channel_handler(channel) {
        channel.onopen = function() {
            button('send', true);
            log('CHANNEL opened!!!');
        };
        channel.onmessage = message_callback;
        channel.onerror = function(e) {
            log(e.message);
        };
    }
    // ------------------------------------------------------------------------
    // :: init code
    // ------------------------------------------------------------------------
    function init() {
        var ref = users.push();
        ref.onDisconnect().remove();
        var update = {};
        update[ref.key] = {id: connection.getSessionid()};
        users.update(update);
    }
    init();
    // ------------------------------------------------------------------------
    users.once('value', function(snapshot) {
        var data = snapshot.val();
        console.log(data);
        console.log(JSON.stringify(data));
        if (data) {
            if (Object.keys(data).length == 2) {
                create_pc(false);
            }
        }
    });
    // ------------------------------------------------------------------------
    users.limitToLast(1).on('child_added', function(snapshot) {
        var data = snapshot.val();
        if (data.id != connection.getSessionid()) {
            create_pc(true);
            create_offer();
        }
    });
})();
