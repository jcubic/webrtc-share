<?php

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
