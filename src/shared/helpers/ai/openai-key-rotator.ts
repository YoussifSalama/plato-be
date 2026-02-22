export class OpenAiKeyRotator {
    private readonly keys: string[];
    private index = 0;

    constructor(keys: string[]) {
        if (!keys.length) throw new Error("No OpenAI API keys provided.");
        this.keys = keys;
    }

    next(): string {
        const key = this.keys[this.index];
        this.index = (this.index + 1) % this.keys.length;
        return key;
    }
}