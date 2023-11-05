import "dotenv/config";
import Server from "./server.js";
import * as fs from "fs";

function setup() {
    const server = new Server(process.env.HOST, process.env.PORT);

    const ledStatusMap = new Map();

    server.addEndpoint("/dashboard", "GET", () => {
        return {
            status: 200,
            headers: {
                "Content-Type": "text/html"
            },
            data: fs.readFileSync("dashboard.html")
        };
    });

    server.addEndpoint("/", "GET", () => {
        return {
            status: 302,
            headers: {
                Location: "/dashboard"
            }
        };
    });

    server.addEndpoint("/status/:ledId", "POST", (requestData) => {
        if (!requestData.dynamicParameters) {
            return { status: 500 };
        }

        const { ledId } = requestData.dynamicParameters;
        const isEnabled = requestData.parsedBody === "1";

        if (isEnabled) {
            ledStatusMap.set(ledId, "1");
        } else {
            ledStatusMap.set(ledId, "0");
        }
    });

    server.addEndpoint("/status/:ledId", "GET", (requestData) => {
        if (!requestData.dynamicParameters) {
            return { status: 500 };
        }

        const { ledId } = requestData.dynamicParameters;

        // Should perhaps check if the led exists in the first place, and throw an error if not
        // On the other hand, if there is no led, it will always be turned off
        const ledStatus = ledStatusMap.get(ledId) || "0";

        return {
            status: 200,
            headers: {
                "Content-Type": "text/plain"
            },
            data: ledStatus === "1" ? "1" : "0"
        };
    });
}

setup();
