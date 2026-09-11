import assert from "node:assert/strict";
import http from "node:http";
import OpenAI, { toFile } from "openai";
import { openAIClientOptions } from "@/lib/providers/adapters/openai-provider-adapter";

interface CapturedRequest {
  method: string;
  url: string;
  contentType: string | undefined;
  body: Buffer;
}

function listen(server: http.Server) {
  return new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
}

function port(server: http.Server) {
  const address = server.address();
  assert.ok(address && typeof address === "object");
  return address.port;
}

async function close(server: http.Server) {
  await new Promise<void>((resolve, reject) => server.close((error) => (error ? reject(error) : resolve())));
}

function okImageResponse() {
  return JSON.stringify({
    created: 1,
    data: [
      {
        b64_json: Buffer.from("ok").toString("base64")
      }
    ],
    output_format: "png",
    quality: "medium",
    size: "1024x1024"
  });
}

async function main() {
  const previousHttpsProxy = process.env.HTTPS_PROXY;
  const previousHttpProxy = process.env.HTTP_PROXY;
  const previousLowerHttpsProxy = process.env.https_proxy;
  const previousLowerHttpProxy = process.env.http_proxy;
  const capturedRequests: CapturedRequest[] = [];
  let proxyHits = 0;
  let targetPort = 0;

  const target = http.createServer((request, response) => {
    const chunks: Buffer[] = [];
    request.on("data", (chunk: Buffer) => chunks.push(chunk));
    request.on("end", () => {
      const body = Buffer.concat(chunks);
      capturedRequests.push({
        method: request.method ?? "",
        url: request.url ?? "",
        contentType: request.headers["content-type"],
        body
      });

      response.setHeader("content-type", "application/json");
      if (request.url?.includes("/images/edits")) {
        response.end(okImageResponse());
        return;
      }

      if (request.url?.includes("/models")) {
        response.end(JSON.stringify({ object: "list", data: [] }));
        return;
      }

      response.end("{}");
    });
  });

  const proxy = http.createServer((request, response) => {
    proxyHits += 1;
    assert.ok(request.url);
    const upstreamUrl = new URL(request.url);
    const upstream = http.request(
      {
        hostname: "127.0.0.1",
        port: targetPort,
        path: `${upstreamUrl.pathname}${upstreamUrl.search}`,
        method: request.method,
        headers: request.headers
      },
      (upstreamResponse) => {
        response.writeHead(upstreamResponse.statusCode ?? 500, upstreamResponse.headers);
        upstreamResponse.pipe(response);
      }
    );

    request.pipe(upstream);
  });

  try {
    await listen(target);
    await listen(proxy);
    const proxyUrl = `http://127.0.0.1:${port(proxy)}`;
    delete process.env.https_proxy;
    delete process.env.http_proxy;
    process.env.HTTPS_PROXY = proxyUrl;
    process.env.HTTP_PROXY = proxyUrl;

    targetPort = port(target);
    const client = new OpenAI({
      ...openAIClientOptions("test-openai-key-multipart-proxy"),
      baseURL: "http://openai-proxy-compat.test/v1",
      maxRetries: 0
    });

    await client.models.list();
    await client.images.edit({
      model: "gpt-image-2",
      prompt: "single image upload test",
      image: [await toFile(Buffer.from("single-image"), "single.png", { type: "image/png" })],
      size: "1024x1024",
      quality: "medium",
      output_format: "png"
    });
    await client.images.edit({
      model: "gpt-image-2",
      prompt: "multiple image upload test",
      image: [
        await toFile(Buffer.from("first-image"), "first.png", { type: "image/png" }),
        await toFile(Buffer.from("second-image"), "second.jpg", { type: "image/jpeg" })
      ],
      size: "1024x1024",
      quality: "medium",
      output_format: "png"
    });

    assert.equal(proxyHits, 3);
    assert.deepEqual(
      capturedRequests.map((request) => request.url),
      ["/v1/models", "/v1/images/edits", "/v1/images/edits"]
    );

    const singleUpload = capturedRequests[1];
    const multipleUpload = capturedRequests[2];
    assert.ok(singleUpload);
    assert.ok(multipleUpload);
    assert.match(singleUpload.contentType ?? "", /^multipart\/form-data; boundary=/);
    assert.match(multipleUpload.contentType ?? "", /^multipart\/form-data; boundary=/);
    assert.ok(singleUpload.body.includes(Buffer.from("single-image")));
    assert.ok(multipleUpload.body.includes(Buffer.from("first-image")));
    assert.ok(multipleUpload.body.includes(Buffer.from("second-image")));
    assert.doesNotMatch(singleUpload.body.toString("utf8"), /\[object FormData\]/);
    assert.doesNotMatch(multipleUpload.body.toString("utf8"), /\[object FormData\]/);

    console.log("OpenAI multipart proxy compatibility tests passed.");
  } finally {
    if (previousHttpsProxy === undefined) {
      delete process.env.HTTPS_PROXY;
    } else {
      process.env.HTTPS_PROXY = previousHttpsProxy;
    }
    if (previousHttpProxy === undefined) {
      delete process.env.HTTP_PROXY;
    } else {
      process.env.HTTP_PROXY = previousHttpProxy;
    }
    if (previousLowerHttpsProxy === undefined) {
      delete process.env.https_proxy;
    } else {
      process.env.https_proxy = previousLowerHttpsProxy;
    }
    if (previousLowerHttpProxy === undefined) {
      delete process.env.http_proxy;
    } else {
      process.env.http_proxy = previousLowerHttpProxy;
    }
    await close(proxy);
    await close(target);
  }
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
