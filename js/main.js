/*  This file is part of WebRTC Share (send.jcubic.pl)
 *  Application code for WebRTC/Firebase based P2P file sharing app
 *
 *  Copyright (C) Jakub T. Jankiewicz <https://jcubic.pl>
 *
 *  WebRTC Share is free software: you can redistribute it and/or modify
 *  it under the terms of the GNU General Public License as published by
 *  the Free Software Foundation, either version 3 of the License, or
 *  (at your option) any later version.
 *
 *  Foobar is distributed in the hope that it will be useful,
 *  but WITHOUT ANY WARRANTY; without even the implied warranty of
 *  MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 *  GNU General Public License for more details.
 *
 *  You should have received a copy of the GNU General Public License
 *
 * MIT licensed POC can be found at https://codepen.io/jcubic/pen/yvMeRg
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
    firebase.initializeApp(config);
    var db_ref = firebase.database().ref('send/' + room);
    // ------------------------------------------------------------------------
    // :: Firebase based Events
    // ------------------------------------------------------------------------
    function FirebaseConnection() {
        this.randId = Math.floor(Math.random() * 1000000000);
        log('Client ID: ' + this.randId);
        this.connection = this.connect();
        this.connection.onDisconnect().set([{
            type: 'disconnect',
            sender: null, // send to both
            data: JSON.stringify({id: this.getSessionid()})
        }]);
    }
    // ------------------------------------------------------------------------
    FirebaseConnection.prototype.connect = function(room) {
        db_ref.child('webRTC').remove();
        return db_ref.child('webRTC');
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
            data: JSON.stringify(data)
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
    // :: File Handler
    // ------------------------------------------------------------------------
    function FileHandler(filename, arrayBuffer) {
        this.filename = filename;
        this.arraybuffer = arrayBuffer;
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
        dataChannel.send(JSON.stringify({
            length: len,
            filename: this.filename
        }));
        log('sending total of ' + len + ' bytes in ' + n + ' chunks');
        for (var i = 0; i < n; i++) {
            var start = i * chunk_size,
                end = (i + 1) * chunk_size;
            log('sending ' + i + ' chunk');
            dataChannel.send(this.arraybuffer.slice(start, end));
        }
        // send the reminder, if any
        if (len % chunk_size) {
            dataChannel.send(this.arraybuffer.slice(n * chunk_size));
            if (n === 0) {
                log('sending data');
            } else {
                log('sending last chunk');
            }
        }
    };
    // ------------------------------------------------------------------------
    FileHandler.fromFile = function(file) {
        return new Promise(function(resolve, reject) {
            var f = new FileReader();
            f.onload = function(e) {
                resolve(new FileHandler(file.name, e.target.result));
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
    function log(str) {
        console.log(str);
        if (typeof str !== 'string') {
            str = JSON.stringify(str);
        }
        if (str == '{}') {
            console.log(new Error().stack);
        }
        textarea.value += (str.length > 100 ? str.slice(0, 97) + '...' : str) + '\n';
    }
    // ------------------------------------------------------------------------
    function button(message, enabled) {
        if (enabled) {
            file.removeAttribute('disabled');
        } else {
            file.addAttribute('disabled', 'disabled');
        }
        var send = document.getElementById('send');
        send.innerHTML = message;
    }
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
    // ------------------------------------------------------------------------

    connection.on('answer', function(answer) {
        log('receive answer');
        pc.handleAnswer(answer);
        if (!offer_sent) {
            create_offer();
        }
    });
    connection.on('disconnect', function(data) {
        log('Lost connection with ' + data.id);
        offer_sent = false;
        dataChannel = null;
        pc = null;
        ips.reset();
    });
    connection.on('ice', function(ice) {
        pc.processIce(ice);
        ips.snoop(ice);
    });
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
        FileHandler.fromFile(e.target.files[0]).then(function(handler) {
            handler.send(dataChannel);
        });
    });
    // ------------------------------------------------------------------------
    var message_callback = (function() {
        var buf, count, meta;
        return function onmessage(event) {
            console.log(event);
            if (typeof event.data === 'string') {
                meta = JSON.parse(event.data);
                buf = window.buf = new Uint8ClampedArray(meta.length);
                count = 0;
                log('Expecting a total of ' + buf.byteLength + ' bytes');
                return;
            }
            var data = new Uint8ClampedArray(event.data);
            buf.set(data, count);
            var len = (data.byteLength || event.data.size);
            count += len;
            log('receive ' + len + ' data');
            if (count === buf.byteLength) {
                // we're done: all data chunks have been received
                log('Done. downloading.');
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
        users.push({
            id: connection.getSessionid()
        });
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