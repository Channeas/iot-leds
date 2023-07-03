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

            let dynamicParameters;
            if (endpointHandler.isDynamicEndpoint) {
                dynamicParameters = this._getDynamicParameters(
                    request.url,
                    endpointHandler
                );
            }

            const contentType = request.headers["content-type"];

            const rawBody = await this._getBodyData(request);
            const parsedBody = this._parseBody(rawBody, contentType);

            const queryString = request.url.split("?")[1];

            const responseResult = await endpointHandler.handler({
                contentType,
                dynamicParameters,
                parsedBody,
                rawBody,
                queryString
            });

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

        // First check if there is an exact match for the request URL, IE the URL is static
        if (endpointHandlers && endpointHandlers[method]) {
            return endpointHandlers[method];
        }

        const dynamicEndpointHandlers = this._lookForDynamicEndpointHandler(
            urlWithoutQueryString
        );

        return dynamicEndpointHandlers && dynamicEndpointHandlers[method];
    }

    _lookForDynamicEndpointHandler(url) {
        return this._recursiveGenerateDynamicEndpoint(
            "",
            url.substring(1).split("/")
        );
    }

    _recursiveGenerateDynamicEndpoint(startUrl, remainingUrlSegments) {
        if (remainingUrlSegments.length === 0) {
            return this._endpoints.get(startUrl);
        }

        const segments = [...remainingUrlSegments];
        const foundMatch = this._recursiveGenerateDynamicEndpoint(
            `${startUrl}/${segments.shift()}`,
            segments
        );
        if (foundMatch) {
            return foundMatch;
        }

        const secondMatch = this._recursiveGenerateDynamicEndpoint(
            `${startUrl}/$DYNAMIC`,
            segments
        );
        if (secondMatch) {
            return secondMatch;
        }

        return null;
    }

    _getDynamicParameters(requestUrl, endpointHandler) {
        const segments = requestUrl.split("/");
        const dynamicSegments = endpointHandler.path.split("/");
        const dynamicParameters = {};

        for (const index in dynamicSegments) {
            const isDynamic = dynamicSegments[index].startsWith(":");
            if (isDynamic) {
                const alias = dynamicSegments[index].substring(1);
                if (!alias) {
                    continue;
                }

                const parameterValue = segments[index];
                dynamicParameters[alias] = parameterValue;
            }
        }

        return dynamicParameters;
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

    addEndpoint(endpointPath, httpMethod, handler) {
        let dynamicPath;

        const isDynamicEndpoint = endpointPath.includes(":");
        if (isDynamicEndpoint) {
            dynamicPath = this._parseDynamicEndpointPath(endpointPath);
        }

        const endpointHandlers =
            this._endpoints.get(dynamicPath || endpointPath) || {};
        const upperCaseHttpMethod = httpMethod.toUpperCase();

        const methodAlreadyExistsForEndpoint =
            !!endpointHandlers[upperCaseHttpMethod];
        if (methodAlreadyExistsForEndpoint) {
            throw new Error(
                `Endpoint ${upperCaseHttpMethod} ${endpointPath} already has a handler`
            );
        }

        endpointHandlers[upperCaseHttpMethod] = {
            handler,
            isDynamicEndpoint,
            dynamicPath,
            path: endpointPath
        };
        this._endpoints.set(dynamicPath || endpointPath, endpointHandlers);
    }

    _parseDynamicEndpointPath(initialPath) {
        const aliases = [];

        let modifiedPath = initialPath;
        while (modifiedPath.includes(":")) {
            const startIndex = modifiedPath.indexOf(":");
            const endIndex = modifiedPath.indexOf("/", startIndex);
            const alias = modifiedPath.slice(
                startIndex + 1,
                endIndex === -1 ? modifiedPath.length : endIndex
            );

            aliases.push(alias);
            modifiedPath = modifiedPath.replace(`:${alias}`, "$DYNAMIC");
        }

        return modifiedPath;
    }
}
