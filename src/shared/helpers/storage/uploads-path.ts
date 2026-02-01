import * as fs from "fs";
import * as path from "path";

const findProjectRoot = () => {
    let current = process.cwd();
    for (let i = 0; i < 6; i += 1) {
        if (fs.existsSync(path.join(current, "package.json"))) {
            return current;
        }
        const parent = path.dirname(current);
        if (parent === current) {
            break;
        }
        current = parent;
    }
    return process.cwd();
};

export const ensureUploadsDir = (subdir?: string) => {
    const root = findProjectRoot();
    const base = path.join(root, "uploads");
    if (!fs.existsSync(base)) {
        fs.mkdirSync(base, { recursive: true });
    }
    if (!subdir) {
        return base;
    }
    const full = path.join(base, subdir);
    if (!fs.existsSync(full)) {
        fs.mkdirSync(full, { recursive: true });
    }
    return full;
};

