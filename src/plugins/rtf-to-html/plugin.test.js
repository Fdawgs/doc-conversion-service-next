/* eslint-disable security/detect-non-literal-fs-filename */
const { cloneDeep } = require("lodash");
const fs = require("fs");
const Fastify = require("fastify");
const isHtml = require("is-html");
const raw = require("raw-body");
const plugin = require(".");
const getConfig = require("../../config");

/**
 * Used to check that common incorrectly converted Windows-1252
 * to UTF-8 values are removed by the `fix-utf8` module
 */
const artifacts =
	/â‚¬|â€š|Æ’|â€ž|â€¦|â€¡|Ë†|â€°|â€¹|Å½|â€˜|â€™|â€œ|â€¢|â€“|â€”|Ëœ|Å¡|Å¾|Å¸|Â¯|Â·|Â´|Â°|Ã‚|ï‚·|âˆš|�|Ã€|Ãƒ|Ã„|Ã…|Ã†|Ã‡|Ãˆ|Ã‰|ÃŠ|Ã‹|ÃŒ|ÃŽ|Ã‘|Ã’|Ã“|Ã”|Ã•|Ã–|Ã—|Ã˜|Ã™|Ãš|Ã›|Ãœ|Ãž|ÃŸ|Ã¡|Ã¢|Ã£|Ã¤|Ã¥|Ã¦|Ã§|Ã¨|Ã©|Ãª|Ã«|Ã¬|Ã­|Ã®|Ã¯|Ã°|Ã±|Ã²|Ã³|Ã´|Ãµ|Ã¶|Ã·|Ã¸|Ã¹|Ãº|Ã»|Ã¼|Ã½|Ã¾|Ã¿|â‰¤|â‰¥|Â|Ã|â€|�/g;

describe("RTF-to-HTML Conversion Plugin", () => {
	let config;
	let server;

	beforeAll(async () => {
		config = await getConfig();
		config = cloneDeep(config);
		config.unrtf.tempDirectory = "./src/temp3/";
	});

	beforeEach(() => {
		server = Fastify();

		server.addContentTypeParser("application/rtf", async (req, payload) => {
			const res = await raw(payload);
			return res;
		});

		server.post("/", async (req, res) => {
			res.header("content-type", "application/json");
			res.send(req.conversionResults);
		});
	});

	afterAll(() => {
		fs.rmdirSync(config.unrtf.tempDirectory, { recursive: true });
	});

	afterEach(async () => {
		await server.close();
	});

	test("Should convert RTF file to HTML and place in specified directory", async () => {
		server.register(plugin, config.unrtf);

		let response = await server.inject({
			method: "POST",
			url: "/",
			body: fs.readFileSync("./test_resources/test_files/valid_rtf.rtf"),
			headers: {
				"content-type": "application/rtf",
			},
		});

		response = JSON.parse(response.payload);

		expect(response.body).toEqual(
			expect.stringContaining("Ask not what your country can do for you")
		);
		expect(response.body).not.toEqual(expect.stringMatching(artifacts));
		expect(isHtml(response.body)).toEqual(true);
		expect(typeof response.docLocation).toEqual("object");
		expect(fs.existsSync(response.docLocation.rtf)).toEqual(false);
		expect(fs.existsSync(config.unrtf.tempDirectory)).toEqual(true);
	});

	test("Should return HTTP status code 400 if RTF file is missing", async () => {
		server.register(plugin, config.unrtf);

		const response = await server.inject({
			method: "POST",
			url: "/",
			headers: {
				"content-type": "application/rtf",
			},
		});

		const body = JSON.parse(response.payload);

		expect(response.statusCode).toEqual(400);
		expect(response.statusMessage).toEqual("Bad Request");
		expect(body.statusCode).toEqual(400);
		expect(body.error).toEqual("Bad Request");
	});
});
