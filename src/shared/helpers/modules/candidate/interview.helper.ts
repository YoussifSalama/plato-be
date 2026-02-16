import * as fs from "fs";
import * as path from "path";
import { ensureUploadsDir } from "src/shared/helpers/storage/uploads-path";

const ANSWER_GROUP_PREFIX = "answer_";
const WAV_HEADER_BYTES = 44;

const stripWavHeader = (buffer: Buffer) =>
    buffer.length > WAV_HEADER_BYTES ? buffer.subarray(WAV_HEADER_BYTES) : Buffer.alloc(0);

const concatWavBuffers = (buffers: Buffer[]) => {
    if (buffers.length === 0) {
        return Buffer.alloc(0);
    }
    const header = buffers[0].subarray(0, WAV_HEADER_BYTES);
    const dataChunks = buffers.map((buffer, index) =>
        index === 0 ? buffer.subarray(WAV_HEADER_BYTES) : stripWavHeader(buffer)
    );
    return Buffer.concat([header, ...dataChunks]);
};

export const getSessionChunksDirectory = (interviewSessionId: number) => {
    const candidateChunksFolder = ensureUploadsDir("candidate/interview/chunks");
    const candidateChunksPath = path.join(candidateChunksFolder, interviewSessionId.toString());
    if (!fs.existsSync(candidateChunksPath)) {
        fs.mkdirSync(candidateChunksPath, { recursive: true });
    }
    return candidateChunksPath;
};

export const getAnswerGroupDirectory = (
    chunksDirectoryName: string,
    groupIndex: number,
    ensure = false
) => {
    const chunksGroupDirectoryName = path.join(
        chunksDirectoryName,
        `${ANSWER_GROUP_PREFIX}${groupIndex}`
    );
    if (ensure && !fs.existsSync(chunksGroupDirectoryName)) {
        fs.mkdirSync(chunksGroupDirectoryName, { recursive: true });
    }
    return chunksGroupDirectoryName;
};

export const getLatestAnswerGroupIndex = (chunksDirectoryName: string) => {
    if (!fs.existsSync(chunksDirectoryName)) {
        return 1;
    }
    const entries = fs.readdirSync(chunksDirectoryName, { withFileTypes: true });
    const indices = entries
        .filter((entry) => entry.isDirectory())
        .map((entry) => {
            const match = new RegExp(`^${ANSWER_GROUP_PREFIX}(\\d+)$`).exec(entry.name);
            return match ? Number(match[1]) : null;
        })
        .filter((value): value is number => value !== null && !Number.isNaN(value));
    return indices.length ? Math.max(...indices) : 1;
};

export const writeAudioChunkToFile = (
    chunksDirectoryName: string,
    groupIndex: number,
    chunk: Buffer
) => {
    const chunksGroupDirectoryName = getAnswerGroupDirectory(
        chunksDirectoryName,
        groupIndex,
        true
    );
    const chunkFilePath = path.join(chunksGroupDirectoryName, `${Date.now()}.wav`);
    fs.writeFileSync(chunkFilePath, chunk);
    return chunkFilePath;
};

export const combineAnswerGroupChunks = (chunksDirectoryName: string, groupIndex: number) => {
    const chunksGroupDirectoryName = getAnswerGroupDirectory(
        chunksDirectoryName,
        groupIndex,
        false
    );
    if (!fs.existsSync(chunksGroupDirectoryName)) {
        throw new Error("No chunks group found for this answer.");
    }
    const chunkFiles = fs
        .readdirSync(chunksGroupDirectoryName)
        .filter((file) => file.endsWith(".wav"))
        .sort();
    if (chunkFiles.length === 0) {
        throw new Error("No chunks found for this answer.");
    }
    const buffers = chunkFiles.map((file) =>
        fs.readFileSync(path.join(chunksGroupDirectoryName, file))
    );
    const combinedBuffer = concatWavBuffers(buffers);
    const combinedFilePath = path.join(
        chunksGroupDirectoryName,
        `${ANSWER_GROUP_PREFIX}${groupIndex}.wav`
    );
    fs.writeFileSync(combinedFilePath, combinedBuffer);
    return combinedFilePath;
};

