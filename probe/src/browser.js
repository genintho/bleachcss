import { Probe } from "./probe";
const url = "https://f322a8dccbdb.ngrok.io";
window.BleachCSS = new Probe({
	url,
});
BleachCSS.start({ url, debug: true });
