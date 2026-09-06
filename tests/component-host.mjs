import { createServer } from "node:http";
createServer((_req, res) => {
res.setHeader("Content-Type", "text/html");
res.end(`<!doctype html><meta name="viewport" content="width=device-width,initial-scale=1">
<style>body{margin:0;font:16px Arial}#player{width:min(100%,900px);margin:auto}input,button{min-height:44px}</style>
<label>Host text<input></label><button onclick="this.textContent='Host clicked'">Host button</button><div id="player"></div>
<script>window.ready=[];window.failures=[];window.rounds=[];for(const [event,list] of [['pma-ready','ready'],['pma-error','failures'],['pma-round-ended','rounds']])document.addEventListener(event,e=>window[list].push(e.detail));</script>
<script type="module">import 'http://127.0.0.1:5301/component.js';document.querySelector('#player').append(document.createElement('pma-defense-arcade'));</script>`);
}).listen(5302,"127.0.0.1");
