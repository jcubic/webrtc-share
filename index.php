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
    echo $room;
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
?><!DOCTYPE html>
<html>
  <head>
    <title>File Share P2P App using WebRTC</title>
  </head>
  <body>
    <h1>Room: <?= $_GET["room"] ?></h1>
  </body>
</html>
