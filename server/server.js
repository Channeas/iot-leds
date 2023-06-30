import * as http from "http";

export default class Server {
    constructor(host, port) {
        console.log(`Trying to create a server at ${host}:${port}`);

        this._server = new http.Server();

        this._server.listen(port, host, () =>
            this._handleServerReady(host, port)
        );

        this._server.on("request", (request, response) =>
            this._handleRequest(request, response)
        );

        this._endpoints = new Map();
    }

    _handleServerReady(host, port) {
        console.log(`Server is live at ${host}:${port}`);
    }

    async _handleRequest(request, response) {
        console.log(`${request.method} ${request.url}`);

        try {
            const endpointHandler = this._getEndpointHandler(
                request.url,
                request.method
            );
            if (!endpointHandler) {
                response.writeHead(404);
                response.end();
                return;
            }

            const rawBody = await this._getBodyData(request);
            const parsedBody = this._parseBody(
                rawBody,
                request.headers["content-type"]
            );

            const responseResult = await endpointHandler(parsedBody);

            if (!responseResult) {
                response.writeHead(200);
                response.end();
                return;
            }

            const { status = 200 } = responseResult;
            response.writeHead(status, responseResult.headers || {});
            response.end(responseResult.data);
        } catch (error) {
            response.writeHead(500);
            response.end(error.toString());
        }
    }

    _getEndpointHandler(url, method) {
        const urlWithoutQueryString = url.split("?")[0];
        const endpointHandlers = this._endpoints.get(urlWithoutQueryString);

        if (!endpointHandlers) {
            return null;
        }

        return endpointHandlers[method];
    }

    async _getBodyData(request) {
        return new Promise((resolve) => {
            const buffer = [];
            request
                .on("data", (chunk) => {
                    buffer.push(chunk);
                })
                .on("end", () => {
                    resolve(Buffer.concat(buffer).toString());
                });
        });
    }

    _parseBody(rawBody, contentType) {
        if (!rawBody) {
            return null;
        }

        const parser = {
            "application/json": () => JSON.parse(rawBody)
        }[contentType];

        if (!parser) {
            return rawBody;
        }

        return parser();
    }

    addEndpoint(endpoint, httpMethod, handler) {
        const endpointHandlers = this._endpoints.get(endpoint) || {};
        const upperCaseHttpMethod = httpMethod.toUpperCase();

        const methodAlreadyExistsForEndpoint =
            !!endpointHandlers[upperCaseHttpMethod];
        if (methodAlreadyExistsForEndpoint) {
            throw new Error(
                `Endpoint ${endpoint} already has a handler for the ${upperCaseHttpMethod} method`
            );
        }

        endpointHandlers[upperCaseHttpMethod] = handler;
        this._endpoints.set(endpoint, endpointHandlers);
    }
}
