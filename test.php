<?php



$url = 'http://localhost:3000/api/v1/probe/report';
$data = array('k' => 'value1', 'v' => 'value2', 'f' => [
    'https://github.githubassets.com/assets/frameworks-3d85abd8e6af4fc72b0afa253e125ef9.css' => ['.btn']
]);

// use key 'http' even if you send the request to https://...
$options = array(
    'http' => array(
        'header'  => "Content-type: text/plain\r\n",
        'method'  => 'POST',
        'content' => json_encode($data)
    )
);
$context  = stream_context_create($options);
$result = file_get_contents($url, false, $context);
if ($result === FALSE) { /* Handle error */ }

var_dump($result);