<?php
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
    return strtolower($adjectives[$j] . '-' . $nouns[$i]);
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

$root = preg_replace("|/[^/]+$|", "/", $_SERVER['REQUEST_URI']);

?><!DOCTYPE html>
<html>
  <head>
    <title>P2P File Share (<?= $_GET["room"] ?>)</title>
    <meta name="description" content="Web application for sharing files between computers."/>
    <link rel="shortcut icon" href="<?= $root ?>favicon.ico">
    <script src="https://www.gstatic.com/firebasejs/7.1.0/firebase-app.js"></script>
    <script src="https://www.gstatic.com/firebasejs/7.1.0/firebase-database.js"></script>
    <script src="<?= $root ?>js/rtcpeerconnection.bundle.js"></script>
    <script>var room = '<?= $_GET['room'] ?>';</script>
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <link rel="stylesheet" href="<?= $root ?>css/style.css"/>
  </head>
  <body>
    <header>
      <h1>P2P file transfer</h1>
      <h2>Room "<?= $_GET["room"] ?>"</h2>
    </header>
    <div class="loader">
      <progress class="send" value="0" max="100"></progress>
      <progress class="recv" value="0" max="100"></progress>
      <div class="send-btn">
        <input type="file" id="file" disabled/>
        <button id="send" disabled>waiting...</button>
      </div>
    </div>
    <div class="qr-image">
      <img id="qr" src="<?= qr() ?>"/>
    </div>
    <details>
      <summary>Connection Log</summary>
      <textarea class="log" readonly></textarea>
    </details>
    <script src="<?= $root ?>js/main.js"></script>
  </body>
</html>
