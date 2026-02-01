module.exports = {
    apps: [
        {
            name: "plato-be",
            script: "dist/src/main.js",
            env: {
                NODE_ENV: "production",
            },
            watch: false,
            ignore_watch: ["node_modules", "uploads", "uploads/**"],
        },
    ],
};

