import { Probe } from "./probe";
const url = "https://494d7db78f50.ngrok.io";
window.BleachCSS = new Probe({
	url,
});
BleachCSS.start({ url, debug: true });
