import "dotenv/config";
import Server from "./server.js";

function setup() {
    const server = new Server(process.env.HOST, process.env.PORT);

    server.addEndpoint("/dashboard", "GET", () => {
        // TODO: Serve dashboard
        console.log("Get request received");
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
        // TODO: Set status
        console.log("Got a post with the following request data", requestData);
    });

    server.addEndpoint("/status/:ledId", "GET", () => {
        // TODO: Get status
        console.log("Got a GET asking for the LED status");
    });
}

setup();
