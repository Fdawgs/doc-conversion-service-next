const fs = require("fs");
const Fastify = require("fastify");
const isHtml = require("is-html");
const { JSDOM } = require("jsdom");
const raw = require("raw-body");
const plugin = require(".");

describe("Tidy-CSS Plugin", () => {
	let server;

	beforeEach(() => {
		server = Fastify();

		server.addContentTypeParser("text/html", async (req, payload) => {
			const res = await raw(payload);
			return res;
		});
	});

	afterEach(async () => {
		await server.close();
	});

	test("Should tidy HTML", async () => {
		server.post("/", async (req, res) => {
			res.send(await server.tidyHtml(req.body));
		});
		server.register(plugin);

		const response = await server.inject({
			method: "POST",
			url: "/",
			body: fs.readFileSync(
				"./test_resources/test_files/valid_bullet_issues_html.html",
				{ encoding: "UTF-8" }
			),
			headers: {
				"content-type": "text/html",
			},
		});

		const dom = new JSDOM(response.payload);

		expect(
			dom.window.document.querySelector("html").getAttribute("lang")
		).toEqual("en");
		expect(
			dom.window.document.querySelector("html").getAttribute("xml:lang")
		).toEqual("en");
		expect(typeof response.payload).toEqual("string");
		expect(isHtml(response.payload)).toEqual(true);
	});

	test("Should tidy HTML and set language", async () => {
		server.post("/", async (req, res) => {
			res.send(await server.tidyHtml(req.body, "fr"));
		});
		server.register(plugin);

		const response = await server.inject({
			method: "POST",
			url: "/",
			body: fs.readFileSync(
				"./test_resources/test_files/valid_bullet_issues_html.html",
				{ encoding: "UTF-8" }
			),
			headers: {
				"content-type": "text/html",
			},
		});

		const dom = new JSDOM(response.payload);

		expect(
			dom.window.document.querySelector("html").getAttribute("lang")
		).toEqual("fr");
		expect(
			dom.window.document.querySelector("html").getAttribute("xml:lang")
		).toEqual("fr");
		expect(typeof response.payload).toEqual("string");
		expect(isHtml(response.payload)).toEqual(true);
	});
});
