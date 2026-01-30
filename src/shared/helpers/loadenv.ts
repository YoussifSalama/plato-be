function loadEnv(): string {
    const nodeEnv = process.env.NODE_ENV || "development";
    const paths = [".env.development", ".env.test", ".env.production"];
    switch (nodeEnv) {
        case "development":
            return paths[0];
        case "test":
            return paths[1];
        case "production":
            return paths[2];
        default:
            return paths[0];
    }
}

export default loadEnv;