import { createMocks } from "node-mocks-http";
import type { Body, RequestMethod } from "node-mocks-http";
import type { NextApiHandler, NextApiRequest, NextApiResponse } from "next";

type ApiRequestOptions = {
    method: RequestMethod;
    query?: Record<string, string>;
    body?: Body;
    headers?: Record<string, string>;
}

export async function callApi(handler: NextApiHandler, options: ApiRequestOptions) {
    const { method, query, body, headers } = options;
    
    const { req, res } = createMocks({
        method,
        query,
        body,
        headers
    });

    await handler(req as NextApiRequest, res as NextApiResponse);

    return {
        status: res._getStatusCode(),
        json: () => JSON.parse(res._getData()),
        headers: res._getHeaders()
    }
}
