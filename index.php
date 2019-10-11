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
if (!isset($_GET['room']) && empty($_GET['room']) && !is_facebook()) {
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


function is_facebook() {
    return strpos($_SERVER["HTTP_USER_AGENT"], "facebookexternalhit/") !== false ||
           strpos($_SERVER["HTTP_USER_AGENT"], "Facebot") !== false;
}

function generate_name() {
    $nouns = explode("\n", file_get_contents("nouns.txt"));
    $adjectives = explode("\n", file_get_contents("adjectives.txt"));
    $i = array_rand($nouns);
    $j = array_rand($adjectives);
    return strtolower($adjectives[$j] . '-' . $nouns[$i]);
}

function self_url() {
    return origin() . strtok($_SERVER[REQUEST_URI], '?');
}

function origin() {
    $protocol = (isset($_SERVER["HTTPS"]) && $_SERVER["HTTPS"] === "on" ? "https" : "http");
    return "$protocol://$_SERVER[HTTP_HOST]";
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

$origin = origin();

?><!DOCTYPE html>
<html>
  <head>
    <title>P2P File Share (<?= $_GET["room"] ?>)</title>
    <meta name="description" content="Web application for sharing files between computers. Work on Mobile and Desktop."/>
    <link rel="shortcut icon" href="<?= $root ?>favicon.ico">
    <link rel="canonical" href="<?= $origin . $root ?>"/>
    <!-- share meta tags -->
    <!-- Facebook -->
    <meta property="og:locale" content="en_EN"/>
    <meta property="og:type" content="article"/>
    <meta property="og:title" content="P2P File Share"/>
    <meta property="og:description" content="Web application for sharing files between computers. Work on Mobile and Desktop."/>
    <meta property="og:url" content="<?= $origin . $root ?>"/>
    <meta property="og:site_name" content="P2P File Share"/>
    <meta property="og:image" content="<?= $origin .$root ?>img/cover.png"/>
    <!-- twitter -->
    <meta name="twitter:image" content="<?= $origin . $root ?>img/cover.png"/>
    <meta name="twitter:image:alt" content="Vector illustration with computers, file icon and arrows"/>
    <meta name="twitter:title" content="P2P File Share"/>
    <meta name="twitter:description" content="Web application for sharing files between computers. Work on Mobile and Desktop."/>
    <meta name="twitter:card" content="summary_large_image"/>
    <meta name="twitter:site" content="@jcubic"/>
    <meta name="twitter:creator" content="@jcubic"/>

    <script src="https://www.gstatic.com/firebasejs/7.1.0/firebase-app.js"></script>
    <script src="https://www.gstatic.com/firebasejs/7.1.0/firebase-database.js"></script>
    <script src="<?= $root ?>js/rtcpeerconnection.bundle.js"></script>

    <script>var room = '<?= $_GET['room'] ?>';</script>
    <link rel="stylesheet" href="<?= $root ?>css/style.css"/>

    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  </head>
  <body>
    <a href="https://github.com/jcubic/webrtc-share/" class="github-corner" aria-label="View source on GitHub"><svg width="80" height="80" viewBox="0 0 250 250" style="fill:#fff; color:#151513; position: absolute; top: 0; border: 0; right: 0;" aria-hidden="true"><path d="M0,0 L115,115 L130,115 L142,142 L250,250 L250,0 Z"></path><path d="M128.3,109.0 C113.8,99.7 119.0,89.6 119.0,89.6 C122.0,82.7 120.5,78.6 120.5,78.6 C119.2,72.0 123.4,76.3 123.4,76.3 C127.3,80.9 125.5,87.3 125.5,87.3 C122.9,97.6 130.6,101.9 134.4,103.2" fill="currentColor" style="transform-origin: 130px 106px;" class="octo-arm"></path><path d="M115.0,115.0 C114.9,115.1 118.7,116.5 119.8,115.4 L133.7,101.6 C136.9,99.2 139.9,98.4 142.2,98.6 C133.8,88.0 127.5,74.4 143.8,58.0 C148.5,53.4 154.0,51.2 159.7,51.0 C160.3,49.4 163.2,43.6 171.4,40.1 C171.4,40.1 176.1,42.5 178.8,56.2 C183.1,58.6 187.2,61.8 190.9,65.4 C194.5,69.0 197.7,73.2 200.1,77.6 C213.8,80.2 216.3,84.9 216.3,84.9 C212.7,93.1 206.9,96.0 205.4,96.6 C205.1,102.4 203.0,107.8 198.3,112.5 C181.9,128.9 168.3,122.5 157.7,114.1 C157.9,116.9 156.7,120.9 152.7,124.9 L141.0,136.5 C139.8,137.7 141.6,141.9 141.8,141.8 Z" fill="currentColor" class="octo-body"></path></svg></a><style>.github-corner:hover .octo-arm{animation:octocat-wave 560ms ease-in-out}@keyframes octocat-wave{0%,100%{transform:rotate(0)}20%,60%{transform:rotate(-25deg)}40%,80%{transform:rotate(10deg)}}@media (max-width:500px){.github-corner:hover .octo-arm{animation:none}.github-corner .octo-arm{animation:octocat-wave 560ms ease-in-out}}</style>
    <header>
      <h1>P2P file transfer</h1>
      <h2>Room "<?= $_GET["room"] ?>" <a class="new-btn" href="<?= $root ?>">New Room</a></h2>
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
