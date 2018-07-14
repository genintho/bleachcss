import * as postcss from "postcss";

/**
 * Convert a Post Object to a CSS string
 *
 * @param {postcss} pcss
 * @param {function} cb
 */
export function stringify(pcss: any): Promise<string> {
    return new Promise<string>((resolve, reject) => {
        let newCssStr = "";
        postcss.stringify(pcss.root, (result) => {
            newCssStr += result;
        });
        resolve(newCssStr);
    });
}
