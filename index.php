<?php
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

if (!isset($_GET['room']) && empty($_GET['room'])) {
    $url = self_url();
    $room = generate_name();
    if (preg_match("/index.php/", $url)) {
        $url .= "?room=$room";
    } else {
        if (!preg_match("|/$|", $url)) {
            $url .= "/";
        }
        $url .= $room;
    }
    header('Location: ' . $url, true, 302);
    die();
}


function generate_name() {
    $nouns = explode("\n", file_get_contents("nouns.txt"));
    $adjectives = explode("\n", file_get_contents("adjectives.txt"));
    $i = array_rand($nouns);
    $j = array_rand($adjectives);
    return strtolower($nouns[$i] . "-" . $adjectives[$j]);
}

function self_url() {
    $protocol = (isset($_SERVER["HTTPS"]) && $_SERVER["HTTPS"] === "on" ? "https" : "http");
    return "$protocol://$_SERVER[HTTP_HOST]$_SERVER[REQUEST_URI]";
}

function qr() {
    ob_start();
    QRCode::png(self_url(), null, QR_ECLEVEL_L, 10);
    $img = "data:image/png;base64," . base64_encode(ob_get_contents());
    ob_end_clean();
    return $img;
}

require('phpqrcode/qrlib.php');

$root = preg_replace("|[^/]*$|", "/", $_SERVER['REQUEST_URI']);

?><!DOCTYPE html>
<html>
  <head>
    <title>P2P File Share (<?= $_GET["room"] ?>)</title>
    <link rel="shortcut icon" href="<?= $root ?>favicon.ico">
    <script src="https://www.gstatic.com/firebasejs/7.1.0/firebase-app.js"></script>
    <script src="https://www.gstatic.com/firebasejs/7.1.0/firebase-database.js"></script>
    <script src="<?= $root ?>js/rtcpeerconnection.bundle.js"></script>
    <script>var room = '<?= $_GET['room'] ?>';</script>
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <style>
     div {
  float: left;
  position: relative;
  overflow: hidden;
  width: 100px;
  height: 20px;
}
div input {
  right: 0;
}
div button, div input {
  position: absolute;
  right: 0;
}
div button, div input:not([disabled]) {
  cursor: pointer;
}
div input:hover:not([disabled]) + button,
div input:active:not([disabled]) + button {
  border-style: inset;
  border-width: 1px;
}

div button {
  left: 0;
  pointer-events: none;
  z-index: 10;
  width: 100%;
  height: 100%;
  box-sizing: border-box;
}
textarea {
  max-width: calc(100% - 10px);
}
     #qr {
         max-width: 100%;
     }
    </style>
  </head>
  <body>
    <h1>Room: <?= $_GET["room"] ?></h1>
    <div>
      <input type="file" id="file" disabled/>
      <button id="send">waiting...</button>
    </div>
    <br/>
    <progress class="send"></progress>
    <progress class="receive"></progress>
    <br/>
    <br/>
    <textarea cols="120" rows="7"></textarea>
    <script src="<?= $root ?>js/main.js"></script>
    <br/>
    <img id="qr" src="<?= qr() ?>"/>
  </body>
</html>
