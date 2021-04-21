import axios from "axios";
import * as fs from "fs";

export function toVariable(url: string) {
	return axios
		.request({
			responseType: "text",
			url,
			method: "get",
			headers: {
				"Content-Type": "text/css",
			},
		})
		.then((result) => {
			return result.data;
		});
}
