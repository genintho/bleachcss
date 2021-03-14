import * as fs from "fs";
import * as fse from "fs-extra";
import * as targz from "targz";
import { exec } from "child_process";
import * as _ from "lodash";

export function read(filePath: string): Promise<string> {
    return new Promise<string>((resolve, reject) => {
        fs.readFile(filePath, { encoding: "utf-8" }, (err, content) => {
            err ? reject(err) : resolve(content);
        });
    });
}

export function write(filePath: string, content: any): Promise<void> {
    return new Promise<void>((resolve, reject) => {
        fs.writeFile(filePath, content, (err) => {
            err ? reject() : resolve();
        });
    });
}

export function mkDirTemp(prefix: string): Promise<string> {
    // The parent directory for the new temporary directory
    const tmpDir = "/tmp/" + prefix;

    return new Promise<string>((resolve, reject) => {
        fs.mkdtemp(tmpDir, (err, folder) => {
            err ? reject(err) : resolve(folder);
        });
    });
}

export function rmDir(pathOfDir: string): Promise<void> {
    return new Promise<void>((resolve, reject) => {
        fse.remove(pathOfDir, (err) => {
            err ? reject(err) : resolve();
        });
    });
}

export function untar(
    pathToArchive: string,
    destination: string
): Promise<void> {
    return new Promise<void>((resolve, reject) => {
        // decompress files from tar.gz archive
        targz.decompress(
            {
                src: pathToArchive,
                dest: destination,
            },
            function(err) {
                err ? reject() : resolve();
            }
        );
    });
}

export function findInPath(pathInput: string): Promise<string[]> {
    return new Promise<string[]>((resolve, reject) => {
        // @FIXME escape command
        const cmd =
            "find " +
            pathInput +
            ' -type f -iname "*.css" -or -iname "*.scss" -or -iname "*.sass" | grep -v node_modules';
        exec(cmd, (error, stdout, stderr) => {
            if (error) {
                reject(`exec error: ${error}`);
                return;
            }

            const files = _.compact(stdout.split("\n"));
            resolve(files);
        });
    });
}
